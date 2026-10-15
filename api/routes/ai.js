// api/routes/ai.js — POST /parse (kandidat mutasi) + POST /chat (read-only).
import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { wajibAuth } from '../lib/auth.js';
import { chatMasuk } from '../lib/validasi.js';
import { panggilLLM } from '../lib/llmGratis.js';
import { normalisasiTugas } from '../lib/normalisasi.js';
import { gabungDueZona, ZONA_DEFAULT } from '../lib/zona.js';

const r = Router();
r.use(wajibAuth);

const PARAGRAF_MAX = 4000;

// Zona user best-effort untuk tafsir jam dinding.
async function zonaUser(userId) {
  try {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } });
    return u?.timezone ?? ZONA_DEFAULT;
  } catch {
    return ZONA_DEFAULT;
  }
}

r.post('/parse', async (req, res) => {
  const { paragraf } = req.body ?? {};
  if (!paragraf || !String(paragraf).trim()) return res.status(400).json({ error: 'paragraf wajib diisi' });
  if (String(paragraf).length > PARAGRAF_MAX) return res.status(400).json({ error: `paragraf maksimal ${PARAGRAF_MAX} karakter` });
  // Waktu server + zona dari profil: kiriman client (now/timezone) diabaikan
  // agar tak bisa memanipulasi resolusi tanggal LLM.
  const nowISO = new Date().toISOString();
  const tz = await zonaUser(req.userId);
  try {
    const mentah = await panggilLLM(String(paragraf), nowISO, tz);
    if (!mentah) return res.json({ sumber: 'lokal', tasks: [] });
    const tasks = normalisasiTugas(mentah, nowISO, tz);
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
      const tz = await zonaUser(req.userId).catch(() => ZONA_DEFAULT);
      const tasks = await prisma.task.findMany({
        where: { userId: req.userId, deletedAt: null, status: 'PENDING' },
        orderBy: { dueDate: 'asc' },
      });
      const lewat = tasks.filter((t) => {
        if (!t.dueDate) return false;
        const due = gabungDueZona(t.dueDate, t.dueTime ?? null, tz) ?? new Date(t.dueDate);
        return due < now;
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
