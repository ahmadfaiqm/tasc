import { describe, it, expect } from 'vitest';
import { tentukanUrgensi, urutkanSaran, jawabLokal } from './parserAturan.js';

const NOW = new Date('2026-10-04T07:00:00.000Z').getTime();
const iso = (ms) => new Date(ms).toISOString();
const T = (nama, jam, urgensi = 'santai', selesai = false) => ({
  id: nama, nama, tenggat: iso(NOW + jam * 3600000), urgensi, selesai, reminded: false,
  created_at: iso(NOW), updated_at: iso(NOW),
});

describe('tentukanUrgensi', () => {
  it('mendesak bila <= 2 jam', () => {
    expect(tentukanUrgensi('Rapat', NOW + 3600000, NOW)).toBe('mendesak');
  });
  it('mendesak bila ada kata kunci walau jauh', () => {
    expect(tentukanUrgensi('Kirim ke klien', NOW + 72 * 3600000, NOW)).toBe('mendesak');
  });
  it('sedang bila <= 24 jam, santai selebihnya', () => {
    expect(tentukanUrgensi('Belajar', NOW + 5 * 3600000, NOW)).toBe('sedang');
    expect(tentukanUrgensi('Baca buku', NOW + 72 * 3600000, NOW)).toBe('santai');
  });
});

describe('urutkanSaran', () => {
  it('urgensi dulu lalu tenggat terdekat, tidak mutasi input', () => {
    const a = T('A jauh sedang', 20, 'sedang');
    const b = T('B dekat santai', 1, 'santai');
    const c = T('C jauh mendesak', 50, 'mendesak');
    const asal = [a, b, c];
    const out = urutkanSaran(asal, NOW);
    expect(out.map((t) => t.nama)).toEqual(['C jauh mendesak', 'A jauh sedang', 'B dekat santai']);
    expect(asal[0].nama).toBe('A jauh sedang');
  });
});

describe('jawabLokal', () => {
  it('prioritas menyebut tugas pertama + alasan + sisa', () => {
    const tasks = [T('Kirim deadline klien', 1, 'mendesak'), T('Belajar', 5, 'sedang'), T('Baca', 50, 'santai')];
    const j = jawabLokal('mana yang dikerjakan dulu?', tasks, NOW);
    expect(j).toMatch(/Kirim deadline klien/);
    expect(j).toMatch(/1 tugas lain/);
  });
  it('jadwal mepet terdeteksi < 45 menit', () => {
    const tasks = [T('A', 1), T('B', 1.5)];
    expect(jawabLokal('apakah jadwal saya mepet?', tasks, NOW)).toMatch(/mepet/i);
  });
  it('luar topik mengembalikan daftar kemampuan', () => {
    expect(jawabLokal('siapa presiden?', [], NOW)).toMatch(/bisa membantu/i);
  });
});
