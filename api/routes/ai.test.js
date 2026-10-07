// api/routes/ai.test.js
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { normalisasiTugas } from '../lib/normalisasi.js';

const token = `a.${Buffer.from(JSON.stringify({ sub: '00000000-0000-0000-0000-000000000000' })).toString('base64')}.c`;
const auth = { Authorization: `Bearer ${token}` };
const nowISO = new Date('2026-10-07T08:00:00+07:00').toISOString();

describe('POST /api/ai/parse kontrak PRD', () => {
  it('tanpa token -> 401', async () => {
    const r = await request(app).post('/api/ai/parse').send({ paragraf: 'Besok beli sepatu' });
    expect(r.status).toBe(401);
  });
  it('paragraf kosong -> 400', async () => {
    const r = await request(app).post('/api/ai/parse').set(auth).send({ paragraf: '  ' });
    expect(r.status).toBe(400);
  });
  it('tanpa AI_KEY -> sumber lokal tasks kosong', async () => {
    const r = await request(app).post('/api/ai/parse').set(auth).send({ paragraf: 'Besok jam 4 sore beli sepatu', now: nowISO, timezone: 'Asia/Jakarta' });
    expect(r.status).toBe(200);
    expect(r.body.sumber).toBe('lokal');
    expect(r.body.tasks).toEqual([]);
  });
});

describe('POST /api/ai/chat read-only', () => {
  it('tanpa token -> 401', async () => {
    const r = await request(app).post('/api/ai/chat').send({ pesan: 'ringkas tugasku hari ini' });
    expect(r.status).toBe(401);
  });
  it('pesan kosong -> 400', async () => {
    const r = await request(app).post('/api/ai/chat').set(auth).send({ pesan: '  ' });
    expect(r.status).toBe(400);
  });
  it('menolak mutation dengan pesan preview', async () => {
    const r = await request(app).post('/api/ai/chat').set(auth).send({ pesan: 'hapus semua task saya' });
    expect(r.status).toBe(200);
    expect(JSON.stringify(r.body)).toMatch(/preview/i);
  });
});

describe('normalisasiTugas kontrak PRD', () => {
  it('tanpa jam -> due_time null UNSPECIFIED, tanpa mengarang jam', () => {
    const r = normalisasiTugas([{ title: 'Beli sepatu', due_date: '2026-10-08' }], nowISO);
    expect(r).toHaveLength(1);
    expect(r[0].due_time).toBeNull();
    expect(r[0].time_precision).toBe('UNSPECIFIED');
  });
  it('jam valid dipertahankan, urgency/priority dihitung server', () => {
    const r = normalisasiTugas([{ title: 'Kumpulkan skripsi deadline', due_date: '2026-10-08', due_time: '16:00', time_precision: 'EXACT' }], nowISO);
    expect(r[0].due_time).toBe('16:00');
    expect(r[0].time_precision).toBe('EXACT');
    expect(r[0].priority).toBe('HIGH');
    expect(['URGENT', 'NORMAL', 'LOW']).toContain(r[0].urgency);
  });
  it('title kosong dibuang, jam invalid -> null', () => {
    const r = normalisasiTugas([{ title: '  ' }, { title: 'Rapat', due_time: '99:99' }], nowISO);
    expect(r).toHaveLength(1);
    expect(r[0].due_time).toBeNull();
  });
});
