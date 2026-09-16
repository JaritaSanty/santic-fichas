import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const settle = (page: Page) => expect(page.locator('[data-generation]')).toHaveAttribute('data-generation', 'done', { timeout: 10_000 });

async function downloadPdf(page: Page) {
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Descargar PDF' }).click()]);
  const bytes = await readFile((await download.path()) as string);
  const pdf = await getDocument({ data: new Uint8Array(bytes), verbosity: 0 }).promise;
  const items = async (n: number) => (await (await pdf.getPage(n)).getTextContent()).items.map((i) => ('str' in i ? i.str : ''));
  const text = async (n: number) => (await items(n)).join(' ');
  return { download, pdf, text, items };
}

test.describe('descarga en PDF', () => {
  test('alumno y soluciones con tildes y eñes, y nombre derivado del título', async ({ page }) => {
    await page.goto('es/sopa-de-letras/');
    await page.getByLabel('Título').fill('Animales de la granja: ñandú');
    await settle(page);
    const { download, pdf, text, items } = await downloadPdf(page);
    expect(download.suggestedFilename()).toBe('animales-de-la-granja-nandu.pdf');
    expect(pdf.numPages).toBe(2);
    expect(await text(1)).toContain('Animales de la granja: ñandú');
    expect(await text(1)).toContain('pingüino');
    expect(await text(2)).toContain('Soluciones');

    // Sin .notdef ni glifos vacíos (§13.1): la lista del alumno extrae cada palabra con tilde, diéresis o Ñ tal cual,
    // y ninguna página contiene U+FFFD ni controles.
    const words = ['gato', 'perro', 'conejo', 'caballo', 'oveja', 'vaca', 'gallina', 'pato', 'ñandú', 'pingüino'];
    const studentStrings = (await items(1)).map((s) => s.trim());
    for (const word of words) expect(studentStrings).toContain(word);
    for (const n of [1, 2]) {
      const strings = (await items(n)).map((s) => s.trim()).filter((s) => s !== '');
      expect(strings.length).toBeGreaterThan(144);
      const all = strings.join('');
      expect(all).not.toContain('\uFFFD');
      expect(all).not.toMatch(/notdef/);
      expect(all).not.toMatch(/[\u0000-\u001F]/);
    }
    // La cuadrícula del alumno incluye la Ñ de «ñandú» como letra suelta.
    expect(await items(1)).toContain('Ñ');
  });

  test('sin soluciones el PDF tiene una página', async ({ page }) => {
    await page.goto('es/sopa-de-letras/');
    await settle(page);
    await page.getByLabel('Incluir soluciones').uncheck();
    const { pdf } = await downloadPdf(page);
    expect(pdf.numPages).toBe(1);
  });

  test('el PDF se genera sin conexión tras la primera carga', async ({ page, context }) => {
    await page.goto('es/sopa-de-letras/');
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
    await context.setOffline(true);
    await page.reload();
    await settle(page);
    const { pdf } = await downloadPdf(page);
    expect(pdf.numPages).toBe(2);
    await context.setOffline(false);
  });
});
