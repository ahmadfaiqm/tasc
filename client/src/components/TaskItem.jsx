import { useState } from 'react';

export default function TaskItem({ task, onToggle, onHapus, onSimpan }) {
  const [edit, setEdit] = useState(false);
  const [nama, setNama] = useState(task.nama);
  const [tgl, setTgl] = useState(task.tenggat.slice(0, 10));
  const [jam, setJam] = useState(task.tenggat.slice(11, 16));
  const [urgensi, setUrgensi] = useState(task.urgensi);
  const dekat = !task.selesai && new Date(task.tenggat) - Date.now() <= 5 * 60000 && new Date(task.tenggat) > Date.now();
  const fmt = new Date(task.tenggat).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  const simpan = () => {
    if (!nama.trim()) return;
    onSimpan(task.id, { nama: nama.trim(), tenggat: new Date(`${tgl}T${jam}`).toISOString(), urgensi });
    setEdit(false);
  };

  if (edit) {
    return (
      <li className="task-item">
        <span />
        <span>
          <input type="text" aria-label="Nama tugas" value={nama} onChange={(e) => setNama(e.target.value)} />
          <span style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input type="date" aria-label="Tanggal tenggat" value={tgl} onChange={(e) => setTgl(e.target.value)} />
            <input type="time" aria-label="Jam tenggat" value={jam} onChange={(e) => setJam(e.target.value)} />
            <select aria-label="Urgensi" value={urgensi} onChange={(e) => setUrgensi(e.target.value)}>
              <option value="mendesak">Mendesak</option>
              <option value="sedang">Sedang</option>
              <option value="santai">Santai</option>
            </select>
          </span>
        </span>
        <span />
        <button className="icon-btn" aria-label="Simpan" title="Simpan (Enter)" onClick={simpan}>✓</button>
        <button className="icon-btn" aria-label="Batal" title="Batal (Escape)"
          onClick={() => setEdit(false)}
          onKeyDown={(e) => { if (e.key === 'Escape') setEdit(false); }}>↩</button>
      </li>
    );
  }
  return (
    <li className={`task-item${task.selesai ? ' selesai' : ''}`}>
      <input type="checkbox" aria-label={`Selesai: ${task.nama}`} checked={task.selesai} onChange={() => onToggle(task.id)} />
      <span>
        <span className="task-nama">{task.nama}</span>
        <br />
        <span className={`mute task-waktu${dekat ? ' dekat' : ''}`}>{fmt}{dekat ? ' — kurang dari 5 menit' : ''}</span>
      </span>
      <span className={`badge badge-${task.urgensi}`}>{task.urgensi}</span>
      <button className="icon-btn" aria-label={`Edit ${task.nama}`} title="Edit" onClick={() => setEdit(true)}>✎</button>
      <button className="icon-btn" aria-label={`Batalkan ${task.nama}`} title="Batalkan" onClick={() => onHapus(task.id)}>✕</button>
    </li>
  );
}
