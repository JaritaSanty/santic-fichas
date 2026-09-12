import { describe, expect, it } from 'vitest';
import { normalizeBasePath, withBasePath } from './paths';

describe('normalizeBasePath', () => {
  it('devuelve cadena vacía sin valor', () => {
    expect(normalizeBasePath(undefined)).toBe('');
    expect(normalizeBasePath('')).toBe('');
    expect(normalizeBasePath('/')).toBe('');
  });
  it('quita barras finales y añade la inicial', () => {
    expect(normalizeBasePath('/fichas/')).toBe('/fichas');
    expect(normalizeBasePath('fichas')).toBe('/fichas');
    expect(normalizeBasePath('  /a/b// ')).toBe('/a/b');
  });
  it('rechaza caracteres no válidos', () => {
    expect(() => normalizeBasePath('/fi chas')).toThrow(/NEXT_PUBLIC_BASE_PATH/);
    expect(() => normalizeBasePath('https://x.test')).toThrow(/NEXT_PUBLIC_BASE_PATH/);
  });
});

describe('withBasePath', () => {
  it('antepone el basePath a rutas absolutas internas', () => {
    expect(withBasePath('/sw.js', '/fichas')).toBe('/fichas/sw.js');
    expect(withBasePath('/sw.js', '')).toBe('/sw.js');
    expect(withBasePath('/', '/fichas')).toBe('/fichas/');
  });
  it('exige que la ruta empiece por /', () => {
    expect(() => withBasePath('sw.js', '')).toThrow(/debe empezar por \//);
  });
});
