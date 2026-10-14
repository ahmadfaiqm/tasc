import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Ringkasan from './Ringkasan.jsx';

const BENTO = { aktif: 6, mendesak: 2, selesaiX: 4, selesaiY: 5, selesaiPersen: 80, berikut: null };

describe('Ringkasan', () => {
  it('panel kiri: persen besar + kartu aktivitas, tanpa bento', () => {
    render(<Ringkasan bento={BENTO} />);
    expect(screen.getByText(/80%/)).toBeTruthy();
    expect(document.querySelector('.panel-kiri')).toBeTruthy();
    expect(document.querySelector('.bento-grid')).toBeNull();
  });
});
