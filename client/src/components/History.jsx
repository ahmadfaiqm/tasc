// client/src/components/History.jsx
// Ringkasan bulanan dari GET /api/history/:y/:m (overdue dihitung server).
import { useCallback, useEffect, useState } from 'react';
import { riwayatBulan } from '../lib/api.js';

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export default function History() {
  const skrg = new Date();
  const [tahun, setTahun] = useState(skrg.getFullYear());
  const [bulan, setBulan] = useState(skrg.getMonth() + 1);
  const [data, setData] = useState(null);
  const [gagal, setGagal] = useState(false);

  const muat = useCallback(async (y, m) => {
    try {
      const r = await riwayatBulan(y, m);
      setData(r);
      setGagal(false);
    } catch {
      setData(null);
      setGagal(true);
    }
  }, []);

  useEffect(() => {
    muat(tahun, bulan);
  }, [tahun, bulan, muat]);

  const geser = (delta) => {
    let y = tahun;
    let m = bulan + delta;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    if (m > 12) {
      m = 1;
      y += 1;
    }
    setTahun(y);
    setBulan(m);
  };

  const persen = data && typeof data.completion_rate === 'number'
    ? `${Math.round(data.completion_rate * 100)}%`
    : '—';

  return (
    <section aria-label="Riwayat bulanan" className="kartu riwayat">
      <h2>Riwayat</h2>
      <div className="baris">
        <button type="button" onClick={() => geser(-1)}>
          Bulan lalu
        </button>
        <span aria-live="polite">
          {NAMA_BULAN[bulan - 1]} {tahun}
        </span>
        <button type="button" onClick={() => geser(1)}>
          Bulan depan
        </button>
      </div>
      {gagal && <p className="kosong">Riwayat belum bisa dimuat (masuk untuk menyinkronkan).</p>}
      {data && (
        <dl className="ringkasan">
          <div>
            <dt>Total</dt>
            <dd>{data.total ?? 0}</dd>
          </div>
          <div>
            <dt>Selesai</dt>
            <dd>{data.completed ?? 0}</dd>
          </div>
          <div>
            <dt>Terlambat</dt>
            <dd>{data.overdue ?? 0}</dd>
          </div>
          <div>
            <dt>Tingkat selesai</dt>
            <dd>{persen}</dd>
          </div>
          <div>
            <dt>Mendesak</dt>
            <dd>{data.urgent ?? 0}</dd>
          </div>
        </dl>
      )}
    </section>
  );
}
