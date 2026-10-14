import { test, expect } from '@playwright/test';

test('tanpa login hanya melihat halaman auth', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(/susun harimu bersama ai/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /lanjut tanpa akun/i })).toHaveCount(0);
  await expect(page.getByRole('tab', { name: /daftar/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /masuk dengan google/i })).toBeVisible();
});

test('halaman auth tanpa kartu contoh dan tanpa tombol mulai', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(/selesai tepat waktu/i)).toHaveCount(0);
  await expect(page.getByRole('link', { name: /mulai/i })).toHaveCount(0);
});
