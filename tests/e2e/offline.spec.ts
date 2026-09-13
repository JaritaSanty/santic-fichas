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

  // Vigila las peticiones de cargas RSC y de _next/ durante la transición de idioma: si la clave de
  // precarga no coincide byte a byte con lo que pide el router cliente (p. ej. los tokens "$" de
  // "__next.$d$lang.__PAGE__.txt" quedaran mal codificados), esto lo detecta en vez de dejarlo
  // pasar en silencio.
  const failures: string[] = [];
  page.on('requestfailed', (request) => {
    const url = new URL(request.url());
    if (url.pathname.endsWith('.txt') || url.pathname.includes('/_next/')) {
      failures.push(`falló: ${request.url()} — ${request.failure()?.errorText}`);
    }
  });
  page.on('response', (response) => {
    const url = new URL(response.url());
    if ((url.pathname.endsWith('.txt') || url.pathname.includes('/_next/')) && response.status() >= 400) {
      failures.push(`estado ${response.status()}: ${response.url()}`);
    }
  });

  // Marca la ventana: si el cambio de idioma fuese una navegación completa (en vez de una
  // transición cliente de next/link), la marca desaparecería con la recarga.
  await page.evaluate(() => {
    (window as unknown as { __noReload?: boolean }).__noReload = true;
  });

  await page.getByRole('link', { name: 'English' }).click();
  await expect(page).toHaveURL(/\/fichas\/en\/word-search\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Word search');

  expect(failures).toEqual([]);
  expect(await page.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload)).toBe(true);

  await page.goto('en/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await context.setOffline(false);
});
