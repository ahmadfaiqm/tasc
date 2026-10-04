import express from 'express';
import { panggilOpenAI } from '../lib/openai.js';

const router = express.Router();

router.post('/parse', async (req, res) => {
  const { paragraf = '', now = new Date().toISOString(), timezone = 'Asia/Jakarta' } = req.body || {};
  try {
    const mentah = await panggilOpenAI([
      { role: 'system', content: `Kamu pemecah rencana Bahasa Indonesia menjadi tugas. Zona waktu pengguna ${timezone}, waktu sekarang ${now}. Aturan: pecah pada titik/koma/baris baru/"lalu"/"kemudian"; "jam 9 yang sudah lewat tanpa penanda hari = besok"; tanpa jam = +30 menit berantai dari tugas sebelumnya; urgensi: mendesak jika tenggat <=2 jam atau kata urgent/segera/penting/deadline/klien/darurat, sedang jika <=24 jam, selainnya santai. Balas HANYA JSON: {"tasks":[{"nama":string,"tenggat":string ISO 8601,"urgensi":"mendesak"|"sedang"|"santai"}]}.` },
      { role: 'user', content: paragraf },
    ]);
    const j = JSON.parse(mentah);
    return res.json({ tasks: j.tasks || [], mode: 'ai' });
  } catch {
    return res.json({ tasks: [], mode: 'lokal' });
  }
});

router.post('/chat', async (req, res) => {
  const { pesan = '', tasks = [] } = req.body || {};
  try {
    const mentah = await panggilOpenAI([
      { role: 'system', content: 'Kamu asisten jadwal TASKA, berbahasa Indonesia. Tugas aktif (JSON): ' + JSON.stringify(tasks) + '. Topik: prioritas/mana dulu (urut urgensi lalu tenggat, sebut tugas pertama + alasan + kedua + sisa), jadwal mepet (jarak < 45 menit), hari padat (>= 4 tugas/hari), tugas mendesak, ringkasan. Di luar topik: balas daftar kemampuan. Balas HANYA JSON: {"jawaban":string}.' },
      { role: 'user', content: pesan },
    ]);
    const j = JSON.parse(mentah);
    return res.json({ jawaban: j.jawaban || '', mode: 'ai' });
  } catch {
    return res.status(502).json({ jawaban: '', mode: 'lokal' });
  }
});

export default router;
