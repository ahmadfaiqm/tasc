import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../lib/openai.js', () => ({ panggilOpenAI: vi.fn() }));

import { panggilOpenAI } from '../lib/openai.js';
import app from '../app.js';

beforeEach(() => vi.resetAllMocks());

describe('GET /api/health', () => {
  it('ok', async () => {
    const r = await request(app).get('/api/health');
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ ok: true });
  });
});

describe('POST /api/ai/parse', () => {
  it('mode ai saat OpenAI sukses', async () => {
    panggilOpenAI.mockResolvedValueOnce(JSON.stringify({ tasks: [{ nama: 'Rapat', tenggat: '2026-10-05T02:00:00.000Z', urgensi: 'mendesak' }] }));
    const r = await request(app).post('/api/ai/parse').send({ paragraf: 'Rapat jam 9', now: '2026-10-04T07:00:00.000Z', timezone: 'Asia/Jakarta' });
    expect(r.status).toBe(200);
    expect(r.body.mode).toBe('ai');
    expect(r.body.tasks[0].nama).toBe('Rapat');
  });
  it('mode lokal saat OpenAI gagal', async () => {
    panggilOpenAI.mockRejectedValueOnce(new Error('mati'));
    const r = await request(app).post('/api/ai/parse').send({ paragraf: 'x', now: '2026-10-04T07:00:00.000Z', timezone: 'Asia/Jakarta' });
    expect(r.status).toBe(200);
    expect(r.body.mode).toBe('lokal');
    expect(r.body.tasks).toEqual([]);
  });
});

describe('POST /api/ai/chat', () => {
  it('jawab dari OpenAI', async () => {
    panggilOpenAI.mockResolvedValueOnce(JSON.stringify({ jawaban: 'Kerjakan A dulu.' }));
    const r = await request(app).post('/api/ai/chat').send({ pesan: 'mana dulu?', tasks: [] });
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ jawaban: 'Kerjakan A dulu.', mode: 'ai' });
  });
  it('502 saat OpenAI gagal agar client fallback', async () => {
    panggilOpenAI.mockRejectedValueOnce(new Error('mati'));
    const r = await request(app).post('/api/ai/chat').send({ pesan: 'mana dulu?', tasks: [] });
    expect(r.status).toBe(502);
    expect(r.body.mode).toBe('lokal');
  });
});
