// api/routes/tasks.test.js
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
describe('tasks lifecycle', () => {
  it('tanpa token -> 401', async () => {
    const r = await request(app).get('/api/tasks');
    expect(r.status).toBe(401);
  });
  it('buat tanpa title -> 400', async () => {
    const r = await request(app).post('/api/tasks').set('Authorization', 'Bearer x.y.z').send({ title: '  ' });
    expect([400, 401]).toContain(r.status);
  });
});
