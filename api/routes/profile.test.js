import { describe, it, expect, vi, afterEach } from 'vitest';
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

function buatToken(sub) {
  const h = b64url({ alg: 'HS256', typ: 'JWT' });
  const p = b64url({ sub });
  return `${h}.${p}.c2lnbmF0dXJlLWFjYWstZml4dG5t`;
}

describe('profile', () => {
  it('tanpa token -> 401', async () => {
    const r = await request(app).get('/api/profile');
    expect(r.status).toBe(401);
  });
  it('GET profil ada -> 200 serial', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({ id: 'user-a', email: 'a@mail.com', name: 'Budi', aiConsent: true, timezone: 'Asia/Jakarta' });
    const r = await request(app).get('/api/profile').set('Authorization', `Bearer ${buatToken('user-a')}`);
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ id: 'user-a', email: 'a@mail.com', nama: 'Budi', aiConsent: true, timezone: 'Asia/Jakarta' });
  });
  it('GET profil belum ada -> 404', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
    const r = await request(app).get('/api/profile').set('Authorization', `Bearer ${buatToken('user-a')}`);
    expect(r.status).toBe(404);
  });
  it('PATCH nama 1 karakter -> 400', async () => {
    const r = await request(app).patch('/api/profile').set('Authorization', `Bearer ${buatToken('user-a')}`).send({ nama: 'A', aiConsent: true });
    expect(r.status).toBe(400);
  });
  it('PATCH profil baru tanpa email -> 400', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
    const r = await request(app).patch('/api/profile').set('Authorization', `Bearer ${buatToken('user-a')}`).send({ nama: 'Budi', aiConsent: true });
    expect(r.status).toBe(400);
  });
  it('PATCH valid -> upsert milik sendiri -> 200', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
    const upsert = vi.spyOn(prisma.user, 'upsert').mockResolvedValue({ id: 'user-a', email: 'a@mail.com', name: 'Budi', aiConsent: true, timezone: 'Asia/Jakarta' });
    const r = await request(app).patch('/api/profile').set('Authorization', `Bearer ${buatToken('user-a')}`).send({ nama: 'Budi', aiConsent: true, email: 'a@mail.com' });
    expect(r.status).toBe(200);
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'user-a' } }));
    expect(r.body.nama).toBe('Budi');
  });
});
