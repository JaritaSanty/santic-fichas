import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';
import { walk } from './lib/walk.mjs';

const OUT = 'out';
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.txt', '.xml', '.json', '.svg', '.webmanifest', '.ttf', '.otf', '.map']);
const MIN_BYTES = 1024;

let written = 0;
for (const rel of walk(OUT)) {
  if (!COMPRESSIBLE.has(path.extname(rel))) continue;
  const file = path.join(OUT, rel);
  const buf = readFileSync(file);
  if (buf.length < MIN_BYTES) continue;
  const br = brotliCompressSync(buf, { params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_SIZE_HINT]: buf.length } });
  const gz = gzipSync(buf, { level: 9 });
  if (br.length < buf.length) { writeFileSync(`${file}.br`, br); written += 1; }
  if (gz.length < buf.length) { writeFileSync(`${file}.gz`, gz); written += 1; }
}
process.stdout.write(`Precomprimidos: ${written} ficheros .br/.gz\n`);
