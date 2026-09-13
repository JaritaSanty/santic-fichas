import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';

const OUT = path.resolve('out');
const PORT = Number(process.env.PORT ?? 4173);
const BASE = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').trim().replace(/\/+$/, '');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.json': 'application/json', '.xml': 'application/xml', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.webmanifest': 'application/manifest+json',
};

function send(res, status, file) {
  res.writeHead(status, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
  createReadStream(file).pipe(res);
}

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const notFound = () => send(res, 404, path.join(OUT, '404.html'));
  if (url.pathname !== BASE && !url.pathname.startsWith(`${BASE}/`)) return notFound();

  const relative = decodeURIComponent(url.pathname.slice(BASE.length)) || '/';
  const target = path.join(OUT, relative);
  if (!target.startsWith(OUT)) return notFound();

  if (relative.endsWith('/')) {
    const index = path.join(target, 'index.html');
    return existsSync(index) ? send(res, 200, index) : notFound();
  }
  if (existsSync(target) && statSync(target).isFile()) return send(res, 200, target);
  if (existsSync(path.join(target, 'index.html'))) {
    res.writeHead(308, { Location: `${url.pathname}/${url.search}` });
    return res.end();
  }
  return notFound();
}).listen(PORT, () => {
  process.stdout.write(`Sirviendo out/ en http://localhost:${PORT}${BASE}/\n`);
});
