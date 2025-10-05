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
    const serverPromptIntro =
      `Important: The first uploaded image is the person (subject). Any additional uploaded images are outfit images that should be used as clothing sources. ` +
      `Transfer clothing and details from the outfit images onto the subject in a realistic way. Preserve the subject's pose and scene lighting. ` +
      `Do NOT add or remove body parts or extra people. ALWAYS MODIFY THE PERSON OUTFIT TO THE UPLOADED CLOTHES. If an outfit image depicts a dress, do NOT add pants or lower-body garments. ` +
      `For outerwear or hoodies, transfer top-layer details (hood, collar, texture) but do not obscure the face or change identity. ` +
      `Avoid compositing seams, text, watermarks, or UI. Frame the subject centrally (occupying ~60–80% of image height). Return a single PNG image only.`;
    contentParts.push({ text: serverPromptIntro });
    contentParts.push({ text: `Client instructions: ${prompt}` });

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const label = i === 0
        ? 'Subject image (person) — do not change identity or face.'
        : `Outfit image ${i} — clothing source. Use these garments to dress the subject (do not add extra people).`;
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
// Uses inline base64 bytes (no short-lived fileUri). Vibe-centric scoring.
app.post('/api/feedback', upload.single('image'), async (req, res) => {
  try {
    const style = (req.body.style || '').toString().trim();
    const file = req.file;

    if (!style) return res.status(400).json({ error: 'Missing style' });
    if (!file)  return res.status(400).json({ error: 'Missing image file' });

    // Inline the image directly (no short-lived fileUri)
    const filePart = {
      inlineData: { data: file.buffer.toString('base64'), mimeType: file.mimetype }
    };

    // Vibe-forward analysis prompt (no example JSON to avoid echoing)
    const analysisPrompt = `
You are a professional fashion stylist and aesthetic analyst.
Evaluate how well the uploaded outfit expresses the target vibe: "${style}".

Return ONE valid JSON object only (no commentary, no markdown).
Schema:
{
  "overall_score": number (0–1, two decimals),
  "components": {
    "fit": number (0–1),
    "color": number (0–1),
    "proportions": number (0–1),
    "cohesion": number (0–1),
    "vibe_match": number (0–1)
  },
  "weights": { "fit": number, "color": number, "proportions": number, "cohesion": number, "vibe_match": number },
  "vibe": string (<= 2 sentences),
  "tips": [ { "label": string, "text": string, "score": number (0–1, optional) } ],
  "action_plan": [ { "recommendation": string, "impact_estimate": number (0–1) } ],
  "tags": [ string ]
}


Weights (sum to 1, vibe-forward):
- vibe_match = 0.55
- fit = 0.15
- color = 0.10
- proportions = 0.10
- cohesion = 0.10

Scoring guidance (two-decimal precision):
- IMPORTANT: Look through all the details of the person: Shoes, Accessories, Shirts, Pants, Outerwear, Bags, Jewelry, Hats.
- Compute overall_score = weighted sum of components.
- Judge fit/color/proportions/cohesion ONLY in relation to how well they support the target vibe.
- Penalize elements that clearly contradict the vibe (e.g., sneakers with formal tux).
  If major elements oppose the vibe, set vibe_match ≤ 0.25 and cap overall_score ≤ 0.55.
- Keep feedback specific and actionable (2–4 tips, up to 3 action_plan items).
- Do not mention faces, identity, or background. Focus strictly on clothing, silhouette, layering, and color relationships.
`;

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

// --- POST /api/recommendations  (AI-generated outfit recommendations) --------
// Analyzes uploaded image and vibe, returns personalized outfit recommendations
app.post('/api/recommendations', upload.single('image'), async (req, res) => {
  try {
    const vibe = (req.body.vibe || 'casual').toString().trim();
    const file = req.file;

    if (!file) return res.status(400).json({ error: 'Missing image file' });

    // Inline the image directly
    const filePart = {
      inlineData: { data: file.buffer.toString('base64'), mimeType: file.mimetype }
    };

    const recommendationPrompt = `
You are a professional fashion stylist and personal shopper.
Analyze the uploaded image of a person and recommend 4 complete outfit items that match their style and the target vibe: "${vibe}".

Return ONE valid JSON object only (no commentary, no markdown).
Schema:
{
  "recommendations": [
    {
      "id": number (1-4),
      "name": string (outfit item name, e.g., "Classic White Button-Down Shirt"),
      "category": string (one of: "shirt", "pants", "dress", "shoes", "outerwear", "accessory"),
      "style": string (short style description, e.g., "Professional chic"),
      "price": string (estimated price with currency, e.g., "$89"),
      "matchScore": number (85-98, how well it matches the person and vibe),
      "searchQuery": string (Google Shopping search query, e.g., "white button down shirt women professional"),
      "description": string (1-2 sentences about why this item works for them)
    }
  ]
}

Requirements:
- Recommend a diverse mix: at least one top (shirt/dress/outerwear), one bottom (pants) or full outfit (dress), and one pair of shoes or accessory.
- Base recommendations on the person's apparent style, body type, and color preferences visible in the image.
- Match the target vibe "${vibe}" (e.g., formal = blazers, dress pants; casual = denim, tees; streetwear = hoodies, sneakers).
- Provide realistic price estimates (range $50-$300 per item).
- Make searchQuery specific enough for Google Shopping (include gender, style, color if relevant).
- Ensure matchScore reflects how well the item suits both the person and the vibe (higher scores for better matches).
`;

    const resp = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: [{ role: 'user', parts: [{ text: recommendationPrompt }, filePart] }],
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
      return res.status(500).json({ error: 'Could not parse recommendations JSON', raw: text.slice(0, 1000) });
    }

    // Add Google Shopping links to each recommendation
    if (parsed.recommendations && Array.isArray(parsed.recommendations)) {
      parsed.recommendations = parsed.recommendations.map(rec => ({
        ...rec,
        shopLink: `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(rec.searchQuery || rec.name)}`
      }));
    }

    return res.json(parsed);
  } catch (err) {
    const body = err?.response?.body || err?.body || err?.message || String(err);
    console.error('recommendations error:', body);
    return res.status(500).json({ error: typeof body === 'string' ? body : String(body) });
  }
});

// --- Start -------------------------------------------------------------------
const port = Number(process.env.PORT) || 5001;
app.listen(port, () => {
  console.log(`✅ API listening at http://localhost:${port}`);
});
