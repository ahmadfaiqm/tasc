// client/src/components/Dashboard.jsx
// Cangkang satu landing: topbar + sapaan + slot tugas + slot rekap. Tanpa tab, tanpa mode tamu.
export default function Dashboard({ nama, email, onKeluar, tugas, rekap }) {
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
        <span className="dash-nama">{nama || email || 'Teman'}</span>
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
