// api/routes/history.js — agregasi month->day->status. Overdue dihitung, bukan status.
import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { wajibAuth } from '../lib/auth.js';
import { gabungDueZona, ZONA_DEFAULT } from '../lib/zona.js';

const r = Router();
r.use(wajibAuth);

function gabungDue(dueDate, dueTime, tz) {
  return gabungDueZona(dueDate, dueTime, tz ?? ZONA_DEFAULT);
}

function ringkas(tasks, now, tz) {
  let completed = 0, cancelled = 0, overdue = 0, urgent = 0;
  const byDay = {};
  for (const t of tasks) {
    if (t.status === 'COMPLETED') completed += 1;
    if (t.status === 'CANCELLED') cancelled += 1;
    if (t.status === 'PENDING') {
      const due = gabungDue(t.dueDate, t.dueTime, tz);
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
  const [user, tasks] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } }).catch(() => null),
    prisma.task.findMany({
      where: {
        userId,
        deletedAt: null,
        OR: [
          { dueDate: { gte: awal, lt: akhir } },
          { dueDate: null, createdAt: { gte: awal, lt: akhir } },
        ],
      },
    }),
  ]);
  return ringkas(tasks, new Date(), user?.timezone ?? ZONA_DEFAULT);
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
