import { useState } from 'react';
import { gunakanTugas } from './lib/gunakanTugas.js';
import ChatAsisten from './components/ChatAsisten.jsx';
import TaskList from './components/TaskList.jsx';
import Toast from './components/Toast.jsx';

export default function App() {
  const t = gunakanTugas();
  const [paksaLokal, setPaksaLokal] = useState(false);
  return (
    <>
      <div className="chrome-logo">TAS<br />KA</div>
      <nav className="chrome-nav"><a href="#fitur">Fitur AI</a><a href="#kerja">Coba</a></nav>
      <div className="chrome-sos mute">sosial</div>
      <div className="chrome-gulir">Gulir</div>

      <section id="hero">
        <p className="label mute">01 — Task manager berbasis AI</p>
        <h1 className="wordmark">TASKA</h1>
        <p>Tulis rencanamu dalam satu paragraf, TASKA menyusunnya jadi tugas terjadwal.</p>
        <a className="btn" href="#kerja">Coba sekarang</a>
      </section>

      <section id="fitur">
        <p className="label mute">02 — Asisten AI</p>
        <div className="jendela-trio">
          <div className="panel jendela-samping"><div className="bubble bubble-ai">Contoh saran…</div></div>
          <div className="panel">
            <div className="bubble bubble-user">Besok rapat jam 9, lalu kirim laporan jam 2</div>
            <div className="bubble bubble-ai" style={{ marginTop: 10 }}>Kerjakan “Rapat” dulu karena tenggatnya paling dekat (09.00, mendesak).</div>
          </div>
          <div className="panel jendela-samping"><div className="bubble bubble-ai">Contoh ringkasan…</div></div>
        </div>
        <h2 style={{ marginTop: 24 }}>TANYA JADWALMU</h2>
        <p className="mute">Prioritas, jadwal mepet, tugas mendesak, ringkasan.</p>
        <a className="btn" href="#kerja">Coba sekarang</a>
      </section>

      <section id="kerja">
        <p className="label mute">03 — Ruang kerja</p>
        <div className="kerja-grid">
          <div className="panel">
            <h3>TULIS RENCANA</h3>
            <label className="label mute" htmlFor="paragraf">Rencana (satu paragraf)</label>
            <textarea id="paragraf" rows={6} value={t.paragraf} onChange={(e) => t.setParagraf(e.target.value)}
              placeholder="Contoh: Besok rapat jam 9, lalu kirim laporan jam 2 siang" />
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button className="btn" onClick={() => t.susunDariParagraf(paksaLokal)}>Susun jadi tugas</button>
              <button className="btn btn-ghost" onClick={t.aktifkanNotifikasi}>
                {t.notifAktif ? 'Notifikasi aktif' : 'Aktifkan notifikasi'}
              </button>
            </div>
            <label className="mute" style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 8 }}>
              <input type="checkbox" checked={paksaLokal} onChange={(e) => setPaksaLokal(e.target.checked)} /> mode lokal saja (tanpa AI server)
            </label>
          </div>
          <div className="panel">
            <h3>DAFTAR TUGAS</h3>
            <TaskList tasks={t.tasks} onToggle={t.toggleSelesai} onHapus={t.hapusTugas} onSimpan={t.simpanEdit} />
          </div>
        </div>
        <div className="panel kerja-chat">
          <h3>ASISTEN AI</h3>
          <ChatAsisten tasks={t.tasks} saranOtomatis={t.tasksBaru} />
        </div>
      </section>
      <Toast toast={t.toast} onUrung={t.urungHapus} />
    </>
  );
}
