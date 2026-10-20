// client/src/lib/api.test.js
import { describe, it, expect, vi } from 'vitest';
import { mintaParse } from './api.js';
describe('mintaParse JWT', () => {
  it('kirim Authorization bila ada token', async () => {
    let headers;
    vi.stubGlobal('fetch', (url, opt) => { headers = opt.headers; return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify({ sumber: 'lokal', tasks: [] })) }); });
    vi.stubGlobal('localStorage', { getItem: () => 'tok.test.sig' });
    await mintaParse('halo');
    expect(headers.Authorization).toMatch(/Bearer/);
    vi.unstubAllGlobals();
  });
});

describe('basisApi', () => {
  it('menghapus trailing slash dari VITE_API_URL', async () => {
    let url;
    vi.stubEnv('VITE_API_URL', 'http://localhost:3001/');
    vi.stubGlobal('fetch', (u) => { url = u; return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('{}') }); });
    vi.stubGlobal('localStorage', { getItem: () => '' });
    await mintaParse('halo');
    expect(url).toBe('http://localhost:3001/api/ai/parse');
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });
});
