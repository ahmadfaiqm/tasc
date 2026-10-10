import { describe, it, expect } from 'vitest';
import { hitungBento } from './ringkasan.js';

const NOW = new Date('2026-10-10T10:00:00');

function t(patch) {
  return { id: 'x', title: 'T', status: 'PENDING', urgency: 'LOW', due_date: null, due_time: null, ...patch };
}

describe('hitungBento', () => {
  it('menghitung aktif, mendesak, persen selesai, dan tugas berikut', () => {
    const daftar = [
      t({ id: 'a', title: 'Rapat', urgency: 'URGENT', due_date: '2026-10-10', due_time: '11:00' }),
      t({ id: 'b', title: 'Beli sepatu', due_date: '2026-10-11', due_time: null }),
      { ...t({ id: 'c' }), status: 'COMPLETED', completed_at: '2026-10-05T08:00:00' },
      { ...t({ id: 'd' }), status: 'COMPLETED', completed_at: '2026-09-01T08:00:00' },
    ];
    const b = hitungBento(daftar, NOW);
    expect(b.aktif).toBe(2);
    expect(b.mendesak).toBe(1);
    expect(b.selesaiX).toBe(1);
    expect(b.selesaiY).toBe(3);
    expect(b.selesaiPersen).toBe(33);
    expect(b.berikut.nama).toBe('Rapat');
    expect(b.berikut.jam).toBe('11:00');
  });

  it('tanpa tugas aktif -> berikut null dan persen 0', () => {
    const b = hitungBento([], NOW);
    expect(b.aktif).toBe(0);
    expect(b.berikut).toBe(null);
    expect(b.selesaiPersen).toBe(0);
  });
});
