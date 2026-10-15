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
