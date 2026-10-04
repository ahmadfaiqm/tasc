import { useCallback, useEffect, useRef, useState } from 'react';
import { susunTugas, tentukanUrgensi, REMINDER_MIN } from './parserAturan.js';
import { parseParagraf } from './api.js';
import { kirimPengingat, mintaIzinNotifikasi } from './notifikasi.js';

const KUNCI = 'taska.tasks.v1';
const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const bacaAwal = () => {
  try { return JSON.parse(localStorage.getItem(KUNCI)) || []; } catch { return []; }
};

export function gunakanTugas() {
  const [tasks, setTasks] = useState(bacaAwal);
  const [paragraf, setParagraf] = useState('');
  const [toast, setToast] = useState(null);
  const [notifAktif, setNotifAktif] = useState(
    () => 'Notification' in window && Notification.permission === 'granted',
  );
  const [tasksBaru, setTasksBaru] = useState(null);
  const hapusTerakhir = useRef(null);
  const toastTimer = useRef(null);

  const tampilToast = useCallback((pesan, aksi = null) => {
    clearTimeout(toastTimer.current);
    setToast({ pesan, aksi });
    toastTimer.current = setTimeout(() => setToast(null), aksi ? 8000 : 4500);
  }, []);

  useEffect(() => {
    try { localStorage.setItem(KUNCI, JSON.stringify(tasks)); } catch { /* abaikan */ }
  }, [tasks]);

  const susunDariParagraf = useCallback(async (paksaLokal = false) => {
    const { tasks: baru, mode } = await parseParagraf(paragraf, paksaLokal);
    if (!baru.length) { tampilToast('Tulis rencanamu dulu ya.'); return []; }
    setTasks((lama) => [...lama, ...baru]);
    setTasksBaru(baru);
    setParagraf('');
    if (mode === 'lokal' && !paksaLokal) tampilToast('Mode offline — memakai aturan lokal.');
    return baru;
  }, [paragraf, tampilToast]);

  const toggleSelesai = useCallback((id) => {
    setTasks((lama) => lama.map((t) => t.id === id ? { ...t, selesai: !t.selesai, updated_at: new Date().toISOString() } : t));
  }, []);

  const hapusTugas = useCallback((id, diam = false) => {
    setTasks((lama) => {
      const korban = lama.find((t) => t.id === id);
      if (korban) hapusTerakhir.current = { tugas: korban, indeks: lama.indexOf(korban) };
      return lama.filter((t) => t.id !== id);
    });
    if (!diam) tampilToast('Tugas dibatalkan.', { label: 'Urung', aksi: 'urung' });
  }, [tampilToast]);

  const urungHapus = useCallback(() => {
    const h = hapusTerakhir.current;
    if (!h) return;
    setTasks((lama) => {
      const salin = [...lama];
      salin.splice(Math.min(h.indeks, salin.length), 0, h.tugas);
      return salin;
    });
    hapusTerakhir.current = null;
    setToast(null);
  }, []);

  const simpanEdit = useCallback((id, { nama, tenggat, urgensi }) => {
    setTasks((lama) => lama.map((t) => t.id === id
      ? { ...t, nama, tenggat, urgensi, reminded: false, updated_at: new Date().toISOString() } : t));
  }, []);

  const aktifkanNotifikasi = useCallback(async () => {
    const hasil = await mintaIzinNotifikasi();
    if (hasil === 'granted') { setNotifAktif(true); tampilToast('Notifikasi aktif.'); }
    else tampilToast('Notifikasi tidak diizinkan — pengingat hanya tampil di layar.');
  }, [tampilToast]);

  useEffect(() => {
    const tick = setInterval(() => {
      const nowMs = Date.now();
      setTasks((lama) => {
        const lewat = lama.filter((t) => Date.parse(t.tenggat) <= nowMs);
        const jalan = lama.filter((t) => Date.parse(t.tenggat) > nowMs);
        if (lewat.length) {
          hapusTerakhir.current = { tugas: lewat[lewat.length - 1], indeks: lama.length - 1 };
          tampilToast(
            lewat.length === 1 ? `"${lewat[0].nama}" terhapus karena lewat waktu.` : `${lewat.length} tugas terhapus karena lewat waktu.`,
            { label: 'Urung', aksi: 'urung' },
          );
        }
        const perluIngat = jalan.filter((t) => !t.selesai && !t.reminded
          && Date.parse(t.tenggat) - nowMs <= REMINDER_MIN * 60000 && Date.parse(t.tenggat) - nowMs > 0);
        if (perluIngat.length) {
          for (const t of perluIngat) kirimPengingat(t);
          tampilToast(`"${perluIngat[0].nama}" kurang dari 5 menit.`);
          return jalan.map((t) => perluIngat.some((p) => p.id === t.id) ? { ...t, reminded: true } : t);
        }
        return lewat.length ? jalan : lama;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [tampilToast]);

  return { tasks, tasksBaru, paragraf, setParagraf, susunDariParagraf, toggleSelesai, hapusTugas, simpanEdit, toast, urungHapus, notifAktif, aktifkanNotifikasi };
}
