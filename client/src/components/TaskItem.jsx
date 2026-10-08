import { useState } from 'react';
import { labelUrgensi } from '../lib/urgensi.js';

// Kontrak baru: {title, due_date, due_time, time_precision, status, urgency, priority}.
// Fallback baca cache tamu lama: {nama, tenggat, selesai, urgensi}.
function judul(tugas) {
  return tugas.title ?? tugas.nama ?? '';
}

function selesai(tugas) {
  if (typeof tugas.status === 'string') return tugas.status === 'COMPLETED';
  return Boolean(tugas.selesai);
}

function urgensi(tugas) {
  const u = tugas.urgency ?? tugas.urgensi ?? 'LOW';
  if (u === 'Mendesak') return 'URGENT';
  if (u === 'Sedang') return 'NORMAL';
  if (u === 'Santai') return 'LOW';
  return u;
}

function tanggalStr(v) {
  if (v == null || v === '') return '';
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? '' : v.toISOString().slice(0, 10);
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

function jamStr(v) {
  if (v == null) return '';
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return '';
    return `${String(v.getUTCHours()).padStart(2, '0')}:${String(v.getUTCMinutes()).padStart(2, '0')}`;
  }
  const s = String(v).trim();
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(s) ? s : '';
}

function dueMs(tugas) {
  if (tugas.tenggat) {
    const d = new Date(tugas.tenggat);
    if (!Number.isNaN(d.getTime())) return d.getTime();
  }
  const tgl = tanggalStr(tugas.due_date);
  if (!tgl) return null;
  const jam = jamStr(tugas.due_time);
  const d = new Date(jam ? `${tgl}T${jam}:00` : `${tgl}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

function awalanRelatif(tgl) {
  if (!tgl) return '';
  const hariIni = new Date();
  const kunci = (x) => `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
  const d = new Date(`${tgl}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  const beda = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date(hariIni.getFullYear(), hariIni.getMonth(), hariIni.getDate())) / 864e5);
  if (beda === 0) return 'Hari ini, ';
  if (beda === 1) return 'Besok, ';
  if (beda === 2) return 'Lusa, ';
  return '';
}

function tampilWaktu(tugas) {
  if (tugas.tenggat) {
    const d = new Date(tugas.tenggat);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    }
  }
  const tgl = tanggalStr(tugas.due_date);
  const jam = jamStr(tugas.due_time);
  if (!tgl && !jam) return 'Jam belum ditentukan';
  const d = tgl ? new Date(`${tgl}T00:00:00`) : null;
  const tglTampil = d && !Number.isNaN(d.getTime())
    ? d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
    : tgl;
  const rel = awalanRelatif(tgl);
  return jam ? `${rel}${tglTampil} · ${jam}` : `${rel}${tglTampil} · Jam belum ditentukan`;
}

const PILIHAN_URGENSI = [
  { nilai: 'URGENT', teks: 'Mendesak' },
  { nilai: 'NORMAL', teks: 'Sedang' },
  { nilai: 'LOW', teks: 'Santai' },
];

export default function TaskItem({ tugas, onUbah, onHapus, onToggle }) {
  const nama = judul(tugas);
  const isSelesai = selesai(tugas);
  const urg = urgensi(tugas);
  const label = labelUrgensi(urg);
  const due = dueMs(tugas);
  const sisa = due == null ? null : due - Date.now();
  const mepet = !isSelesai && sisa != null && sisa > 0 && sisa <= 5 * 60e3;

  const [modeEdit, setModeEdit] = useState(false);
  const [namaBaru, setNamaBaru] = useState(nama);
  const [tglBaru, setTglBaru] = useState(() => tanggalStr(tugas.due_date));
  const [jamBaru, setJamBaru] = useState(() => jamStr(tugas.due_time));
  const [urgBaru, setUrgBaru] = useState(urg);

  const mulaiEdit = () => {
    setNamaBaru(nama);
    setTglBaru(tanggalStr(tugas.due_date));
    setJamBaru(jamStr(tugas.due_time));
    setUrgBaru(urg);
    setModeEdit(true);
  };

  const simpan = () => {
    const title = namaBaru.trim();
    if (title) {
      onUbah({
        ...tugas,
        title,
        due_date: tglBaru || null,
        due_time: jamBaru || null,
        time_precision: jamBaru ? 'EXACT' : 'UNSPECIFIED',
        urgency: urgBaru,
      });
    }
    setModeEdit(false);
  };

  const batal = () => {
    setNamaBaru(nama);
    setModeEdit(false);
  };

  return (
    <li className={`tugas ${isSelesai ? 'selesai' : ''} ${mepet ? 'segera' : ''}`}>
      <input
        type="checkbox"
        aria-label={`Tandai selesai: ${nama}`}
        checked={isSelesai}
        onChange={onToggle}
      />
      {modeEdit ? (
        <div className="tugas-edit">
          <label>
            Nama tugas
            <input
              aria-label="Judul tugas"
              value={namaBaru}
              onChange={(e) => setNamaBaru(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') simpan();
                if (e.key === 'Escape') batal();
              }}
              autoFocus
            />
          </label>
          <div className="baris">
            <label>
              Tanggal
              <input type="date" aria-label="Tanggal tenggat" value={tglBaru} onChange={(e) => setTglBaru(e.target.value)} />
            </label>
            <label>
              Jam
              <input type="time" aria-label="Jam tenggat" value={jamBaru} onChange={(e) => setJamBaru(e.target.value)} />
            </label>
            <label>
              Urgensi
              <select aria-label="Tingkat urgensi" value={urgBaru} onChange={(e) => setUrgBaru(e.target.value)}>
                {PILIHAN_URGENSI.map((p) => (
                  <option key={p.nilai} value={p.nilai}>
                    {p.teks}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="baris">
            <button type="button" className="tombol-ikon" aria-label={`Simpan ${nama}`} title="Simpan (Enter)" onClick={simpan}>
              &#10003;
            </button>
            <button type="button" className="tombol-ikon" aria-label="Batalkan perubahan" title="Batal (Escape)" onClick={batal}>
              &#8617;
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="tugas-teks">
            <span className="tugas-nama">{nama}</span>{' '}
            <time className="tugas-waktu">
              {tampilWaktu(tugas)}
              {mepet ? ' — kurang dari 5 menit' : ''}
            </time>
          </div>
          <span className={`label ${label.kelas}`}>{label.teks}</span>
          <button type="button" className="tombol-ikon" aria-label={`Ubah ${nama}`} title={`Ubah ${nama}`} onClick={mulaiEdit}>
            &#9998;
          </button>
          <button type="button" className="tombol-ikon" aria-label={`Hapus ${nama}`} title={`Hapus ${nama}`} onClick={onHapus}>
            &#10005;
          </button>
        </>
      )}
    </li>
  );
}
