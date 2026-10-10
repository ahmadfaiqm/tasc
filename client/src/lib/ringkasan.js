// client/src/lib/ringkasan.js — angka kartu bento dari daftar kanonik snake_case.
export function gabungDueMs(dueDate, dueTime) {
  if (!dueDate) return null;
  const d = new Date(`${dueDate}T${dueTime ?? '00:00'}:00`);
  const ms = d.getTime();
  return Number.isNaN(ms) ? null : ms;
}

export function hitungBento(daftar, now = new Date()) {
  const semua = Array.isArray(daftar) ? daftar : [];
  const bulan = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const penandaBulan = (t) => t.completed_at ?? t.completedAt ?? t.created_at ?? t.createdAt ?? t.updated_at ?? t.updatedAt ?? '';
  const aktif = semua.filter((t) => (t.status ?? 'PENDING') === 'PENDING');
  const depan = aktif.filter((t) => {
    const due = gabungDueMs(t.due_date, t.due_time);
    return due == null || due >= now.getTime();
  });
  const mendesak = aktif.filter((t) => (t.urgency ?? t.urgensi) === 'URGENT').length;
  const relevanBulan = semua.filter((t) => {
    if ((t.status ?? 'PENDING') === 'PENDING') return true;
    const s = penandaBulan(t);
    return typeof s === 'string' && s.slice(0, 7) === bulan;
  });
  const selesaiBulan = relevanBulan.filter((t) => (t.status ?? '') === 'COMPLETED');
  const calon = depan
    .map((t) => ({ t, due: gabungDueMs(t.due_date, t.due_time) }))
    .filter((x) => x.due != null)
    .sort((a, b) => a.due - b.due)[0];
  return {
    aktif: depan.length,
    mendesak,
    selesaiX: selesaiBulan.length,
    selesaiY: relevanBulan.length,
    selesaiPersen: relevanBulan.length ? Math.round((selesaiBulan.length / relevanBulan.length) * 100) : 0,
    berikut: calon
      ? { jam: calon.t.due_time, nama: calon.t.title ?? calon.t.nama ?? '', hari: calon.t.due_date ?? '' }
      : null,
  };
}
