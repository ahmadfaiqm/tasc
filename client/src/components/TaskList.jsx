import TaskItem from './TaskItem.jsx';

export default function TaskList({ daftar, onUbah, onHapus, onToggle }) {
  if (!daftar.length) return <p className="kosong">Belum ada tugas. Tulis paragraf lalu tekan “Susun jadi tugas”.</p>;
  return (
    <ul className="daftar-tugas">
      {daftar.map((t) => (
        <TaskItem
          key={t.id}
          tugas={t}
          onUbah={(baru) => onUbah(t.id, baru)}
          onHapus={() => onHapus(t.id)}
          onToggle={() => onToggle(t.id)}
        />
      ))}
    </ul>
  );
}
