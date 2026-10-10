// client/src/components/Dashboard.jsx
import { useState } from 'react';
import Ringkasan from './Ringkasan.jsx';

export default function Dashboard({ nama, email, tamu, bento, onKeluar, tugas, rekap }) {
  const [tab, setTab] = useState(tamu ? 'tugas' : 'ringkasan');
  const tabs = [
    ['ringkasan', 'Ringkasan'],
    ['tugas', 'Tugas'],
    ['rekap', 'Rekap'],
  ];
  return (
    <div>
      <header className="dash-header">
        <span className="auth-logo" style={{ position: 'static' }}>
          <span className="centang">✓</span> Taska
        </span>
        <nav aria-label="Dashboard" className="nav-pil">
          {tabs.map(([id, label]) => (
            <button key={id} type="button" aria-selected={tab === id} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </nav>
        <span className="dash-nama">{nama || email || 'Tamu'}</span>
        <button type="button" className="pil-hitam" onClick={onKeluar}>
          Keluar
        </button>
      </header>
      <main>
        {tab === 'ringkasan' && !tamu ? <Ringkasan nama={nama} bento={bento} /> : null}
        {tab === 'ringkasan' && tamu ? <p className="mikro">MASUK UNTUK RINGKASAN</p> : null}
        {tab === 'tugas' ? tugas : null}
        {tab === 'rekap' ? rekap : null}
      </main>
    </div>
  );
}
