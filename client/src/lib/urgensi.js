// Label urgensi monokrom (design.md §4): beda kontras + bobot, bukan warna.
const PETA = {
  URGENT: { teks: 'Mendesak', kelas: 'label-mendesak' },
  NORMAL: { teks: 'Sedang', kelas: 'label-sedang' },
  LOW: { teks: 'Santai', kelas: 'label-santai' },
  Mendesak: { teks: 'Mendesak', kelas: 'label-mendesak' },
  Sedang: { teks: 'Sedang', kelas: 'label-sedang' },
  Santai: { teks: 'Santai', kelas: 'label-santai' },
};

export function labelUrgensi(u) {
  return PETA[u] ?? PETA.LOW;
}
