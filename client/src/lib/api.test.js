// client/src/lib/api.test.js
import { describe, it, expect, vi } from 'vitest';
import { mintaParse } from './api.js';
describe('mintaParse', () => {
  it('lempar saat server tidak bisa dihubungi', async () => {
    vi.stubGlobal('fetch', () => Promise.reject(new Error('off')));
    await expect(mintaParse('halo')).rejects.toThrow();
    vi.unstubAllGlobals();
  });
});
