import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';

describe('GET /api/cron/cleanup', () => {
  it('401 tanpa secret', async () => {
    const r = await request(app).get('/api/cron/cleanup');
    expect(r.status).toBe(401);
  });
  it('200 dengan secret walau tanpa env supabase', async () => {
    process.env.CRON_SECRET = 's3cret';
    const r = await request(app).get('/api/cron/cleanup').set('Authorization', 'Bearer s3cret');
    expect(r.body).toEqual({ dihapus: 0 });
    delete process.env.CRON_SECRET;
  });
});
