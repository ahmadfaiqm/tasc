import { test, expect } from '@playwright/test';

test('tulis paragraf menjadi tugas, centang, edit, hapus', async ({ page }) => {
  await page.goto('/#kerja');
  await page.getByLabel('Rencana (satu paragraf)').fill('Rapat jam 9 malam, lalu makan siang');
  await page.getByRole('button', { name: 'Susun jadi tugas' }).click();
  await expect(page.getByText('Rapat jam 9 malam').first()).toBeVisible();
  await page.getByLabel('Selesai: Rapat jam 9 malam').check();
  await expect(page.locator('.task-item.selesai')).toBeVisible();
  await page.getByRole('button', { name: 'Batalkan makan siang' }).click();
  await expect(page.getByRole('status')).toContainText('dibatalkan');
});

test('chat menjawab prioritas (mode lokal tanpa backend)', async ({ page }) => {
  await page.goto('/#kerja');
  await page.getByLabel('Rencana (satu paragraf)').fill('Rapat jam 9 malam');
  await page.getByRole('button', { name: 'Susun jadi tugas' }).click();
  await page.getByLabel('Tanya asisten AI').fill('Mana yang dikerjakan dulu?');
  await page.getByRole('button', { name: 'Kirim' }).click();
  await expect(page.locator('.bubble-ai').last()).toContainText('Kerjakan');
});
