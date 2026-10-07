// api/routes/notifications.js — settings + subscribe.
import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { wajibAuth } from '../lib/auth.js';
import { settings } from '../lib/validasi.js';

const REMINDER_MIN = 5;

const r = Router();
r.use(wajibAuth);

const serial = (s) => ({
  enabled: s.enabled,
  default_reminder_minutes: s.defaultReminderMinutes,
});

r.get('/settings', async (req, res) => {
  try {
    let s = await prisma.notificationSetting.findUnique({ where: { userId: req.userId } });
    if (!s) {
      s = await prisma.notificationSetting.create({
        data: { userId: req.userId, enabled: false, defaultReminderMinutes: REMINDER_MIN },
      });
    }
    return res.json(serial(s));
  } catch {
    return res.status(500).json({ error: 'gagal memuat pengaturan' });
  }
});

r.patch('/settings', async (req, res) => {
  const parsed = settings.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: 'validasi gagal', detail: parsed.error.issues });
  const d = parsed.data;
  const data = {};
  if (d.enabled !== undefined) data.enabled = d.enabled;
  const mnt = d.default_reminder_minutes ?? d.defaultReminderMinutes;
  if (mnt !== undefined) data.defaultReminderMinutes = mnt;
  try {
    const s = await prisma.notificationSetting.upsert({
      where: { userId: req.userId },
      update: data,
      create: { userId: req.userId, enabled: data.enabled ?? false, defaultReminderMinutes: data.defaultReminderMinutes ?? REMINDER_MIN },
    });
    return res.json(serial(s));
  } catch {
    return res.status(500).json({ error: 'gagal menyimpan pengaturan' });
  }
});

r.post('/subscribe', async (req, res) => {
  const tipe = req.body?.notification_type ?? req.body?.notificationType ?? 'BROWSER';
  if (!['IN_APP', 'BROWSER', 'PUSH'].includes(tipe)) {
    return res.status(400).json({ error: 'tipe notifikasi tidak valid' });
  }
  try {
    const ada = await prisma.notificationSubscription.findFirst({
      where: { userId: req.userId, notificationType: tipe, active: true },
    });
    const s = ada
      ? await prisma.notificationSubscription.update({
          where: { id: ada.id },
          data: { endpoint: req.body?.endpoint ?? ada.endpoint, subscriptionData: req.body?.subscription_data ?? req.body?.subscriptionData ?? ada.subscriptionData },
        })
      : await prisma.notificationSubscription.create({
          data: {
            userId: req.userId,
            notificationType: tipe,
            endpoint: req.body?.endpoint ?? null,
            subscriptionData: req.body?.subscription_data ?? req.body?.subscriptionData ?? null,
          },
        });
    return res.status(201).json({ id: s.id, notification_type: s.notificationType, active: s.active });
  } catch {
    return res.status(500).json({ error: 'gagal menyimpan langganan' });
  }
});

export default r;
