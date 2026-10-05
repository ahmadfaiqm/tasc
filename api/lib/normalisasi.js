export function normalisasiTugas(arr, nowISO) {
  if (!Array.isArray(arr)) return [];
  const now = new Date(nowISO).getTime();
  return arr.filter(t => t && typeof t.nama === 'string' && t.nama.trim() && t.tenggat)
    .map(t => ({ nama: t.nama.trim().slice(0, 200), tenggat: new Date(t.tenggat).toISOString() }))
    .filter(t => !Number.isNaN(Date.parse(t.tenggat)) && Date.parse(t.tenggat) > now - 864e5);
}
