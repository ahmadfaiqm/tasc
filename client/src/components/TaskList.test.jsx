import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import TaskList from './TaskList.jsx';

afterEach(cleanup);

const t = (nama, extra = {}) => ({
  id: `id-${nama}`,
  title: nama,
  due_date: '2026-10-20',
  due_time: null,
  time_precision: 'UNSPECIFIED',
  urgency: 'LOW',
  priority: 'MEDIUM',
  status: 'PENDING',
  ...extra,
});

const noop = () => {};

describe('TaskList', () => {
  it('task pertama featured, sisanya baris ringkas', () => {
    render(<TaskList daftar={[t('A'), t('B')]} onUbah={noop} onHapus={noop} onToggle={noop} />);
    expect(document.querySelectorAll('.task-utama')).toHaveLength(1);
    expect(document.querySelectorAll('.task-baris')).toHaveLength(1);
  });

  it('daftar kosong menampilkan pesan tanpa featured', () => {
    render(<TaskList daftar={[]} onUbah={noop} onHapus={noop} onToggle={noop} />);
    expect(screen.getByText(/belum ada tugas/i)).toBeTruthy();
    expect(document.querySelector('.task-utama')).toBeNull();
  });
});
