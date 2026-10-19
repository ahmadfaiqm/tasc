// api/lib/llmGratis.test.js
import { describe, it, expect } from 'vitest';
import { basisProvider, modelPengganti } from './llmGratis.js';

describe('basisProvider', () => {
  it('memetakan nama penyedia ramah ke URL gaya-OpenAI', () => {
    expect(basisProvider('gemini')).toBe('https://generativelanguage.googleapis.com/v1beta/openai');
    expect(basisProvider('GEMINI')).toBe('https://generativelanguage.googleapis.com/v1beta/openai');
    expect(basisProvider('openai')).toBe('https://api.openai.com/v1');
  });
  it('membiarkan URL apa adanya + membuang slash akhir', () => {
    expect(basisProvider('https://contoh.id/v1/')).toBe('https://contoh.id/v1');
  });
  it('kosong -> string kosong (panggilLLM balik null, klien pakai parser lokal)', () => {
    expect(basisProvider('')).toBe('');
    expect(basisProvider(undefined)).toBe('');
  });
});

describe('modelPengganti', () => {
  it('mengambil model pengganti yang BEDA dari yang sedang dipakai', () => {
    const pesan = 'This model models/gemini-2.5-flash is no longer available to new users. '
      + 'Please update your code to use models/gemini-3.8-flash for the latest features.';
    expect(modelPengganti(pesan, 'gemini-2.5-flash')).toBe('gemini-3.8-flash');
  });
  it('tidak mengarang pengganti bila pesan hanya menyebut model yang sama', () => {
    expect(modelPengganti('models/gemini-2.5-flash tidak ditemukan', 'gemini-2.5-flash')).toBeNull();
  });
  it('tanpa nama model -> null', () => {
    expect(modelPengganti('unauthorized', 'gemini-2.5-flash')).toBeNull();
  });
});
