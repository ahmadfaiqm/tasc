import { useState } from 'react';

export default function TaskItem({ tugas, onUbah, onHapus, onToggle }) {
  const [modeEdit, setModeEdit] = useState(false);
  const [namaBaru, setNamaBaru] = useState(tugas.nama);

  const simpan = () => {
    const nama = namaBaru.trim();
    if (nama && nama !== tugas.nama) onUbah({ ...tugas, nama });
    setModeEdit(false);
  };

  return (
    <li className={`tugas ${tugas.selesai ? 'selesai' : ''} ${tugas.segera ? 'segera' : ''}`}>
      <input
        type="checkbox"
        aria-label={`Tandai selesai: ${tugas.nama}`}
        checked={Boolean(tugas.selesai)}
        onChange={onToggle}
      />
      <div className="tugas-teks">
        {modeEdit ? (
          <input
            aria-label="Nama tugas"
            value={namaBaru}
            onChange={(e) => setNamaBaru(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') simpan();
              if (e.key === 'Escape') {
                setNamaBaru(tugas.nama);
                setModeEdit(false);
              }
            }}
            autoFocus
          />
        ) : (
          <>
            <span className="tugas-nama">{tugas.nama}</span>{' '}
            <time className="tugas-waktu">
              {new Date(tugas.tenggat).toLocaleString('id-ID', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
              {tugas.segera && !tugas.selesai ? ' — segera' : ''}
            </time>
          </>
        )}
      </div>
      <span className={`label label-${tugas.urgensi.toLowerCase()}`}>{tugas.urgensi}</span>
      {modeEdit ? (
        <button type="button" aria-label={`Simpan ${tugas.nama}`} onClick={simpan}>
          Simpan
        </button>
      ) : (
        <button type="button" aria-label={`Ubah ${tugas.nama}`} onClick={() => setModeEdit(true)}>
          Ubah
        </button>
      )}
      <button type="button" aria-label={`Hapus ${tugas.nama}`} onClick={onHapus}>
        Hapus
      </button>
      {modeEdit && (
        <button
          type="button"
          onClick={() => {
            setNamaBaru(tugas.nama);
            setModeEdit(false);
          }}
        >
          Batal
        </button>
      )}
    </li>
  );
}
