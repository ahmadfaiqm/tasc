// api/routes/ai.js — POST /parse (kandidat mutasi) + POST /chat (read-only).
import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { wajibAuth } from '../lib/auth.js';
import { chatMasuk } from '../lib/validasi.js';
import { panggilLLM } from '../lib/llmGratis.js';
import { normalisasiTugas, formatJam } from '../lib/normalisasi.js';

const r = Router();
r.use(wajibAuth);

r.post('/parse', async (req, res) => {
  const { paragraf, now, timezone } = req.body ?? {};
  if (!paragraf || !String(paragraf).trim()) return res.status(400).json({ error: 'paragraf wajib diisi' });
  const nowISO = now ?? new Date().toISOString();
  const tz = timezone ?? 'Asia/Jakarta';
  try {
    const mentah = await panggilLLM(String(paragraf), nowISO, tz);
    if (!mentah) return res.json({ sumber: 'lokal', tasks: [] });
    const tasks = normalisasiTugas(mentah, nowISO);
    try {
      await prisma.aiInteraction.create({
        data: {
          userId: req.userId,
          interactionType: 'TASK_PARSING',
          inputText: String(paragraf),
          responseText: JSON.stringify(tasks),
        },
      });
    } catch { /* audit best-effort, jangan gagalkan parse */ }
    return res.json({ sumber: 'ai', tasks });
  } catch { return res.json({ sumber: 'lokal', tasks: [] }); }
});

// Kata kerja mutasi -> tolak, arahkan ke preview (chat read-only P0).
const POLA_MUTASI = [
  /tambah/i, /buat/i, /bikin/i, /tambahkan/i, /buatkan/i,
  /ubah/i, /ganti/i, /edit/i, /perbarui/i,
  /hapus/i, /hilangkan/i, /delete/i, /remove/i,
  /selesaikan/i, /tandai/i, /centang/i, /complete/i,
  /batal/i, /tunda/i, /cancel/i,
  /jadwalkan/i, /ingatkan/i, /ingatk/i, /atur pengingat/i,
];
const PESAN_TOLAK = 'Asisten hanya bisa membaca. Gunakan preview untuk mengubah, menambah, atau menghapus task.';

r.post('/chat', async (req, res) => {
  const parsed = chatMasuk.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: 'pesan wajib diisi', detail: parsed.error.issues });
  const pesan = parsed.data.pesan;
  if (POLA_MUTASI.some((p) => p.test(pesan))) {
    return res.json({ jawaban: PESAN_TOLAK, tindakan: 'ditolak', alasan: 'chat read-only: mutasi lewat preview' });
  }
  try {
    const bawah = pesan.toLowerCase();
    const now = new Date();
    if (/terlambat|lewat|overdue|tunggak/.test(bawah)) {
      const tasks = await prisma.task.findMany({
        where: { userId: req.userId, deletedAt: null, status: 'PENDING' },
        orderBy: { dueDate: 'asc' },
      });
      const lewat = tasks.filter((t) => {
        if (!t.dueDate) return false;
        const d = new Date(t.dueDate);
        if (t.dueTime) {
          const jam = formatJam(t.dueTime);
          if (jam) d.setUTCHours(Number(jam.slice(0, 2)), Number(jam.slice(3, 5)), 0, 0);
        }
        return d < now;
      });
      const daftar = lewat.map((t) => `- ${t.title}`).join('\n') || '(tidak ada)';
      return res.json({ jawaban: `Task terlambat (${lewat.length}):\n${daftar}`, jumlah: lewat.length });
    }
    if (/ringkas|ringkasan|summary|hari ini/.test(bawah)) {
      const [pending, selesai] = await Promise.all([
        prisma.task.count({ where: { userId: req.userId, deletedAt: null, status: 'PENDING' } }),
        prisma.task.count({ where: { userId: req.userId, deletedAt: null, status: 'COMPLETED' } }),
      ]);
      return res.json({ jawaban: `Ringkasan: ${pending} menunggu, ${selesai} selesai.`, menunggu: pending, selesai });
    }
    const tasks = await prisma.task.findMany({
      where: { userId: req.userId, deletedAt: null, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    const daftar = tasks.map((t) => `- ${t.title}`).join('\n') || '(tidak ada task menunggu)';
    return res.json({ jawaban: `Task menunggu (${tasks.length}):\n${daftar}`, jumlah: tasks.length });
  } catch {
    return res.status(500).json({ error: 'chat gagal' });
  }
});

export default r;
