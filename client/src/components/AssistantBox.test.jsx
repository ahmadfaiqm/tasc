import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import AssistantBox from './AssistantBox.jsx';

vi.mock('../lib/api.js', () => ({ tanyaAsisten: vi.fn(async () => ({ jawaban: 'ok' })) }));

if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

afterEach(cleanup);

describe('AssistantBox', () => {
  it('pesanAwal mengisi input tanpa auto-kirim', async () => {
    const api = await import('../lib/api.js');
    const { rerender } = render(<AssistantBox pesanAwal="" />);
    rerender(<AssistantBox pesanAwal="Tanya soal: Laporan" />);
    expect(screen.getByLabelText(/tanya asisten/i).value).toBe('Tanya soal: Laporan');
    expect(api.tanyaAsisten).not.toHaveBeenCalled();
  });
});
