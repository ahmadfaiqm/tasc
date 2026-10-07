// client/src/lib/parserAturan.test.js
import { describe, it, expect } from 'vitest';
import { parseParagraf, tentukanUrgency, saranPriority } from './parserAturan.js';
const now = new Date('2026-10-07T08:00:00+07:00');
describe('no-fake-time', () => {
  it('tanpa jam -> due_time null UNSPECIFIED', () => {
    const r = parseParagraf('Besok beli sepatu', now);
    expect(r).toHaveLength(1);
    expect(r[0].title).toMatch(/sepatu/i);
    expect(r[0].due_time).toBeNull();
    expect(r[0].time_precision).toBe('UNSPECIFIED');
  });
  it('jam eksplisit -> EXACT', () => {
    const r = parseParagraf('Besok jam 4 sore beli sepatu', now);
    expect(r[0].due_time).toBe('16:00');
    expect(r[0].time_precision).toBe('EXACT');
  });
  it('setengah 4 sore -> 15:30', () => {
    const r = parseParagraf('Olahraga setengah 4 sore', now);
    expect(r[0].due_time).toBe('15:30');
  });
  it('jam lewat hari ini -> besok', () => {
    const r = parseParagraf('Sarapan jam 6', new Date('2026-10-07T08:00:00+07:00'));
    expect(r[0].due_date.getDate()).toBe(8);
  });
  it('satu input tiga aktivitas -> tiga task', () => {
    const r = parseParagraf('Besok jam 8 kuliah, siangnya beli sepatu, jam 7 malam kerjakan tugas', now);
    expect(r).toHaveLength(3);
  });
});
describe('urgency/priority', () => {
  it('urgency dari jarak', () => {
    expect(tentukanUrgency(new Date(now.getTime() + 3600e3), now)).toBe('URGENT');
    expect(tentukanUrgency(new Date(now.getTime() + 5 * 3600e3), now)).toBe('NORMAL');
    expect(tentukanUrgency(new Date(now.getTime() + 5 * 864e5), now)).toBe('LOW');
  });
  it('priority keyword -> HIGH via AI', () => {
    expect(saranPriority('Besok kumpulin skripsi deadline').priority).toBe('HIGH');
  });
});
