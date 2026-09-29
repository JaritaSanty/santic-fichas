import { expect, test } from '@playwright/test';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const pageCount = async (pdf: Buffer) => (await getDocument({ data: new Uint8Array(pdf), verbosity: 0 }).promise).numPages;

test.describe('impresión directa', () => {
  test('solo imprime la hoja: sin interfaz, sin anuncios, una página', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('es/sopa-de-letras/');
    await expect(page.locator('[data-generation]')).toHaveAttribute('data-generation', 'done', { timeout: 10_000 });
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
    await expect(page.locator('#print-root svg')).toHaveCount(2);
    await expect(page.locator('#print-root')).toContainText('Animales de la granja: ñandú');
    await expect(page.locator('#print-root')).toContainText('santiceducation.com');
    // La marca de página también se imprime: la pila de fotocopias dice cuál es cada hoja y cuál es la del docente.
    await expect(page.locator('#print-root')).toContainText('Página 1/2');
    await expect(page.locator('#print-root')).toContainText('Alumno');
    await expect(page.locator('#print-root')).toContainText('Soluciones');
    for (const ad of await page.locator('.ad-slot').all()) await expect(ad).toBeHidden();

    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
    expect(await pageCount(pdf)).toBe(2);
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

  test('el cuadernillo de operaciones también imprime solo la hoja', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('es/operaciones/');
    await expect(page.locator('[data-generation]')).toHaveAttribute('data-generation', 'done', { timeout: 10_000 });
    await page.getByLabel('Título').fill('Sumas y restas: segundo curso');
    await expect(page.locator('html')).toHaveAttribute('data-print-sheet', 'true');
    const pages = Number(await page.locator('[data-job-line] dl > div').filter({ hasText: 'Páginas' }).locator('dd').textContent());

    await page.emulateMedia({ media: 'print' });
    const visible = await page.evaluate(() =>
      Array.from(document.body.children)
        .filter((el) => getComputedStyle(el).display !== 'none')
        .map((el) => el.id),
    );
    expect(visible).toEqual(['print-root']);
    await expect(page.locator('#print-root .print-page')).toHaveCount(pages);
    await expect(page.locator('#print-root')).toContainText('Sumas y restas: segundo curso');
    for (const ad of await page.locator('.ad-slot').all()) await expect(ad).toBeHidden();

    expect(await pageCount(await page.pdf({ preferCSSPageSize: true, printBackground: true }))).toBe(pages);
  });

  test('un cuadernillo sin ejercicios no monta ninguna hoja de impresión', async ({ page }) => {
    await page.goto('es/operaciones/');
    await expect(page.locator('[data-generation]')).toHaveAttribute('data-generation', 'done', { timeout: 10_000 });
    // Solo divisiones exactas de 100–101 entre 7: no sale ninguna, así que no hay nada que imprimir.
    for (const kind of ['Suma', 'Resta']) await page.getByLabel(kind, { exact: true }).uncheck();
    await page.getByLabel('División', { exact: true }).check();
    const first = page.getByRole('group', { name: 'Primer número', exact: true });
    await first.getByLabel('Mínimo').fill('100');
    await first.getByLabel('Máximo').fill('101');
    const second = page.getByRole('group', { name: 'Segundo número', exact: true });
    await second.getByLabel('Mínimo').fill('7');
    await second.getByLabel('Máximo').fill('7');
    await expect(page.locator('[data-generation]')).toHaveAttribute('data-generation', 'done', { timeout: 10_000 });

    // Ctrl+P no puede sacar hojas en blanco: sin ficha imprimible la página se imprime como una página normal.
    await expect(page.locator('#print-root')).toHaveCount(0);
    await expect(page.locator('html')).not.toHaveAttribute('data-print-sheet', 'true');
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('main')).toBeVisible();
    for (const ad of await page.locator('.ad-slot').all()) await expect(ad).toBeHidden();
  });

  test('sin soluciones se imprime una sola página', async ({ page }) => {
    await page.goto('es/sopa-de-letras/');
    await expect(page.locator('[data-generation]')).toHaveAttribute('data-generation', 'done', { timeout: 10_000 });
    await page.getByLabel('Incluir soluciones').uncheck();
    await page.emulateMedia({ media: 'print' });
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
    expect(await pageCount(pdf)).toBe(1);
  });
});
