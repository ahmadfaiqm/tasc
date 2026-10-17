// client/src/components/Dashboard.jsx
// Cangkang satu landing: topbar (avatar profil di kanan atas) + sapaan + slot tugas + slot rekap.
import { useState } from 'react';
import { inisialProfil } from '../lib/profil.js';
import PengaturanProfil from './PengaturanProfil.jsx';

export default function Dashboard({ nama, email, foto, onKeluar, onUbahNama, tugas, rekap }) {
  const [menuTerbuka, setMenuTerbuka] = useState(false);
  const [pengaturanTerbuka, setPengaturanTerbuka] = useState(false);

  const bukaPengaturan = () => {
    setMenuTerbuka(false);
    setPengaturanTerbuka(true);
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
        <div className="profil">
          <button
            type="button"
            className="avatar"
            aria-label="Menu profil"
            aria-haspopup="menu"
            aria-expanded={menuTerbuka}
            onClick={() => setMenuTerbuka((v) => !v)}
          >
            {foto ? (
              <img src={foto} alt="" />
            ) : (
              <span aria-hidden="true">{inisialProfil(nama, email)}</span>
            )}
          </button>
          {menuTerbuka && (
            <div role="menu" aria-label="Profil" className="profil-menu">
              <div className="profil-kepala">
                <strong>{nama || 'Teman'}</strong>
                <span className="profil-email">{email}</span>
              </div>
              <button type="button" role="menuitem" onClick={bukaPengaturan}>
                <span aria-hidden="true">⚙️</span> Pengaturan profil
              </button>
              <button type="button" role="menuitem" className="profil-keluar" onClick={onKeluar}>
                <span aria-hidden="true">↪</span> Keluar
              </button>
            </div>
          )}
        </div>
      </header>
      <main>
        <div className="salam">
          <h2>Halo, {nama || 'teman'}!</h2>
          <p className="mikro">TASK HARI INI</p>
        </div>
        <div id="bagian-tugas">{tugas}</div>
        <div id="bagian-rekap">{rekap}</div>
      </main>
      {pengaturanTerbuka && (
        <PengaturanProfil
          nama={nama}
          email={email}
          foto={foto}
          onSimpan={onUbahNama}
          onTutup={() => setPengaturanTerbuka(false)}
        />
      )}
    </div>
  );
}
