import { describe, expect, it } from 'vitest';
import { generateArithmetic } from './generate';
import { ARITHMETIC_LIMITS, validateArithmetic } from './params';
import { drawOperations } from './space';
import { suggestArithmetic, type ArithmeticSuggestion } from './suggest';
import type { ArithmeticInput, OperationKind, ValidArithmetic } from './types';

const valueOf = (input: Partial<ArithmeticInput>): ValidArithmetic => {
  const v = validateArithmetic({
    kinds: { add: true, sub: false, mul: false, div: false },
    first: { min: 10, max: 99 },
    second: { min: 10, max: 99 },
    carry: 'any',
    division: 'exact',
    count: 10,
    layout: 'columns',
    columns: 3,
    ...input,
  });
  if (!v.ok) throw new Error('parámetros no válidos en la prueba');
  return v.value;
};

const only = (...kinds: OperationKind[]): Pick<ArithmeticInput, 'kinds'> => ({
  kinds: { add: kinds.includes('add'), sub: kinds.includes('sub'), mul: kinds.includes('mul'), div: kinds.includes('div') },
});

/** PRNG lineal minúsculo: las pruebas necesitan un azar repetible, no uno bueno. */
const seeded = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
};

/**
 * Tamaño real del espacio. Todas las configuraciones de las pruebas caben por debajo de `ENUMERATE_MAX`, así que
 * `drawOperations` las enumera enteras y el recuento es exacto, no una muestra.
 */
const poolOf = (value: ValidArithmetic, kind: OperationKind): number => drawOperations(kind, value, 1e6, seeded(7)).length;

const poolSize = (value: ValidArithmetic): number => value.kinds.reduce((sum, kind) => sum + poolOf(value, kind), 0);

const apply = (value: ValidArithmetic, suggestion: ArithmeticSuggestion): ValidArithmetic => {
  switch (suggestion.code) {
    case 'raise-first-max':
      return { ...value, first: { ...value.first, max: suggestion.to } };
    case 'lower-first-min':
      return { ...value, first: { ...value.first, min: suggestion.to } };
    case 'widen-second':
      return { ...value, second: { min: suggestion.min, max: suggestion.max } };
    case 'allow-remainder':
      return { ...value, division: 'remainder' };
    case 'allow-carry':
    case 'allow-any-carry':
      return { ...value, carry: 'any' };
    case 'reduce-count':
      return { ...value, count: suggestion.to };
  }
};

describe('suggestArithmetic', () => {
  it('no sugiere nada cuando la ficha sale entera', () => {
    const value = valueOf({ count: 10 });
    expect(suggestArithmetic(value, 10)).toEqual([]);
    expect(suggestArithmetic(value, 11)).toEqual([]);
  });

  it('sube el máximo al primer múltiplo válido y baja el mínimo al anterior', () => {
    // 100..101 ÷ 7 no tiene ningún múltiplo: el primero por arriba es 7 × 15 = 105 y el último por abajo 7 × 14 = 98.
    const value = valueOf({ ...only('div'), first: { min: 100, max: 101 }, second: { min: 7, max: 7 }, count: 10 });
    expect(suggestArithmetic(value, 0)).toEqual([
      { code: 'raise-first-max', to: 105, fills: false },
      { code: 'lower-first-min', to: 98, fills: false },
      { code: 'widen-second', min: 5, max: 7, fills: false },
      { code: 'allow-remainder', fills: false },
    ]);
  });

  it('no propone un primer operando por encima del tope, solo el múltiplo de abajo', () => {
    // 7 × 14286 = 100002 se sale de maxOperand (99999); 7 × 14285 = 99995 sí cabe. 9 × 11111 = 99999 revive el divisor.
    const value = valueOf({ ...only('div'), first: { min: 99998, max: 99999 }, second: { min: 7, max: 7 }, count: 10 });
    expect(suggestArithmetic(value, 0)).toEqual([
      { code: 'lower-first-min', to: 99995, fills: false },
      { code: 'widen-second', min: 7, max: 9, fills: false },
      { code: 'allow-remainder', fills: false },
    ]);
  });

  it('con resto busca el primer dividendo no divisible, no el múltiplo', () => {
    // 105 ÷ 7 es exacta, así que en modo resto el espacio está vacío: 106 y 104 sí dejan resto, y 105 ÷ 6 también.
    const value = valueOf({
      ...only('div'),
      first: { min: 105, max: 105 },
      second: { min: 7, max: 7 },
      division: 'remainder',
      count: 10,
    });
    expect(suggestArithmetic(value, 0)).toEqual([
      { code: 'raise-first-max', to: 106, fills: false },
      { code: 'lower-first-min', to: 104, fills: false },
      { code: 'widen-second', min: 6, max: 7, fills: false },
    ]);
  });

  it('propone permitir la llevada cuando la restricción deja la suma sin espacio', () => {
    // 90..99 + 90..99 sin llevada es imposible (la columna de las decenas siempre suma 18); con 100 sí: 90 + 100 = 190.
    const value = valueOf({ first: { min: 90, max: 99 }, second: { min: 90, max: 99 }, carry: 'without', count: 10 });
    expect(suggestArithmetic(value, 0)).toEqual([
      { code: 'widen-second', min: 90, max: 100, fills: true },
      { code: 'allow-carry', fills: true },
    ]);
  });

  it('amplía el segundo operando cuando el par ordenado de la resta nunca cabe', () => {
    // 10..19 − 50: la resta ordena el par, así que el minuendo sería 50 y se sale del primer operando. 19 − 19 sí vale.
    const value = valueOf({ ...only('sub'), first: { min: 10, max: 19 }, second: { min: 50, max: 50 }, count: 10 });
    expect(suggestArithmetic(value, 0)).toEqual([{ code: 'widen-second', min: 19, max: 50, fills: false }]);
  });

  it('amplía el segundo operando justo hasta que el espacio llega a lo pedido', () => {
    // 0..9 + 0..9 son 100 pares distintos; cada segundo operando nuevo añade 10, así que 0..19 da exactamente 200.
    const value = valueOf({ first: { min: 0, max: 9 }, second: { min: 0, max: 9 }, count: 200 });
    const available = generateArithmetic(value, 'v1-POCAS1').operations.length;
    expect(available).toBe(100);
    expect(suggestArithmetic(value, available)).toEqual([
      { code: 'widen-second', min: 0, max: 19, fills: true },
      { code: 'reduce-count', to: 100 },
    ]);
  });

  it('no amplía el segundo operando cuando no es él quien falla', () => {
    // 0..9 + 0..9 con el tope de operaciones: el espacio (100) ya pasa de las 20 pedidas, así que solo falta volumen…
    const enough = valueOf({ first: { min: 0, max: 9 }, second: { min: 0, max: 9 }, count: 20 });
    expect(suggestArithmetic(enough, 12)).toEqual([{ code: 'reduce-count', to: 12 }]);
  });

  it('no propone permitir la llevada cuando lo que se pidió fue «con llevada»', () => {
    // 0..9 + 0..9 con llevada son 45 pares; cada segundo operando nuevo aporta los que se pasan de 9, y 0..24 da 100.
    const value = valueOf({ first: { min: 0, max: 9 }, second: { min: 0, max: 9 }, carry: 'with', count: 100 });
    expect(suggestArithmetic(value, 45)).toEqual([
      { code: 'widen-second', min: 0, max: 24, fills: true },
      { code: 'reduce-count', to: 45 },
    ]);
  });

  it('con resto salta el divisor 1, que no deja resto', () => {
    const value = valueOf({ ...only('div'), first: { min: 10, max: 19 }, second: { min: 1, max: 1 }, division: 'remainder', count: 10 });
    expect(suggestArithmetic(value, 0)).toEqual([{ code: 'widen-second', min: 1, max: 2, fills: false }]);
  });

  it('calla sobre el espacio que no cabe en el presupuesto de sondeos', () => {
    // 10000..99999 × 999: el rectángulo no se puede contar entero, así que no se afirma nada de él…
    const big = valueOf({ ...only('mul'), first: { min: 10000, max: 99999 }, second: { min: 999, max: 999 }, carry: 'without', count: 200 });
    expect(suggestArithmetic(big, 0)).toEqual([{ code: 'allow-carry', fills: false }]);
    // …y si además no se encuentra ningún par que la llevada esté descartando (aquí casi no hay pares que mirar),
    // la lista sale vacía en vez de inventarse algo: la herramienta tiene que aguantar una lista vacía.
    const huge = valueOf({ ...only('sub'), first: { min: 10000, max: 99999 }, second: { min: 99998, max: 99999 }, carry: 'without', count: 200 });
    expect(suggestArithmetic(huge, 0)).toEqual([]);
  });

  it('propone quitar la exigencia de llevada cuando es ella la que vacía el espacio', () => {
    // 0..9 − 7: restar dos números de una cifra nunca pide prestado, así que «con llevada» no deja ninguna resta.
    const value = valueOf({ ...only('sub'), first: { min: 0, max: 9 }, second: { min: 7, max: 7 }, carry: 'with', count: 10 });
    expect(poolOf(value, 'sub')).toBe(0);
    expect(suggestArithmetic(value, 0)).toEqual([{ code: 'allow-any-carry', fills: false }]);
    // Y no se propone si el espacio con llevada no está vacío: entonces lo que falta es volumen, no la restricción.
    const some = valueOf({ first: { min: 0, max: 9 }, second: { min: 0, max: 9 }, carry: 'with', count: 100 });
    expect(suggestArithmetic(some, 45).some((s) => s.code === 'allow-any-carry')).toBe(false);
  });

  it('distingue el ajuste que llena la ficha del que solo la desatasca', () => {
    // 0..9 con 90..99 sin llevada: la resta y la división son imposibles (harían falta minuendos y dividendos
    // mayores) y solo quedan 55 sumas y 20 multiplicaciones. Subir el dividendo a 90 deja una división y una resta,
    // pero no 200 operaciones; bajar el segundo operando hasta el 9 revive las cuatro y además llena la ficha.
    const value = valueOf({ ...only('add', 'sub', 'mul', 'div'), first: { min: 0, max: 9 }, second: { min: 90, max: 99 }, carry: 'without', count: 200 });
    const available = generateArithmetic(value, 'v1-MESETA').operations.length;
    expect(available).toBe(75);
    expect(suggestArithmetic(value, available)).toEqual([
      { code: 'raise-first-max', to: 90, fills: false },
      { code: 'widen-second', min: 9, max: 99, fills: true },
      { code: 'allow-carry', fills: true },
      { code: 'reduce-count', to: 75 },
    ]);
  });

  it('no propone un recuento por debajo del mínimo', () => {
    const value = valueOf({ ...only('div'), first: { min: 100, max: 101 }, second: { min: 7, max: 7 }, count: 10 });
    expect(suggestArithmetic(value, 0).some((s) => s.code === 'reduce-count')).toBe(false);
    expect(suggestArithmetic(value, 1)).toContainEqual({ code: 'reduce-count', to: 1 });
  });

  describe('cada sugerencia amplía de verdad el espacio', () => {
    const cases: Array<[string, ValidArithmetic]> = [
      ['división exacta sin múltiplos', valueOf({ ...only('div'), first: { min: 100, max: 101 }, second: { min: 7, max: 7 }, count: 10 })],
      ['división exacta estrecha', valueOf({ ...only('div'), first: { min: 50, max: 59 }, second: { min: 9, max: 9 }, count: 20 })],
      ['división con resto imposible', valueOf({ ...only('div'), first: { min: 105, max: 105 }, second: { min: 7, max: 7 }, division: 'remainder', count: 10 })],
      ['suma sin llevada imposible', valueOf({ first: { min: 90, max: 99 }, second: { min: 90, max: 99 }, carry: 'without', count: 10 })],
      ['resta con el par ordenado fuera de rango', valueOf({ ...only('sub'), first: { min: 10, max: 19 }, second: { min: 50, max: 50 }, count: 10 })],
      ['multiplicación sin llevada', valueOf({ ...only('mul'), first: { min: 100, max: 999 }, second: { min: 7, max: 7 }, carry: 'without', count: 40 })],
      ['las cuatro operaciones en un rango pequeño', valueOf({ ...only('add', 'sub', 'mul', 'div'), first: { min: 20, max: 29 }, second: { min: 3, max: 3 }, count: 60 })],
      ['volumen insuficiente', valueOf({ first: { min: 0, max: 9 }, second: { min: 0, max: 9 }, count: 200 })],
      // Dos operaciones muertas de cuatro: la resta y la división necesitarían un primer operando mayor que el
      // segundo. El espacio real son 55 sumas y 20 multiplicaciones, y es el caso que destapó que seguir
      // `reduce-count` encogía la ficha (75 → 58 → 50 → …).
      ['dos operaciones sin espacio de cuatro', valueOf({ ...only('add', 'sub', 'mul', 'div'), first: { min: 0, max: 9 }, second: { min: 90, max: 99 }, carry: 'without', count: 200 })],
    ];

    for (const [name, value] of cases) {
      it(name, () => {
        const available = generateArithmetic(value, 'v1-AJUSTE').operations.length;
        expect(available).toBeLessThan(value.count);
        const suggestions = suggestArithmetic(value, available);
        expect(suggestions).toEqual(suggestArithmetic(value, available)); // pura: dos llamadas, el mismo resultado
        expect(suggestions.length).toBeGreaterThan(0);

        const before = poolSize(value);
        for (const suggestion of suggestions) {
          if (suggestion.code === 'reduce-count') {
            expect(suggestion.to).toBe(available);
            expect(suggestion.to).toBeGreaterThanOrEqual(ARITHMETIC_LIMITS.minCount);
            expect(suggestion.to).toBeLessThan(value.count);
            // Y es alcanzable: pedir ese número tiene que devolver ese número, no volver a quedarse corto.
            expect(generateArithmetic(apply(value, suggestion), 'v1-AJUSTE').operations).toHaveLength(suggestion.to);
            continue;
          }
          const after = apply(value, suggestion);
          expect(poolSize(after)).toBeGreaterThan(before);
          // `fills` no puede prometer de más: si dice que sale la ficha entera, el espacio llega a lo pedido.
          if ('fills' in suggestion && suggestion.fills) expect(poolSize(after)).toBeGreaterThanOrEqual(value.count);
          // Y tampoco se queda corto sin motivo: solo el recuento de la resta es una cota inferior.
          if ('fills' in suggestion && !suggestion.fills && !value.kinds.includes('sub')) {
            expect(poolSize(after)).toBeLessThan(value.count);
          }
          // La promesa exacta de `widen-second`: ninguna operación elegida se queda sin espacio y, si ninguna estaba
          // bloqueada de entrada, el espacio total pasa a llegar a lo pedido.
          if (suggestion.code === 'widen-second') {
            for (const kind of value.kinds) expect(poolOf(after, kind)).toBeGreaterThan(0);
            if (value.kinds.every((kind) => poolOf(value, kind) > 0)) {
              expect(poolSize(after)).toBeGreaterThanOrEqual(value.count);
            }
          }
        }
      });
    }
  });

  it('nunca propone valores fuera de los límites', () => {
    const { minOperand, maxOperand, maxFactor, minCount, maxCount } = ARITHMETIC_LIMITS;
    const values: ValidArithmetic[] = [
      valueOf({ ...only('div'), first: { min: 100, max: 101 }, second: { min: 7, max: 7 }, count: 10 }),
      valueOf({ ...only('div'), first: { min: 99998, max: 99999 }, second: { min: 7, max: 7 }, count: 10 }),
      valueOf({ ...only('div'), first: { min: 0, max: 3 }, second: { min: 999, max: 999 }, count: 10 }),
      valueOf({ first: { min: 90, max: 99 }, second: { min: 90, max: 99 }, carry: 'without', count: 10 }),
      valueOf({ ...only('mul'), first: { min: 99990, max: 99999 }, second: { min: 999, max: 999 }, carry: 'without', count: 10 }),
    ];
    for (const value of values) {
      for (const suggestion of suggestArithmetic(value, 0)) {
        if (suggestion.code === 'raise-first-max' || suggestion.code === 'lower-first-min') {
          expect(suggestion.to).toBeGreaterThanOrEqual(minOperand);
          expect(suggestion.to).toBeLessThanOrEqual(maxOperand);
        }
        if (suggestion.code === 'widen-second') {
          expect(suggestion.min).toBeGreaterThanOrEqual(minOperand);
          expect(suggestion.min).toBeLessThanOrEqual(suggestion.max);
          const top = value.kinds.includes('mul') || value.kinds.includes('div') ? maxFactor : maxOperand;
          expect(suggestion.max).toBeLessThanOrEqual(top);
        }
        if (suggestion.code === 'reduce-count') {
          expect(suggestion.to).toBeGreaterThanOrEqual(minCount);
          expect(suggestion.to).toBeLessThanOrEqual(maxCount);
        }
      }
    }
  });
});
