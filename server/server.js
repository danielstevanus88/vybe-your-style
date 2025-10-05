import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { GoogleGenAI } from '@google/genai';

// Resolve server directory and load .env from the same folder as this file.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });
console.log('GEMINI_API_KEY present:', !!process.env.GEMINI_API_KEY, 'prefix=', (process.env.GEMINI_API_KEY || '').slice(0,8));

const app = express();
app.use(cors());

if (!process.env.GEMINI_API_KEY) {
  console.error('No GEMINI_API_KEY found in environment. Please set GEMINI_API_KEY in server/.env or in the environment.');
}
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Helper: pick a text-capable model by listing available models and selecting a Gemini/text model
async function pickTextModel() {
  try {
    console.log('Listing available models to select a text-capable model...');
    const list = await ai.models.list();
    // Normalize possible return shapes: some SDKs return { models: [...] } or { models: { ... } }
    let itemsRaw = list?.models ?? list;
    let items = [];
    if (Array.isArray(itemsRaw)) {
      items = itemsRaw;
    } else if (itemsRaw && typeof itemsRaw === 'object') {
      // convert object values to an array
      items = Object.values(itemsRaw);
    } else {
      items = [];
    }

    // Normalize model descriptors into simple entries { id, name, supports }
    const normalized = (items || []).map((m) => {
      // some SDKs return { name } or { model }
      const id = m?.name || m?.model || (typeof m === 'string' ? m : undefined);
      const supports = m?.supportedMethods || m?.capabilities || m?.support || '';
      return { raw: m, id, supports };
    }).filter(Boolean);

    // Candidate priorities:
    // 1) prefer explicit gemini-1.5-pro if available
    // 2) gemini.* models that look text/chat capable
    // 3) models whose id includes 'text' or 'chat'
    // 4) any model that appears to support 'generateContent' or 'text' in capabilities
    // 5) first available model id
    let candidate = normalized.find((m) => /gemini-1.5-pro/i.test(m.id || ''))
      || normalized.find((m) => /gemini/i.test(m.id || '') && !/image/i.test(m.id || ''))
      || normalized.find((m) => /text|chat/i.test(m.id || ''))
      || normalized.find((m) => /generate|text|chat/i.test(String(m.supports || '').toLowerCase()))
      || normalized[0];

    console.log('Model selection result:', candidate?.id || candidate?.raw || candidate);
    return candidate?.id || undefined;
  } catch (e) {
    console.error('Failed to list models for selection', e?.message || e);
    return undefined;
  }
}

// In-memory upload; cap size & count server-side
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 5, fileSize: 12 * 1024 * 1024 }, // 12MB per file
  fileFilter: (_req, file, cb) => {
    const ok = ['image/png', 'image/jpeg', 'image/webp'].includes(file.mimetype);
    cb(ok ? null : new Error('Unsupported image type'), ok);
  },
});

app.post('/api/generate', upload.array('images', 5), async (req, res) => {
  try {
    const prompt = (req.body.prompt || '').toString().trim();
    const files = req.files || [];
    console.log('Received upload request; prompt length:', prompt.length, 'files received:', files.length);

    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });
    if (!files.length) return res.status(400).json({ error: 'Upload 1–5 images' });
    if (files.length > 5) return res.status(400).json({ error: 'Max 5 images' });

    // Prefer the Files API (robust for size/reuse). Each upload returns a URI you can reference.
    // Docs: ai.files.upload(...) then pass {fileData:{fileUri, mimeType}} in contents.  :contentReference[oaicite:2]{index=2}
    const fileParts = [];
    for (const f of files) {
      // write a temp file so we can call ai.files.upload({ file: <path> })
      const tmp = path.join(process.cwd(), '.tmp', `${Date.now()}-${f.originalname}`);
      fs.mkdirSync(path.dirname(tmp), { recursive: true });
      fs.writeFileSync(tmp, f.buffer);
      const uploaded = await ai.files.upload({
        file: tmp,
        mimeType: f.mimetype,
        displayName: f.originalname,
      });
      // Support different response shapes from the Files API (some versions return { file: { uri } },
      // others return a top-level { uri } or fileUri).
      if (!uploaded) {
        console.error('Uploaded response missing entirely:', JSON.stringify(uploaded).slice(0, 1000));
        return res.status(500).json({ error: 'Upload to AI files API failed: empty response' });
      }
      const fileUri = (uploaded.file && uploaded.file.uri) || uploaded.uri || uploaded.fileUri;
      if (!fileUri) {
        console.error('Uploaded response missing any file URI; full response:', JSON.stringify(uploaded).slice(0, 1000));
        return res.status(500).json({ error: 'Upload to AI files API failed: missing file URI in response' });
      }
      console.log('Uploaded file URI selected:', fileUri);
      // Clean up temp file
      fs.unlink(tmp, () => {});
      // Part that references the uploaded file (use detected fileUri)
      fileParts.push({ fileData: { fileUri, mimeType: f.mimetype } });
    }

    // Log summary of uploaded file URIs that will be sent to the model (no secrets)
    const uploadedUris = fileParts.map((p) => p.fileData?.fileUri).filter(Boolean);
    console.log('Total uploaded fileUris to pass to model:', uploadedUris.length);
    console.log('fileUris:', uploadedUris);

    // Generate two views (Front, Back) by making separate model calls.
    const views = ['Front View', 'Back View'];
    const results = [];
    for (const view of views) {
      try {
  // Strong, explicit instructions to avoid artifacts and enforce fashion rules + framing.
  const viewPrompt = `${view}. Using the uploaded person as the single subject, generate one realistic, photo-quality ${view.toLowerCase()} virtual try-on image that transfers clothing from the provided outfit images onto the same person. Preserve the subject's natural pose and the scene's lighting. Frame the person centrally: the subject should occupy roughly 60–80% of image height, be centered horizontally, and be clearly visible (head to just below the knees for front view; full back for back view).
  If the provided outfit is a dress, render only the dress for the lower body (do NOT add pants, leggings, or other lower-body garments). Do NOT add, remove, or duplicate body parts (no extra limbs or extra people). Avoid visible compositing seams, overlays, watermarks, text, or UI. Use realistic shadows and consistent skin tones so the clothing appears naturally worn by the subject. Return a single PNG image only, with no captions or surrounding UI.`;
        console.log('Sending to model for view:', view, { promptPreview: viewPrompt.slice(0, 200), fileUris: uploadedUris });
        const resp = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: [{ role: 'user', parts: [{ text: viewPrompt }, ...fileParts] }],
          config: { responseModalities: ['IMAGE'] },
        });

        const partsForView = resp.candidates?.[0]?.content?.parts ?? [];
        const imagePartForView = partsForView.find((p) => p.inlineData?.data);
        if (!imagePartForView) {
          console.error('No image returned for view', view, 'response truncated:', JSON.stringify(resp).slice(0, 1000));
          results.push({ view, error: 'No image returned' });
          continue;
        }

        results.push({
          view,
          mimeType: imagePartForView.inlineData.mimeType || 'image/png',
          data: imagePartForView.inlineData.data,
        });
      } catch (viewErr) {
        console.error('Model call failed for view', view, viewErr?.message || viewErr);
        const body = viewErr?.response?.body || viewErr?.body || viewErr?.message;
        console.error('Model error body (truncated):', typeof body === 'string' ? body.slice(0, 1000) : body);
        results.push({ view, error: typeof body === 'string' ? body : String(body) });
      }
    }

    return res.json({ results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err?.message || 'Generation failed' });
  }
});

// POST /api/feedback
// Accepts: form field 'style' (string) and one image file named 'image'
app.post('/api/feedback', upload.single('image'), async (req, res) => {
  try {
    const style = (req.body.style || '').toString().trim();
    const file = req.file;
    if (!style) return res.status(400).json({ error: 'Missing style' });
    if (!file) return res.status(400).json({ error: 'Missing image file' });

    // write temp file and upload
    const tmp = path.join(process.cwd(), '.tmp', `${Date.now()}-${file.originalname}`);
    fs.mkdirSync(path.dirname(tmp), { recursive: true });
    fs.writeFileSync(tmp, file.buffer);
    let uploaded;
    try {
      uploaded = await ai.files.upload({ file: tmp, mimeType: file.mimetype, displayName: file.originalname });
    } finally {
      fs.unlink(tmp, () => {});
    }
    if (!uploaded) return res.status(500).json({ error: 'Upload failed' });
    const fileUri = (uploaded.file && uploaded.file.uri) || uploaded.uri || uploaded.fileUri;
    if (!fileUri) return res.status(500).json({ error: 'Upload returned no file URI' });

    // Build a prompt asking for a JSON-only analysis
    const analysisPrompt = `You are a professional fashion stylist and critic. Given the provided image (the uploaded outfit) and the target style: "${style}", analyze how well the outfit matches the target style.
Return ONLY a single valid JSON object (no surrounding explanation) with the following shape:
{
  "overall_score": number between 0 and 1,
  "vibe": short text summary (1-2 sentences),
  "tips": [ { "label": string, "text": string, "score": number between 0 and 1 (optional) } ],
  "tags": [ string ]
}

Focus only on garments, colors, fit, proportions, and cohesion. Do NOT mention or describe faces or identities. Be concise and actionable in tips.`;

    // Call model with the file reference
    // Attempt to find multiple candidate text models and try them until one succeeds.
    let modelResp;
    try {
      // Get model list and build candidate ids (de-duplicated)
      const list = await ai.models.list();
      // Normalize list result into an array similar to pickTextModel
      let itemsRaw = list?.models ?? list;
      let items = [];
      if (Array.isArray(itemsRaw)) {
        items = itemsRaw;
      } else if (itemsRaw && typeof itemsRaw === 'object') {
        items = Object.values(itemsRaw);
      } else {
        items = [];
      }
      const ids = Array.from(new Set((items || []).map((m) => m?.name || m?.model || m).filter(Boolean)));

      // Ensure we have some sensible fallbacks appended (but do not prefer them over listed models)
      const fallbacks = ['text-bison', 'gemini-2.1', 'gemini-1'];
      const candidates = ids.concat(fallbacks).slice(0, 20); // limit attempts

      console.log('Feedback model candidates:', candidates.slice(0, 8));
      let lastErr;
      for (const candidate of candidates) {
        try {
          console.log('Trying feedback model:', candidate);
          modelResp = await ai.models.generateContent({
            model: candidate,
            contents: [{ role: 'user', parts: [{ text: analysisPrompt }, { fileData: { fileUri, mimeType: file.mimetype } }] }],
            config: { responseModalities: ['TEXT'] },
          });
          // Basic sanity check: did we receive any text parts?
          const parts = modelResp?.candidates?.[0]?.content?.parts ?? [];
          const textPart = parts.find((p) => p.text || p.type === 'output_text');
          if (textPart) {
            console.log('Model', candidate, 'returned text; using it for parsing.');
            break; // keep modelResp
          }
          // If no text, treat as failure and try next
          lastErr = new Error('No text returned');
        } catch (inner) {
          console.warn('Model', candidate, 'failed:', inner?.message || inner);
          lastErr = inner;
          // try next candidate
        }
      }

      if (!modelResp) {
        console.error('All model candidates failed for feedback:', lastErr?.message || lastErr);
        const body = lastErr?.response?.body || lastErr?.body || lastErr?.message || String(lastErr);
        return res.status(500).json({ error: 'All feedback model attempts failed', detail: typeof body === 'string' ? body : String(body) });
      }
    } catch (e) {
      console.error('Feedback model selection/listing error', e?.message || e);
      const body = e?.response?.body || e?.body || e?.message;
      return res.status(500).json({ error: 'Failed to list or call models for feedback', detail: typeof body === 'string' ? body : String(body) });
    }

    const parts = modelResp.candidates?.[0]?.content?.parts ?? [];
    // find textual part
    const textPart = parts.find((p) => p.text || p.role === 'assistant' || p.type === 'output_text');
    const text = (textPart && (textPart.text || textPart.content || textPart.output_text)) || parts.map(p => p.text || '').join('\n');
    if (!text) return res.status(500).json({ error: 'No textual analysis returned' });

    // Try to parse JSON from the model output
    let parsed;
    try {
      // The model should return JSON only; attempt direct parse or extract JSON block
      const jsonText = text.trim();
      // If the text starts with a code fence, strip it
      const cleaned = jsonText.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
      parsed = JSON.parse(cleaned);
    } catch (err) {
      console.error('Failed to parse JSON from model output:', text.slice(0, 1000));
      return res.status(500).json({ error: 'Could not parse analysis JSON', raw: text });
    }

    return res.json(parsed);
  } catch (err) {
    console.error('Feedback route error', err);
    return res.status(500).json({ error: err?.message || 'Feedback failed' });
  }
});

const port = Number(process.env.PORT) || 5001;
app.listen(port, () => console.log(`Server listening on http://localhost:${port}`));
