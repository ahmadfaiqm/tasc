import { useEffect, useRef, useState } from 'react';
import { kirimChat } from '../lib/api.js';
import { urutkanSaran } from '../lib/parserAturan.js';

const SARAN_CEPAT = ['Mana yang dikerjakan dulu?', 'Apakah jadwal saya mepet?', 'Apa tugas mendesak saya?', 'Ringkas jadwal saya'];

export default function ChatAsisten({ tasks, saranOtomatis, paksaLokal = false }) {
  const [pesan, setPesan] = useState([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState('ai');
  const [mengetik, setMengetik] = useState(false);
  const logRef = useRef(null);
  const sudahSaran = useRef(false);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [pesan, mengetik]);

  useEffect(() => {
    if (saranOtomatis?.length && !sudahSaran.current) {
      sudahSaran.current = true;
      const u = urutkanSaran(saranOtomatis.filter((t) => !t.selesai), Date.now());
      if (!u.length) return;
      const [p1, p2, ...sisa] = u;
      let j = `Saran: kerjakan "${p1.nama}" dulu karena ${p1.urgensi === 'mendesak' ? 'paling mendesak' : 'tenggatnya paling dekat'}.`;
      if (p2) j += ` Berikutnya "${p2.nama}".`;
      if (sisa.length) j += ` Masih ada ${sisa.length} tugas lain.`;
      setPesan((l) => [...l, { dari: 'ai', teks: j }]);
    }
  }, [saranOtomatis]);

  const kirim = async (teks) => {
    const isi = (teks ?? input).trim();
    if (!isi || mengetik) return;
    setInput('');
    setPesan((l) => [...l, { dari: 'user', teks: isi }]);
    setMengetik(true);
    const r = await kirimChat(isi, tasks, paksaLokal);
    setMode(r.mode);
    setPesan((l) => [...l, { dari: 'ai', teks: r.jawaban }]);
    setMengetik(false);
  };

  return (
    <div>
      {mode === 'lokal' && <p className="mute" style={{ margin: '0 0 8px' }}>mode offline — menjawab dengan aturan lokal</p>}
      <div className="chat-log" role="log" aria-label="Percakapan asisten AI" ref={logRef}>
        {pesan.map((p, i) => <div key={i} className={`bubble bubble-${p.dari === 'user' ? 'user' : 'ai'}`}>{p.teks}</div>)}
        {mengetik && <div className="bubble bubble-ai">mengetik…</div>}
      </div>
      <div className="pil-row" style={{ marginTop: 10 }}>
        {SARAN_CEPAT.map((s) => <button key={s} className="pil" onClick={() => kirim(s)}>{s}</button>)}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input type="text" aria-label="Tanya asisten AI" value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') kirim(); }} placeholder="Tanya soal jadwalmu…" />
        <button className="btn" onClick={() => kirim()}>Kirim</button>
      </div>
    </div>
  );
}
