import { useEffect, useReducer } from 'react';
import TaskItem from './TaskItem.jsx';

function kunciTgl(t) {
  if (t.tenggat) {
    const d = new Date(t.tenggat);
    if (!Number.isNaN(d.getTime())) {
      const p = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    }
  }
  const v = t.due_date;
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  return null;
}

function jamSort(t) {
  const j = typeof t.due_time === 'string' && /^\d{2}:\d{2}$/.test(t.due_time) ? t.due_time : '99:99';
  if (t.tenggat) {
    const d = new Date(t.tenggat);
    if (!Number.isNaN(d.getTime())) {
      const p = (n) => String(n).padStart(2, '0');
      return `${p(d.getHours())}:${p(d.getMinutes())}`;
    }
  }
  return j;
}

function kunciSort(t) {
  const k = kunciTgl(t);
  return `${k ?? '9999-99-99'}T${jamSort(t)}`;
}

export default function TaskList({ daftar, onUbah, onHapus, onToggle, onTanya }) {
  // Render ulang berkala agar penanda "kurang dari 5 menit" tepat waktu.
  const [, segarkan] = useReducer((x) => x + 1, 0);
  useEffect(() => {
    const id = setInterval(segarkan, 30000);
    return () => clearInterval(id);
  }, []);

  if (!daftar.length) return <p className="kosong">Belum ada tugas. Tulis paragraf lalu tekan “Susun jadi tugas”.</p>;

  const urut = [...daftar].sort((a, b) => (kunciSort(a) < kunciSort(b) ? -1 : 1));
  const [utama, ...sisa] = urut;

  return (
    <ul className="daftar-tugas">
      <TaskItem
        key={utama.id}
        tugas={utama}
        varian="utama"
        onUbah={(baru) => onUbah(utama.id, baru)}
        onHapus={() => onHapus(utama.id)}
        onToggle={() => onToggle(utama.id)}
        onTanya={onTanya ? () => onTanya(utama) : undefined}
      />
      {sisa.map((t) => (
        <TaskItem
          key={t.id}
          tugas={t}
          varian="baris"
          onUbah={(baru) => onUbah(t.id, baru)}
          onHapus={() => onHapus(t.id)}
          onToggle={() => onToggle(t.id)}
          onTanya={onTanya ? () => onTanya(t) : undefined}
        />
      ))}
    </ul>
  );
}
