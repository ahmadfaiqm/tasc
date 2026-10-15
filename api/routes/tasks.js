// api/routes/tasks.js
import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { wajibAuth } from '../lib/auth.js';
import { taskBuat, taskUbah } from '../lib/validasi.js';
import { tentukanUrgency, saranPriority } from '../lib/prioritas.js';
import { serialkanTask } from '../lib/normalisasi.js';
import { gabungDueZona, ZONA_DEFAULT } from '../lib/zona.js';

const REMINDER_MIN = 5;

const r = Router();
r.use(wajibAuth);

// Zona user untuk tafsir jam dinding (best-effort; default bila profil belum ada).
async function zonaUser(userId) {
  try {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } });
    return u?.timezone ?? ZONA_DEFAULT;
  } catch {
    return ZONA_DEFAULT;
  }
}

// due_date hanya menerima 'YYYY-MM-DD' kalender valid (tolak rollover
// seperti 2026-02-30 dan string bebas seperti 'besok'). Kembalikan tri-state:
// { status: 'kosong' } bila null/undefined/'' (tidak diisi / hapus),
// { status: 'valid', value: Date }, atau { status: 'invalid' } -> 400.
function tanggalKalenderValid(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return dt;
}

function keDueDate(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  return tanggalKalenderValid(s);
}

function keDueDateKetat(v) {
  if (v === undefined || v === null) return { status: 'kosong', value: null };
  const s = String(v).trim();
  if (!s) return { status: 'kosong', value: null };
  const d = tanggalKalenderValid(s);
  if (!d) return { status: 'invalid' };
  return { status: 'valid', value: d };
}

const GALAT_TANGGAL = [{ path: ['due_date'], message: 'due_date harus YYYY-MM-DD kalender valid', code: 'custom' }];

function keDueTime(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(s)) return null;
  return new Date(`1970-01-01T${s}:00.000Z`);
}

// Jam dinding di zona user -> instan UTC (dulu memperlakukan jam dinding sebagai UTC,
// selisih s.d. 7 jam vs sweep).
function gabungDue(dueDate, dueTime, tz) {
  return gabungDueZona(dueDate, dueTime, tz ?? ZONA_DEFAULT);
}

function ambil(d, ...kunci) {
  for (const k of kunci) {
    if (d?.[k] !== undefined) return d[k];
  }
  return undefined;
}

function bangunCreate(body, now, tz) {
  const parsed = taskBuat.safeParse(body);
  if (!parsed.success) return { error: parsed.error };
  const d = parsed.data;
  const title = d.title.trim();
  const ddMentah = ambil(d, 'due_date', 'dueDate');
  const ddCek = keDueDateKetat(ddMentah);
  if (ddCek.status === 'invalid') return { error: { issues: GALAT_TANGGAL } };
  const dueDate = ddCek.value;
  const dueTime = keDueTime(ambil(d, 'due_time', 'dueTime'));
  const timePrecision = ambil(d, 'time_precision', 'timePrecision') ?? 'UNSPECIFIED';
  const saran = saranPriority(title);
  const due = gabungDue(dueDate, dueTime, tz) ?? dueDate;
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
    // Notifikasi dimatikan -> jangan buat/macem penanda terkirim.
    if (setting && setting.enabled === false) {
      return res.json({ dibuat: 0, terkirim: 0 });
    }
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
    // Server tidak punya kanal kirim (push = P1): yang jatuh tempo tetap PENDING
    // agar tidak diklaim terkirim. Konsumen masa depan yang mengirim bertugas
    // menandai SENT; di sini kembalikan terkirim: 0 dengan jujur.
    return res.json({ dibuat, terkirim: 0 });
  } catch (e) {
    return res.status(500).json({ error: 'sweep gagal' });
  }
});

r.get('/', async (req, res) => {
  try {
    const where = { userId: req.userId, deletedAt: null };
    if (req.query.status) {
      const st = String(req.query.status);
      if (!['PENDING', 'COMPLETED', 'CANCELLED'].includes(st)) {
        return res.status(400).json({ error: 'status tidak valid' });
      }
      where.status = st;
    }
    if (req.query.date) {
      const cek = keDueDateKetat(String(req.query.date));
      if (cek.status === 'invalid') return res.status(400).json({ error: 'query date harus YYYY-MM-DD kalender valid' });
      if (cek.value) where.dueDate = cek.value;
    }
    const tasks = await prisma.task.findMany({ where, orderBy: { createdAt: 'desc' }, take: 500 });
    return res.json({ tasks: tasks.map(serialkanTask) });
  } catch {
    return res.status(500).json({ error: 'gagal memuat tasks' });
  }
});

r.post('/', async (req, res) => {
  const { data, error } = bangunCreate(req.body ?? {}, new Date(), await zonaUser(req.userId));
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
    if (dd !== undefined) {
      const cek = keDueDateKetat(dd);
      if (cek.status === 'invalid') return res.status(400).json({ error: 'due_date harus YYYY-MM-DD kalender valid' });
      patch.dueDate = cek.value;
    }
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
      const tz = await zonaUser(req.userId);
      const due = gabungDue(patch.dueDate ?? lama.dueDate, patch.dueTime ?? lama.dueTime, tz) ?? patch.dueDate ?? lama.dueDate;
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
