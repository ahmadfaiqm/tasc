// api/lib/prisma.test.js
import { describe, it, expect } from 'vitest';
import prisma from './prisma.js';
import { wajibAuth } from './auth.js';
describe('prisma wiring', () => {
  it('prisma client tersedia', () => {
    expect(prisma.task.findMany).toBeTypeOf('function');
  });
  it('auth menolak tanpa token', () => {
    const req = { headers: {} };
    const res = { status: (c) => ({ json: (b) => ({ c, b }) }) };
    let next = false;
    wajibAuth(req, res, () => { next = true; });
    expect(next).toBe(false);
  });
});
