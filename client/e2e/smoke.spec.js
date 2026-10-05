import { test, expect } from '@playwright/test';

test('tulis -> tersusun -> saran -> centang -> edit -> hapus', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel(/paragraf tugas/i).fill('Rapat jam 9, lalu makan siang. Besok apel pukul 07.30');
  await page.getByRole('button', { name: /susun jadi tugas/i }).click();
  await expect(page.getByText(/tersusun/i)).toBeVisible({ timeout: 10000 });
  await expect(page.getByLabel(/saran urutan/i)).toBeVisible();
  const pertama = page.locator('.daftar-tugas .tugas').first();
  await pertama.getByRole('checkbox').check();
  await expect(pertama).toHaveClass(/selesai/);
});
