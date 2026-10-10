import { test, expect } from '@playwright/test';

test('pengunjung tanpa sesi melihat halaman masuk', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(/susun harimu bersama ai/i)).toBeVisible();
  await expect(page.getByRole('tab', { name: /daftar/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /masuk dengan google/i })).toBeVisible();
});

test('tamu -> tab Tugas -> susun -> konfirmasi -> centang', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /lanjut tanpa akun/i }).click();
  await page.getByLabel(/paragraf tugas/i).fill('Rapat jam 9, lalu makan siang. Besok apel pukul 07.30');
  await page.getByRole('button', { name: /susun jadi tugas/i }).click();
  const pratinjau = page.getByLabel(/pratinjau tugas/i);
  await expect(pratinjau).toBeVisible({ timeout: 15000 });
  await pratinjau.getByRole('button', { name: /konfirmasi/i }).first().click();
  await expect(page.locator('[role="status"]', { hasText: /tersimpan/i })).toBeVisible({ timeout: 10000 });
  const pertama = page.locator('.daftar-tugas .tugas').first();
  await expect(pertama).toBeVisible();
  await pertama.getByRole('checkbox').check();
  await expect(pertama).toHaveClass(/selesai/);
});

test('keluar mengembalikan ke halaman masuk', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /lanjut tanpa akun/i }).click();
  await page.getByRole('button', { name: /keluar/i }).click();
  await expect(page.getByText(/susun harimu bersama ai/i)).toBeVisible();
});
