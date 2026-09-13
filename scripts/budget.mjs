import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { cssFontUrls, detectBasePath, firstViewAssets, resolveAssetPath } from './lib/html-assets.mjs';
import { walk } from './lib/walk.mjs';

const OUT = 'out';
const LIMIT_BYTES = 300 * 1024;
// Marcadores de módulos de carga diferida que no pueden aparecer en JS inicial (Fase 2: pdf-lib).
const FORBIDDEN_INITIAL = ['PDFDocument', 'fontkit'];

const gz = (buf) => gzipSync(buf, { level: 9 }).length;
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
const read = (rel) => readFileSync(path.join(OUT, rel));

let failed = false;
const fail = (msg) => {
  failed = true;
  process.stderr.write(`✗ ${msg}\n`);
};

const pages = walk(OUT).filter((f) => f.endsWith('.html') && f !== '404.html' && !f.startsWith('404/') && !f.startsWith('_not-found/'));
const rows = [];

for (const page of pages) {
  const html = readFileSync(path.join(OUT, page), 'utf8');
  const basePath = detectBasePath(html);
  const { scripts, styles, fonts } = firstViewAssets(html);
  let total = gz(Buffer.from(html));
  let external = 0;

  const account = (url, { compress, fromFile } = { compress: true }) => {
    const rel = resolveAssetPath(url, basePath, fromFile);
    if (rel === null) {
      external += 1;
      return null;
    }
    if (!existsSync(path.join(OUT, rel))) {
      fail(`${page}: recurso inexistente ${url}`);
      return null;
    }
    const buf = read(rel);
    total += compress ? gz(buf) : buf.length;
    return { rel, buf };
  };

  for (const url of scripts) {
    const asset = account(url);
    if (asset) {
      const text = asset.buf.toString('utf8');
      for (const marker of FORBIDDEN_INITIAL) if (text.includes(marker)) fail(`${page}: "${marker}" aparece en el chunk inicial ${asset.rel}`);
    }
  }
  const fontFiles = new Set();
  for (const url of styles) {
    const asset = account(url);
    if (asset) for (const f of cssFontUrls(asset.buf.toString('utf8'))) {
      const rel = resolveAssetPath(f, basePath, asset.rel);
      if (rel) fontFiles.add(rel);
    }
  }
  for (const url of fonts) {
    const rel = resolveAssetPath(url, basePath);
    if (rel) fontFiles.add(rel);
  }
  // Las woff2 ya están comprimidas: cuentan con su tamaño real. Cota superior: todas las del CSS inicial.
  for (const rel of fontFiles) {
    if (existsSync(path.join(OUT, rel))) total += read(rel).length;
    else fail(`${page}: tipografía inexistente ${rel}`);
  }

  rows.push({ page, total, external });
  if (total > LIMIT_BYTES) fail(`${page}: ${kb(total)} supera el presupuesto de ${kb(LIMIT_BYTES)}`);
}

rows.sort((a, b) => b.total - a.total);
for (const r of rows) process.stdout.write(`${kb(r.total).padStart(10)}  ${r.page}${r.external ? `  (+${r.external} externo/s excluido/s)` : ''}\n`);
process.stdout.write(`\nLímite: ${kb(LIMIT_BYTES)} por primera vista (HTML + JS sin noModule + CSS gzip -9, tipografías sin comprimir).\n`);
process.exit(failed ? 1 : 0);
