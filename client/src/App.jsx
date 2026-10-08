import { useEffect, useMemo, useRef, useState } from 'react';
import { parseParagraf, tentukanUrgency, saranPriority, saranUrutan, REMINDER_MIN } from './lib/parserAturan.js';
import {
  mintaParse,
  muatTasks,
  buatTask,
  ubahTask,
  hapusTask,
  selesaikanTask,
  bukaUlangTask,
  ambilToken,
  simpanToken,
} from './lib/api.js';
import { supabase } from './lib/supabase.js';
import TaskList from './components/TaskList.jsx';
import Preview from './components/Preview.jsx';
import History from './components/History.jsx';
import AssistantBox from './components/AssistantBox.jsx';
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

function keTanggalStr(v) {
  if (v == null || v === '') return null;
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return null;
    const p = (n) => String(n).padStart(2, '0');
    return `${v.getFullYear()}-${p(v.getMonth() + 1)}-${p(v.getDate())}`;
  }
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function keJamStr(v) {
  if (v == null) return null;
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return null;
    return `${String(v.getUTCHours()).padStart(2, '0')}:${String(v.getUTCMinutes()).padStart(2, '0')}`;
  }
  const s = String(v).trim();
  if (/^([01]\d|2[0-3]):[0-5]\d$/.test(s)) return s;
  const m = s.match(/T(\d{2}):(\d{2})/);
  if (m) return `${m[1]}:${m[2]}`;
  return null;
}

// Baris API (camelCase mentah dari POST/PATCH atau serialisasi GET) -> kanonik snake_case.
function dariApi(t) {
  const dueDate = keTanggalStr(t.due_date ?? t.dueDate ?? t.dueDate ?? null);
  return {
    id: t.id,
    title: t.title ?? t.nama ?? '',
    description: t.description ?? null,
    source_text: t.source_text ?? t.sourceText ?? null,
    due_date: dueDate ?? keTanggalStr(t.tenggat),
    due_time: keJamStr(t.due_time ?? t.dueTime ?? null),
    time_precision: t.time_precision ?? t.timePrecision ?? 'UNSPECIFIED',
    duration_minutes: t.duration_minutes ?? t.durationMinutes ?? null,
    urgency: t.urgency ?? t.urgensi ?? 'LOW',
    priority: t.priority ?? 'MEDIUM',
    priority_source: t.priority_source ?? t.prioritySource ?? 'SYSTEM',
    status: t.status ?? (t.selesai ? 'COMPLETED' : 'PENDING'),
    reminded: Boolean(t.reminded),
    updated_at: t.updatedAt ?? t.updated_at ?? new Date().toISOString(),
  };
}

function dueMs(t) {
  if (t.tenggat) {
    const d = new Date(t.tenggat);
    return Number.isNaN(d.getTime()) ? null : d.getTime();
  }
  const tgl = keTanggalStr(t.due_date);
  if (!tgl) return null;
  const jam = keJamStr(t.due_time);
  const d = new Date(jam ? `${tgl}T${jam}:00` : `${tgl}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

function perkayaKandidat(k) {
  const saran = saranPriority(k.title ?? '');
  const due = dueMs({ due_date: k.due_date, due_time: k.due_time });
  return {
    id: k.id ?? buatId(),
    title: k.title ?? '',
    description: k.description ?? null,
    source_text: k.source_text ?? k.sourceText ?? null,
    due_date: keTanggalStr(k.due_date),
    due_time: keJamStr(k.due_time),
    time_precision: k.time_precision ?? 'UNSPECIFIED',
    duration_minutes: k.duration_minutes ?? null,
    urgency: k.urgency ?? tentukanUrgency(due ? new Date(due) : null, new Date()),
    priority: k.priority ?? saran.priority,
    priority_source: k.priority_source ?? saran.source,
    alasan_prioritas: k.alasan_prioritas ?? saran.reason,
    assumptions: Array.isArray(k.assumptions) ? k.assumptions : [],
  };
}

function kePayload(k) {
  return {
    title: k.title,
    description: k.description ?? null,
    source_text: k.source_text ?? null,
    due_date: keTanggalStr(k.due_date),
    due_time: keJamStr(k.due_time),
    time_precision: k.time_precision ?? 'UNSPECIFIED',
    duration_minutes: k.duration_minutes ?? null,
    urgency: k.urgency,
    priority: k.priority,
    priority_source: k.priority_source,
    ai_assumption: Array.isArray(k.assumptions) && k.assumptions.length ? k.assumptions.join('; ') : null,
  };
}

export default function App() {
  const [paragraf, setParagraf] = useState('');
  const [daftar, setDaftar] = useState(() => muat(KUNCI_LOKAL, []));
  const [preview, setPreview] = useState([]);
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

  // Auth (Supabase hanya untuk Auth; data lewat API).
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setPengguna(data.session?.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_ev, sesi) => setPengguna(sesi?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const segarkanDariApi = async () => {
    const j = await muatTasks();
    const tasks = (j?.tasks ?? []).map(dariApi);
    setDaftar(tasks);
    try {
      localStorage.setItem(KUNCI_LOKAL, JSON.stringify(tasks));
    } catch { /* abaikan */ }
    setBelumSinkron(false);
  };

  // Login: migrasi batch tamu via API, lalu jadikan API sumber utama.
  useEffect(() => {
    if (!supabase || !pengguna) return;
    (async () => {
      try {
        const lokal = muat(KUNCI_LOKAL, []).filter((t) => t.title || t.nama);
        for (const t of lokal) {
          const palk = t.title
            ? kePayload(t)
            : { title: t.nama, due_date: keTanggalStr(t.tenggat), due_time: null, time_precision: 'UNSPECIFIED' };
          if (!palk.title) continue;
          try {
            await buatTask(palk);
          } catch {
            const antri = muat(KUNCI_ANTRI, []);
            antri.push(palk);
            try {
              localStorage.setItem(KUNCI_ANTRI, JSON.stringify(antri));
            } catch { /* abaikan */ }
            setBelumSinkron(true);
          }
        }
        await segarkanDariApi();
        try {
          localStorage.removeItem(KUNCI_ANTRI);
        } catch { /* abaikan */ }
      } catch {
        setBelumSinkron(true);
      }
      sudahMuat.current = true;
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pengguna]);

  // Cache lokal saat tamu.
  useEffect(() => {
    if (!pengguna) {
      try {
        localStorage.setItem(KUNCI_LOKAL, JSON.stringify(daftar));
      } catch { /* abaikan */ }
    }
  }, [daftar, pengguna]);

  // Retry antre tiap 30 dtk.
  useEffect(() => {
    if (!supabase || !pengguna) return;
    const id = setInterval(async () => {
      const antri = muat(KUNCI_ANTRI, []);
      if (!antri.length) return;
      const sisa = [];
      for (const palk of antri) {
        try {
          await buatTask(palk);
        } catch {
          sisa.push(palk);
        }
      }
      try {
        if (sisa.length) localStorage.setItem(KUNCI_ANTRI, JSON.stringify(sisa));
        else localStorage.removeItem(KUNCI_ANTRI);
      } catch { /* abaikan */ }
      setBelumSinkron(sisa.length > 0);
      if (!sisa.length) {
        try {
          await segarkanDariApi();
        } catch { /* abaikan */ }
      }
    }, 30000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pengguna]);

  // Timer 1 dtk: pengingat (hanya bila due_time != null) + hapus-otomatis.
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      setDaftar((sebelum) => {
        let berubah = false;
        const hapus = [];
        const sesudah = sebelum.map((t) => {
          const status = t.status ?? (t.selesai ? 'COMPLETED' : 'PENDING');
          if (status !== 'PENDING') return t;
          const due = dueMs(t);
          if (due == null) return t;
          const jam = keJamStr(t.due_time);
          const sisa = due - now;
          if (jam && sisa > 0 && sisa <= REMINDER_MIN * 60e3 && !t.reminded) {
            berubah = true;
            tampilkanToast(`Segera: ${t.title ?? t.nama}`);
            try {
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(`Segera: ${t.title ?? t.nama}`);
              }
            } catch { /* abaikan */ }
            return { ...t, reminded: true };
          }
          if (due < now) hapus.push(t);
          return t;
        }).filter((t) => {
          const due = dueMs(t);
          const status = t.status ?? (t.selesai ? 'COMPLETED' : 'PENDING');
          return status !== 'PENDING' || due == null || due >= now;
        });
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

  // Quick Capture -> pratinjau (tanpa preview tidak ada tulis DB dari AI).
  const susun = async () => {
    if (!paragraf.trim()) {
      tampilkanToast('Tulis dulu paragraf tugasnya');
      return;
    }
    const now = new Date();
    if (!paksaLokal) {
      try {
        const hasil = await mintaParse(paragraf);
        if (Array.isArray(hasil?.tasks) && hasil.tasks.length) {
          setPreview(hasil.tasks.map(perkayaKandidat));
          setMode(hasil.sumber === 'ai' ? 'ai' : 'lokal');
          tampilkanToast(`${hasil.tasks.length} kandidat siap diperiksa (mode ${hasil.sumber === 'ai' ? 'AI' : 'lokal'})`);
          return;
        }
        if (hasil?.sumber === 'lokal') throw new Error('fallback-lokal');
        if (!hasil?.tasks?.length) {
          // AI menjawab kosong -> tetap tawarkan baca lokal.
          const lokal = parseParagraf(paragraf, now).map(perkayaKandidat);
          setPreview(lokal);
          setMode('lokal');
          tampilkanToast(`${lokal.length} kandidat siap diperiksa (mode lokal)`);
          return;
        }
      } catch { /* jatuh ke lokal */ }
    }
    const lokal = parseParagraf(paragraf, now).map(perkayaKandidat);
    setPreview(lokal);
    setMode('lokal');
    tampilkanToast(`${lokal.length} kandidat siap diperiksa (mode lokal)`);
  };

  const adaToken = async () => Boolean(await ambilToken());

  const konfirmasi = async (i) => {
    const k = preview[i];
    if (!k) return;
    const payload = kePayload(k);
    if ((await adaToken()) && pengguna) {
      try {
        const tersimpan = await buatTask(payload);
        setDaftar((d) => [...d, dariApi(tersimpan)]);
        tampilkanToast('Tugas tersimpan');
      } catch {
        const antri = muat(KUNCI_ANTRI, []);
        antri.push(payload);
        try {
          localStorage.setItem(KUNCI_ANTRI, JSON.stringify(antri));
        } catch { /* abaikan */ }
        setBelumSinkron(true);
        tampilkanToast('Gagal menyimpan — masuk antrean, retry otomatis');
        return;
      }
    } else {
      setDaftar((d) => [...d, { ...k, status: 'PENDING', reminded: false, updated_at: new Date().toISOString() }]);
      tampilkanToast('Tugas tersimpan (tamu)');
    }
    setPreview((p) => p.filter((_, x) => x !== i));
  };

  const ubahPreview = (i, patch) => {
    setPreview((p) => p.map((k, x) => (x === i ? perkayaKandidat({ ...k, ...patch }) : k)));
  };

  const batalPreview = (i) => {
    setPreview((p) => p.filter((_, x) => x !== i));
  };

  const saran = useMemo(() => saranUrutan(daftar), [daftar]);

  const ubah = async (id, baru) => {
    const title = (baru.title ?? baru.nama ?? '').trim();
    if (!title) return;
    const patch = {
      title,
      due_date: keTanggalStr(baru.due_date ?? baru.tenggat) ?? null,
      due_time: keJamStr(baru.due_time) ?? null,
      urgency: baru.urgency ?? baru.urgensi ?? undefined,
    };
    if ((await adaToken()) && pengguna) {
      try {
        const r = await ubahTask(id, patch);
        setDaftar((d) => d.map((t) => (t.id === id ? dariApi(r) : t)));
        return;
      } catch {
        tampilkanToast('Gagal mengubah di server');
        return;
      }
    }
    setDaftar((d) =>
      d.map((t) =>
        t.id === id
          ? {
              ...t,
              ...patch,
              time_precision: baru.time_precision ?? t.time_precision ?? 'UNSPECIFIED',
              reminded: false,
              updated_at: new Date().toISOString(),
            }
          : t
      )
    );
  };

  const hapus = async (id) => {
    if ((await adaToken()) && pengguna) {
      try {
        await hapusTask(id);
      } catch {
        tampilkanToast('Gagal menghapus di server');
        return;
      }
    }
    setDaftar((d) => d.filter((t) => t.id !== id));
  };

  const toggle = async (id) => {
    const t = daftar.find((x) => x.id === id);
    if (!t) return;
    const status = t.status ?? (t.selesai ? 'COMPLETED' : 'PENDING');
    if ((await adaToken()) && pengguna) {
      try {
        const r = status === 'COMPLETED' ? await bukaUlangTask(id) : await selesaikanTask(id);
        setDaftar((d) => d.map((x) => (x.id === id ? dariApi(r) : x)));
        return;
      } catch {
        tampilkanToast('Gagal mengubah status di server');
        return;
      }
    }
    setDaftar((d) =>
      d.map((x) => (x.id === id ? { ...x, status: status === 'COMPLETED' ? 'PENDING' : 'COMPLETED' } : x))
    );
  };

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
    simpanToken('');
    setPengguna(null);
    sudahMuat.current = false;
  };

  return (
    <main className="wadah">
      <nav aria-label="Navigasi utama" className="nav-tetap">
        <a className="logo-tumpuk" href="#atas">
          TAS
          <br />
          KA
        </a>
        <div className="nav-tautan">
          <a href="#folder">Folder</a>
          <a href="#kerja">Coba</a>
        </div>
      </nav>
      <div className="tepi-sosial" aria-hidden="true">
        <span>TASKA</span>
      </div>
      <span className="tepi-gulir" aria-hidden="true">
        Gulir
      </span>

      <section id="atas" aria-label="Hero" className="bagian hero">
        <p className="nav-nomor">01</p>
        <h1 className="wordmark">TASKA</h1>
        <p className="tagline">Tulis rencana dengan bahasa sehari-hari — TASKA menyusunnya jadi tugas, menentukan urgensi, dan menyarankan urutan pengerjaan.</p>
        <a href="#kerja">
          <button type="button" className="primer">
            Coba sekarang
          </button>
        </a>
      </section>

      <section id="folder" aria-label="Folder bulanan" className="bagian">
        <p className="nav-nomor">02</p>
        <History daftar={daftar} />
      </section>

      <section id="kerja" aria-label="Ruang kerja" className="bagian">
        <p className="nav-nomor">03</p>
        <h2>Ruang Kerja</h2>
        <p className="mode-line">{pengguna ? `Mode akun — ${pengguna.email}` : 'Mode tamu — tugas tersimpan di browser'}</p>
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
          <h3>Daftar tugas</h3>
          <TaskList daftar={daftar} onUbah={ubah} onHapus={hapus} onToggle={toggle} />
        </section>
      </div>
      <Preview daftar={preview} onKonfirmasi={konfirmasi} onUbah={ubahPreview} onBatal={batalPreview} />
      <SaranUrutan saran={saran} />
      <AssistantBox />
      <Toast
        pesan={toast}
        aksiLabel={arsipHapus.current ? 'Urung' : undefined}
        onAksi={arsipHapus.current ? urungkanHapus : undefined}
      />
      </section>
    </main>
  );
}
