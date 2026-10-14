import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Dashboard from './Dashboard.jsx';

describe('Dashboard', () => {
  it('tanpa tab: topbar, sapaan, tugas, lalu rekap berurutan', () => {
    render(
      <Dashboard
        nama="Budi"
        email="budi@mail.com"
        onKeluar={() => {}}
        tugas={<section aria-label="blok-tugas" />}
        rekap={<section aria-label="blok-rekap" />}
      />
    );
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.getByText(/halo, budi/i)).toBeTruthy();
    const els = ['blok-tugas', 'blok-rekap'].map((n) => screen.getByLabelText(n));
    expect(els[0].compareDocumentPosition(els[1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
