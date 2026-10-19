import { describe, it, expect } from 'vitest';
import { hariTanggal } from './tanggal.js';

describe('hariTanggal', () => {
  it('menampilkan nama hari + tanggal dari YYYY-MM-DD', () => {
    expect(hariTanggal('2026-10-19')).toBe('Senin, 19 Okt 2026');
  });
  it('kosong / bukan format tanggal -> string kosong', () => {
    expect(hariTanggal('')).toBe('');
    expect(hariTanggal(null)).toBe('');
    expect(hariTanggal('besok')).toBe('');
  });
  it('tanggal kalender tidak valid (rollover) -> string kosong', () => {
    expect(hariTanggal('2026-02-30')).toBe('');
  });
});
