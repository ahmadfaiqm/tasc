import { describe, it, expect } from 'vitest';
import { labelUrgensi } from './urgensi.js';

describe('labelUrgensi', () => {
  it('memakai istilah Penting / Biasa / Santai', () => {
    expect(labelUrgensi('URGENT').teks).toBe('Penting');
    expect(labelUrgensi('NORMAL').teks).toBe('Biasa');
    expect(labelUrgensi('LOW').teks).toBe('Santai');
  });
  it('teks lama dari cache tamu tetap dikenali', () => {
    expect(labelUrgensi('Mendesak').teks).toBe('Penting');
    expect(labelUrgensi('Sedang').teks).toBe('Biasa');
  });
  it('nilai tak dikenal -> Santai', () => {
    expect(labelUrgensi('APAPUN').teks).toBe('Santai');
  });
});
