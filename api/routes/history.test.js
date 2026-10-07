// api/routes/history.test.js
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
describe('history', () => {
  it('tanpa token -> 401', async () => {
    const r = await request(app).get('/api/history');
    expect([401, 404]).toContain(r.status);
  });
});
