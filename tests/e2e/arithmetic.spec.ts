import { expect, test, type Page } from '@playwright/test';

/**
 * Las dos rutas del cuadernillo. Los textos que la prueba necesita nombrar van aquí; los números (hojas,
 * capacidad, páginas, ejercicios) no se escriben nunca a mano: se leen de lo que la propia interfaz anuncia,
 * porque dependen de la tipografía y del papel detectado y cambiarían con ellos.
 */
const ROUTES = [
  {
    path: 'es/operaciones/',
    heading: 'Cuadernillo de operaciones',
    pagesLabel: 'Páginas',
    codeItem: 'Código',
    seedLabel: 'Código de ficha',
    countLabel: 'Número de operaciones',
    otherVersion: 'Este código es de otra versión del generador (v2)',
  },
  {
    path: 'en/math-worksheets/',
    heading: 'Arithmetic booklet',
    pagesLabel: 'Pages',
    codeItem: 'Code',
    seedLabel: 'Worksheet code',
    countLabel: 'Number of operations',
    otherVersion: 'This code belongs to another version of the generator (v2)',
  },
] as const;

const ES = ROUTES[0];
const EN = ROUTES[1];
const SIGNS = ['+', '−', '×', '÷'] as const;

const settle = (page: Page) => expect(page.locator('[data-generation]')).toHaveAttribute('data-generation', 'done', { timeout: 10_000 });
const sheet = (page: Page) => page.locator('[data-tool-canvas] svg[role="img"]').first();
const jobValue = (page: Page, item: string) => page.locator('[data-job-line] dl > div').filter({ hasText: item }).locator('dd');

/** Índices impresos de la primera hoja: `1)`, `2)`… Vacío significa que no se ha maquetado ningún ejercicio. */
const exercises = (page: Page) =>
  sheet(page).evaluate((svg) => Array.from(svg.querySelectorAll('text'), (t) => t.textContent ?? '').filter((t) => /^\d+\)$/.test(t)));

/**
 * Signos dibujados en toda la vista previa, en el orden de `SIGNS`: dicen qué operaciones han salido de verdad.
 * Se buscan dentro del texto porque en columnas el signo es un texto suelto y en línea va en la expresión entera.
 */
const signs = (page: Page) =>
  page.locator('[data-tool-canvas] svg[role="img"]').evaluateAll((svgs, wanted: readonly string[]) => {
    const drawn = svgs.map((svg) => Array.from(svg.querySelectorAll('text'), (t) => t.textContent ?? '').join(' ')).join(' ');
    return wanted.filter((sign) => drawn.includes(sign));
  }, SIGNS);

const numbersIn = (text: string) => (text.match(/\d+/g) ?? []).map(Number);

/**
 * Hojas de alumno y capacidad por hoja según el aviso de paginación, que es el primero de `[data-notices]`.
 * Todo lo demás (páginas del documento, hojas impresas, ejercicios dibujados) se contrasta con esto: si la
 * herramienta anunciara un número y produjera otro, la prueba falla sin depender de ninguna cifra fija.
 */
async function announced(page: Page): Promise<{ sheets: number; perPage: number }> {
  const notice = page.locator('[data-notices] li').first();
  await expect(notice).toBeVisible();
  const [sheets = 0, perPage = 0] = numbersIn((await notice.textContent()) ?? '');
  return { sheets, perPage };
}

const requestedCount = async (page: Page, label: string) => Number(await page.getByLabel(label).inputValue());

/** Deja el cuadernillo con menos operaciones de las pedidas: solo divisiones exactas entre 2 y 9, 200 pedidas. */
async function shortfall(page: Page) {
  for (const kind of ['Suma', 'Resta']) await page.getByLabel(kind, { exact: true }).uncheck();
  await page.getByLabel('División', { exact: true }).check();
  const second = page.getByRole('group', { name: 'Segundo número', exact: true });
  await second.getByLabel('Mínimo').fill('2');
  await second.getByLabel('Máximo').fill('9');
  await page.getByLabel(ES.countLabel).fill('200');
  await settle(page);
}

test.describe('cuadernillo de operaciones', () => {
  for (const route of ROUTES) {
    test(`${route.path} genera el cuadernillo por defecto con las operaciones en la hoja`, async ({ page }) => {
      await page.goto(route.path);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(route.heading);
      await settle(page);

      const { sheets, perPage } = await announced(page);
      const count = await requestedCount(page, route.countLabel);
      expect(sheets).toBe(Math.ceil(count / perPage));
      // Con soluciones el documento lleva el doble de páginas que hojas de alumno, y la línea de trabajo lo dice.
      // El aviso interpola el número también en singular, así que una hoja de más o de menos se ve aquí.
      await expect(jobValue(page, route.pagesLabel)).toHaveText(String(sheets * 2));
      await expect(jobValue(page, route.codeItem)).toHaveText(/^v1-[0-9A-Z]{6}$/);

      // La primera hoja lleva los ejercicios que caben, numerados desde 1) sin saltos.
      const drawn = await exercises(page);
      expect(drawn).toEqual(Array.from({ length: Math.min(count, perPage) }, (_, i) => `${i + 1})`));
      // Por defecto solo suma y resta: ningún bloque puede llevar × ni ÷.
      expect(await signs(page)).toEqual(['+', '−']);

      await expect(page.locator('[data-action="print"]')).toBeEnabled();
      await expect(page.locator('[data-action="pdf"]')).toBeEnabled();
      await expect(page.locator('[data-tool-canvas] [role="alert"]')).toHaveCount(0);
    });
  }

  test('las cuatro operaciones con 200 ejercicios paginan y la línea de trabajo concuerda', async ({ page }) => {
    await page.goto(ES.path);
    // Código fijo: el reparto entre las cuatro operaciones deja de depender del sorteo de cada carga.
    await page.getByLabel(ES.seedLabel).fill('v1-ABC234');
    await settle(page);
    const single = await announced(page);
    expect(single.sheets).toBe(Math.ceil((await requestedCount(page, ES.countLabel)) / single.perPage));

    for (const kind of ['Multiplicación', 'División']) await page.getByLabel(kind, { exact: true }).check();
    await page.getByLabel(ES.countLabel).fill('200');
    await settle(page);

    const { sheets, perPage } = await announced(page);
    expect(sheets).toBe(Math.ceil(200 / perPage));
    expect(sheets).toBeGreaterThan(1);
    await expect(jobValue(page, ES.pagesLabel)).toHaveText(String(sheets * 2));
    await expect(page.locator('[data-tool-canvas] svg[role="img"]')).toHaveCount(sheets * 2);
    // En columnas la división se dibuja como galera, sin signo; las otras tres sí dejan el suyo en la hoja.
    expect(await signs(page)).toEqual(['+', '−', '×']);
    // Solo queda el aviso de paginación: la herramienta no echa en falta ninguna de las cuatro operaciones.
    await expect(page.locator('[data-notices] li')).toHaveCount(1);

    // En línea la división sí lleva ÷, y la capacidad de la hoja se vuelve a anunciar para la nueva disposición.
    await page.getByLabel('En línea').check();
    await settle(page);
    expect(await signs(page)).toEqual([...SIGNS]);
    const inline = await announced(page);
    expect(inline.sheets).toBe(Math.ceil(200 / inline.perPage));
    await expect(jobValue(page, ES.pagesLabel)).toHaveText(String(inline.sheets * 2));
  });

  test('las opciones imposibles se explican arriba y bajo el campo que las causa', async ({ page }) => {
    await page.goto(ES.path);
    await settle(page);
    const alert = page.locator('[data-tool-canvas] [role="alert"]');
    await expect(alert).toHaveCount(0);

    // Sin ninguna operación marcada no hay ficha posible y la herramienta lo dice en vez de quedarse quieta.
    for (const kind of ['Suma', 'Resta']) await page.getByLabel(kind, { exact: true }).uncheck();
    await expect(alert).toContainText('Se necesita al menos una operación: suma, resta, multiplicación o división.');
    await expect(page.locator('[data-action="print"]')).toBeDisabled();
    await expect(page.locator('[data-action="pdf"]')).toBeDisabled();
    await page.getByLabel('Suma', { exact: true }).check();
    await expect(alert).toHaveCount(0);

    // Rango invertido: el resumen arriba y el mismo mensaje bajo el operando que lo causa, con el campo marcado.
    const first = page.getByRole('group', { name: 'Primer número', exact: true });
    const second = page.getByRole('group', { name: 'Segundo número', exact: true });
    await first.getByLabel('Mínimo').fill('99');
    await first.getByLabel('Máximo').fill('10');
    const inverted = 'En el primer número, el mínimo no puede ser mayor que el máximo.';
    await expect(alert).toContainText(inverted);
    await expect(first.getByText(inverted)).toBeVisible();
    await expect(first.getByLabel('Mínimo')).toHaveAttribute('aria-invalid', 'true');
    await expect(first.getByLabel('Máximo')).toHaveAttribute('aria-invalid', 'true');
    // El error de un operando no salpica al otro ni al resto del parte.
    await expect(second.getByText(inverted)).toHaveCount(0);
    await expect(second.getByLabel('Mínimo')).not.toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('[data-action="print"]')).toBeDisabled();

    // Cantidad vacía: mismo trato, bajo su propio campo.
    await first.getByLabel('Máximo').fill('99');
    await settle(page);
    await page.getByLabel(ES.countLabel).fill('');
    const outOfRange = 'El número de operaciones debe estar entre 1 y 200.';
    await expect(alert).toContainText(outOfRange);
    await expect(page.getByLabel(ES.countLabel)).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('[data-docket] summary')).toContainText('— operaciones');
  });

  test('cuando no caben las columnas pedidas se dice cuántas se usan', async ({ page }) => {
    await page.goto(ES.path);
    await settle(page);
    // Por defecto caben las cuatro pedidas: no hay más aviso que el de paginación.
    await expect(page.locator('[data-notices] li')).toHaveCount(1);

    for (const kind of ['Suma', 'Resta']) await page.getByLabel(kind, { exact: true }).uncheck();
    await page.getByLabel('División', { exact: true }).check();
    await page.getByLabel('Con resto').check();
    const first = page.getByRole('group', { name: 'Primer número', exact: true });
    await first.getByLabel('Mínimo').fill('10000');
    await first.getByLabel('Máximo').fill('99999');
    const second = page.getByRole('group', { name: 'Segundo número', exact: true });
    await second.getByLabel('Mínimo').fill('2');
    await second.getByLabel('Máximo').fill('9');
    await page.getByLabel('En línea').check();
    await page.getByLabel('Columnas por hoja').selectOption('5');
    await settle(page);

    await expect(page.locator('[data-notices] li').nth(1)).toHaveText('Con estas operaciones solo caben 2 columnas por hoja; se usan esas.');
    // El selector sigue marcando lo que se pidió: el aviso explica la diferencia, no la esconde.
    await expect(page.getByLabel('Columnas por hoja')).toHaveValue('5');

    // Al pedir las que caben, el aviso desaparece: sigue al recorte real, no al número del selector.
    await page.getByLabel('Columnas por hoja').selectOption('2');
    await settle(page);
    await expect(page.locator('[data-notices] li')).toHaveCount(1);
  });

  test('«Nuevo cuadernillo» cambia el código y el cuadernillo con él', async ({ page }) => {
    await page.goto(ES.path);
    await settle(page);
    const before = await sheet(page).innerHTML();
    const code = await jobValue(page, ES.codeItem).textContent();
    expect(code).toMatch(/^v1-[0-9A-Z]{6}$/);

    await page.getByRole('button', { name: 'Nuevo cuadernillo' }).click();
    await settle(page);
    await expect(jobValue(page, ES.codeItem)).toHaveText(/^v1-[0-9A-Z]{6}$/);
    await expect(jobValue(page, ES.codeItem)).not.toHaveText(code!);
    expect(await sheet(page).innerHTML()).not.toBe(before);
  });

  test(`${EN.path} dibuja la división a la inglesa y escribe el resto con «r»`, async ({ page }) => {
    await page.goto(EN.path);
    // Código fijo: con resto, que alguna división deje resto deja de depender del sorteo de cada carga.
    await page.getByLabel(EN.seedLabel).fill('v1-ABC234');
    await settle(page);
    for (const kind of ['Addition', 'Subtraction']) await page.getByLabel(kind, { exact: true }).uncheck();
    await page.getByLabel('Division', { exact: true }).check();
    await page.getByLabel('With remainder').check();
    await settle(page);

    // La galera inglesa dibuja el esquema con trazos: no hay signo ÷ en ninguna hoja.
    expect(await signs(page)).toEqual([]);
    expect(await exercises(page)).toHaveLength(await requestedCount(page, EN.countLabel));
    // El resto va pegado al cociente en la hoja de soluciones, con la marca inglesa y no con «resto».
    const remainders = await page
      .locator('[data-tool-canvas] svg[role="img"]')
      .last()
      .evaluate((svg) => Array.from(svg.querySelectorAll('text'), (t) => t.textContent ?? '').filter((t) => /^\s*(r|resto)\s+\d+$/.test(t)));
    expect(remainders.length).toBeGreaterThan(0);
    for (const mark of remainders) expect(mark.trim()).toMatch(/^r \d+$/);
  });

  test('el mismo código reproduce el mismo cuadernillo en dos cargas distintas', async ({ page }) => {
    const build = async (code: string) => {
      await page.goto(ES.path);
      await page.getByLabel(ES.seedLabel).fill(code);
      await settle(page);
      for (const kind of ['Multiplicación', 'División']) await page.getByLabel(kind, { exact: true }).check();
      await settle(page);
      return sheet(page).innerHTML();
    };
    const first = await build('v1-ABC234');
    // El mismo código escrito con otra grafía: se normaliza antes de sortear.
    expect(await build(' v1-abc234 ')).toBe(first);
  });

  for (const route of ROUTES) {
    test(`${route.path} rechaza un código de otra versión y bloquea Imprimir y Descargar PDF`, async ({ page }) => {
      await page.goto(route.path);
      await settle(page);
      await expect(page.locator('[data-action="print"]')).toBeEnabled();

      await page.getByLabel(route.seedLabel).fill('v2-ABC234');
      await expect(page.getByText(route.otherVersion, { exact: false })).toBeVisible();
      // Sin ficha para el código escrito: ni se imprime, ni se descarga, ni se enseña el código anterior.
      await expect(page.locator('[data-action="print"]')).toBeDisabled();
      await expect(page.locator('[data-action="pdf"]')).toBeDisabled();
      await expect(jobValue(page, route.codeItem)).toHaveText('—');
      expect(await exercises(page)).toEqual([]);
      await expect(page.locator('#print-root')).toHaveCount(0);
    });
  }

  test('la división exacta sin espacio se explica con sugerencias y no genera ninguna hoja', async ({ page }) => {
    await page.goto(ES.path);
    await settle(page);
    for (const kind of ['Suma', 'Resta']) await page.getByLabel(kind, { exact: true }).uncheck();
    await page.getByLabel('División', { exact: true }).check();
    const first = page.getByRole('group', { name: 'Primer número', exact: true });
    await first.getByLabel('Mínimo').fill('100');
    await first.getByLabel('Máximo').fill('101');
    const second = page.getByRole('group', { name: 'Segundo número', exact: true });
    await second.getByLabel('Mínimo').fill('7');
    await second.getByLabel('Máximo').fill('7');
    await settle(page);

    const panel = page.locator('[data-tool-canvas] section');
    await expect(panel.getByRole('heading', { name: 'Faltan operaciones' })).toBeVisible();
    await expect(panel).toContainText('Con estas opciones no hay ninguna operación posible.');
    await expect(panel.getByRole('listitem')).toHaveCount(4);
    await expect(panel).toContainText('Cambiar la división a «con resto»');
    await expect(panel).toContainText('Ampliar el segundo número al rango 5–7');
    // No hay nada que generar: el panel no ofrece aplicar ninguna cantidad.
    await expect(panel.locator('[data-action="generate"]')).toHaveCount(0);

    await expect(page.locator('[data-notices] li')).toHaveText(['No ha salido ninguna división con estas opciones.']);
    expect(await exercises(page)).toEqual([]);
    await expect(jobValue(page, ES.pagesLabel)).toHaveText('1');
    await expect(page.locator('[data-action="print"]')).toBeDisabled();
    await expect(page.locator('[data-action="pdf"]')).toBeDisabled();
  });

  test('la ficha corta ofrece la cantidad posible y el botón la aplica', async ({ page }) => {
    await page.goto(ES.path);
    await settle(page);
    await shortfall(page);

    const apply = page.locator('[data-tool-canvas] section [data-action="generate"]');
    const [available = 0] = numbersIn((await apply.textContent()) ?? '');
    expect(available).toBeGreaterThan(0);
    expect(available).toBeLessThan(200);
    await apply.click();
    await settle(page);

    await expect(page.getByLabel(ES.countLabel)).toHaveValue(String(available));
    await expect(page.locator('[data-tool-canvas] section')).toHaveCount(0);
    const { sheets, perPage } = await announced(page);
    expect(sheets).toBe(Math.ceil(available / perPage));
    await expect(jobValue(page, ES.pagesLabel)).toHaveText(String(sheets * 2));
  });

  test('a 360 px el parte se pliega y «Ampliar» muestra las hojas a tamaño real', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto(ES.path);
    await settle(page);
    await expect(page.getByLabel('Título')).toBeHidden();
    // El resumen del parte plegado cuenta lo que hay dentro: cantidad pedida y código.
    await expect(page.locator('[data-docket] summary')).toContainText(`${await requestedCount(page, ES.countLabel)} operaciones`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);

    await page.getByText('Opciones de la ficha').click();
    await expect(page.getByLabel('Título')).toBeVisible();

    const pages = Number(await jobValue(page, ES.pagesLabel).textContent());
    await page.getByRole('button', { name: 'Ampliar' }).click();
    const enlarged = page.locator('dialog[open] svg[role="img"]');
    await expect(enlarged).toHaveCount(pages);
    expect((await enlarged.first().boundingBox())!.width).toBeGreaterThan(790);
    await page.keyboard.press('Escape');
    await expect(page.locator('dialog svg')).toHaveCount(0);
  });

  test('la hoja de impresión lleva las páginas anunciadas y sin soluciones se queda en la mitad', async ({ page }) => {
    await page.goto(ES.path);
    await settle(page);
    const { sheets, perPage } = await announced(page);
    await expect(page.locator('#print-root .print-page')).toHaveCount(sheets * 2);
    await expect(jobValue(page, ES.pagesLabel)).toHaveText(String(sheets * 2));

    // Una operación más de las que caben: el cuadernillo pasa a varias hojas y la impresión las lleva todas.
    await page.getByLabel(ES.countLabel).fill(String(perPage + 1));
    await settle(page);
    const many = await announced(page);
    expect(many.sheets).toBeGreaterThan(1);
    await expect(page.locator('#print-root .print-page')).toHaveCount(many.sheets * 2);
    await expect(jobValue(page, ES.pagesLabel)).toHaveText(String(many.sheets * 2));

    await page.getByLabel('Incluir soluciones').uncheck();
    await expect(page.locator('#print-root .print-page')).toHaveCount(many.sheets);
    await expect(jobValue(page, ES.pagesLabel)).toHaveText(String(many.sheets));
  });
});
