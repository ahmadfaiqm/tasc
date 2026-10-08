// Folder Bulanan (design.md §3.2): carousel 3 kartu + daftar riwayat bulan terpilih.
// Angka dihitung dari tugas pengguna (prop daftar) — jalan untuk tamu maupun akun.
import { useMemo, useState } from 'react';

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

function kunciBulan(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function bulanIni() {
  const d = new Date();
  return kunciBulan(d);
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

function KartuFolder({ kunci, angka, posisi, onPilih }) {
  const kini = bulanIni();
  const status = kunci === kini ? 'Bulan ini' : angka.total === 0 ? 'Kosong' : 'Arsip';
  const persen = (n) => (angka.total ? Math.round((n / angka.total) * 100) : 0);
  const bilah = [
    { nilai: angka.selesai, warna: '#1f9d73' },
    { nilai: angka.jadwal, warna: '#b5b7bb' },
    { nilai: angka.belum, warna: '#b24a9c' },
    { nilai: angka.batal, warna: '#c3c926' },
  ];
  return (
    <button type="button" className={`kartu-folder ${posisi}`} onClick={onPilih} aria-label={`Pilih ${namaBulan(kunci)}`}>
      <span className="folder-ikon" aria-hidden="true">
        &#128193;
      </span>
      <span className="folder-bulan">{namaBulan(kunci)}</span>
      <span className="folder-status">{status}</span>
      <span className="folder-angka">
        <span>
          <strong>{angka.total}</strong>Total
        </span>
        <span>
          <strong>{angka.selesai}</strong>Selesai
        </span>
        <span>
          <strong>{angka.belum}</strong>Terlewat
        </span>
      </span>
      <span className="batang" aria-hidden="true">
        {bilah.map((b, i) => (
          <span key={i} className="lajur">
            <span className="isi" style={{ width: `${persen(b.nilai)}%`, backgroundColor: b.warna }} />
          </span>
        ))}
      </span>
    </button>
  );
}

export default function History({ daftar = [] }) {
  const [terpilih, setTerpilih] = useState(() => bulanIni());
  const kini = bulanIni();

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

  const angka = (k) => perBulan.get(k) ?? { total: 0, selesai: 0, belum: 0, jadwal: 0, batal: 0, tugas: [] };
  const kiri = geserBulan(terpilih, -1);
  const kanan = geserBulan(terpilih, 1);

  const rekap = useMemo(() => {
    const now = Date.now();
    const grup = new Map();
    for (const t of angka(terpilih).tugas) {
      const tgl = (typeof t.due_date === 'string' ? t.due_date : null)
        ?? (t.tenggat ? new Date(t.tenggat).toISOString().slice(0, 10) : null)
        ?? 'tanpa-tanggal';
      if (!grup.has(tgl)) grup.set(tgl, []);
      grup.get(tgl).push({ t, st: statusTugas(t, now) });
    }
    return [...grup.entries()].sort(([a], [b]) => (a < b ? -1 : 1));
  }, [perBulan, terpilih]);

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
    <section aria-label="Riwayat bulanan" className="kartu riwayat">
      <h2>Folder Bulanan</h2>
      <div className="komidi">
        <KartuFolder kunci={kiri} angka={angka(kiri)} posisi="samping" onPilih={() => setTerpilih(kiri)} />
        <KartuFolder kunci={terpilih} angka={angka(terpilih)} posisi="aktif" onPilih={() => {}} />
        <KartuFolder kunci={kanan} angka={angka(kanan)} posisi="samping" onPilih={() => setTerpilih(kanan)} />
      </div>
      <div className="komidi-nav">
        <button type="button" className="tombol-ikon" aria-label="Bulan sebelumnya" title="Bulan sebelumnya" onClick={() => setTerpilih(geserBulan(terpilih, -1))}>
          &#8249;
        </button>
        <span className="bulan-aktif" aria-live="polite">
          {namaBulan(terpilih)}
        </span>
        <button type="button" className="tombol-ikon" aria-label="Bulan berikutnya" title="Bulan berikutnya" onClick={() => setTerpilih(geserBulan(terpilih, 1))}>
          &#8250;
        </button>
      </div>
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
      </div>
      {terpilih !== kini && (
        <div className="baris">
          <button type="button" onClick={() => setTerpilih(kini)}>
            Kembali ke bulan ini
          </button>
        </div>
      )}
    </section>
  );
}
