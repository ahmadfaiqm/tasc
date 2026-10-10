// client/src/components/Ringkasan.jsx
export default function Ringkasan({ nama, bento }) {
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
          <p className="mikro">BERIKUTNYA</p>
          {bento.berikut ? (
            <p>
              {bento.berikut.jam} · {bento.berikut.hari} · {bento.berikut.nama}
            </p>
          ) : (
            <p>Tidak ada jadwal</p>
          )}
        </div>
      </div>
    </section>
  );
}
