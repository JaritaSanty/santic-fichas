import { expect, test, type Page } from '@playwright/test';

const sheet = (page: Page) => page.locator('[data-tool-canvas] svg[role="img"]').first();
const settle = (page: Page) => expect(page.locator('[data-generation]')).toHaveAttribute('data-generation', 'done', { timeout: 10_000 });
const gridLetters = (page: Page) =>
  sheet(page).evaluate((svg) => Array.from(svg.querySelectorAll('text')).filter((t) => Array.from(t.textContent ?? '').length === 1).map((t) => t.textContent));

test.describe('sopa de letras', () => {
  test('genera la cuadrícula de ejemplo con la lista en su forma original', async ({ page }) => {
    await page.goto('es/sopa-de-letras/');
    await settle(page);
    expect(await gridLetters(page)).toHaveLength(144);
    await expect(sheet(page)).toContainText('ñandú');
    await expect(sheet(page)).toContainText('pingüino');
  });

  test('el mismo código reproduce la misma ficha', async ({ page }) => {
    await page.goto('es/sopa-de-letras/');
    await page.getByLabel('Código de ficha').fill('v1-abc234');
    await settle(page);
    const first = await sheet(page).innerHTML();
    await page.getByLabel('Tamaño de la cuadrícula').selectOption('13');
    await settle(page);
    expect(await gridLetters(page)).toHaveLength(169);
    await page.getByLabel('Tamaño de la cuadrícula').selectOption('12');
    await settle(page);
    expect(await sheet(page).innerHTML()).toBe(first);

    await page.reload();
    await page.getByLabel('Código de ficha').fill(' v1-ABC234 ');
    await settle(page);
    expect(await sheet(page).innerHTML()).toBe(first);
  });

  test('«Nueva sopa» cambia el código y la cuadrícula', async ({ page }) => {
    await page.goto('es/sopa-de-letras/');
    await settle(page);
    const before = (await gridLetters(page)).join('');
    await page.getByRole('button', { name: 'Nueva sopa' }).click();
    await settle(page);
    expect((await gridLetters(page)).join('')).not.toBe(before);
  });

  test('un código mal escrito se indica y no genera', async ({ page }) => {
    await page.goto('es/sopa-de-letras/');
    await page.getByLabel('Código de ficha').fill('hola');
    await expect(page.getByText('Código no válido. Formato: v1-ABC234.')).toBeVisible();
  });

  test('las líneas inválidas se rechazan sin bloquear', async ({ page }) => {
    await page.goto('es/sopa-de-letras/');
    await page.getByLabel('Palabras').fill('gato\naño 2\nperro');
    await settle(page);
    await expect(page.getByText('Línea 2: solo se admiten letras, espacios, guiones y apóstrofos.')).toBeVisible();
    expect(await gridLetters(page)).toHaveLength(144);
  });

  test('una palabra más larga que la cuadrícula bloquea con mensaje concreto', async ({ page }) => {
    await page.goto('es/sopa-de-letras/');
    await page.getByLabel('Tamaño de la cuadrícula').selectOption('8');
    await page.getByLabel('Palabras').fill('mariposas');
    await expect(page.locator('[data-tool-canvas]').getByRole('alert')).toContainText('«mariposas» tiene 9 letras: la cuadrícula debe medir al menos 9.');
  });

  test('informa de las palabras sin colocar y genera sin ellas', async ({ page }) => {
    await page.goto('es/sopa-de-letras/');
    await page.getByLabel('Tamaño de la cuadrícula').selectOption('8');
    await page.getByLabel('Vertical').uncheck();
    await page.getByLabel('Diagonal').uncheck();
    await page.getByLabel('Palabras').fill(['aaaaaaaa', 'bbbbbbbb', 'cccccccc', 'dddddddd', 'eeeeeeee', 'ffffffff', 'gggggggg', 'hhhhhhhh', 'iiiiiiii'].join('\n'));
    await settle(page);
    await expect(page.getByRole('heading', { name: 'Palabras sin colocar' })).toBeVisible();
    await expect(page.getByText('Activar la dirección diagonal.')).toBeVisible();
    await page.getByRole('button', { name: 'Generar sin estas palabras' }).click();
    await settle(page);
    await expect(page.getByRole('heading', { name: 'Palabras sin colocar' })).toHaveCount(0);
    expect((await page.getByLabel('Palabras').inputValue()).split('\n')).toHaveLength(8);
  });

  test('«Incluir soluciones» controla las páginas impresas', async ({ page }) => {
    await page.goto('es/sopa-de-letras/');
    await settle(page);
    await expect(page.locator('#print-root .print-page')).toHaveCount(2);
    await page.getByLabel('Incluir soluciones').uncheck();
    await expect(page.locator('#print-root .print-page')).toHaveCount(1);
  });

  test('en inglés no aparece la Ñ de relleno', async ({ page }) => {
    await page.goto('en/word-search/');
    await settle(page);
    const letters = await gridLetters(page);
    expect(letters).toHaveLength(144);
    expect(letters).not.toContain('Ñ');
  });
});

test.describe('prueba de imprenta', () => {
  test('la línea de trabajo muestra papel, páginas y código con las acciones al inicio', async ({ page }) => {
    await page.goto('es/sopa-de-letras/');
    await page.getByLabel('Código de ficha').fill('v1-ABC234');
    await expect(page.locator('[data-generation]')).toHaveAttribute('data-generation', 'done', { timeout: 10_000 });
    const line = page.locator('[data-job-line]');
    await expect(line).toContainText('v1-ABC234');
    await expect(line).toContainText('2');
    const order = await line.locator('button').evaluateAll((buttons) => buttons.map((b) => b.getAttribute('data-action')));
    expect(order.slice(0, 2)).toEqual(['print', 'pdf']);
  });

  test('100 % muestra la hoja a tamaño físico en escritorio', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('es/sopa-de-letras/');
    await page.getByRole('button', { name: '100 %' }).click();
    await expect(page.getByRole('button', { name: '100 %' })).toHaveAttribute('aria-pressed', 'true');
    const width = (await page.locator('[data-proof-sheet] svg[role="img"]').first().boundingBox())!.width;
    expect(width).toBeGreaterThan(790);
  });

  test('a 360 px «Ampliar» abre la hoja a tamaño real, el diálogo se desplaza y no desborda la página', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('es/sopa-de-letras/');
    await expect(page.locator('[data-generation]')).toHaveAttribute('data-generation', 'done', { timeout: 10_000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
    await page.getByRole('button', { name: 'Ampliar' }).click();
    const dialog = page.locator('dialog[open]');
    const enlarged = dialog.locator('svg[role="img"]').first();
    await expect(enlarged).toBeVisible();
    expect((await enlarged.boundingBox())!.width).toBeGreaterThan(790);

    const overflow = await dialog.evaluate((el) => ({ scrollHeight: el.scrollHeight, clientHeight: el.clientHeight, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }));
    expect(overflow.scrollHeight).toBeGreaterThan(overflow.clientHeight);
    expect(overflow.scrollWidth).toBeGreaterThan(overflow.clientWidth);

    await dialog.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    const lastSvg = dialog.locator('svg[role="img"]').last();
    const box = (await lastSvg.boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(box.y).toBeLessThan(viewport.height);
    expect(box.y + box.height).toBeGreaterThan(0);

    await page.getByRole('button', { name: 'Cerrar' }).click();
    await expect(page.locator('dialog[open]')).toHaveCount(0);
  });

  test('el parte plegable sigue accesible al cambiar de tamaño de viewport', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('es/sopa-de-letras/');
    await page.getByText('Opciones de la ficha').click();
    await expect(page.getByLabel('Título')).toBeHidden();
    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(page.getByLabel('Título')).toBeVisible();
  });
});
