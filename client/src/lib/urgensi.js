// Label urgensi monokrom (design.md §4): beda kontras + bobot, bukan warna.
// Istilah UI: Penting / Biasa / Santai. Teks lama (Mendesak/Sedang) tetap
// dikenali untuk data yang sudah tersimpan di cache tamu.
const PETA = {
  URGENT: { teks: 'Penting', kelas: 'label-mendesak' },
  NORMAL: { teks: 'Biasa', kelas: 'label-sedang' },
  LOW: { teks: 'Santai', kelas: 'label-santai' },
  Mendesak: { teks: 'Penting', kelas: 'label-mendesak' },
  Sedang: { teks: 'Biasa', kelas: 'label-sedang' },
  Santai: { teks: 'Santai', kelas: 'label-santai' },
  Penting: { teks: 'Penting', kelas: 'label-mendesak' },
  Biasa: { teks: 'Biasa', kelas: 'label-sedang' },
};

export function labelUrgensi(u) {
  return PETA[u] ?? PETA.LOW;
}
