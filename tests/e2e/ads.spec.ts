import { expect, test, type Locator, type Page } from '@playwright/test';

type Box = { x: number; y: number; width: number; height: number };

function rectDistance(a: Box, b: Box): number {
  const dx = Math.max(0, a.x - (b.x + b.width), b.x - (a.x + a.width));
  const dy = Math.max(0, a.y - (b.y + b.height), b.y - (a.y + a.height));
  return Math.hypot(dx, dy);
}

async function box(locator: Locator): Promise<Box> {
  const b = await locator.boundingBox();
  if (!b) throw new Error('Elemento sin caja visible');
  return b;
}

const settle = (page: Page) => expect(page.locator('[data-generation]')).toHaveAttribute('data-generation', 'done', { timeout: 10_000 });

/**
 * Cuadernillo con menos operaciones de las pedidas: el panel de ficha corta añade un cuarto `data-action`
 * («Generar N operaciones») dentro del lienzo, bajo la vista previa, que es la única acción de la aplicación
 * que no vive ni en la línea de trabajo ni en el parte.
 */
async function arithmeticShortfall(page: Page) {
  await page.goto('es/operaciones/');
  await settle(page);
  // En móvil el parte nace plegado y sus campos no se pueden tocar: se abre y se deja abierto para medirlo.
  const docket = page.locator('[data-docket]');
  if (!(await docket.evaluate((d) => (d as HTMLDetailsElement).open))) await page.getByText('Opciones de la ficha').click();
  for (const kind of ['Suma', 'Resta']) await page.getByLabel(kind, { exact: true }).uncheck();
  await page.getByLabel('División', { exact: true }).check();
  const second = page.getByRole('group', { name: 'Segundo número', exact: true });
  await second.getByLabel('Mínimo').fill('2');
  await second.getByLabel('Máximo').fill('9');
  await page.getByLabel('Número de operaciones').fill('200');
  await settle(page);
  await expect(page.locator('[data-tool-canvas] section [data-action="generate"]')).toBeVisible();
}

async function expectAdsFarFromActions(page: Page) {
  // Solo las acciones con caja visible se pueden medir: en móvil hay que abrir antes el parte plegado.
  const actions = page.locator('[data-action]:visible');
  const ads = page.locator('.ad-slot:visible');
  for (let i = 0; i < (await actions.count()); i++) {
    const action = actions.nth(i);
    await action.scrollIntoViewIfNeeded();
    await action.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    const actionBox = await box(action);
    for (let j = 0; j < (await ads.count()); j++) {
      expect(rectDistance(actionBox, await box(ads.nth(j)))).toBeGreaterThanOrEqual(150);
    }
  }
}

test.describe('zonas publicitarias', () => {
  test('escritorio: lateral de 300×600 fuera del lienzo y lejos de las acciones', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('es/sopa-de-letras/');
    const sidebar = page.locator('.ad-slot[data-ad-format="sidebar"]');
    await expect(sidebar).toBeVisible();
    const s = await box(sidebar);
    expect(Math.round(s.width)).toBe(300);
    expect(Math.round(s.height)).toBe(600);
    expect(s.y).toBeLessThan(900);

    const canvas = await box(page.locator('[data-tool-canvas]'));
    expect(rectDistance(s, canvas)).toBeGreaterThan(0);
    await expect(page.locator('[data-tool-canvas] .ad-slot')).toHaveCount(0);
    await expect(page.locator('[data-ad-anchor]')).toBeHidden();
    await expectAdsFarFromActions(page);
  });

  test('móvil 360: sin lateral, anclaje inferior fijo y lejos de las acciones', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('es/sopa-de-letras/');
    await expect(page.locator('.ad-slot[data-ad-format="sidebar"]')).toBeHidden();
    const anchor = page.locator('[data-ad-anchor]');
    await expect(anchor).toBeVisible();
    const a = await box(anchor);
    expect(Math.round(a.y + a.height)).toBe(740);
    await expect(page.locator('[data-tool-canvas] .ad-slot')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
    // Abre el parte para medir también «Nueva sopa» y las demás acciones que contiene.
    await page.getByText('Opciones de la ficha').click();
    await expect(page.getByRole('button', { name: 'Nueva sopa' })).toBeVisible();
    expect(await page.locator('[data-action]:visible').count()).toBeGreaterThanOrEqual(3);
    await expectAdsFarFromActions(page);
  });

  test('ninguna unidad supera tres por vista', async ({ page }) => {
    for (const size of [{ width: 1280, height: 900 }, { width: 360, height: 740 }]) {
      await page.setViewportSize(size);
      for (const path of ['es/sopa-de-letras/', 'es/operaciones/']) {
        await page.goto(path);
        expect(await page.locator('.ad-slot:visible').count()).toBeLessThanOrEqual(3);
      }
    }
  });

  test('escritorio: el cuadernillo con la ficha corta mantiene la distancia también en el botón del panel', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await arithmeticShortfall(page);
    await expect(page.locator('.ad-slot[data-ad-format="sidebar"]')).toBeVisible();
    await expect(page.locator('[data-tool-canvas] .ad-slot')).toHaveCount(0);
    // Imprimir, Descargar PDF, «Nuevo cuadernillo» y el botón del panel de ficha corta.
    expect(await page.locator('[data-action]:visible').count()).toBe(4);
    await expectAdsFarFromActions(page);
  });

  test('móvil 360: el cuadernillo con la ficha corta no acerca ninguna acción al anclaje', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await arithmeticShortfall(page);
    await expect(page.locator('[data-ad-anchor]')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
    // El parte queda abierto: se mide también «Nuevo cuadernillo», que en móvil vive dentro del plegable.
    await expect(page.getByRole('button', { name: 'Nuevo cuadernillo' })).toBeVisible();
    expect(await page.locator('[data-action]:visible').count()).toBe(4);
    await expectAdsFarFromActions(page);
  });
});
