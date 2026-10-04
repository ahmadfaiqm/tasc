import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';

describe('POST /api/push/subscribe', () => {
  it('toleran tanpa env (tersimpan:false tapi ok)', async () => {
    const r = await request(app).post('/api/push/subscribe').send({ subscription: { a: 1 } });
    expect(r.status).toBe(200);
    expect(r.body.ok).toBe(true);
  });
  it('401 untuk token palsu saat env ada', async () => {
    process.env.SUPABASE_URL = 'x';
    process.env.SUPABASE_SERVICE_KEY = 'y';
    try {
      const r = await request(app).post('/api/push/subscribe')
        .set('Authorization', 'Bearer xxx.invalid')
        .send({ subscription: { a: 1 } });
      expect(r.status).toBe(401);
    } finally {
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_KEY;
    }
  });
});
