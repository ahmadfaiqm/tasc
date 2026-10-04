import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseParagraf, kirimChat } from './api.js';

afterEach(() => vi.unstubAllGlobals());

describe('parseParagraf', () => {
  it('pakai server bila sukses', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, json: async () => ({ tasks: [{ nama: 'Rapat', tenggat: '2026-10-05T02:00:00.000Z', urgensi: 'mendesak' }], mode: 'ai' }),
    })));
    const r = await parseParagraf('Rapat jam 9');
    expect(r.mode).toBe('ai');
    expect(r.tasks[0].nama).toBe('Rapat');
    expect(r.tasks[0].id).toBeTruthy();
    expect(r.tasks[0].selesai).toBe(false);
  });
  it('fallback lokal bila server mati', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('mati'); }));
    const r = await parseParagraf('Rapat jam 9 malam');
    expect(r.mode).toBe('lokal');
    expect(r.tasks.length).toBe(1);
    expect(r.tasks[0].urgensi).toMatch(/mendesak|sedang|santai/);
  });
  it('paksaLokal langsung lokal tanpa fetch', async () => {
    const spy = vi.fn(async () => { throw new Error('tidak boleh dipanggil'); });
    vi.stubGlobal('fetch', spy);
    const r = await parseParagraf('Rapat jam 9 malam', true);
    expect(r.mode).toBe('lokal');
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('kirimChat', () => {
  it('fallback lokal bila server mati', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500 })));
    const r = await kirimChat('mana yang dulu?', []);
    expect(r.mode).toBe('lokal');
    expect(r.jawaban).toMatch(/Belum ada tugas/i);
  });
  it('fallback lokal bila server jawab mode lokal', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ jawaban: '', mode: 'lokal' }) })));
    const r = await kirimChat('mana yang dulu?', []);
    expect(r.mode).toBe('lokal');
    expect(r.jawaban).toMatch(/Belum ada tugas/i);
  });
});
