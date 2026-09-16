import { describe, expect, it } from 'vitest';
import { ARITHMETIC_ALGORITHM_VERSION, generateArithmetic } from './generate';
import { validateArithmetic } from './params';
import { buildOperation } from './space';
import type { ArithmeticInput } from './types';

/**
 * Fixture dorado de la versión 1 del algoritmo: los códigos `v1-…` ya compartidos deben seguir dando la misma ficha.
 * Congela la lista entera de operaciones en su orden final, así que cualquier cambio en la semilla, en el reparto
 * del cupo, en el sorteo de cada operación, en las reglas de llevada o en la mezcla final rompe la prueba.
 * Si falla, no se actualizan los valores: se sube `ARITHMETIC_ALGORITHM_VERSION` y se añade un fixture nuevo.
 */
interface GoldenCase {
  name: string;
  seed: string;
  input: ArithmeticInput;
  operations: string[];
}

const base: ArithmeticInput = {
  kinds: { add: false, sub: false, mul: false, div: false },
  first: { min: 10, max: 99 },
  second: { min: 10, max: 99 },
  carry: 'any',
  division: 'exact',
  count: 10,
  layout: 'columns',
  columns: 3,
};

const CASES: GoldenCase[] = [
  {
    name: 'suma de dos cifras sin llevada',
    seed: 'v1-SUMA23',
    input: { ...base, kinds: { add: true, sub: false, mul: false, div: false }, carry: 'without', count: 10 },
    operations: [
      'add 14 54 = 68 r0',
      'add 27 62 = 89 r0',
      'add 61 21 = 82 r0',
      'add 80 14 = 94 r0',
      'add 41 11 = 52 r0',
      'add 27 32 = 59 r0',
      'add 15 73 = 88 r0',
      'add 44 25 = 69 r0',
      'add 27 40 = 67 r0',
      'add 60 18 = 78 r0',
    ],
  },
  {
    name: 'las cuatro operaciones con división con resto',
    seed: 'v1-MIXTO4',
    input: {
      ...base,
      kinds: { add: true, sub: true, mul: true, div: true },
      first: { min: 100, max: 999 },
      second: { min: 2, max: 9 },
      division: 'remainder',
      count: 14,
    },
    // Cupos 4, 4, 3 y 3: el resto de 14 entre cuatro operaciones va a la suma y a la resta, en orden canónico.
    operations: [
      'div 440 9 = 48 r8',
      'mul 368 4 = 1472 r0',
      'add 808 9 = 817 r0',
      'mul 361 8 = 2888 r0',
      'add 961 8 = 969 r0',
      'sub 229 2 = 227 r0',
      'div 105 9 = 11 r6',
      'add 216 4 = 220 r0',
      'div 955 2 = 477 r1',
      'sub 649 3 = 646 r0',
      'sub 860 8 = 852 r0',
      'sub 517 8 = 509 r0',
      'add 453 4 = 457 r0',
      'mul 415 7 = 2905 r0',
    ],
  },
  {
    name: 'multiplicación de tres cifras por una',
    seed: 'v1-MULT35',
    input: {
      ...base,
      kinds: { add: false, sub: false, mul: true, div: false },
      first: { min: 100, max: 999 },
      second: { min: 2, max: 9 },
      count: 8,
    },
    operations: [
      'mul 135 3 = 405 r0',
      'mul 749 4 = 2996 r0',
      'mul 564 4 = 2256 r0',
      'mul 338 2 = 676 r0',
      'mul 738 5 = 3690 r0',
      'mul 349 2 = 698 r0',
      'mul 648 7 = 4536 r0',
      'mul 817 9 = 7353 r0',
    ],
  },
  {
    // Congela la segunda vuelta: la única división exacta de 101..109 entre 7 es 105, así que la división aporta 1 de
    // las 3 que le tocaban y el déficit de 2 se reparte entre las otras tres. Fija a la vez el orden canónico del
    // reparto y el redondeo hacia arriba: reparte 1 a la suma y 1 a la resta (4, 4, 3, 1), no 0, 1 y 1 (3, 4, 4, 1).
    name: 'déficit repartido entre tres operaciones elegibles',
    seed: 'v1-DEFIC4',
    input: {
      ...base,
      kinds: { add: true, sub: true, mul: true, div: true },
      first: { min: 101, max: 109 },
      second: { min: 7, max: 7 },
      division: 'exact',
      count: 12,
    },
    operations: [
      'mul 102 7 = 714 r0',
      'add 102 7 = 109 r0',
      'div 105 7 = 15 r0',
      'sub 102 7 = 95 r0',
      'add 101 7 = 108 r0',
      'mul 108 7 = 756 r0',
      'sub 109 7 = 102 r0',
      'add 103 7 = 110 r0',
      'sub 108 7 = 101 r0',
      'mul 106 7 = 742 r0',
      'sub 103 7 = 96 r0',
      'add 108 7 = 115 r0',
    ],
  },
];

describe(`fixture dorado del algoritmo v${ARITHMETIC_ALGORITHM_VERSION}`, () => {
  it('la versión congelada es la 1', () => {
    expect(ARITHMETIC_ALGORITHM_VERSION).toBe(1);
  });

  for (const c of CASES) {
    it(c.name, () => {
      const v = validateArithmetic(c.input);
      if (!v.ok) throw new Error('entrada inválida');
      const result = generateArithmetic(v.value, c.seed);
      expect(result.version).toBe(1);
      expect(result.operations.map((o) => `${o.kind} ${o.a} ${o.b} = ${o.result} r${o.remainder}`)).toEqual(c.operations);
      // Las operaciones congeladas siguen siendo válidas por sí mismas, no solo iguales a las de ayer.
      for (const op of result.operations) expect(buildOperation(op.kind, op.a, op.b, v.value)).toEqual(op);
    });
  }
});
