import { readdirSync } from 'node:fs';
import path from 'node:path';

/** Lista recursiva de ficheros de `dir`, con rutas relativas en formato POSIX. */
export function walk(dir, prefix = '') {
  return readdirSync(path.join(dir, prefix), { withFileTypes: true }).flatMap((entry) => {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    return entry.isDirectory() ? walk(dir, rel) : [rel];
  });
}
