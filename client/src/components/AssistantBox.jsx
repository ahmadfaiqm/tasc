// client/src/components/AssistantBox.jsx
// Chat read-only (P0): hanya membaca; mutasi ditolak server dan diarahkan ke preview.
import { useEffect, useRef, useState } from 'react';
import { tanyaAsisten } from '../lib/api.js';

const SARAN_CEPAT = [
  'Mana yang kukerjakan dulu?',
  'Hari ini padat tidak?',
  'Apa yang mendesak?',
  'Ringkas jadwalku besok',
];

export default function AssistantBox() {
  const [pesan, setPesan] = useState('');
  const [riwayat, setRiwayat] = useState([]);
  const [sibuk, setSibuk] = useState(false);
  const dasar = useRef(null);

  useEffect(() => {
    dasar.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [riwayat, sibuk]);

  const tanya = async (teksMentah) => {
    const teks = (teksMentah ?? pesan).trim();
    if (!teks || sibuk) return;
    setPesan('');
    setRiwayat((r) => [...r, { dari: 'user', teks }]);
    setSibuk(true);
    try {
      const r = await tanyaAsisten(teks);
      setRiwayat((w) => [...w, { dari: 'ai', teks: r?.jawaban ?? '(tidak ada jawaban)' }]);
    } catch {
      setRiwayat((w) => [...w, { dari: 'ai', teks: 'Asisten tidak tersedia — periksa koneksi atau masuk dulu.' }]);
    } finally {
      setSibuk(false);
    }
  };

  return (
    <section aria-label="Asisten" className="kartu asisten">
      <h3>Asisten</h3>
      <p className="privasi">Asisten hanya bisa membaca. Untuk mengubah task, gunakan pratinjau.</p>
      <ol className="chat-daftar" role="log" aria-label="Percakapan asisten" aria-live="polite">
        {riwayat.map((m, i) => (
          <li key={i} className={`balon ${m.dari}`}>
            {m.teks}
          </li>
        ))}
        {sibuk && (
          <li className="balon ai" aria-hidden="true">
            Mengetik…
          </li>
        )}
      </ol>
      <div ref={dasar} />
      <div className="saran-cepat">
        {SARAN_CEPAT.map((s) => (
          <button key={s} type="button" onClick={() => tanya(s)} disabled={sibuk}>
            {s}
          </button>
        ))}
      </div>
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
        <button type="button" onClick={() => tanya()} disabled={sibuk}>
          {sibuk ? 'Menanya…' : 'Tanya'}
        </button>
      </div>
    </section>
  );
}
