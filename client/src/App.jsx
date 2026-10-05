import { useEffect, useMemo, useRef, useState } from 'react';
import { parseParagraf, tentukanUrgensi, saranUrutan, REMINDER_MIN } from './lib/parserAturan.js';
import { mintaParse } from './lib/api.js';
import { supabase } from './lib/supabase.js';
import TaskList from './components/TaskList.jsx';
import SaranUrutan from './components/SaranUrutan.jsx';
import Toast from './components/Toast.jsx';

export const UNDO_MS = 8000;
const KUNCI_LOKAL = 'taskman:tugas';
const KUNCI_ANTRI = 'taskman:antri';

function muat(kunci, awal) {
  try {
    const mentah = localStorage.getItem(kunci);
    return mentah ? JSON.parse(mentah) : awal;
  } catch {
    return awal;
  }
}

function buatId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function keTugas(nama, tenggat, now) {
  const t = tenggat instanceof Date ? tenggat : new Date(tenggat);
  return {
    id: buatId(),
    nama,
    tenggat: t.toISOString(),
    urgensi: tentukanUrgensi(t, now, nama),
    selesai: false,
    reminded: false,
    updated_at: new Date().toISOString(),
  };
}

export default function App() {
  const [paragraf, setParagraf] = useState('');
  const [daftar, setDaftar] = useState(() => muat(KUNCI_LOKAL, []));
  const [mode, setMode] = useState('lokal');
  const [paksaLokal, setPaksaLokal] = useState(false);
  const [toast, setToast] = useState('');
  const [belumSinkron, setBelumSinkron] = useState(false);
  const [pengguna, setPengguna] = useState(null);
  const [email, setEmail] = useState('');
  const [sandi, setSandi] = useState('');
  const sudahMuat = useRef(false);
  const arsipHapus = useRef(null);
  const timerToast = useRef(null);

  const tampilkanToast = (pesan) => {
    setToast(pesan);
    clearTimeout(timerToast.current);
    timerToast.current = setTimeout(() => setToast(''), 4500);
  };

  // Auth + migrasi sekali
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setPengguna(data.session?.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_ev, sesi) => setPengguna(sesi?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || !pengguna) return;
    (async () => {
      const lokal = muat(KUNCI_LOKAL, []);
      if (lokal.length) {
        const baris = lokal.map((t) => ({
          nama: t.nama,
          tenggat: t.tenggat,
          urgensi: t.urgensi,
          selesai: t.selesai,
          reminded: t.reminded,
          user_id: pengguna.id,
          updated_at: t.updated_at ?? new Date().toISOString(),
        }));
        const { error } = await supabase.from('tasks').insert(baris);
        if (!error) localStorage.setItem(KUNCI_LOKAL, JSON.stringify([]));
      }
      const { data } = await supabase.from('tasks').select('*').order('tenggat');
      if (data) {
        setDaftar(data.map((t) => ({ ...t, id: t.id })));
        localStorage.setItem(KUNCI_LOKAL, JSON.stringify(data.map((t) => ({ ...t, id: t.id }))));
      }
      sudahMuat.current = true;
    })();
  }, [pengguna]);

  // Cache lokal selalu
  useEffect(() => {
    if (!pengguna) localStorage.setItem(KUNCI_LOKAL, JSON.stringify(daftar));
  }, [daftar, pengguna]);

  const saran = useMemo(() => {
    const aktif = daftar.filter((t) => !t.selesai).map((t) => ({ ...t, tenggat: new Date(t.tenggat) }));
    return saranUrutan(aktif);
  }, [daftar]);

  const simpanKeSupabase = async (baris) => {
    if (!supabase || !pengguna) return true;
    const { error } = await supabase.from('tasks').upsert(
      baris.map((t) => ({
        id: t.id,
        nama: t.nama,
        tenggat: t.tenggat,
        urgensi: t.urgensi,
        selesai: t.selesai,
        reminded: t.reminded,
        user_id: pengguna.id,
        updated_at: t.updated_at ?? new Date().toISOString(),
      })),
      { onConflict: 'id' }
    );
    if (error) {
      localStorage.setItem(KUNCI_ANTRI, JSON.stringify(baris));
      setBelumSinkron(true);
      return false;
    }
    setBelumSinkron(false);
    return true;
  };

  // Persist tiap perubahan daftar saat login (last-write-wins via updated_at)
  useEffect(() => {
    if (!supabase || !pengguna || !sudahMuat.current) return;
    const id = setTimeout(() => {
      simpanKeSupabase(daftar).then((ok) => {
        if (ok) localStorage.removeItem(KUNCI_ANTRI);
      });
    }, 500);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daftar, pengguna]);

  // Retry antre tiap 30 dtk
  useEffect(() => {
    if (!supabase || !pengguna) return;
    const id = setInterval(async () => {
      const antri = muat(KUNCI_ANTRI, []);
      if (!antri.length) return;
      const ok = await simpanKeSupabase(antri);
      if (ok) localStorage.removeItem(KUNCI_ANTRI);
    }, 30000);
    return () => clearInterval(id);
  }, [pengguna]);

  // Timer 1 dtk: pengingat + hapus-otomatis
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      setDaftar((sebelum) => {
        let berubah = false;
        let hapus = [];
        const sesudah = sebelum.map((t) => {
          if (t.selesai) return t;
          const sisa = new Date(t.tenggat).getTime() - now;
          if (sisa > 0 && sisa <= REMINDER_MIN * 60e3 && !t.reminded) {
            berubah = true;
            tampilkanToast(`Segera: ${t.nama}`);
            try {
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(`Segera: ${t.nama}`);
              }
            } catch { /* abaikan */ }
            return { ...t, reminded: true };
          }
          if (new Date(t.tenggat).getTime() < now) hapus.push(t);
          return t;
        }).filter((t) => new Date(t.tenggat).getTime() >= now || t.selesai);
        if (hapus.length) {
          berubah = true;
          clearTimeout(arsipHapus.current?.timer);
          arsipHapus.current = {
            tugas: hapus,
            timer: setTimeout(() => {
              arsipHapus.current = null;
              setToast('');
            }, UNDO_MS),
          };
          tampilkanToast(`${hapus.length} tugas lewat waktu dihapus`);
        }
        return berubah ? sesudah : sebelum;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const urungkanHapus = () => {
    if (!arsipHapus.current) return;
    clearTimeout(arsipHapus.current.timer);
    const kembali = arsipHapus.current.tugas;
    arsipHapus.current = null;
    setDaftar((d) => [...kembali, ...d]);
    setToast('');
  };

  const susun = async () => {
    if (!paragraf.trim()) {
      tampilkanToast('Tulis dulu paragraf tugasnya');
      return;
    }
    const now = new Date();
    if (!paksaLokal) {
      try {
        const hasil = await mintaParse(paragraf);
        if (hasil?.sumber === 'ai' && Array.isArray(hasil.tugas) && hasil.tugas.length) {
          const baru = hasil.tugas.map((t) => keTugas(t.nama, t.tenggat, now));
          setDaftar((d) => [...d, ...baru]);
          setMode('ai');
          tampilkanToast(`${baru.length} tugas tersusun (mode AI)`);
          return;
        }
      } catch { /* jatuh ke lokal */ }
    }
    const lokal = parseParagraf(paragraf, now).map((t) => keTugas(t.nama, t.tenggat, now));
    setDaftar((d) => [...d, ...lokal]);
    setMode('lokal');
    tampilkanToast(`${lokal.length} tugas tersusun (mode lokal)`);
  };

  const ubah = (id, baru) => {
    setDaftar((d) =>
      d.map((t) => (t.id === id ? { ...baru, reminded: false, updated_at: new Date().toISOString() } : t))
    );
  };
  const hapus = (id) => setDaftar((d) => d.filter((t) => t.id !== id));
  const toggle = (id) =>
    setDaftar((d) => d.map((t) => (t.id === id ? { ...t, selesai: !t.selesai } : t)));

  const mintaIzinNotifikasi = async () => {
    if (!('Notification' in window)) {
      tampilkanToast('Browser tidak mendukung notifikasi');
      return;
    }
    const izin = await Notification.requestPermission();
    tampilkanToast(izin === 'granted' ? 'Notifikasi diaktifkan' : 'Izin notifikasi ditolak — toast tetap jalan');
  };

  const masuk = async (modeAuth) => {
    if (!supabase) {
      tampilkanToast('Supabase belum dikonfigurasi — mode tamu (localStorage)');
      return;
    }
    const fn = modeAuth === 'daftar' ? supabase.auth.signUp : supabase.auth.signInWithPassword;
    const { error } = await fn({ email, password: sandi });
    tampilkanToast(error ? `Gagal: ${error.message}` : modeAuth === 'daftar' ? 'Cek email untuk verifikasi' : 'Masuk berhasil');
  };
  const keluar = async () => {
    if (supabase) await supabase.auth.signOut();
    setPengguna(null);
    sudahMuat.current = false;
  };

  return (
    <main className="wadah">
      <h1>Ruang Kerja</h1>
      <section aria-label="Akun" className="kartu akun">
        {pengguna ? (
          <div className="baris">
            <span>Masuk sebagai {pengguna.email}</span>
            <button type="button" onClick={keluar}>
              Keluar
            </button>
          </div>
        ) : (
          <div className="baris">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" />
            <label htmlFor="sandi">Sandi</label>
            <input id="sandi" type="password" value={sandi} onChange={(e) => setSandi(e.target.value)} />
            <button type="button" onClick={() => masuk('masuk')}>
              Masuk
            </button>
            <button type="button" onClick={() => masuk('daftar')}>
              Daftar
            </button>
            {!supabase && <span className="privasi">mode tamu (localStorage)</span>}
          </div>
        )}
      </section>
      {belumSinkron && <p className="banner">Belum tersinkron — perubahan disimpan lokal, retry otomatis.</p>}
      <div className="kolom">
        <section aria-label="Masukan paragraf" className="kartu">
          <label htmlFor="paragraf">Paragraf tugas (Bahasa Indonesia)</label>
          <textarea
            id="paragraf"
            rows={5}
            value={paragraf}
            onChange={(e) => setParagraf(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) susun();
            }}
            placeholder="Contoh: Rapat jam 9, lalu kirim laporan 30 menit lagi. Besok apel pukul 07.30"
          />
          <div className="baris">
            <button type="button" onClick={susun}>
              Susun jadi tugas
            </button>
            <span className="badge" aria-live="polite">
              mode {mode === 'ai' ? 'AI' : 'lokal'}
            </span>
          </div>
          <p className="privasi">
            Paragraf hanya dikirim ke AI saat tombol ditekan.{' '}
            <button type="button" onClick={() => setPaksaLokal((v) => !v)}>
              {paksaLokal ? ' mode lokal saja (aktif)' : 'pakai mode lokal saja'}
            </button>
          </p>
          <div className="baris">
            <button type="button" onClick={mintaIzinNotifikasi}>
              Aktifkan notifikasi
            </button>
          </div>
        </section>
        <section aria-label="Daftar tugas" className="kartu">
          <h2>Daftar tugas</h2>
          <TaskList daftar={daftar} onUbah={ubah} onHapus={hapus} onToggle={toggle} />
        </section>
      </div>
      <SaranUrutan saran={saran} />
      <Toast
        pesan={toast}
        aksiLabel={arsipHapus.current ? 'Urung' : undefined}
        onAksi={arsipHapus.current ? urungkanHapus : undefined}
      />
    </main>
  );
}
