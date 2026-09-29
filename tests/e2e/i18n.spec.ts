import { expect, test } from '@playwright/test';

test.describe('idioma', () => {
  for (const [locale, expected] of [
    ['en-US', /\/fichas\/en\/$/],
    ['es-EC', /\/fichas\/es\/$/],
    ['de-DE', /\/fichas\/es\/$/],
  ] as const) {
    test(`la raíz redirige para ${locale}`, async ({ browser }) => {
      const context = await browser.newContext({ locale });
      const page = await context.newPage();
      await page.goto('./');
      await expect(page).toHaveURL(expected);
      await context.close();
    });
  }

  test('el selector lleva a la página equivalente y recuerda la elección', async ({ page }) => {
    await page.goto('es/sopa-de-letras/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sopa de letras');

    await page.getByRole('link', { name: 'English' }).click();
    await expect(page).toHaveURL(/\/fichas\/en\/word-search\/$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Word search');

    await page.goto('./');
    await expect(page).toHaveURL(/\/fichas\/en\/$/);
  });

  test('el selector mantiene la sección del cuadernillo en los dos sentidos', async ({ page }) => {
    await page.goto('es/operaciones/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cuadernillo de operaciones');

    await page.getByRole('link', { name: 'English' }).click();
    await expect(page).toHaveURL(/\/fichas\/en\/math-worksheets\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Arithmetic booklet');

    await page.getByRole('link', { name: 'Español' }).click();
    await expect(page).toHaveURL(/\/fichas\/es\/operaciones\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cuadernillo de operaciones');
  });

  test('los recursos de marca respetan el basePath', async ({ page, request }) => {
    await page.goto('es/');
    const icon = await page.locator('link[rel="icon"]').first().getAttribute('href');
    expect(icon).toMatch(/^\/fichas\/brand\//);
    expect((await request.get(icon!)).status()).toBe(200);

    const logo = page.locator('header img').first();
    await expect(logo).toBeVisible();
    expect(await logo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  });

  test('una sección inexistente no se exporta', async ({ request }) => {
    expect((await request.get('en/sopa-de-letras/')).status()).toBe(404);
    // El slug inglés del cuadernillo es `math-worksheets`: ningún otro se exporta.
    expect((await request.get('en/arithmetic/')).status()).toBe(404);
    expect((await request.get('en/operaciones/')).status()).toBe(404);
  });
});
