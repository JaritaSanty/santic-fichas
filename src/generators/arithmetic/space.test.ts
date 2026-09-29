import { describe, expect, it } from 'vitest';
import { buildOperation, drawOperations, ENUMERATE_MAX } from './space';
import { validateArithmetic } from './params';
import type { ArithmeticInput, ValidArithmetic } from './types';

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

const rand = () => 0.5;

/** PRNG lineal minúsculo: las pruebas necesitan un azar repetible, no uno bueno. */
const seeded = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
};

/** Envoltorio que cuenta sorteos: distingue la enumeración (un sorteo por operación) del muestreo (dos por intento). */
const counting = (seed: number) => {
  const next = seeded(seed);
  const spy = {
    calls: 0,
    rand: () => {
      spy.calls += 1;
      return next();
    },
  };
  return spy;
};

const divisionValue = (over: Partial<ArithmeticInput>): ValidArithmetic =>
  valueOf({ kinds: { add: false, sub: false, mul: false, div: true }, ...over });

describe('buildOperation', () => {
  it('suma sin llevada acepta 34 + 25 y rechaza 47 + 38', () => {
    const value = valueOf({ carry: 'without' });
    expect(buildOperation('add', 34, 25, value)?.result).toBe(59);
    expect(buildOperation('add', 47, 38, value)).toBeNull();
  });

  it('suma con llevada exige al menos un arrastre', () => {
    const value = valueOf({ carry: 'with' });
    expect(buildOperation('add', 47, 38, value)?.result).toBe(85);
    expect(buildOperation('add', 34, 25, value)).toBeNull();
  });

  it('la resta nunca es negativa y ordena los operandos', () => {
    const value = valueOf({ kinds: { add: false, sub: true, mul: false, div: false } });
    const op = buildOperation('sub', 27, 52, value);
    expect(op).not.toBeNull();
    expect(op?.a).toBe(52);
    expect(op?.b).toBe(27);
    expect(op?.result).toBe(25);
  });

  it('resta sin llevada rechaza el préstamo', () => {
    const value = valueOf({ kinds: { add: false, sub: true, mul: false, div: false }, carry: 'without' });
    expect(buildOperation('sub', 58, 23, value)?.result).toBe(35);
    expect(buildOperation('sub', 52, 27, value)).toBeNull();
  });

  it('multiplicación sin llevada acepta 23 × 3 y rechaza 47 × 6', () => {
    const value = valueOf({ kinds: { add: false, sub: false, mul: true, div: false }, second: { min: 2, max: 9 }, carry: 'without' });
    expect(buildOperation('mul', 23, 3, value)?.result).toBe(69);
    expect(buildOperation('mul', 47, 6, value)).toBeNull();
  });

  it('multiplicación sin llevada también rechaza el arrastre al sumar los parciales', () => {
    const value = valueOf({ kinds: { add: false, sub: false, mul: true, div: false }, second: { min: 11, max: 13 }, carry: 'without' });
    // 23 × 13 = 299: columnas 9, 9 y 2, ningún arrastre.
    expect(buildOperation('mul', 23, 13, value)?.result).toBe(299);
    // 56 × 11: los productos parciales no pasan de 9, pero la columna central suma 5 + 6 = 11.
    expect(buildOperation('mul', 56, 11, value)).toBeNull();
  });

  it('división exacta solo acepta múltiplos', () => {
    const value = valueOf({ kinds: { add: false, sub: false, mul: false, div: true }, second: { min: 2, max: 9 }, division: 'exact' });
    const op = buildOperation('div', 84, 7, value);
    expect(op?.result).toBe(12);
    expect(op?.remainder).toBe(0);
    expect(buildOperation('div', 85, 7, value)).toBeNull();
  });

  it('división por cero no existe', () => {
    const value = valueOf({ kinds: { add: false, sub: false, mul: false, div: true }, second: { min: 0, max: 9 } });
    expect(buildOperation('div', 84, 0, value)).toBeNull();
  });

  it('descarta la resta cuando el par intercambiado se sale de los rangos', () => {
    const value = valueOf({ kinds: { add: false, sub: true, mul: false, div: false }, first: { min: 50, max: 60 }, second: { min: 0, max: 99 } });
    // Al ordenar quedaría 90 - 10, y 90 no cabe en el primer operando.
    expect(buildOperation('sub', 10, 90, value)).toBeNull();
  });
});

describe('drawOperations', () => {
  it('no repite pares', () => {
    const value = valueOf({ first: { min: 0, max: 9 }, second: { min: 0, max: 9 } });
    const ops = drawOperations('add', value, 100, rand);
    const keys = new Set(ops.map((o) => `${o.a}:${o.b}`));
    expect(keys.size).toBe(ops.length);
  });

  it('devuelve como mucho el espacio disponible', () => {
    // 3 × 3 pares posibles: 0..2 con 0..2.
    const value = valueOf({ first: { min: 0, max: 2 }, second: { min: 0, max: 2 } });
    expect(drawOperations('add', value, 50, rand)).toHaveLength(9);
  });

  it('todas las divisiones con resto tienen resto entre 1 y divisor - 1', () => {
    const value = divisionValue({ first: { min: 100, max: 999 }, second: { min: 2, max: 9 }, division: 'remainder' });
    const ops = drawOperations('div', value, 40, seeded(11));
    expect(ops.length).toBeGreaterThan(0);
    for (const op of ops) {
      expect(op.remainder).toBeGreaterThan(0);
      expect(op.remainder).toBeLessThan(op.b);
      expect(op.b * op.result + op.remainder).toBe(op.a);
      expect(op.a).toBeLessThanOrEqual(999);
      expect(op.a).toBeGreaterThanOrEqual(100);
    }
  });

  it('devuelve una lista vacía cuando el espacio es imposible', () => {
    // Divisiones exactas de 3 dígitos con divisor 500..999: el único múltiplo posible sería el propio divisor
    // con cociente 1; se comprueba que, si no hay ninguno, la lista es vacía en lugar de colgarse.
    const value = valueOf({
      kinds: { add: false, sub: false, mul: false, div: true },
      first: { min: 100, max: 101 },
      second: { min: 200, max: 300 },
      division: 'exact',
    });
    expect(drawOperations('div', value, 10, rand)).toEqual([]);
  });

  it('el muestreo de espacios grandes no se cuelga', () => {
    const value = valueOf({ first: { min: 10000, max: 99999 }, second: { min: 10000, max: 99999 } });
    const started = Date.now();
    expect(drawOperations('add', value, 200, seeded(3))).toHaveLength(200);
    // Medido en ~1 ms; el margen es holgura para máquinas cargadas, no una meta de rendimiento.
    expect(Date.now() - started).toBeLessThan(400);
  });

  it('la división con resto encuentra el único dividendo posible', () => {
    const value = divisionValue({ first: { min: 100, max: 100 }, second: { min: 3, max: 3 }, division: 'remainder' });
    // 100 = 3 · 33 + 1: buildOperation lo acepta, así que el sorteo tiene que encontrarlo.
    expect(buildOperation('div', 100, 3, value)).not.toBeNull();
    expect(drawOperations('div', value, 10, rand)).toEqual([{ kind: 'div', a: 100, b: 3, result: 33, remainder: 1 }]);
  });

  it('la división con resto recorre toda la ventana de restos de cada cociente', () => {
    const value = divisionValue({ first: { min: 100, max: 110 }, second: { min: 9, max: 9 }, division: 'remainder' });
    const ops = drawOperations('div', value, 50, rand);
    // 100..110 salvo el múltiplo 108.
    expect(ops.map((o) => o.a).sort((x, y) => x - y)).toEqual([100, 101, 102, 103, 104, 105, 106, 107, 109, 110]);
  });

  it('la enumeración también es exacta en modo resto', () => {
    const value = divisionValue({ first: { min: 100, max: 199 }, second: { min: 2, max: 9 }, division: 'remainder' });
    let expected = 0;
    for (let a = value.first.min; a <= value.first.max; a++) {
      for (let b = value.second.min; b <= value.second.max; b++) if (buildOperation('div', a, b, value)) expected += 1;
    }
    expect(expected).toBeGreaterThan(0);
    expect(drawOperations('div', value, 1_000_000, rand)).toHaveLength(expected);
  });

  it('el mismo rand da el mismo resultado', () => {
    const value = divisionValue({ first: { min: 100, max: 999 }, second: { min: 2, max: 9 }, division: 'remainder' });
    expect(drawOperations('div', value, 25, seeded(42))).toEqual(drawOperations('div', value, 25, seeded(42)));

    const big = valueOf({ first: { min: 10000, max: 99999 }, second: { min: 10000, max: 99999 } });
    expect(drawOperations('add', big, 25, seeded(42))).toEqual(drawOperations('add', big, 25, seeded(42)));
  });

  it('enumera justo hasta ENUMERATE_MAX y muestrea a partir de ahí', () => {
    expect(ENUMERATE_MAX).toBe(20000);

    // 200 × 100 = ENUMERATE_MAX: se enumera el rectángulo y solo se sortea el prefijo que se devuelve.
    const enumerated = counting(5);
    expect(drawOperations('add', valueOf({ first: { min: 0, max: 199 }, second: { min: 0, max: 99 } }), 5, enumerated.rand)).toHaveLength(5);
    expect(enumerated.calls).toBe(5);

    // Un valor más en el primer operando: 201 × 100 pasa del tope y se muestrea (dos sorteos por intento).
    const sampled = counting(5);
    expect(drawOperations('add', valueOf({ first: { min: 0, max: 200 }, second: { min: 0, max: 99 } }), 5, sampled.rand)).toHaveLength(5);
    expect(sampled.calls).toBe(10);
  });
});
