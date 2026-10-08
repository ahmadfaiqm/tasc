// client/src/components/Preview.jsx
// Daftar kandidat hasil parse (belum disimpan) + Confirm/Edit/Cancel per baris.
import { useState } from 'react';
import { labelUrgensi } from '../lib/urgensi.js';

function keTanggalStr(v) {
  if (v == null || v === '') return '';
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return '';
    const p = (n) => String(n).padStart(2, '0');
    return `${v.getFullYear()}-${p(v.getMonth() + 1)}-${p(v.getDate())}`;
  }
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function tampilTanggal(v) {
  const s = keTanggalStr(v);
  if (!s) return '—';
  const d = new Date(`${s}T00:00:00`);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function tampilJam(kandidat) {
  if (kandidat.due_time && /^\d{2}:\d{2}$/.test(String(kandidat.due_time))) return kandidat.due_time;
  return 'Jam belum ditentukan';
}

export default function Preview({ daftar, onKonfirmasi, onUbah, onBatal }) {
  const [editIdx, setEditIdx] = useState(null);
  const [judul, setJudul] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [jam, setJam] = useState('');

  if (!daftar?.length) return null;

  const mulaiEdit = (i) => {
    const k = daftar[i];
    setEditIdx(i);
    setJudul(k.title ?? '');
    setTanggal(keTanggalStr(k.due_date));
    setJam(k.due_time ?? '');
  };

  const simpanEdit = (i) => {
    const patch = { title: judul.trim() || daftar[i].title };
    patch.due_date = tanggal ? tanggal : null;
    if (jam && /^\d{2}:\d{2}$/.test(jam)) {
      patch.due_time = jam;
      patch.time_precision = 'EXACT';
    } else if (daftar[i].time_precision === 'PERIOD') {
      patch.due_time = null;
      patch.time_precision = 'PERIOD';
    } else {
      patch.due_time = null;
      patch.time_precision = 'UNSPECIFIED';
    }
    onUbah(i, patch);
    setEditIdx(null);
  };

  return (
    <section aria-label="Pratinjau tugas" className="kartu pratinjau">
      <h3>Pratinjau ({daftar.length})</h3>
      <p className="privasi">Periksa dulu — tugas baru tersimpan setelah Anda menekan Konfirmasi.</p>
      <ul className="daftar-pratinjau">
        {daftar.map((k, i) => (
          <li key={k.id ?? i} className="baris-pratinjau">
            {editIdx === i ? (
              <div className="edit-pratinjau">
                <label htmlFor={`judul-${i}`}>Judul</label>
                <input
                  id={`judul-${i}`}
                  value={judul}
                  onChange={(e) => setJudul(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') simpanEdit(i);
                    if (e.key === 'Escape') setEditIdx(null);
                  }}
                  autoFocus
                />
                <div className="baris">
                  <label htmlFor={`tgl-${i}`}>Tanggal</label>
                  <input id={`tgl-${i}`} type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
                  <label htmlFor={`jam-${i}`}>Jam</label>
                  <input id={`jam-${i}`} type="time" value={jam} onChange={(e) => setJam(e.target.value)} />
                </div>
                <div className="baris">
                  <button type="button" onClick={() => simpanEdit(i)}>
                    Simpan
                  </button>
                  <button type="button" onClick={() => setEditIdx(null)}>
                    Batal
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="pratinjau-teks">
                  <strong>{k.title}</strong>{' '}
                  <span className="pratinjau-waktu">
                    {tampilTanggal(k.due_date)} · {tampilJam(k)}
                  </span>
                  {Array.isArray(k.assumptions) && k.assumptions.length > 0 && (
                    <span className="asumsi">Asumsi: {k.assumptions.join('; ')}</span>
                  )}
                  {k.priority && (
                    <span className={`label label-prioritas-${String(k.priority).toLowerCase()}`}>
                      {k.priority}
                      {k.alasan_prioritas ? ` — ${k.alasan_prioritas}` : k.reason ? ` — ${k.reason}` : ''}
                    </span>
                  )}
                  {k.urgency && (() => { const l = labelUrgensi(k.urgency); return <span className={`label ${l.kelas}`}>{l.teks}</span>; })()}
                </div>
                <div className="baris">
                  <button type="button" onClick={() => onKonfirmasi(i)}>
                    Konfirmasi
                  </button>
                  <button type="button" aria-label={`Ubah ${k.title}`} onClick={() => mulaiEdit(i)}>
                    Ubah
                  </button>
                  <button type="button" aria-label={`Batalkan ${k.title}`} onClick={() => onBatal(i)}>
                    Batal
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
