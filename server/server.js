import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { GoogleGenAI } from '@google/genai';

const app = express();
app.use(cors());

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
    const files = (req.files as Express.Multer.File[]) || [];

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
      // Clean up temp file
      fs.unlink(tmp, () => {});
      // Part that references the uploaded file
      fileParts.push({
        fileData: { fileUri: uploaded.file.uri, mimeType: f.mimetype },
      });
    }

    // Ask Gemini 2.5 Flash Image to produce just an image
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ role: 'user', parts: [{ text: prompt }, ...fileParts] }],
      // Return only image data (no caption)
      config: { responseModalities: ['IMAGE'] },
    }); // API shapes & options shown in docs. :contentReference[oaicite:3]{index=3}

    // Find the image in the response and return base64
    const parts = response.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((p: any) => p.inlineData?.data);
    if (!imagePart) return res.status(500).json({ error: 'No image returned' });

    // Default output is PNG unless you set image_config; decode on client. :contentReference[oaicite:4]{index=4}
    res.json({
      mimeType: imagePart.inlineData.mimeType || 'image/png',
      data: imagePart.inlineData.data, // base64 string
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Generation failed' });
  }
});

const port = Number(process.env.PORT) || 5001;
app.listen(port, () => console.log(`Server listening on http://localhost:${port}`));
