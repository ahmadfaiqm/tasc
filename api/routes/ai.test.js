import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
describe('POST /api/ai/parse', () => {
  it('tanpa AI_KEY balikan lokal kosong', async () => {
    const r = await request(app).post('/api/ai/parse').send({ paragraf: 'Rapat jam 9', now: new Date().toISOString(), timezone: 'Asia/Jakarta' });
    expect(r.status).toBe(200);
    expect(r.body.sumber).toBe('lokal');
    expect(r.body.tugas).toEqual([]);
  });
  it('validasi paragraf kosong', async () => {
    const r = await request(app).post('/api/ai/parse').send({ paragraf: '  ', now: new Date().toISOString() });
    expect(r.status).toBe(400);
  });
});
