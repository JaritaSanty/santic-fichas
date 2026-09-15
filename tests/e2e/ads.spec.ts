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
      await page.goto('es/sopa-de-letras/');
      expect(await page.locator('.ad-slot:visible').count()).toBeLessThanOrEqual(3);
    }
  });
});
