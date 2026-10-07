// client/src/components/AssistantBox.jsx
// Chat read-only (P0): hanya membaca; mutasi ditolak server dan diarahkan ke preview.
import { useState } from 'react';
import { tanyaAsisten } from '../lib/api.js';

export default function AssistantBox() {
  const [pesan, setPesan] = useState('');
  const [jawaban, setJawaban] = useState('');
  const [sibuk, setSibuk] = useState(false);

  const tanya = async () => {
    const teks = pesan.trim();
    if (!teks || sibuk) return;
    setSibuk(true);
    try {
      const r = await tanyaAsisten(teks);
      setJawaban(r?.jawaban ?? '(tidak ada jawaban)');
    } catch {
      setJawaban('Asisten tidak tersedia — periksa koneksi atau masuk dulu.');
    } finally {
      setSibuk(false);
    }
  };

  return (
    <section aria-label="Asisten" className="kartu asisten">
      <h2>Asisten</h2>
      <p className="privasi">Asisten hanya bisa membaca. Untuk mengubah task, gunakan pratinjau.</p>
      <label htmlFor="pesan-asisten">Tanya asisten</label>
      <input
        id="pesan-asisten"
        value={pesan}
        onChange={(e) => setPesan(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') tanya();
        }}
        placeholder="Contoh: apa saja yang terlambat?"
      />
      <div className="baris">
        <button type="button" onClick={tanya} disabled={sibuk}>
          {sibuk ? 'Menanya…' : 'Tanya'}
        </button>
      </div>
      {jawaban && (
        <p className="jawaban" aria-live="polite">
          {jawaban}
        </p>
      )}
    </section>
  );
}
