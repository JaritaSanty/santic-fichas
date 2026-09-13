import { expect, test } from '@playwright/test';

const PATHS = ['./', 'es/', 'en/', 'es/sopa-de-letras/', 'en/word-search/'];

test('ninguna petición sale del origen propio (sin AdSense configurado)', async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const external = new Set<string>();
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.protocol.startsWith('http') && url.origin !== origin) external.add(url.origin);
  });

  for (const path of PATHS) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
  }
  await page.goto('es/sopa-de-letras/');
  await page.getByLabel('Título').fill('Prueba de red');
  await page.getByLabel('Papel').selectOption('letter');
  await page.waitForLoadState('networkidle');

  expect([...external]).toEqual([]);
});

test('ninguna entrada del usuario aparece en consola ni en peticiones', async ({ page }) => {
  const SENTINEL = 'ZQXCENTINELAÑ';
  const leaks: string[] = [];
  page.on('console', (msg) => { if (msg.text().includes(SENTINEL)) leaks.push(`console: ${msg.text()}`); });
  page.on('request', (request) => {
    if (request.url().includes(SENTINEL) || (request.postData() ?? '').includes(SENTINEL)) leaks.push(`request: ${request.url()}`);
  });

  await page.goto('es/sopa-de-letras/');
  await page.getByLabel('Título').fill(SENTINEL);
  await page.getByLabel('Centro o docente').fill(SENTINEL);
  await page.waitForLoadState('networkidle');

  expect(page.url()).not.toContain(SENTINEL);
  const stored = await page.evaluate(async (s) => {
    const inStorage = JSON.stringify({ ...localStorage }).includes(s);
    let inCache = false;
    for (const key of await caches.keys()) {
      const cache = await caches.open(key);
      for (const req of await cache.keys()) if (decodeURIComponent(req.url).includes(s)) inCache = true;
    }
    return { inStorage, inCache };
  }, SENTINEL);
  expect(stored).toEqual({ inStorage: false, inCache: false });
  expect(leaks).toEqual([]);
});
