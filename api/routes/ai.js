import { Router } from 'express';
import { panggilLLM } from '../lib/llmGratis.js';
import { normalisasiTugas } from '../lib/normalisasi.js';
const r = Router();
r.post('/parse', async (req, res) => {
  const { paragraf, now, timezone } = req.body ?? {};
  if (!paragraf || !String(paragraf).trim()) return res.status(400).json({ error: 'paragraf wajib diisi' });
  try {
    const mentah = await panggilLLM(String(paragraf), now ?? new Date().toISOString(), timezone ?? 'Asia/Jakarta');
    if (!mentah) return res.json({ sumber: 'lokal', tugas: [] });
    return res.json({ sumber: 'ai', tugas: normalisasiTugas(mentah, now ?? new Date().toISOString()) });
  } catch { return res.json({ sumber: 'lokal', tugas: [] }); }
});
export default r;
