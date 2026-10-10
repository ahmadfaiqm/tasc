import { useState } from 'react';

const CONTOH = [
  { judul: '49%', sub: 'Selesai tepat waktu' },
  { judul: 'Mendesak', sub: '2 tugas butuh cepat' },
  { judul: 'AI membaca', sub: 'Bahasa sehari-hari' },
  { judul: 'Rekap', sub: 'Riwayat per bulan' },
  { judul: 'Berikutnya', sub: 'Selalu tahu urutan' },
];

export default function AuthPage({ onMasuk, onDaftar, onGoogle, onTamu, galat = '', sibuk = false, namaAwal = '' }) {
  const [tab, setTab] = useState('masuk');
  const [nama, setNama] = useState(namaAwal);
  const [email, setEmail] = useState('');
  const [sandi, setSandi] = useState('');
  const [setuju, setSetuju] = useState(false);
  const [petunjuk, setPetunjuk] = useState('');
  const pesan = petunjuk || galat;
  const namaOk = nama.trim().length >= 2 && nama.trim().length <= 40;

  const kirimMasuk = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!email.trim()) {
      setPetunjuk('Isi email dulu.');
      return;
    }
    setPetunjuk('');
    onMasuk({ email: email.trim(), sandi });
  };

  const kirimDaftar = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!namaOk) {
      setPetunjuk('Nama tampilan 2–40 karakter.');
      return;
    }
    if (!email.trim()) {
      setPetunjuk('Isi email dulu.');
      return;
    }
    setPetunjuk('');
    onDaftar({ nama: nama.trim(), email: email.trim(), sandi });
  };

  return (
    <div className="auth-page">
      <section aria-label="Masuk akun" className="auth-hero">
        <nav aria-label="Navigasi" className="auth-nav">
          <p className="auth-logo">
            <span className="centang">✓</span> Taska
          </p>
          <div className="tautan-tengah">
            <a href="#auth-card" onClick={() => setTab('masuk')}>
              Masuk
            </a>
            <a href="#auth-card" onClick={() => setTab('daftar')}>
              Daftar
            </a>
          </div>
          <a className="cta-lime" href="#auth-card">
            Mulai
          </a>
        </nav>
        <h1>Susun harimu bersama AI</h1>
        <p className="sub">Tulis rencana dengan bahasa sehari-hari — TASKA menyusunnya jadi tugas terjadwal.</p>
        <div className="auth-card" id="auth-card">
          <div role="tablist" aria-label="Masuk atau daftar" className="tab-segmented">
            <button type="button" role="tab" aria-selected={tab === 'masuk'} onClick={() => setTab('masuk')}>
              Masuk
            </button>
            <button type="button" role="tab" aria-selected={tab === 'daftar'} onClick={() => setTab('daftar')}>
              Daftar
            </button>
          </div>
          {pesan ? (
            <p role="alert" className="galat">
              {pesan}
            </p>
          ) : null}
          {tab === 'masuk' ? (
            <form onSubmit={kirimMasuk}>
              <label htmlFor="auth-email">Email</label>
              <input id="auth-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" autoComplete="email" />
              <label htmlFor="auth-sandi">Sandi</label>
              <input id="auth-sandi" type="password" value={sandi} onChange={(e) => setSandi(e.target.value)} autoComplete="current-password" />
              <div className="baris">
                <button type="submit" className="tombol-utama" disabled={sibuk}>
                  Masuk{' '}
                  <span className="panah" aria-hidden="true">
                    →
                  </span>
                </button>
              </div>
              <p className="mikro">RINGKASAN AKUN</p>
              <button type="button" onClick={onGoogle} disabled={sibuk}>
                Masuk dengan Google
              </button>
            </form>
          ) : (
            <form onSubmit={kirimDaftar}>
              <label htmlFor="auth-nama">Nama tampilan</label>
              <input id="auth-nama" type="text" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama untuk sapaan" autoComplete="nickname" maxLength={40} />
              <label htmlFor="auth-email-daftar">Email</label>
              <input id="auth-email-daftar" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" autoComplete="email" />
              <label htmlFor="auth-sandi-daftar">Sandi</label>
              <input id="auth-sandi-daftar" type="password" value={sandi} onChange={(e) => setSandi(e.target.value)} autoComplete="new-password" />
              <label htmlFor="auth-setuju">
                <input id="auth-setuju" type="checkbox" checked={setuju} onChange={(e) => setSetuju(e.target.checked)} />
                AI boleh membaca tulisanku
              </label>
              <div className="baris">
                <button type="submit" className="tombol-utama" disabled={sibuk || !setuju}>
                  Daftar{' '}
                  <span className="panah" aria-hidden="true">
                    →
                  </span>
                </button>
              </div>
            </form>
          )}
          <div className="baris">
            <button type="button" onClick={onTamu}>
              Lanjut tanpa akun (mode lokal)
            </button>
          </div>
        </div>
        <div className="kartu-contoh" aria-hidden="true">
          {CONTOH.map((c) => (
            <span key={c.judul} className="contoh">
              <strong>{c.judul}</strong>
              <span>{c.sub}</span>
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
