import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import TaskItem from './TaskItem.jsx';

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

describe('TaskItem', () => {
  it('tombol Tanya AI memanggil onTanya dengan tugas', () => {
    const onTanya = vi.fn();
    render(<TaskItem tugas={t('Laporan')} onUbah={noop} onHapus={noop} onToggle={noop} onTanya={onTanya} />);
    fireEvent.click(screen.getByRole('button', { name: /tanya ai/i }));
    expect(onTanya).toHaveBeenCalledTimes(1);
    expect(onTanya.mock.calls[0][0]).toMatchObject({ title: 'Laporan' });
  });

  it('checkbox memanggil onToggle, ubah membuka edit', () => {
    const onToggle = vi.fn();
    render(<TaskItem tugas={t('Belajar')} onUbah={noop} onHapus={noop} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onToggle).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: /ubah belajar/i }));
    expect(screen.getByLabelText(/judul tugas/i)).toBeTruthy();
  });
});
