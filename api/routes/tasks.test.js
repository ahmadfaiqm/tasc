// api/routes/tasks.test.js
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createHmac } from 'node:crypto';
import request from 'supertest';
import app from '../app.js';
import prisma from '../lib/prisma.js';

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.SUPABASE_JWT_SECRET;
});

function b64url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function buatToken(sub, secret, palsu = false) {
  const h = b64url({ alg: 'HS256', typ: 'JWT' });
  const p = b64url({ sub });
  const sig = palsu
    ? 'c2lnbmF0dXJlLWFjYWstZml4dG5t'
    : createHmac('sha256', secret).update(`${h}.${p}`).digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${h}.${p}.${sig}`;
}

describe('tasks lifecycle', () => {
  it('tanpa token -> 401', async () => {
    const r = await request(app).get('/api/tasks');
    expect(r.status).toBe(401);
  });
  it('buat tanpa title -> 400', async () => {
    const r = await request(app).post('/api/tasks').set('Authorization', 'Bearer x.y.z').send({ title: '  ' });
    expect([400, 401]).toContain(r.status);
  });
  it('token palsu (signature acak, sub valid) -> 401 saat secret di-set; valid -> lolos auth', async () => {
    process.env.SUPABASE_JWT_SECRET = 'rahasia-uji-lokal-bukan-prod';
    try {
      const palsu = await request(app).post('/api/tasks')
        .set('Authorization', `Bearer ${buatToken('user-a', process.env.SUPABASE_JWT_SECRET, true)}`)
        .send({ title: '  ' });
      expect(palsu.status).toBe(401);
      const valid = await request(app).post('/api/tasks')
        .set('Authorization', `Bearer ${buatToken('user-a', process.env.SUPABASE_JWT_SECRET)}`)
        .send({ title: '  ' });
      expect(valid.status).toBe(400);
    } finally {
      delete process.env.SUPABASE_JWT_SECRET;
    }
  });
  it('tanpa secret -> perilaku lama (decode payload saja)', async () => {
    delete process.env.SUPABASE_JWT_SECRET;
    const r = await request(app).post('/api/tasks')
      .set('Authorization', `Bearer ${buatToken('user-a', 'apapun', true)}`)
      .send({ title: '  ' });
    expect(r.status).toBe(400);
  });
  it('lintas-user: findFirst milik B tak temukan untuk A -> 404', async () => {
    vi.spyOn(prisma.task, 'findFirst').mockResolvedValue(null);
    const r = await request(app).get('/api/tasks/milik-b')
      .set('Authorization', `Bearer ${buatToken('user-a', 'x', true)}`);
    expect(r.status).toBe(404);
  });
  it('complete idempoten: sudah COMPLETED -> 200 sama tanpa update', async () => {
    const lama = { id: 't1', userId: 'user-a', status: 'COMPLETED', dueDate: new Date('2026-01-05T00:00:00.000Z'), dueTime: new Date('1970-01-01T09:00:00.000Z') };
    vi.spyOn(prisma.task, 'findFirst').mockResolvedValue(lama);
    const update = vi.spyOn(prisma.task, 'update').mockResolvedValue(lama);
    const r = await request(app).post('/api/tasks/t1/complete')
      .set('Authorization', `Bearer ${buatToken('user-a', 'x', true)}`);
    expect(r.status).toBe(200);
    expect(r.body.status).toBe('COMPLETED');
    expect(r.body.dueTime).toBe('09:00');
    expect(update).not.toHaveBeenCalled();
  });
  it('sweep idempoten: reminder PENDING yang sama tak digandakan', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({ timezone: 'Asia/Jakarta' });
    vi.spyOn(prisma.notificationSetting, 'findUnique').mockResolvedValue({ defaultReminderMinutes: 5 });
    vi.spyOn(prisma.task, 'findMany').mockResolvedValue([
      { id: 't1', dueDate: new Date('2026-01-05T00:00:00.000Z'), dueTime: new Date('1970-01-01T09:00:00.000Z') },
    ]);
    vi.spyOn(prisma.taskReminder, 'findFirst').mockResolvedValue({ id: 'r1', status: 'PENDING' });
    const create = vi.spyOn(prisma.taskReminder, 'create').mockResolvedValue({ id: 'r1' });
    vi.spyOn(prisma.taskReminder, 'updateMany').mockResolvedValue({ count: 0 });
    const r = await request(app).post('/api/tasks/sweep')
      .set('Authorization', `Bearer ${buatToken('user-a', 'x', true)}`);
    expect(r.status).toBe(200);
    expect(r.body.dibuat).toBe(0);
    expect(create).not.toHaveBeenCalled();
  });
});
