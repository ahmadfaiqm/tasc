// client/src/components/Ringkasan.jsx
// Panel kiri landing: konteks, angka produktivitas besar, kartu aktivitas kuning.
export default function Ringkasan({ bento }) {
  const persen = bento?.selesaiPersen ?? 0;
  return (
    <section aria-label="Produktivitas" className="panel-kiri">
      <div className="konteks">✨ <strong>Proyek Pribadi</strong></div>
      <p className="angka-besar">{persen}%</p>
      <p className="mikro">SELESAI BULAN INI</p>
      <div className="kartu-aktivitas">
        <p className="mikro">AKTIVITAS</p>
        <div className="aktivitas-angka">
          <span>
            <strong>{bento?.selesaiX ?? 0}</strong>Selesai
          </span>
          <span>
            <strong>{bento?.mendesak ?? 0}</strong>Penting
          </span>
          <span>
            <strong>{bento?.aktif ?? 0}</strong>Aktif
          </span>
        </div>
      </div>
    </section>
  );
}
