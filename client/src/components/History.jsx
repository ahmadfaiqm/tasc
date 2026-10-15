// Rekap bulanan kipas (desain §6.2): 5 kartu miring, tengah penuh di depan.
// Ketuk kartu samping untuk ke tengah; ketuk kartu aktif untuk buka detail harian.
import { useEffect, useMemo, useState } from 'react';

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const WARNA_KIPAS = ['#f9a8d4', '#f6c453', '#7dd3fc', '#86efac', '#c4b5fd'];

// Geometri kipas murni (dapat diuji): posisi kartu relatif terhadap yang aktif.
export function hitungKipas(indexAktif, indexKartu, jarak = 92) {
  const off = indexKartu - indexAktif;
  const ax = Math.abs(off);
  return {
    x: off * jarak,
    r: off * 9,
    s: off === 0 ? 1 : Math.max(0.82, 1 - ax * 0.08),
    y: ax * 12,
    z: 10 - ax,
    op: ax > 2 ? 0 : 1,
  };
}

// Jarak kipas mengikuti lebar layar (dapat diuji).
export function pilihJarak(lebarPx) {
  return lebarPx < 420 ? 58 : 92;
}

function kunciBulan(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function bulanIni() {
  return kunciBulan(new Date());
}

function geserBulan(kunci, delta) {
  const [y, m] = kunci.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return kunciBulan(d);
}

function namaBulan(kunci) {
  const [y, m] = kunci.split('-').map(Number);
  return `${NAMA_BULAN[m - 1]} ${y}`;
}

function kunciTugas(t) {
  const v = t.due_date ?? t.tenggat ?? null;
  if (v == null || v === '') return null;
  const s = v instanceof Date
    ? `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`
    : String(v).slice(0, 10);
  return /^\d{4}-\d{2}$/.test(s) ? s : /^\d{4}-\d{2}-\d{2}$/.test(s) ? s.slice(0, 7) : null;
}

function selesai(t) {
  if (typeof t.status === 'string') return t.status === 'COMPLETED';
  return Boolean(t.selesai);
}

function dueMs(t) {
  const tgl = typeof t.due_date === 'string' ? t.due_date : null;
  if (!tgl) {
    if (!t.tenggat) return null;
    const d = new Date(t.tenggat);
    return Number.isNaN(d.getTime()) ? null : d.getTime();
  }
  const jam = typeof t.due_time === 'string' && /^\d{2}:\d{2}$/.test(t.due_time) ? t.due_time : null;
  const d = new Date(jam ? `${tgl}T${jam}:00` : `${tgl}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

function statusTugas(t, now) {
  if (selesai(t)) return 'selesai';
  if (t.status === 'CANCELLED') return 'batal';
  const due = dueMs(t);
  if (due != null && due < now) return 'belum';
  return 'jadwal';
}

const TEKS_STATUS = { selesai: 'Selesai', belum: 'Belum selesai', jadwal: 'Terjadwal', batal: 'Batal' };

function KartuKipas({ kunci, angka, posisi, aktif, warna, jarak, onPilih, onBuka }) {
  const kini = bulanIni();
  const g = hitungKipas(2, posisi, jarak);
  const persen = angka.total ? Math.round((angka.selesai / angka.total) * 100) : 0;
  return (
    <button
      type="button"
      className={`kcard ${aktif ? 'kcard-aktif' : ''}`}
      style={{
        background: warna,
        transform: `translateX(${g.x}px) translateY(${g.y}px) rotate(${g.r}deg) scale(${g.s})`,
        zIndex: g.z,
        opacity: aktif ? 1 : 0.92,
      }}
      aria-current={aktif ? 'true' : undefined}
      aria-label={`Pilih ${namaBulan(kunci)}${kunci === kini ? ' (bulan ini)' : ''}`}
      onClick={() => (aktif ? onBuka() : onPilih())}
      onKeyDown={(e) => {
        if (aktif && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onBuka();
        }
      }}
    >
      <span className="rate" aria-hidden="true">★ {angka.total ? `${persen}%` : '–'}</span>
      <span className="folder-bulan">{namaBulan(kunci)}</span>
      <span className="folder-angka-big">{angka.total}</span>
      <span className="folder-sub">
        {angka.selesai} selesai{angka.belum ? ` · ${angka.belum} terlewat` : ''}
      </span>
    </button>
  );
}

export default function History({ daftar = [], awal, onMuatBulan }) {
  const [terpilih, setTerpilih] = useState(() => awal ?? bulanIni());
  const [detailTerbuka, setDetailTerbuka] = useState(null);
  const [server, setServer] = useState({});
  const [lebar, setLebar] = useState(() => (typeof window === 'undefined' ? 1100 : window.innerWidth));
  const jarak = pilihJarak(lebar);

  // Angka kartu dari server bila tersedia (bulan lalu / task yang tak dimuat
  // tetap terhitung); tanpa onMuatBulan -> murni lokal seperti dulu.
  useEffect(() => {
    if (!onMuatBulan) return;
    let batal = false;
    (async () => {
      try {
        const [y, m] = terpilih.split('-').map(Number);
        if (!y || !m) return;
        const j = await onMuatBulan(y, m);
        if (!batal && j) setServer((s) => ({ ...s, [terpilih]: j }));
      } catch { /* fallback lokal */ }
    })();
    return () => { batal = true; };
  }, [terpilih, onMuatBulan]);

  useEffect(() => {
    const atur = () => setLebar(window.innerWidth);
    window.addEventListener('resize', atur);
    return () => window.removeEventListener('resize', atur);
  }, []);

  const perBulan = useMemo(() => {
    const now = Date.now();
    const peta = new Map();
    const pastikan = (k) => {
      if (!peta.has(k)) peta.set(k, { total: 0, selesai: 0, belum: 0, jadwal: 0, batal: 0, tugas: [] });
      return peta.get(k);
    };
    for (const t of daftar) {
      const k = kunciTugas(t);
      if (!k) continue;
      const g = pastikan(k);
      g.total += 1;
      g[statusTugas(t, now)] += 1;
      g.tugas.push(t);
    }
    return peta;
  }, [daftar]);

  const angka = (k) => {
    const sv = server[k];
    if (sv) {
      const total = sv.total ?? 0;
      const selesai = sv.completed ?? 0;
      const belum = sv.overdue ?? 0;
      const batal = sv.cancelled ?? 0;
      return {
        total,
        selesai,
        belum,
        jadwal: Math.max(0, total - selesai - belum - batal),
        batal,
        // Detail harian tetap dari task lokal yang dimuat (server hanya agregat).
        tugas: perBulan.get(k)?.tugas ?? [],
      };
    }
    return perBulan.get(k) ?? { total: 0, selesai: 0, belum: 0, jadwal: 0, batal: 0, tugas: [] };
  };
  const jendela = [-2, -1, 0, 1, 2].map((d) => geserBulan(terpilih, d));

  const pilih = (k) => {
    setTerpilih(k);
    setDetailTerbuka(null);
  };

  const rekap = useMemo(() => {
    if (!detailTerbuka) return [];
    const now = Date.now();
    const grup = new Map();
    for (const t of angka(detailTerbuka).tugas) {
      const tgl = (typeof t.due_date === 'string' ? t.due_date : null)
        ?? (t.tenggat ? new Date(t.tenggat).toISOString().slice(0, 10) : null)
        ?? 'tanpa-tanggal';
      if (!grup.has(tgl)) grup.set(tgl, []);
      grup.get(tgl).push({ t, st: statusTugas(t, now) });
    }
    return [...grup.entries()].sort(([a], [b]) => (a < b ? -1 : 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perBulan, detailTerbuka]);

  const judulHari = (tgl) => {
    if (tgl === 'tanpa-tanggal') return 'Tanpa tanggal';
    const d = new Date(`${tgl}T00:00:00`);
    if (Number.isNaN(d.getTime())) return tgl;
    const cal = d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });
    const hariIni = new Date();
    const kunciHari = (x) => `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
    const rel = kunciHari(d) === kunciHari(hariIni) ? 'Hari ini · ' : '';
    return `${rel}${cal}`;
  };

  return (
    <section aria-label="Rekap bulanan" className="kartu rekap">
      <p className="mikro">REKAP BULANAN</p>
      <div
        aria-label="kipas bulanan"
        className={`kipas${lebar < 420 ? ' sempit' : ''}`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') pilih(geserBulan(terpilih, -1));
          if (e.key === 'ArrowRight') pilih(geserBulan(terpilih, 1));
        }}
      >
        {jendela.map((k, i) => (
          <KartuKipas
            key={k}
            kunci={k}
            angka={angka(k)}
            posisi={i}
            aktif={k === terpilih}
            warna={WARNA_KIPAS[i % WARNA_KIPAS.length]}
            jarak={jarak}
            onPilih={() => pilih(k)}
            onBuka={() => setDetailTerbuka(k)}
          />
        ))}
      </div>
      <div className="komidi-nav">
        <button type="button" aria-label="Bulan sebelumnya" title="Bulan sebelumnya" onClick={() => pilih(geserBulan(terpilih, -1))}>
          &#8249;
        </button>
        <span className="bulan-aktif" aria-label="bulan aktif" aria-live="polite">
          {namaBulan(terpilih)}
        </span>
        <button type="button" aria-label="Bulan berikutnya" title="Bulan berikutnya" onClick={() => pilih(geserBulan(terpilih, 1))}>
          &#8250;
        </button>
      </div>
      {detailTerbuka && (
        <div className="riwayat-hari">
          {rekap.length === 0 && <p className="kosong">Belum ada tugas di bulan ini.</p>}
          {rekap.map(([tgl, isi]) => {
            const jadi = isi.filter((x) => x.st === 'selesai').length;
            return (
              <div key={tgl}>
                <div className="grup-hari">
                  <span>{judulHari(tgl)}</span>
                  <span className="jumlah">
                    {isi.length} tugas · {jadi} selesai
                  </span>
                </div>
                <ul className="riwayat-bariss">
                  {isi.map(({ t, st }) => (
                    <li key={t.id}>
                      <span className={`penanda ${st}`}>{TEKS_STATUS[st]}</span>
                      <span>{t.title ?? t.nama}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          <div className="baris">
            <button type="button" onClick={() => setDetailTerbuka(null)}>
              Tutup detail
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
