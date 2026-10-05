// client/src/lib/parserAturan.test.js
import { describe, it, expect } from 'vitest';
import { parseParagraf, tentukanUrgensi, saranUrutan } from './parserAturan.js';
const now = new Date('2026-10-05T08:00:00+07:00');
describe('parseParagraf', () => {
  it('jam absolut + relatif + besok', () => {
    const r = parseParagraf('Rapat jam 9, lalu kirim laporan 30 menit lagi. Besok apel pukul 07.30', now);
    expect(r).toHaveLength(3);
    expect(r[0].nama).toMatch(/Rapat/i);
    expect(r[0].tenggat.getHours()).toBe(9);
    expect(r[1].tenggat.getTime() - r[0].tenggat.getTime()).toBeGreaterThan(0);
    expect(r[2].tenggat.getDate()).not.toBe(now.getDate());
  });
  it('jam lewat hari ini menjadi besok', () => {
    const r = parseParagraf('Sarapan jam 6', new Date('2026-10-05T08:00:00+07:00'));
    expect(r[0].tenggat.getDate()).toBe(6);
  });
  it('tanpa jam berantai +30 menit', () => {
    const r = parseParagraf('Belanja. Masak. Jemur', now);
    expect(r).toHaveLength(3);
    expect(r[1].tenggat.getTime() - r[0].tenggat.getTime()).toBe(30 * 60 * 1000);
  });
});
describe('urgensi', () => {
  it('2 jam atau kata kunci = Mendesak', () => {
    expect(tentukanUrgensi(new Date(now.getTime() + 60 * 60 * 1000), now, 'biasa')).toBe('Mendesak');
    expect(tentukanUrgensi(new Date(now.getTime() + 5 * 864e5), now, 'deadline klien')).toBe('Mendesak');
    expect(tentukanUrgensi(new Date(now.getTime() + 5 * 3600e3), now, 'biasa')).toBe('Sedang');
    expect(tentukanUrgensi(new Date(now.getTime() + 5 * 864e5), now, 'biasa')).toBe('Santai');
  });
});
describe('saran', () => {
  it('urut urgensi lalu tenggat', () => {
    const s = saranUrutan([
      { nama: 'B', tenggat: new Date(now.getTime() + 9 * 3600e3), urgensi: 'Santai' },
      { nama: 'A', tenggat: new Date(now.getTime() + 3600e3), urgensi: 'Mendesak' }
    ], now);
    expect(s.pertama).toBe('A');
  });
});
