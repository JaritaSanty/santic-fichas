/* Service worker generado en build. No editar out/sw.js: editar scripts/sw-template.js. */
const VERSION = '__VERSION__';
const BASE = '__BASE__';
const PRECACHE = __PRECACHE__;
const CACHE = `santic-${VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('santic-') && k !== CACHE).map((k) => caches.delete(k)))),
  );
});

function fromCache(request, pathname) {
  return caches
    .match(request, { ignoreSearch: true })
    .then((hit) => hit || caches.match(pathname.endsWith('/') ? pathname : `${pathname}/`, { ignoreSearch: true }))
    .then((hit) => hit || caches.match(`${BASE}/404.html`));
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Nunca intercepta otros orígenes (AdSense) ni rutas fuera de la aplicación.
  if (url.origin !== self.location.origin || !url.pathname.startsWith(`${BASE}/`)) return;

  // Recursos con huella: caché primero.
  if (url.pathname.startsWith(`${BASE}/_next/static/`)) {
    event.respondWith(caches.match(request, { ignoreSearch: true }).then((hit) => hit || fetch(request)));
    return;
  }

  // HTML, cargas RSC y demás: red primero, caché como respaldo sin conexión.
  event.respondWith(fetch(request).catch(() => fromCache(request, url.pathname)));
});
