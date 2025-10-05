// server.js  — Express + Gemini (AI Studio) API
// ESM module (node >= 18)

import 'dotenv/config';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { GoogleGenAI } from '@google/genai';

// --- Setup .env and SDK ------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

if (!process.env.GEMINI_API_KEY) {
  console.error('❗ GEMINI_API_KEY missing. Set it in .env next to server.js');
}
console.log('Gemini key present:', !!process.env.GEMINI_API_KEY);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Known-good model IDs (fixed; no dynamic listing)
const IMAGE_MODEL = 'gemini-2.5-flash-image'; // image generation & VTO experiments
const TEXT_MODEL  = 'gemini-2.0-flash';       // fast text for JSON feedback

// --- Upload middleware -------------------------------------------------------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 5, fileSize: 12 * 1024 * 1024 }, // 12 MB per file
  fileFilter: (_req, file, cb) => {
    const ok = ['image/png', 'image/jpeg', 'image/webp'].includes(file.mimetype);
    cb(ok ? null : new Error('Unsupported image type (png/jpeg/webp only)'), ok);
  },
});

// Helper: push a buffer to Gemini Files API and return a content part (used by /api/generate)
async function bufferToFilePart(buf, originalname, mimetype) {
  const tmp = path.join(process.cwd(), '.tmp', `${Date.now()}-${originalname}`);
  fs.mkdirSync(path.dirname(tmp), { recursive: true });
  fs.writeFileSync(tmp, buf);
  try {
    const uploaded = await ai.files.upload({
      file: tmp,
      mimeType: mimetype,
      displayName: originalname,
    });
    const fileUri = (uploaded?.file && uploaded.file.uri) || uploaded?.uri || uploaded?.fileUri;
    if (!fileUri) throw new Error('Upload returned no file URI');
    return { fileData: { fileUri, mimeType: mimetype } };
  } finally {
    // leave cleanup in place; /api/generate uses the Files API path
    fs.unlink(tmp, () => {});
  }
}

// --- POST /api/generate  (virtual try-on / image generation) -----------------
app.post('/api/generate', upload.array('images', 5), async (req, res) => {
  try {
    const prompt = (req.body.prompt || '').toString().trim();
    const files = req.files || [];

    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });
    if (!files.length) return res.status(400).json({ error: 'Upload 1–5 images' });

    // Build contentParts array that interleaves human-readable descriptions with each file.
    // This tells the model: file 1 = subject (person), files 2..N = outfit sources.
    const contentParts = [];
    const serverPromptIntro = `Important: The first uploaded image is the person (subject). Any additional uploaded images are outfit images that should be used as clothing sources. Transfer clothing and details from the outfit images onto the subject in a realistic way. Preserve the subject's pose and scene lighting. Do NOT add or remove body parts or extra people. If an outfit image depicts a dress, do NOT add pants or lower-body garments. For outerwear or hoodies, transfer top-layer details (hood, collar, texture) but do not obscure the face or change identity. Avoid compositing seams, text, watermarks, or UI. Frame the subject centrally (occupying ~60-80% of image height). Return a single PNG image only.`;
    contentParts.push({ text: serverPromptIntro });
    contentParts.push({ text: `Client instructions: ${prompt}` });

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const label = i === 0 ? 'Subject image (person) — do not change identity or face.' : `Outfit image ${i} — clothing source. Use these garments to dress the subject (do not add extra people).`;
      // attach a small textual hint before each file to make its purpose explicit
      contentParts.push({ text: label });
      contentParts.push(await bufferToFilePart(f.buffer, f.originalname, f.mimetype));
    }

    const resp = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: [{ role: 'user', parts: contentParts }],
      config: { responseModalities: ['IMAGE'] },
    });

    const parts = resp?.candidates?.[0]?.content?.parts ?? [];
    const img = parts.find(p => p.inlineData?.data);

    if (!img) {
      const finish = resp?.candidates?.[0]?.finishReason || 'UNKNOWN';
      const safety = resp?.candidates?.[0]?.safetyRatings || resp?.candidates?.[0]?.safetyReasons || [];
      return res.status(422).json({
        error: 'Model did not return an image',
        finishReason: finish,
        safety,
      });
    }

    // Return in the shape your Results.tsx expects
    return res.json({
      results: [{
        view: 'Generated',
        mimeType: img.inlineData.mimeType || 'image/png',
        data: img.inlineData.data, // base64
      }],
    });
  } catch (err) {
    const body = err?.response?.body || err?.body || err?.message || String(err);
    console.error('generate error:', body);
    return res.status(500).json({ error: typeof body === 'string' ? body : String(body) });
  }
});

// --- POST /api/feedback  (text analysis of an outfit image) ------------------
// CHANGED: uses inline base64 bytes instead of Files API URIs to avoid
// "File ... not exist" errors. No other behavior is altered.
app.post('/api/feedback', upload.single('image'), async (req, res) => {
  try {
    const style = (req.body.style || '').toString().trim();
    const file = req.file;

    if (!style) return res.status(400).json({ error: 'Missing style' });
    if (!file)  return res.status(400).json({ error: 'Missing image file' });

    // 👇 Inline the image directly (no short-lived fileUri)
    const filePart = {
      inlineData: { data: file.buffer.toString('base64'), mimeType: file.mimetype }
    };

  const analysisPrompt = `You are a professional fashion stylist and critic. Given the provided image (the uploaded outfit) and the target style: "${style}", produce a concise, structured JSON analysis. IMPORTANT: Return ONLY a single valid JSON object with NO surrounding commentary. EXACTLY follow the schema below.

Schema (required):
{
  "overall_score": number between 0 and 1, // weighted average, two-decimal precision (e.g. 0.78)
  "components": {
    "fit": number between 0 and 1,
    "color": number between 0 and 1,
    "proportions": number between 0 and 1,
    "cohesion": number between 0 and 1,
    "vibe_match": number between 0 and 1 // how closely the look matches the requested vibe/style
  },
  "weights": { "fit": number, "color": number, "proportions": number, "cohesion": number, "vibe_match": number }, // sum to 1
  "vibe": short text summary (1-2 sentences),
  "tips": [ { "label": string, "text": string, "score": number between 0 and 1 (optional) } ],
  "tags": [ string ]
}

Rules and scoring instructions:
- Calculate each component (fit, color, proportions, cohesion) as a number in [0,1] with two decimal places.
- Use the provided weights to compute overall_score as the weighted sum of the components, and ensure overall_score equals that calculation (round to two decimals).
- Prefer these default weights unless a reason to change is obvious: fit=0.30, color=0.20, proportions=0.15, cohesion=0.15, vibe_match=0.20. Include the weights object in the output.
- Do NOT output a constant or canned score. Base numbers on clear visual criteria: how well garments fit the subject, color harmony and contrast, proportional balance (lengths/silhouette), and how cohesive the outfit feels.
 - Important rule: If the detected garments strongly mismatch the requested vibe (for example: target "formal" but detected garments include 't-shirt', 'hoodie', 'sweatpants' with confidence > 0.6), set 'vibe_match' to a low value (<= 0.25) unless the action_plan includes immediate swaps that would change garments. Do not allow a high overall_score when garment types contradict the requested vibe.
 - Provide 2–4 concise actionable tips in the tips array (label + short text). Optionally include a per-tip score in [0,1].
 - Provide a prioritized 'action_plan' array (3 items max) that recommends exact swaps or alterations (e.g., "Swap sweatshirt for a navy blazer + white dress shirt"), each with an 'impact_estimate' in [0,1] estimating how much that change would improve 'vibe_match'.
- Do NOT mention faces, identities, or personal attributes unrelated to clothing. Do NOT include code fences.
- Keep the JSON compact (no extra fields). Example output:
{
  "overall_score": 0.82,
  "components": { "fit": 0.90, "color": 0.75, "proportions": 0.70, "cohesion": 0.75 },
  "weights": { "fit": 0.35, "color": 0.25, "proportions": 0.2, "cohesion": 0.2 },
  "vibe": "Smart-casual, clean lines with a flattering silhouette.",
  "tips": [ { "label": "Adjust Hem", "text": "Shorten the hem slightly for better proportion with these shoes.", "score": 0.7 } ],
  "tags": ["smart-casual","neutral palette","balanced silhouette"]
}

Focus strictly on clothing, colors, fit, proportions, and cohesion. Be precise in numbers and consistent with the weighted overall score.`;

    const resp = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: [{ role: 'user', parts: [{ text: analysisPrompt }, filePart] }],
      config: { responseModalities: ['TEXT'] },
    });

    const parts = resp?.candidates?.[0]?.content?.parts ?? [];
    const textPart = parts.find(p => p.text) || {};
    const text = textPart.text || parts.map(p => p.text).filter(Boolean).join('\n');

    if (!text) {
      const finish = resp?.candidates?.[0]?.finishReason || 'UNKNOWN';
      return res.status(502).json({ error: 'Model did not return text', finishReason: finish });
    }

    // Strip code fences if present and parse JSON
    const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return res.status(500).json({ error: 'Could not parse analysis JSON', raw: text.slice(0, 1000) });
    }

    return res.json(parsed);
  } catch (err) {
    const body = err?.response?.body || err?.body || err?.message || String(err);
    console.error('feedback error:', body);
    return res.status(500).json({ error: typeof body === 'string' ? body : String(body) });
  }
});

// --- Start -------------------------------------------------------------------
const port = Number(process.env.PORT) || 5001;
app.listen(port, () => {
  console.log(`✅ API listening at http://localhost:${port}`);
});
