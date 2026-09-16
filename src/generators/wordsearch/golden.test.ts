import { describe, expect, it } from 'vitest';
import type { Lang } from '@/core/lang';
import type { DirectionOptions } from './directions';
import { generateWordSearch, WORDSEARCH_ALGORITHM_VERSION } from './generate';
import { validateWordSearch } from './params';

/**
 * Fixture dorado de la versión 1 del algoritmo: los códigos `v1-…` ya compartidos deben seguir dando la misma ficha.
 * Si este test falla por un cambio en `core/random`, `normalizeWord`, `fillAlphabet`, el orden o `place.ts`,
 * no se actualizan los valores: se sube `WORDSEARCH_ALGORITHM_VERSION` y se añade un fixture nuevo.
 */
interface GoldenCase {
  name: string;
  lang: Lang;
  seed: string;
  size: number;
  words: string[];
  directions: DirectionOptions;
  rows: string[];
  placements: string[];
}

const CASES: GoldenCase[] = [
  {
    name: 'es con Ñ y diéresis, todas las direcciones',
    lang: 'es',
    seed: 'v1-ORO2ES',
    size: 12,
    words: ['gato', 'perro', 'conejo', 'caballo', 'oveja', 'vaca', 'gallina', 'pato', 'ñandú', 'pingüino'],
    directions: { horizontal: true, vertical: true, diagonal: true, reversed: true },
    rows: [
      'KPZAPÑANDUHU',
      'TELPNFGJVYYY',
      'CRCAGECDGIAM',
      'IRCTOWAMKÑOF',
      'KOAOTBMMONBR',
      'OGBCCAFCIOWC',
      'VMAÑOJDUGUWP',
      'EZLLINGAAXZW',
      'JNLMLNEXTWQB',
      'AUOHIITJOÑWB',
      'TKIPFINIOLNW',
      'FDZACAVAQNOP',
    ],
    placements: [
      'PINGUINO 10,3 -1,1',
      'CABALLO 3,2 1,0',
      'GALLINA 5,1 1,1',
      'CONEJO 5,3 1,1',
      'PERRO 0,1 1,0',
      'OVEJA 5,0 1,0',
      'ÑANDU 0,5 0,1',
      'GATO 6,8 1,0',
      'VACA 11,6 0,-1',
      'PATO 1,3 1,0',
    ],
  },
  {
    name: 'en con una palabra con Ñ, sin diagonales ni invertidas',
    lang: 'en',
    seed: 'v1-GOLD3N',
    size: 10,
    words: ['jalapeño', 'taco', 'salsa', 'lime', 'bean', 'rice', 'corn'],
    directions: { horizontal: true, vertical: true, diagonal: false, reversed: false },
    rows: [
      'RICEBAWENP',
      'ÑAWCWSTYAL',
      'WBGUQNULCJ',
      'XXQQFUYICA',
      'LCSTACOMZL',
      'ROLWDGFEFA',
      'CRVJTVPBCP',
      'TNEÑBEANTE',
      'JSALSAÑCÑÑ',
      'VNUVYGJIXO',
    ],
    placements: ['JALAPEÑO 2,9 1,0', 'SALSA 8,1 0,1', 'TACO 4,3 0,1', 'LIME 2,7 1,0', 'BEAN 7,4 0,1', 'RICE 0,0 0,1', 'CORN 4,1 1,0'],
  },
  {
    name: 'es con colocación parcial completada tras rendirse',
    lang: 'es',
    seed: 'v1-DIAG22',
    size: 8,
    words: ['ABCDEFGH', 'IJKLMNOP', 'QRSTUVWX', 'YZ', 'ZY', 'QQ'],
    directions: { horizontal: false, vertical: false, diagonal: true, reversed: false },
    rows: ['ILQXGYWH', 'IJUQDXGL', 'ZKKUMFJR', 'XXNLEFEA', 'ZSZDMÑGJ', 'VDCYCNYO', 'UBQLZZOI', 'AGKWZMSP'],
    placements: ['ABCDEFGH 7,0 -1,1', 'IJKLMNOP 0,0 1,1', 'YZ 5,3 1,1', 'ZY 4,2 1,1', 'QQ 0,2 1,1'],
  },
];

describe(`fixture dorado del algoritmo v${WORDSEARCH_ALGORITHM_VERSION}`, () => {
  it('la versión congelada es la 1', () => {
    expect(WORDSEARCH_ALGORITHM_VERSION).toBe(1);
  });

  for (const c of CASES) {
    it(c.name, () => {
      const v = validateWordSearch({ wordsText: c.words.join('\n'), size: c.size, directions: c.directions }, c.lang);
      if (!v.ok) throw new Error('entrada inválida');
      const result = generateWordSearch(v.value, c.seed, c.lang);
      const rows = Array.from({ length: result.size }, (_, i) => result.cells.slice(i * result.size, (i + 1) * result.size).join(''));
      expect(rows).toEqual(c.rows);
      expect(result.placements.map((p) => `${p.entry.normalized} ${p.row},${p.col} ${p.dr},${p.dc}`)).toEqual(c.placements);
    });
  }
});
