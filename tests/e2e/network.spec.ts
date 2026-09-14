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

test('ninguna entrada del usuario aparece en consola, peticiones, URL, almacenamiento ni cachés', async ({ page }) => {
  // El centinela del encabezado es largo; la palabra centinela cabe en la cuadrícula para que la generación termine.
  const HEADER_SENTINEL = 'ZQXCENTINELAÑ';
  const WORD_SENTINEL = 'qzxñwkj';
  const needles = [HEADER_SENTINEL, WORD_SENTINEL, WORD_SENTINEL.toUpperCase(), 'QZXNWKJ'];
  const leaks: string[] = [];
  const hasNeedle = (text: string) => needles.some((n) => text.includes(n) || decodeURIComponent(text).includes(n));
  page.on('console', (msg) => {
    if (hasNeedle(msg.text())) leaks.push(`console: ${msg.text()}`);
  });
  page.on('request', (request) => {
    if (hasNeedle(request.url()) || hasNeedle(request.postData() ?? '')) leaks.push(`request: ${request.url()}`);
  });

  await page.goto('es/sopa-de-letras/');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.getByLabel('Título').fill(HEADER_SENTINEL);
  await page.getByLabel('Centro o docente').fill(HEADER_SENTINEL);
  await page.getByLabel('Palabras').fill(`gato\n${WORD_SENTINEL}\nperro`);
  await expect(page.locator('[data-generation]')).toHaveAttribute('data-generation', 'done', { timeout: 10_000 });
  await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Descargar PDF' }).click()]);
  await page.waitForLoadState('networkidle');

  expect(needles.some((n) => page.url().includes(n))).toBe(false);
  const stored = await page.evaluate(async (list) => {
    const has = (text: string) => list.some((n) => text.includes(n));
    const databases = (await indexedDB.databases()).map((db) => db.name ?? '');
    let inCache = false;
    for (const key of await caches.keys()) {
      const cache = await caches.open(key);
      for (const request of await cache.keys()) if (has(decodeURIComponent(request.url))) inCache = true;
    }
    return {
      inLocal: has(JSON.stringify({ ...localStorage })),
      inSession: has(JSON.stringify({ ...sessionStorage })),
      databases,
      inCache,
    };
  }, needles);
  expect(stored).toEqual({ inLocal: false, inSession: false, databases: [], inCache: false });
  expect(leaks).toEqual([]);
});
