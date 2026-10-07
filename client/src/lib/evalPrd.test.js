// client/src/lib/evalPrd.test.js (vitest dataset, ikut test:all)
import { describe, it, expect } from 'vitest';
import { parseParagraf } from './parserAturan.js';
const S = ['besok jam 4 beli sepatu', 'jam 1 siang meeting', 'setengah 4 sore olahraga', 'nanti malam kerjain laporan', 'besok deadline tugas', 'senin depan ketemu dosen'];
describe('eval PRD', () => {
  it('semua sample menghasilkan >=1 task tanpa fake-time', () => {
    for (const s of S) {
      const r = parseParagraf(s, new Date('2026-10-07T08:00:00+07:00'));
      expect(r.length).toBeGreaterThan(0);
      for (const t of r) {
        if (t.time_precision === 'UNSPECIFIED') expect(t.due_time).toBeNull();
      }
    }
  });
});
