// api/routes/history.js — agregasi month->day->status. Overdue dihitung, bukan status.
import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { wajibAuth } from '../lib/auth.js';
import { formatJam } from '../lib/normalisasi.js';

const r = Router();
r.use(wajibAuth);

function gabungDue(dueDate, dueTime) {
  if (!dueDate) return null;
  const d = new Date(dueDate);
  if (Number.isNaN(d.getTime())) return null;
  const jam = formatJam(dueTime);
  if (jam) d.setUTCHours(Number(jam.slice(0, 2)), Number(jam.slice(3, 5)), 0, 0);
  return d;
}

function ringkas(tasks, now) {
  let completed = 0, cancelled = 0, overdue = 0, urgent = 0;
  const byDay = {};
  for (const t of tasks) {
    if (t.status === 'COMPLETED') completed += 1;
    if (t.status === 'CANCELLED') cancelled += 1;
    if (t.status === 'PENDING') {
      const due = gabungDue(t.dueDate, t.dueTime);
      if (due && due < now) overdue += 1;
    }
    if (t.urgency === 'URGENT') urgent += 1;
    // byDay hanya untuk yang bertanggal; tanpa dueDate tetap dihitung di total (bukan overdue).
    if (!t.dueDate) continue;
    const kunci = new Date(t.dueDate).toISOString().slice(0, 10);
    byDay[kunci] = (byDay[kunci] ?? 0) + 1;
  }
  const total = tasks.length;
  return {
    total,
    completed,
    overdue,
    cancelled,
    completion_rate: total ? completed / total : 0,
    urgent,
    byDay,
  };
}

async function historiBulan(userId, year, month) {
  const awal = new Date(Date.UTC(year, month - 1, 1));
  const akhir = new Date(Date.UTC(year, month, 1));
  const tasks = await prisma.task.findMany({
    where: {
      userId,
      deletedAt: null,
      OR: [
        { dueDate: { gte: awal, lt: akhir } },
        { dueDate: null, createdAt: { gte: awal, lt: akhir } },
      ],
    },
  });
  return ringkas(tasks, new Date());
}

r.get('/', async (req, res) => {
  try {
    const now = new Date();
    return res.json(await historiBulan(req.userId, now.getUTCFullYear(), now.getUTCMonth() + 1));
  } catch {
    return res.status(500).json({ error: 'gagal memuat history' });
  }
});

r.get('/:year/:month', async (req, res) => {
  const year = Number(req.params.year);
  const month = Number(req.params.month);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return res.status(400).json({ error: 'bulan tidak valid' });
  }
  try {
    return res.json(await historiBulan(req.userId, year, month));
  } catch {
    return res.status(500).json({ error: 'gagal memuat history' });
  }
});

export default r;
