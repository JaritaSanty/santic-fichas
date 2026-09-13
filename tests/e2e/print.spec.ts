import { expect, test } from '@playwright/test';

test.describe('impresión directa', () => {
  test('solo imprime la hoja: sin interfaz, sin anuncios, una página', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('es/sopa-de-letras/');
    await page.getByLabel('Título').fill('Animales de la granja: ñandú');
    await page.getByLabel('Centro o docente').fill('Escuela Nº 5');
    await expect(page.locator('html')).toHaveAttribute('data-print-sheet', 'true');

    await page.emulateMedia({ media: 'print' });
    const visible = await page.evaluate(() =>
      Array.from(document.body.children)
        .filter((el) => getComputedStyle(el).display !== 'none')
        .map((el) => el.id),
    );
    expect(visible).toEqual(['print-root']);
    await expect(page.locator('#print-root svg')).toHaveCount(1);
    await expect(page.locator('#print-root')).toContainText('Animales de la granja: ñandú');
    await expect(page.locator('#print-root')).toContainText('santiceducation.com');
    for (const ad of await page.locator('.ad-slot').all()) await expect(ad).toBeHidden();

    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
    const count = Number(/\/Count (\d+)/.exec(pdf.toString('latin1'))?.[1]);
    expect(count).toBe(1);
  });

  test('el papel elegido fija el tamaño de página', async ({ page }) => {
    await page.goto('es/sopa-de-letras/');
    await page.getByLabel('Papel').selectOption('letter');
    await expect.poll(() => page.locator('style#print-page-size').textContent()).toMatch(/size:\s*letter/);
    await page.getByLabel('Papel').selectOption('a4');
    await expect.poll(() => page.locator('style#print-page-size').textContent()).toMatch(/size:\s*A4/);
  });

  test('en páginas sin hoja se imprime el contenido pero no los anuncios', async ({ page }) => {
    await page.goto('es/');
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('header')).toBeHidden();
  });

  test('al salir del generador se retira la marca de impresión', async ({ page }) => {
    await page.goto('es/sopa-de-letras/');
    await expect(page.locator('html')).toHaveAttribute('data-print-sheet', 'true');
    await page.getByRole('link', { name: /Santic Education/ }).first().click();
    await expect(page).toHaveURL(/\/fichas\/es\/$/);
    await expect(page.locator('html')).not.toHaveAttribute('data-print-sheet', 'true');
    await expect(page.locator('#print-root')).toHaveCount(0);
  });
});
