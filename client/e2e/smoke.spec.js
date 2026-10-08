import { test, expect } from '@playwright/test';

test('tulis -> pratinjau -> konfirmasi -> centang -> riwayat terlihat', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel(/paragraf tugas/i).fill('Rapat jam 9, lalu makan siang. Besok apel pukul 07.30');
  await page.getByRole('button', { name: /susun jadi tugas/i }).click();
  // Preview muncul (bukan langsung tersimpan).
  const pratinjau = page.getByLabel(/pratinjau tugas/i);
  await expect(pratinjau).toBeVisible({ timeout: 15000 });
  await expect(pratinjau.getByText(/jam belum ditentukan/i).first()).toBeVisible();
  // Confirm kandidat pertama -> masuk daftar.
  await pratinjau.getByRole('button', { name: /konfirmasi/i }).first().click();
  await expect(page.locator('[role="status"]', { hasText: /tersimpan/i })).toBeVisible({ timeout: 10000 });
  const pertama = page.locator('.daftar-tugas .tugas').first();
  await expect(pertama).toBeVisible();
  await pertama.getByRole('checkbox').check();
  await expect(pertama).toHaveClass(/selesai/);
  // Saran + riwayat + asisten read-only terlihat.
  await expect(page.getByLabel(/saran urutan/i)).toBeVisible();
  await expect(page.getByLabel(/riwayat bulanan/i)).toBeVisible();
  await expect(page.getByRole('region', { name: 'Asisten', exact: true })).toBeVisible();
});
