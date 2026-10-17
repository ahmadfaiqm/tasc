// client/src/components/Dashboard.jsx
// Cangkang satu landing: topbar + sapaan + slot tugas + slot rekap. Tanpa tab, tanpa mode tamu.
import { useState } from 'react';

export default function Dashboard({ nama, email, onKeluar, onUbahNama, tugas, rekap }) {
  const [ubah, setUbah] = useState(false);
  const [draft, setDraft] = useState('');

  const bukaUbah = () => {
    setDraft(nama ?? '');
    setUbah(true);
  };
  const simpanNama = async (e) => {
    e.preventDefault();
    const ok = await onUbahNama?.(draft);
    if (ok) setUbah(false);
  };

  return (
    <div>
      <header className="topbar">
        <span className="auth-logo" style={{ position: 'static' }}>
          <span className="centang">✓</span> Taska
        </span>
        <nav aria-label="Bagian halaman" className="tautan-landing">
          <a href="#bagian-tugas">Hari ini</a>
          <a href="#bagian-tugas">Tugas</a>
          <a href="#bagian-rekap">Rekap</a>
          <a href="#asisten">Asisten</a>
        </nav>
        {ubah ? (
          <form className="baris" style={{ marginLeft: 'auto', marginTop: 0 }} onSubmit={simpanNama}>
            <input
              aria-label="Nama baru"
              value={draft}
              maxLength={40}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') setUbah(false); }}
            />
            <button type="submit">Simpan</button>
            <button type="button" className="tombol-garis" onClick={() => setUbah(false)}>Batal</button>
          </form>
        ) : (
          <>
            <span className="dash-nama">{nama || email || 'Teman'}</span>
            {onUbahNama && (
              <button type="button" className="tombol-garis" onClick={bukaUbah}>Ubah nama</button>
            )}
          </>
        )}
        <button type="button" className="tombol-garis" onClick={onKeluar}>
          Keluar
        </button>
      </header>
      <main>
        <div className="salam">
          <h2>Halo, {nama || 'teman'}!</h2>
          <p className="mikro">TASK HARI INI</p>
        </div>
        <div id="bagian-tugas">{tugas}</div>
        <div id="bagian-rekap">{rekap}</div>
      </main>
    </div>
  );
}
