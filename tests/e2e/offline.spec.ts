import { expect, test } from '@playwright/test';

test('la aplicación funciona sin red tras la primera carga', async ({ page, context }) => {
  await page.goto('es/sopa-de-letras/');
  // `ready` resuelve cuando el SW está activo, es decir, cuando la precarga de install ha terminado.
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sopa de letras');
  await page.getByLabel('Título').fill('Sin conexión');
  await expect(page.locator('[data-tool-canvas] svg').first()).toContainText('Sin conexión');

  await page.getByRole('link', { name: 'English' }).click();
  await expect(page).toHaveURL(/\/fichas\/en\/word-search\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Word search');

  await page.goto('en/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await context.setOffline(false);
});
