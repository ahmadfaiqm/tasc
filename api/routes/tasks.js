// api/routes/tasks.js
import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { wajibAuth } from '../lib/auth.js';
import { taskBuat, taskUbah } from '../lib/validasi.js';
import { tentukanUrgency, saranPriority } from '../lib/prioritas.js';
import { serialkanTask } from '../lib/normalisasi.js';

const REMINDER_MIN = 5;
const ZONA_DEFAULT = 'Asia/Jakarta';

// Offset menit vs UTC untuk zona yang dikenal (tanpa DST); tak dikenal -> default Asia/Jakarta (+7).
function offsetMenitZona(tz) {
  switch (String(tz ?? '')) {
    case 'Asia/Jakarta':
    case 'Asia/Pontianak':
      return 7 * 60;
    case 'Asia/Makassar':
      return 8 * 60;
    case 'Asia/Jayapura':
      return 9 * 60;
    case 'UTC':
    case 'Etc/UTC':
      return 0;
    default:
      return 7 * 60;
  }
}

// Gabung dueDate (@db.Date, kalender) + dueTime (@db.Time / 'HH:MM') sebagai jam dinding
// di zona user -> instan UTC. (gabungDue lama memperlakukan jam dinding sebagai UTC.)
function gabungDueZona(dueDate, dueTime, tz) {
  if (!dueDate || !dueTime) return null;
  const d = new Date(dueDate);
  if (Number.isNaN(d.getTime())) return null;
  let hh, mm;
  if (dueTime instanceof Date) {
    if (Number.isNaN(dueTime.getTime())) return null;
    hh = dueTime.getUTCHours();
    mm = dueTime.getUTCMinutes();
  } else {
    const m = String(dueTime).trim().match(/^(\d{1,2}):(\d{2})/);
    if (!m) return null;
    hh = Number(m[1]);
    mm = Number(m[2]);
    if (hh > 23 || mm > 59) return null;
  }
  const off = offsetMenitZona(tz ?? ZONA_DEFAULT);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hh, mm) - off * 60e3);
}

const r = Router();
r.use(wajibAuth);

function keDueDate(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00.000Z`) : new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function keDueTime(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(s)) return null;
  return new Date(`1970-01-01T${s}:00.000Z`);
}

function gabungDue(dueDate, dueTime) {
  if (!dueDate || !dueTime) return null;
  const d = new Date(dueDate);
  const t = new Date(dueTime);
  if (Number.isNaN(d.getTime()) || Number.isNaN(t.getTime())) return null;
  d.setUTCHours(t.getUTCHours(), t.getUTCMinutes(), 0, 0);
  return d;
}

function ambil(d, ...kunci) {
  for (const k of kunci) {
    if (d?.[k] !== undefined) return d[k];
  }
  return undefined;
}

function bangunCreate(body, now) {
  const parsed = taskBuat.safeParse(body);
  if (!parsed.success) return { error: parsed.error };
  const d = parsed.data;
  const title = d.title.trim();
  const dueDate = keDueDate(ambil(d, 'due_date', 'dueDate'));
  const dueTime = keDueTime(ambil(d, 'due_time', 'dueTime'));
  const timePrecision = ambil(d, 'time_precision', 'timePrecision') ?? 'UNSPECIFIED';
  const saran = saranPriority(title);
  const due = gabungDue(dueDate, dueTime) ?? dueDate;
  return {
    data: {
      title,
      description: d.description ?? null,
      sourceText: ambil(d, 'source_text', 'sourceText') ?? null,
      dueDate,
      dueTime,
      timePrecision,
      durationMinutes: ambil(d, 'duration_minutes', 'durationMinutes') ?? null,
      durationSource: ambil(d, 'duration_source') ?? null,
      urgency: d.urgency ?? tentukanUrgency(due, now),
      priority: d.priority ?? saran.priority,
      prioritySource: ambil(d, 'priority_source', 'prioritySource') ?? (d.priority ? 'USER' : saran.source),
      aiAssumption: ambil(d, 'ai_assumption', 'aiAssumption') ?? null,
    },
  };
}

// Sweep dulu agar 'sweep' tak tertangkap :id
r.post('/sweep', async (req, res) => {
  try {
    const now = new Date();
    const [user, setting] = await Promise.all([
      prisma.user.findUnique({ where: { id: req.userId }, select: { timezone: true } }).catch(() => null),
      prisma.notificationSetting.findUnique({ where: { userId: req.userId } }).catch(() => null),
    ]);
    const tz = user?.timezone ?? ZONA_DEFAULT;
    const menit = setting?.defaultReminderMinutes ?? REMINDER_MIN;
    const tasks = await prisma.task.findMany({
      where: { userId: req.userId, deletedAt: null, status: 'PENDING', dueDate: { not: null }, dueTime: { not: null } },
      select: { id: true, dueDate: true, dueTime: true },
    });
    let dibuat = 0;
    for (const t of tasks) {
      const due = gabungDueZona(t.dueDate, t.dueTime, tz);
      if (!due) continue;
      const reminderAt = new Date(due.getTime() - menit * 60e3);
      if (reminderAt > now) continue;
      const ada = await prisma.taskReminder.findFirst({
        where: { taskId: t.id, reminderAt, status: { in: ['PENDING', 'SENT'] } },
      });
      if (ada) continue;
      await prisma.taskReminder.create({ data: { taskId: t.id, reminderAt } });
      dibuat += 1;
    }
    const dikirim = await prisma.taskReminder.updateMany({
      where: { status: 'PENDING', reminderAt: { lte: now }, task: { userId: req.userId, deletedAt: null } },
      data: { status: 'SENT', sentAt: now },
    });
    return res.json({ dibuat, terkirim: dikirim.count });
  } catch (e) {
    return res.status(500).json({ error: 'sweep gagal' });
  }
});

r.get('/', async (req, res) => {
  try {
    const where = { userId: req.userId, deletedAt: null };
    if (req.query.status) where.status = String(req.query.status);
    if (req.query.date) {
      const d = keDueDate(String(req.query.date));
      if (d) where.dueDate = d;
    }
    const tasks = await prisma.task.findMany({ where, orderBy: { createdAt: 'desc' } });
    return res.json({ tasks: tasks.map(serialkanTask) });
  } catch {
    return res.status(500).json({ error: 'gagal memuat tasks' });
  }
});

r.post('/', async (req, res) => {
  const { data, error } = bangunCreate(req.body ?? {}, new Date());
  if (error) return res.status(400).json({ error: 'validasi gagal', detail: error.issues });
  try {
    const t = await prisma.task.create({ data: { ...data, userId: req.userId } });
    return res.status(201).json(serialkanTask(t));
  } catch {
    return res.status(500).json({ error: 'gagal membuat task' });
  }
});

r.get('/:id', async (req, res) => {
  try {
    const t = await prisma.task.findFirst({
      where: { id: req.params.id, userId: req.userId, deletedAt: null },
    });
    if (!t) return res.status(404).json({ error: 'task tidak ditemukan' });
    return res.json(serialkanTask(t));
  } catch {
    return res.status(500).json({ error: 'gagal memuat task' });
  }
});

r.patch('/:id', async (req, res) => {
  try {
    const lama = await prisma.task.findFirst({
      where: { id: req.params.id, userId: req.userId, deletedAt: null },
    });
    if (!lama) return res.status(404).json({ error: 'task tidak ditemukan' });
    if (lama.status !== 'PENDING') {
      return res.status(409).json({ error: 'task selesai/batal, gunakan reopen dulu' });
    }
    const parsed = taskUbah.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: 'validasi gagal', detail: parsed.error.issues });
    const d = parsed.data;
    const patch = {};
    if (d.title !== undefined) patch.title = d.title.trim();
    if (d.description !== undefined) patch.description = d.description;
    const st = ambil(d, 'source_text', 'sourceText');
    if (st !== undefined) patch.sourceText = st;
    const dd = ambil(d, 'due_date', 'dueDate');
    if (dd !== undefined) patch.dueDate = keDueDate(dd);
    const dt = ambil(d, 'due_time', 'dueTime');
    if (dt !== undefined) patch.dueTime = keDueTime(dt);
    const tp = ambil(d, 'time_precision', 'timePrecision');
    if (tp !== undefined) patch.timePrecision = tp;
    const dm = ambil(d, 'duration_minutes', 'durationMinutes');
    if (dm !== undefined) patch.durationMinutes = dm;
    const ds = ambil(d, 'duration_source');
    if (ds !== undefined) patch.durationSource = ds;
    if (d.urgency !== undefined) patch.urgency = d.urgency;
    if (d.priority !== undefined) patch.priority = d.priority;
    const ps = ambil(d, 'priority_source', 'prioritySource');
    if (ps !== undefined) patch.prioritySource = ps;
    const aa = ambil(d, 'ai_assumption', 'aiAssumption');
    if (aa !== undefined) patch.aiAssumption = aa;
    if (patch.dueDate !== undefined || patch.dueTime !== undefined) {
      const due = gabungDue(patch.dueDate ?? lama.dueDate, patch.dueTime ?? lama.dueTime) ?? patch.dueDate ?? lama.dueDate;
      if (d.urgency === undefined) patch.urgency = tentukanUrgency(due, new Date());
    }
    const t = await prisma.task.update({ where: { id: lama.id }, data: patch });
    return res.json(serialkanTask(t));
  } catch {
    return res.status(500).json({ error: 'gagal mengubah task' });
  }
});

r.delete('/:id', async (req, res) => {
  try {
    const lama = await prisma.task.findFirst({
      where: { id: req.params.id, userId: req.userId, deletedAt: null },
    });
    if (!lama) return res.status(404).json({ error: 'task tidak ditemukan' });
    const t = await prisma.task.update({ where: { id: lama.id }, data: { deletedAt: new Date() } });
    return res.json({ ok: true, deletedAt: t.deletedAt });
  } catch {
    return res.status(500).json({ error: 'gagal menghapus task' });
  }
});

r.post('/:id/complete', async (req, res) => {
  try {
    const lama = await prisma.task.findFirst({
      where: { id: req.params.id, userId: req.userId, deletedAt: null },
    });
    if (!lama) return res.status(404).json({ error: 'task tidak ditemukan' });
    if (lama.status === 'COMPLETED') return res.json(serialkanTask(lama));
    const t = await prisma.task.update({
      where: { id: lama.id },
      data: { status: 'COMPLETED', completedAt: new Date(), cancelledAt: null },
    });
    return res.json(serialkanTask(t));
  } catch {
    return res.status(500).json({ error: 'gagal menyelesaikan task' });
  }
});

r.post('/:id/cancel', async (req, res) => {
  try {
    const lama = await prisma.task.findFirst({
      where: { id: req.params.id, userId: req.userId, deletedAt: null },
    });
    if (!lama) return res.status(404).json({ error: 'task tidak ditemukan' });
    if (lama.status === 'CANCELLED') return res.json(serialkanTask(lama));
    const t = await prisma.task.update({
      where: { id: lama.id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });
    return res.json(serialkanTask(t));
  } catch {
    return res.status(500).json({ error: 'gagal membatalkan task' });
  }
});

r.post('/:id/reopen', async (req, res) => {
  try {
    const lama = await prisma.task.findFirst({
      where: { id: req.params.id, userId: req.userId, deletedAt: null },
    });
    if (!lama) return res.status(404).json({ error: 'task tidak ditemukan' });
    if (lama.status === 'PENDING') return res.json(serialkanTask(lama));
    const t = await prisma.task.update({
      where: { id: lama.id },
      data: { status: 'PENDING', completedAt: null, cancelledAt: null },
    });
    return res.json(serialkanTask(t));
  } catch {
    return res.status(500).json({ error: 'gagal membuka ulang task' });
  }
});

export default r;
