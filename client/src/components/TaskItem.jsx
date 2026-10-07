import { useState } from 'react';

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
  if (v == null) return null;
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return null;
    return `${String(v.getUTCHours()).padStart(2, '0')}:${String(v.getUTCMinutes()).padStart(2, '0')}`;
  }
  const s = String(v).trim();
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(s) ? s : null;
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
  return jam ? `${tglTampil} · ${jam}` : `${tglTampil} · Jam belum ditentukan`;
}

export default function TaskItem({ tugas, onUbah, onHapus, onToggle }) {
  const nama = judul(tugas);
  const isSelesai = selesai(tugas);
  const urg = urgensi(tugas);
  const prioritas = tugas.priority ?? null;
  const [modeEdit, setModeEdit] = useState(false);
  const [namaBaru, setNamaBaru] = useState(nama);

  const simpan = () => {
    const title = namaBaru.trim();
    if (title && title !== nama) onUbah({ ...tugas, title, nama: undefined });
    setModeEdit(false);
  };

  return (
    <li className={`tugas ${isSelesai ? 'selesai' : ''} ${tugas.segera ? 'segera' : ''}`}>
      <input
        type="checkbox"
        aria-label={`Tandai selesai: ${nama}`}
        checked={isSelesai}
        onChange={onToggle}
      />
      <div className="tugas-teks">
        {modeEdit ? (
          <input
            aria-label="Judul tugas"
            value={namaBaru}
            onChange={(e) => setNamaBaru(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') simpan();
              if (e.key === 'Escape') {
                setNamaBaru(nama);
                setModeEdit(false);
              }
            }}
            autoFocus
          />
        ) : (
          <>
            <span className="tugas-nama">{nama}</span>{' '}
            <time className="tugas-waktu">
              {tampilWaktu(tugas)}
              {tugas.segera && !isSelesai ? ' — segera' : ''}
            </time>
          </>
        )}
      </div>
      <span className={`label label-${String(urg).toLowerCase()}`}>{urg}</span>
      {prioritas && (
        <span className={`label label-prioritas-${String(prioritas).toLowerCase()}`}>{prioritas}</span>
      )}
      {modeEdit ? (
        <button type="button" aria-label={`Simpan ${nama}`} onClick={simpan}>
          Simpan
        </button>
      ) : (
        <button type="button" aria-label={`Ubah ${nama}`} onClick={() => setModeEdit(true)}>
          Ubah
        </button>
      )}
      <button type="button" aria-label={`Hapus ${nama}`} onClick={onHapus}>
        Hapus
      </button>
      {modeEdit && (
        <button
          type="button"
          onClick={() => {
            setNamaBaru(nama);
            setModeEdit(false);
          }}
        >
          Batal
        </button>
      )}
    </li>
  );
}
