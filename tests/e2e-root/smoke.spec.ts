import { expect, test } from '@playwright/test';

test('la raíz redirige, la herramienta genera y el service worker cubre todo el sitio', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'es-EC' });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page).toHaveURL(/\/es\/$/);

  const logo = page.locator('header img').first();
  expect(await logo.getAttribute('src')).toMatch(/^\/brand\//);
  expect(await logo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);

  await page.goto('/es/sopa-de-letras/');
  await expect(page.locator('[data-generation]')).toHaveAttribute('data-generation', 'done', { timeout: 10_000 });
  const letters = await page
    .locator('[data-tool-canvas] svg[role="img"]')
    .first()
    .evaluate((svg) => Array.from(svg.querySelectorAll('text')).filter((t) => Array.from(t.textContent ?? '').length === 1).length);
  expect(letters).toBe(144);

  // La segunda herramienta carga su Worker y sus fuentes por la misma vía: sin basePath también tiene que generar.
  await page.goto('/es/operaciones/');
  await expect(page.locator('[data-generation]')).toHaveAttribute('data-generation', 'done', { timeout: 10_000 });
  const requested = Number(await page.getByLabel('Número de operaciones').inputValue());
  const exercises = await page
    .locator('[data-tool-canvas] svg[role="img"]')
    .first()
    .evaluate((svg) => Array.from(svg.querySelectorAll('text'), (t) => t.textContent ?? '').filter((t) => /^\d+\)$/.test(t)).length);
  expect(exercises).toBe(requested);

  const scope = await page.evaluate(() => navigator.serviceWorker.ready.then((r) => new URL(r.scope).pathname));
  expect(scope).toBe('/');
  await context.close();
});
