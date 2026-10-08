export default function SaranUrutan({ saran }) {
  if (!saran || !saran.pertama) return null;
  return (
    <section aria-label="Saran urutan" className="saran">
      <h3>Saran urutan</h3>
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
