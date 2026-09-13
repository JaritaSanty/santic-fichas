import { describe, expect, it } from 'vitest';
import { LANGS } from '@/core/lang';
import { pickLang } from './config';
import { getDictionary } from './dictionary';
import { equivalentPath, homePath, sectionFromSlug, sectionParams, sectionPath } from './routes';

describe('pickLang', () => {
  it.each([
    [['en-GB', 'es'], 'en'],
    [['fr-FR', 'es-EC'], 'es'],
    [['EN'], 'en'],
    [['de'], 'es'],
    [[], 'es'],
  ] as const)('%j → %s', (langs, expected) => {
    expect(pickLang(langs)).toBe(expected);
  });
});

describe('rutas', () => {
  it('construye rutas con barra final', () => {
    expect(homePath('en')).toBe('/en/');
    expect(sectionPath('es', 'wordsearch')).toBe('/es/sopa-de-letras/');
    expect(sectionPath('en', 'wordsearch')).toBe('/en/word-search/');
  });

  it('resuelve slugs solo en su idioma', () => {
    expect(sectionFromSlug('es', 'sopa-de-letras')).toBe('wordsearch');
    expect(sectionFromSlug('en', 'sopa-de-letras')).toBeNull();
  });

  it('genera parámetros estáticos únicos por idioma', () => {
    expect(sectionParams('es')).toEqual([{ section: 'sopa-de-letras' }]);
    expect(sectionParams('en')).toEqual([{ section: 'word-search' }]);
  });

  it('traduce la ruta actual al otro idioma', () => {
    expect(equivalentPath('/es/sopa-de-letras/', 'en')).toBe('/en/word-search/');
    expect(equivalentPath('/en/word-search', 'es')).toBe('/es/sopa-de-letras/');
    expect(equivalentPath('/es/', 'en')).toBe('/en/');
    expect(equivalentPath('/es/desconocida/', 'en')).toBe('/en/');
    expect(equivalentPath('/', 'en')).toBe('/en/');
  });
});

describe('diccionarios', () => {
  const flatten = (obj: unknown, prefix = ''): Record<string, unknown> =>
    typeof obj === 'object' && obj !== null
      ? Object.entries(obj).reduce((acc, [k, v]) => ({ ...acc, ...flatten(v, `${prefix}${k}.`) }), {})
      : { [prefix.slice(0, -1)]: obj };

  it('tienen las mismas claves y ningún texto vacío', () => {
    const [es, en] = LANGS.map((l) => flatten(getDictionary(l)));
    expect(Object.keys(en!).sort()).toEqual(Object.keys(es!).sort());
    for (const dict of [es!, en!]) {
      for (const [key, value] of Object.entries(dict)) {
        expect(typeof value, key).toBe('string');
        expect((value as string).trim(), key).not.toBe('');
      }
    }
  });
});
