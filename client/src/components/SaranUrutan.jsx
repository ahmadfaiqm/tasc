export default function SaranUrutan({ saran, onPilih }) {
  const baris = saran?.pertama
    ? [
      `Kerjakan ${saran.pertama} dulu — ${saran.alasan}`,
      ...(saran.kedua ? [`Lalu ${saran.kedua}`] : []),
      ...(saran.sisa?.length ? [`Sisa: ${saran.sisa.join(', ')}`] : []),
    ]
    : [];
  return (
    <section aria-label="Masukan cepat" className="kartu masukan">
      <h3>Masukan cepat</h3>
      {baris.length ? (
        <ul className="daftar-masukan">
          {baris.map((b) => (
            <li key={b}>
              <button type="button" onClick={() => onPilih?.(b)}>
                {b} <span aria-hidden="true">▸</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="masukan-kosong">Tambahkan task nanti aku bantu saranin</p>
      )}
    </section>
  );
}
