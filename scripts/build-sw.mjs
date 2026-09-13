import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { precacheUrls } from './lib/precache.mjs';
import { walk } from './lib/walk.mjs';

const OUT = 'out';
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').trim().replace(/\/+$/, '');
const files = walk(OUT).sort();
const urls = precacheUrls(files, basePath);

const hash = createHash('sha256');
for (const file of files) hash.update(file).update(readFileSync(path.join(OUT, file)));
const version = hash.digest('hex').slice(0, 12);

const sw = readFileSync('scripts/sw-template.js', 'utf8')
  .replace('__VERSION__', version)
  .replace('__BASE__', basePath)
  .replace('__PRECACHE__', JSON.stringify(urls));

writeFileSync(path.join(OUT, 'sw.js'), sw);
process.stdout.write(`sw.js ${version}: ${urls.length} recursos en precarga\n`);
