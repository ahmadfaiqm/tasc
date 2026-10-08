import { useEffect, useReducer } from 'react';
import TaskItem from './TaskItem.jsx';

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

function kunciTgl(t) {
  if (t.tenggat) {
    const d = new Date(t.tenggat);
    if (!Number.isNaN(d.getTime())) {
      const p = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    }
  }
  const v = t.due_date;
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  return null;
}

function jamSort(t) {
  const j = typeof t.due_time === 'string' && /^\d{2}:\d{2}$/.test(t.due_time) ? t.due_time : '99:99';
  if (t.tenggat) {
    const d = new Date(t.tenggat);
    if (!Number.isNaN(d.getTime())) {
      const p = (n) => String(n).padStart(2, '0');
      return `${p(d.getHours())}:${p(d.getMinutes())}`;
    }
  }
  return j;
}

function judulHari(tgl) {
  const d = new Date(`${tgl}T00:00:00`);
  const cal = Number.isNaN(d.getTime())
    ? tgl
    : d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });
  const hariIni = new Date();
  const kunci = (x) => `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
  if (!Number.isNaN(d.getTime()) && kunci(d) === kunci(hariIni)) return `Hari ini · ${cal}`;
  return cal;
}

function judulBulan(tgl) {
  const d = new Date(`${tgl}T00:00:00`);
  if (Number.isNaN(d.getTime())) return 'TANPA TANGGAL';
  return `${NAMA_BULAN[d.getMonth()].toUpperCase()} ${d.getFullYear()}`;
}

export default function TaskList({ daftar, onUbah, onHapus, onToggle }) {
  // Render ulang berkala agar penanda "kurang dari 5 menit" tepat waktu.
  const [, segarkan] = useReducer((x) => x + 1, 0);
  useEffect(() => {
    const id = setInterval(segarkan, 30000);
    return () => clearInterval(id);
  }, []);

  if (!daftar.length) return <p className="kosong">Belum ada tugas. Tulis paragraf lalu tekan “Susun jadi tugas”.</p>;

  const grup = new Map();
  for (const t of daftar) {
    const k = kunciTgl(t) ?? 'tanpa-tanggal';
    if (!grup.has(k)) grup.set(k, []);
    grup.get(k).push(t);
  }
  const urutHari = [...grup.entries()].sort(([a], [b]) => {
    if (a === 'tanpa-tanggal') return 1;
    if (b === 'tanpa-tanggal') return -1;
    return a < b ? -1 : 1;
  });

  let bulanAktif = null;
  return (
    <div>
      {urutHari.map(([tgl, isi]) => {
        const bulan = tgl === 'tanpa-tanggal' ? 'TANPA TANGGAL' : judulBulan(tgl);
        const kepalaBulan = bulan !== bulanAktif ? ((bulanAktif = bulan), true) : false;
        const tampil = [...isi].sort((a, b) => (jamSort(a) < jamSort(b) ? -1 : 1));
        return (
          <div key={tgl}>
            {kepalaBulan && <h4 className="grup-bulan">{bulan}</h4>}
            <div className="grup-hari">
              <span>{tgl === 'tanpa-tanggal' ? 'Belum bertanggal' : judulHari(tgl)}</span>
              <span className="jumlah">{isi.length} tugas</span>
            </div>
            <ul className="daftar-tugas">
              {tampil.map((t) => (
                <TaskItem
                  key={t.id}
                  tugas={t}
                  onUbah={(baru) => onUbah(t.id, baru)}
                  onHapus={() => onHapus(t.id)}
                  onToggle={() => onToggle(t.id)}
                />
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
