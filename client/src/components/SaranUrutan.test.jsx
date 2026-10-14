import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import SaranUrutan from './SaranUrutan.jsx';

afterEach(cleanup);

describe('SaranUrutan', () => {
  it('klik baris memanggil onPilih', () => {
    const onPilih = vi.fn();
    render(<SaranUrutan saran={{ pertama: 'Laporan', alasan: 'tenggat mepet', kedua: '', sisa: [] }} onPilih={onPilih} />);
    fireEvent.click(screen.getByRole('button', { name: /laporan/i }));
    expect(onPilih).toHaveBeenCalledTimes(1);
  });
});
