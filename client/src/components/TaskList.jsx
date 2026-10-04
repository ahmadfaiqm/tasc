import TaskItem from './TaskItem.jsx';

export default function TaskList({ tasks, onToggle, onHapus, onSimpan }) {
  if (!tasks.length) return <p className="mute">Belum ada tugas. Tulis rencanamu di samping lalu tekan “Susun jadi tugas”.</p>;
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {tasks.map((t) => <TaskItem key={t.id} task={t} onToggle={onToggle} onHapus={onHapus} onSimpan={onSimpan} />)}
    </ul>
  );
}
