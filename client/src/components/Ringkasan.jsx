// client/src/components/Ringkasan.jsx
export default function Ringkasan({ nama, bento }) {
  const inisial = (nama || 'T').trim().charAt(0).toUpperCase() || 'T';
  return (
    <section aria-label="Ringkasan">
      <p className="mikro">RINGKASAN</p>
      <h2>Halo, {nama || 'teman'}</h2>
      <div className="bento-grid">
        <div className="bento bento-lime">
          <p className="mikro">TUGAS AKTIF</p>
          <p className="angka">{bento.aktif}</p>
        </div>
        <div className="bento bento-hitam">
          <p className="mikro">MENDESAK</p>
          <p className="angka">{bento.mendesak}</p>
        </div>
        <div className="bento bento-abu">
          <p className="mikro">SELESAI BULAN INI</p>
          <p className="angka">{bento.selesaiPersen}%</p>
          <p>
            {bento.selesaiX} dari {bento.selesaiY} tugas bulan ini
          </p>
        </div>
        <div className="bento bento-biru">
          <div className="bento-head">
            <span className="avatar" aria-hidden="true">
              {inisial}
            </span>
            <p className="mikro">BERIKUTNYA</p>
          </div>
          {bento.berikut ? (
            <p>
              {[bento.berikut.jam, bento.berikut.hari, bento.berikut.nama].filter(Boolean).join(' · ')}
            </p>
          ) : (
            <p>Tidak ada jadwal</p>
          )}
        </div>
      </div>
    </section>
  );
}
