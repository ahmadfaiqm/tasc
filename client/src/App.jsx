import { useEffect, useMemo, useRef, useState } from 'react';
import { tentukanUrgency, saranPriority, saranUrutan, REMINDER_MIN } from './lib/parserAturan.js';
import { hariTanggal } from './lib/tanggal.js';
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
  muatProfil,
  simpanProfil,
  riwayatBulan,
} from './lib/api.js';
import { supabase } from './lib/supabase.js';
import { fotoProfil } from './lib/profil.js';
import { hitungBento } from './lib/ringkasan.js';
import AuthPage from './components/AuthPage.jsx';
import Dashboard from './components/Dashboard.jsx';
import Ringkasan from './components/Ringkasan.jsx';
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
    // Jam lokal (dulu getUTC* -> geser ±7 jam vs keTanggalStr yang lokal).
    return `${String(v.getHours()).padStart(2, '0')}:${String(v.getMinutes()).padStart(2, '0')}`;
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
    completed_at: t.completed_at ?? t.completedAt ?? null,
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

// Terjemahkan galat panggilanApi menjadi sebab yang bisa ditindaklanjuti.
function sebabGagal(e) {
  const m = String(e?.message ?? '');
  if (m === 'api-401' || m === 'api-403') return 'sesi login tidak dikenali — masuk ulang';
  if (m === 'api-400') return 'data ditolak server';
  if (m === 'api-404') return 'endpoint API tidak ditemukan — server belum jalan?';
  if (m.startsWith('api-5')) return `kesalahan server (${m})`;
  if (m.startsWith('api-')) return m;
  return 'server tidak terjangkau — API belum jalan?';
}

export default function App() {
  const [paragraf, setParagraf] = useState('');
  const [daftar, setDaftar] = useState([]);
  const [preview, setPreview] = useState([]);
  const [manual, setManual] = useState(false);
  const [judulManual, setJudulManual] = useState('');
  const [tanggalManual, setTanggalManual] = useState('');
  const [jamManual, setJamManual] = useState('');
  const [urgensiManual, setUrgensiManual] = useState('NORMAL');
  const [toast, setToast] = useState('');
  const [belumSinkron, setBelumSinkron] = useState(false);
  const [pengguna, setPengguna] = useState(null);
  const [profil, setProfil] = useState({ nama: '', aiConsent: false });
  const [galatAuth, setGalatAuth] = useState('');
  const [sibukAuth, setSibukAuth] = useState(false);
  const [sibukSusun, setSibukSusun] = useState(false);
  const susunRef = useRef(false);
  const [prefillAsisten, setPrefillAsisten] = useState('');
  const arsipHapus = useRef(null);
  const timerToast = useRef(null);
  // Dedupe provision profil (StrictMode menggandakan efek; hindari dua create).
  const pastikanProfilRef = useRef(new Set());

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

  // Muat profil setiap sesi tersedia (restore, Google, password). Bila baris
  // belum ada (404) -> buat otomatis agar penulisan task tidak melanggar FK
  // tasks_user_id_fkey. Nama awal "human", consent AI mati (bisa diubah user).
  useEffect(() => {
    if (!pengguna) return;
    const kunci = pengguna.id ?? pengguna.email ?? 'sesi';
    if (pastikanProfilRef.current.has(kunci)) return;
    pastikanProfilRef.current.add(kunci);
    (async () => {
      try {
        const p = await muatProfil();
        setProfil({ nama: p?.nama ?? '', aiConsent: Boolean(p?.aiConsent) });
      } catch (e) {
        if (e?.message !== 'api-404') {
          setProfil({ nama: '', aiConsent: false });
          return;
        }
        try {
          const p = await simpanProfil({ nama: 'human', aiConsent: false, email: pengguna?.email });
          setProfil({ nama: p?.nama ?? 'human', aiConsent: Boolean(p?.aiConsent) });
        } catch {
          setProfil({ nama: '', aiConsent: false });
        }
      }
    })();
  }, [pengguna]);

  const segarkanDariApi = async () => {
    const j = await muatTasks();
    const tasks = (j?.tasks ?? []).map(dariApi);
    setDaftar(tasks);
    setBelumSinkron(false);
  };

  // Login: migrasi batch lokal lawas via API, lalu jadikan API sumber utama.
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
        try {
          localStorage.removeItem(KUNCI_LOKAL);
        } catch { /* abaikan */ }
        await segarkanDariApi();
        // Jangan hapus KUNCI_ANTRI di sini: item yang gagal buatTask
        // sudah di-push ke antre di loop atas dan ditangani retry 30 dtk.
      } catch {
        setBelumSinkron(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pengguna]);

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

  const daftarRef = useRef(daftar);
  daftarRef.current = daftar;

  // Timer 1 dtk: pengingat (hanya bila due_time != null) + hapus-otomatis.
  // Task tanpa jam kedaluwarsa di AKHIR hari tanggalnya, bukan tengah malam.
  // Efek samping (toast/Notification) di luar setDaftar agar StrictMode
  // tidak menggandakannya lewat pemanggilan updater berulang.
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      const ingatkan = [];
      const hapus = [];
      for (const t of daftarRef.current) {
        const status = t.status ?? (t.selesai ? 'COMPLETED' : 'PENDING');
        if (status !== 'PENDING') continue;
        const due = dueMs(t);
        if (due == null) continue;
        const jam = keJamStr(t.due_time);
        let batas = due;
        if (!jam) {
          const tgl = keTanggalStr(t.due_date);
          const akhir = tgl ? new Date(`${tgl}T23:59:59`) : null;
          if (akhir && !Number.isNaN(akhir.getTime())) batas = akhir.getTime();
        }
        const sisa = due - now;
        if (jam && sisa > 0 && sisa <= REMINDER_MIN * 60e3 && !t.reminded) {
          ingatkan.push(t);
        } else if (batas < now) {
          hapus.push(t);
        }
      }
      if (!ingatkan.length && !hapus.length) return;
      for (const t of ingatkan) {
        tampilkanToast(`Segera: ${t.title ?? t.nama}`);
        try {
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`Segera: ${t.title ?? t.nama}`);
          }
        } catch { /* abaikan */ }
      }
      if (hapus.length) {
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
      const sHapus = new Set(hapus);
      const sIngat = new Set(ingatkan);
      setDaftar((cur) => cur
        .filter((t) => !sHapus.has(t))
        .map((t) => (sIngat.has(t) ? { ...t, reminded: true } : t)));
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

  const butuhSesi = async () => {
    if (!(await ambilToken())) {
      tampilkanToast('Sesi berakhir — masuk ulang');
      return false;
    }
    return true;
  };

  // Quick Capture -> pratinjau (selalu lewat AI; tanpa preview tidak ada tulis DB).
  const susun = async () => {
    if (susunRef.current) return;
    if (!paragraf.trim()) {
      tampilkanToast('Tulis dulu paragraf tugasnya');
      return;
    }
    susunRef.current = true;
    setSibukSusun(true);
    try {
      const hasil = await mintaParse(paragraf);
      if (Array.isArray(hasil?.tasks) && hasil.tasks.length) {
        setPreview(hasil.tasks.map(perkayaKandidat));
        tampilkanToast(`${hasil.tasks.length} kandidat siap diperiksa`);
        return;
      }
      tampilkanToast('AI tidak menemukan tugas — tulis lebih jelas, atau pakai mode Manual');
    } catch (e) {
      tampilkanToast(`Gagal menghubungi AI (${sebabGagal(e)}) — coba lagi atau pakai mode Manual`);
    } finally {
      susunRef.current = false;
      setSibukSusun(false);
    }
  };

  // Simpan payload ke antrean retry bila API gagal (dipakai konfirmasi & manual).
  const antrikan = (payload, e) => {
    console.error('buatTask gagal:', e);
    const antri = muat(KUNCI_ANTRI, []);
    antri.push(payload);
    try { localStorage.setItem(KUNCI_ANTRI, JSON.stringify(antri)); } catch { /* abaikan */ }
    setBelumSinkron(true);
    tampilkanToast(`Gagal menyimpan (${sebabGagal(e)}) — masuk antrean, retry otomatis`);
  };

  const konfirmasi = async (i) => {
    const k = preview[i];
    if (!k) return;
    if (!(await butuhSesi())) return;
    const payload = kePayload(k);
    try {
      const tersimpan = await buatTask(payload);
      setDaftar((d) => [...d, dariApi(tersimpan)]);
      tampilkanToast('Tugas tersimpan');
    } catch (e) {
      antrikan(payload, e);
      return;
    }
    setPreview((p) => p.filter((_, x) => x !== i));
  };

  // Mode Manual: isi 4 bidang -> simpan langsung via API.
  const simpanManual = async () => {
    const title = judulManual.trim();
    if (!title) { tampilkanToast('Judul tugas belum diisi'); return; }
    if (!(await butuhSesi())) return;
    const payload = {
      title,
      description: null,
      source_text: null,
      due_date: tanggalManual || null,
      due_time: jamManual || null,
      time_precision: jamManual ? 'EXACT' : 'UNSPECIFIED',
      duration_minutes: null,
      urgency: urgensiManual,
      priority: saranPriority(title).priority,
      priority_source: 'SYSTEM',
      ai_assumption: null,
    };
    try {
      const tersimpan = await buatTask(payload);
      setDaftar((d) => [...d, dariApi(tersimpan)]);
      setJudulManual(''); setTanggalManual(''); setJamManual(''); setUrgensiManual('NORMAL');
      tampilkanToast('Tugas tersimpan');
    } catch (e) {
      antrikan(payload, e);
    }
  };

  const ubahPreview = (i, patch) => {
    setPreview((p) => p.map((k, x) => {
      if (x !== i) return k;
      const gabung = { ...k, ...patch };
      // Asumsi yang sudah dijawab user jangan ditampilkan lagi.
      if (Array.isArray(gabung.assumptions) && gabung.assumptions.length) {
        let saring = gabung.assumptions;
        if (patch.due_date) saring = saring.filter((a) => !/tanggal/i.test(a));
        if (patch.due_time) saring = saring.filter((a) => !/jam/i.test(a));
        gabung.assumptions = saring;
      }
      return perkayaKandidat(gabung);
    }));
  };

  const batalPreview = (i) => {
    setPreview((p) => p.filter((_, x) => x !== i));
  };

  const saran = useMemo(() => saranUrutan(daftar), [daftar]);
  const bento = useMemo(() => hitungBento(daftar), [daftar]);

  const pilihSaran = (teks) => {
    setPrefillAsisten(teks);
    try {
      document.getElementById('asisten')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch { /* abaikan */ }
  };

  const ubah = async (id, baru) => {
    const title = (baru.title ?? baru.nama ?? '').trim();
    if (!title) return;
    if (!(await butuhSesi())) return;
    // Teruskan semua field yang bisa diedit (dulu priority/durasi/deskripsi
    // ikut ter-reset di server karena tak dikirim).
    const patch = {
      title,
      description: baru.description ?? null,
      due_date: keTanggalStr(baru.due_date ?? baru.tenggat) ?? null,
      due_time: keJamStr(baru.due_time) ?? null,
      time_precision: baru.time_precision ?? (keJamStr(baru.due_time) ? 'EXACT' : 'UNSPECIFIED'),
      duration_minutes: baru.duration_minutes ?? baru.durationMinutes ?? null,
      urgency: baru.urgency ?? baru.urgensi ?? undefined,
      priority: baru.priority ?? undefined,
      priority_source: baru.priority_source ?? baru.prioritySource ?? undefined,
    };
    try {
      const r = await ubahTask(id, patch);
      setDaftar((d) => d.map((t) => (t.id === id ? dariApi(r) : t)));
    } catch {
      tampilkanToast('Gagal mengubah di server');
    }
  };

  const hapus = async (id) => {
    if (!(await butuhSesi())) return;
    try {
      await hapusTask(id);
    } catch {
      tampilkanToast('Gagal menghapus di server');
      return;
    }
    setDaftar((d) => d.filter((t) => t.id !== id));
  };

  const toggle = async (id) => {
    const t = daftar.find((x) => x.id === id);
    if (!t) return;
    if (!(await butuhSesi())) return;
    const status = t.status ?? (t.selesai ? 'COMPLETED' : 'PENDING');
    try {
      const r = status === 'COMPLETED' ? await bukaUlangTask(id) : await selesaikanTask(id);
      setDaftar((d) => d.map((x) => (x.id === id ? dariApi(r) : x)));
    } catch {
      tampilkanToast('Gagal mengubah status di server');
    }
  };

  const ubahNama = async (namaBaru) => {
    const nama = String(namaBaru ?? '').trim();
    if (nama.length < 2 || nama.length > 40) {
      tampilkanToast('Nama harus 2–40 karakter');
      return false;
    }
    try {
      const p = await simpanProfil({ nama });
      setProfil((s) => ({ ...s, nama: p?.nama ?? nama }));
      tampilkanToast('Nama diperbarui');
      return true;
    } catch {
      tampilkanToast('Gagal menyimpan nama — coba lagi');
      return false;
    }
  };

  const mintaIzinNotifikasi = async () => {
    if (!('Notification' in window)) {
      tampilkanToast('Browser tidak mendukung notifikasi');
      return;
    }
    const izin = await Notification.requestPermission();
    tampilkanToast(izin === 'granted' ? 'Notifikasi diaktifkan' : 'Izin notifikasi ditolak — toast tetap jalan');
  };

  const masuk = async ({ email, sandi }) => {
    if (!supabase) {
      setGalatAuth('Supabase belum dikonfigurasi — hubungi admin');
      return;
    }
    setSibukAuth(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password: sandi });
      if (error) {
        setGalatAuth(`Gagal: ${error.message}`);
        return;
      }
      setGalatAuth('');
      tampilkanToast('Masuk berhasil');
    } finally {
      setSibukAuth(false);
    }
  };

  const daftarAkun = async ({ nama, email, sandi }) => {
    if (!supabase) {
      setGalatAuth('Supabase belum dikonfigurasi — hubungi admin');
      return;
    }
    setSibukAuth(true);
    try {
      const { error } = await supabase.auth.signUp({ email, password: sandi });
      if (error) {
        setGalatAuth(`Gagal: ${error.message}`);
        return;
      }
      setGalatAuth('');
      try {
        await simpanProfil({ nama, aiConsent: true, email });
      } catch {
        tampilkanToast('Profil gagal disimpan — coba lagi nanti');
      }
      tampilkanToast('Cek email untuk verifikasi');
    } finally {
      setSibukAuth(false);
    }
  };

  const masukGoogle = async () => {
    if (!supabase) {
      setGalatAuth('Supabase belum dikonfigurasi — hubungi admin');
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) setGalatAuth(`Gagal: ${error.message}`);
  };

  const keluar = async () => {
    if (supabase) await supabase.auth.signOut();
    simpanToken('');
    setPengguna(null);
    setProfil({ nama: '', aiConsent: false });
    setGalatAuth('');
    setDaftar([]);
    setPreview([]);
  };

  if (!pengguna) {
    return (
      <main className="wadah landing-terang">
        <AuthPage
          onMasuk={masuk}
          onDaftar={daftarAkun}
          onGoogle={masukGoogle}
          galat={galatAuth}
          sibuk={sibukAuth}
          namaAwal={''}
        />
      </main>
    );
  }

  return (
    <main className="wadah landing-terang">
      <Dashboard
        nama={profil.nama}
        email={pengguna?.email}
        foto={fotoProfil(pengguna)}
        onKeluar={keluar}
        onUbahNama={ubahNama}
        tugas={
          <>
            {belumSinkron && <p className="banner">Belum tersinkron — perubahan disimpan lokal, retry otomatis.</p>}
            <div className="panel-tiga">
              <Ringkasan bento={bento} />
              <section aria-label="Task terdekat" className="kartu panel-tengah">
                <h3>Task terdekat</h3>
                <TaskList daftar={daftar} onUbah={ubah} onHapus={hapus} onToggle={toggle} onTanya={(t) => pilihSaran(`Tanya soal: ${t.title ?? t.nama ?? ''}`)} />
              </section>
              <div id="asisten">
                <SaranUrutan saran={saran} onPilih={pilihSaran} />
                <AssistantBox pesanAwal={prefillAsisten} />
              </div>
            </div>
            <section aria-label="Tulis tugas baru" className="kartu">
              <div className="baris-kepala">
                <span className="judul-kartu">Tulis tugas baru</span>
                <button type="button" className="tombol-ganti-mode" onClick={() => setManual((v) => !v)}>
                  {manual ? 'Asisten' : 'Manual'}
                </button>
              </div>
              {manual ? (
                <div className="form-manual">
                  <div className="bidang">
                    <label htmlFor="judul-manual">Judul</label>
                    <input id="judul-manual" type="text" value={judulManual}
                      onChange={(e) => setJudulManual(e.target.value)} placeholder="Belikan galon air" />
                  </div>
                  <div className="bidang-ganda">
                    <div className="bidang">
                      <label htmlFor="tanggal-manual">Tanggal</label>
                      <input id="tanggal-manual" type="date" value={tanggalManual}
                        onChange={(e) => setTanggalManual(e.target.value)} />
                      {tanggalManual && <p className="hari">{hariTanggal(tanggalManual)}</p>}
                    </div>
                    <div className="bidang">
                      <label htmlFor="jam-manual">Jam</label>
                      <input id="jam-manual" type="time" value={jamManual}
                        onChange={(e) => setJamManual(e.target.value)} />
                    </div>
                  </div>
                  <div className="bidang">
                    <span className="label-bidang">Urgensi</span>
                    <div className="grup-urgensi" role="group" aria-label="Urgensi">
                      {[['URGENT', 'Penting'], ['NORMAL', 'Biasa'], ['LOW', 'Santai']].map(([nilai, teks]) => (
                        <button key={nilai} type="button" aria-pressed={urgensiManual === nilai}
                          onClick={() => setUrgensiManual(nilai)}>{teks}</button>
                      ))}
                    </div>
                  </div>
                  <button type="button" onClick={simpanManual}>Tambah tugas</button>
                </div>
              ) : (
                <>
                  <textarea id="paragraf" aria-label="Tulis tugas baru" rows={3} value={paragraf}
                    onChange={(e) => setParagraf(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) susun(); }}
                    placeholder="Contoh: Rapat jam 9, lalu kirim laporan 30 menit lagi. Besok apel pukul 07.30" />
                  <div className="baris">
                    <button type="button" onClick={susun} disabled={sibukSusun}>
                      {sibukSusun ? 'Menyusun…' : 'Susun jadi tugas'}
                    </button>
                    <p className="privasi">Paragraf hanya dikirim ke AI saat tombol ditekan.</p>
                  </div>
                </>
              )}
              <div className="baris">
                <button type="button" onClick={mintaIzinNotifikasi}>
                  Aktifkan notifikasi
                </button>
              </div>
            </section>
            <Preview daftar={preview} onKonfirmasi={konfirmasi} onUbah={ubahPreview} onBatal={batalPreview} />
          </>
        }
        rekap={<History daftar={daftar} onMuatBulan={riwayatBulan} />}
      />
      <Toast
        pesan={toast}
        aksiLabel={arsipHapus.current ? 'Urung' : undefined}
        onAksi={arsipHapus.current ? urungkanHapus : undefined}
      />
    </main>
  );
}
