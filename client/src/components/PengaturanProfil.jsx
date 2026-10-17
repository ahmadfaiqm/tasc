import { useState } from 'react';
import { inisialProfil } from '../lib/profil.js';

export default function PengaturanProfil({ nama, email, foto, onSimpan, onTutup }) {
  const [draft, setDraft] = useState(nama ?? '');
  const [sibuk, setSibuk] = useState(false);

  const simpan = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setSibuk(true);
    try {
      const ok = await onSimpan?.(draft);
      if (ok) onTutup?.();
    } finally {
      setSibuk(false);
    }
  };

  return (
    <div className="dialog-latar" onClick={onTutup}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Pengaturan profil"
        className="dialog-profil"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onTutup?.();
        }}
      >
        <div className="dialog-kepala">
          <h3>Pengaturan profil</h3>
          <button type="button" className="dialog-tutup" aria-label="Tutup" onClick={onTutup}>
            ×
          </button>
        </div>

        <div className="baris-profil">
          <span className="avatar-besar">
            {foto ? <img src={foto} alt="" /> : <span aria-hidden="true">{inisialProfil(nama, email)}</span>}
          </span>
          <div>
            <strong>Foto profil</strong>
            <p className="privasi">Otomatis dari akun Google — tidak bisa diubah dari sini.</p>
          </div>
        </div>

        <form onSubmit={simpan}>
          <label htmlFor="profil-nama">Nama</label>
          <input
            id="profil-nama"
            type="text"
            value={draft}
            maxLength={40}
            onChange={(e) => setDraft(e.target.value)}
          />
          <p className="mikro">Alamat email</p>
          <p className="nilai-email">{email || '—'}</p>
          <div className="baris" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="tombol-garis" onClick={onTutup}>
              Batal
            </button>
            <button type="submit" disabled={sibuk}>
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
