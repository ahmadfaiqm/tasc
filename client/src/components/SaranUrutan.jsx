export default function SaranUrutan({ saran }) {
  if (!saran || !saran.pertama) return null;
  return (
    <section aria-label="Saran urutan" className="saran">
      <h2>Saran urutan</h2>
      <p>
        Kerjakan <strong>{saran.pertama}</strong> dulu ({saran.alasan}
        ){saran.kedua ? (
          <>
            , lalu <strong>{saran.kedua}</strong>
          </>
        ) : null}
        {saran.sisa?.length ? ` — sisa: ${saran.sisa.join(', ')}` : '.'}
      </p>
    </section>
  );
}
