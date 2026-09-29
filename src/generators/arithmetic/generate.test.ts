import { describe, expect, it } from 'vitest';
import { ARITHMETIC_ALGORITHM_VERSION, generateArithmetic } from './generate';
import { validateArithmetic } from './params';
import { readSeedInput } from './seed';
import type { ArithmeticInput, Operation, OperationKind, ValidArithmetic } from './types';

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

const serialize = (ops: Operation[]): string[] => ops.map((o) => `${o.kind} ${o.a} ${o.b} = ${o.result} r${o.remainder}`);

const countOf = (ops: Operation[], kind: OperationKind): number => ops.filter((o) => o.kind === kind).length;

const ALL_KINDS = { add: true, sub: true, mul: true, div: true };

describe('generateArithmetic', () => {
  it('el mismo código y los mismos parámetros dan exactamente las mismas operaciones', () => {
    const value = valueOf({ kinds: ALL_KINDS, first: { min: 10, max: 99 }, second: { min: 2, max: 9 }, count: 20 });
    expect(serialize(generateArithmetic(value, 'v1-REPITE').operations)).toEqual(
      serialize(generateArithmetic(value, 'v1-REPITE').operations),
    );
  });

  it('dos códigos distintos dan listas distintas', () => {
    const value = valueOf({ kinds: ALL_KINDS, first: { min: 10, max: 99 }, second: { min: 2, max: 9 }, count: 20 });
    expect(serialize(generateArithmetic(value, 'v1-UNO234').operations)).not.toEqual(
      serialize(generateArithmetic(value, 'v1-DOS234').operations),
    );
  });

  it('devuelve lo pedido, el código y la versión', () => {
    const value = valueOf({ count: 12 });
    const result = generateArithmetic(value, 'v1-CABECE');
    expect(result.requested).toBe(12);
    expect(result.seedCode).toBe('v1-CABECE');
    expect(result.version).toBe(ARITHMETIC_ALGORITHM_VERSION);
    expect(result.operations).toHaveLength(12);
  });

  it('con las cuatro operaciones y count 20 hay 5 de cada una', () => {
    const value = valueOf({ kinds: ALL_KINDS, first: { min: 10, max: 99 }, second: { min: 2, max: 9 }, count: 20 });
    const { operations } = generateArithmetic(value, 'v1-CUATRO');
    expect(operations).toHaveLength(20);
    expect([countOf(operations, 'add'), countOf(operations, 'sub'), countOf(operations, 'mul'), countOf(operations, 'div')]).toEqual([5, 5, 5, 5]);
  });

  it('con count 7 y dos operaciones hay 4 y 3 siguiendo el orden canónico', () => {
    const value = valueOf({ kinds: { add: true, sub: true, mul: false, div: false }, count: 7 });
    const { operations } = generateArithmetic(value, 'v1-SIETE7');
    expect(operations).toHaveLength(7);
    expect(countOf(operations, 'add')).toBe(4);
    expect(countOf(operations, 'sub')).toBe(3);
  });

  it('mezcla las operaciones de distinta clase', () => {
    const value = valueOf({ kinds: ALL_KINDS, first: { min: 10, max: 99 }, second: { min: 2, max: 9 }, count: 20 });
    const kinds = generateArithmetic(value, 'v1-MEZCLA').operations.map((o) => o.kind);
    // Sin barajar, las 20 saldrían agrupadas en cuatro bloques de 5: basta con que alguna rompa su bloque.
    const grouped: OperationKind[] = [...Array<OperationKind>(5).fill('add'), ...Array<OperationKind>(5).fill('sub'), ...Array<OperationKind>(5).fill('mul'), ...Array<OperationKind>(5).fill('div')];
    expect(kinds).not.toEqual(grouped);
  });

  it('si una operación no tiene espacio suficiente, las demás cubren el déficit', () => {
    // 101..109 con el 7: suma, resta y multiplicación tienen 9 pares cada una, pero la única división exacta es
    // 105 ÷ 7. Cupos de 3; el déficit de 2 se reparte entre las tres que sí llegaron, empezando por las primeras
    // del orden canónico: una más para la suma y otra para la resta.
    const value = valueOf({
      kinds: ALL_KINDS,
      first: { min: 101, max: 109 },
      second: { min: 7, max: 7 },
      division: 'exact',
      count: 12,
    });
    const { operations, requested } = generateArithmetic(value, 'v1-DEFIC4');
    expect(requested).toBe(12);
    expect(operations).toHaveLength(12);
    expect([countOf(operations, 'add'), countOf(operations, 'sub'), countOf(operations, 'mul'), countOf(operations, 'div')]).toEqual([4, 4, 3, 1]);
  });

  it('si el espacio total es menor que lo pedido devuelve menos y sin repeticiones', () => {
    // El espacio entero son 10 restas más 3 divisiones: 13 operaciones para 30 pedidas.
    const value = valueOf({
      kinds: { add: false, sub: true, mul: false, div: true },
      first: { min: 20, max: 29 },
      second: { min: 3, max: 3 },
      division: 'exact',
      count: 30,
    });
    const { operations, requested } = generateArithmetic(value, 'v1-CORTAS');
    expect(requested).toBe(30);
    expect(operations).toHaveLength(13);
    expect(operations.length).toBeLessThan(requested);
    expect(new Set(operations.map((o) => `${o.kind}:${o.a}:${o.b}`)).size).toBe(operations.length);
  });

  it('no repite operaciones cuando el déficit obliga a volver a sortear', () => {
    const value = valueOf({
      kinds: ALL_KINDS,
      first: { min: 101, max: 109 },
      second: { min: 7, max: 7 },
      division: 'exact',
      count: 12,
    });
    const { operations } = generateArithmetic(value, 'v1-DEFIC4');
    expect(new Set(operations.map((o) => `${o.kind}:${o.a}:${o.b}`)).size).toBe(operations.length);
  });

  it('pedir exactamente lo que cupo devuelve eso mismo, no menos', () => {
    // Con 0..9 y 90..99 sin llevada solo hay espacio para 55 sumas y 20 multiplicaciones: la resta y la división son
    // imposibles (el minuendo y el dividendo tendrían que ser mayores que el segundo operando). El espacio real son
    // 75 operaciones, así que pedir 200 da 75 y volver a pedir esas 75 tiene que seguir dando 75: si el reparto del
    // déficit se quedara en una sola vuelta, daría 58, luego 50, 46, 44… y seguir la sugerencia encogería la ficha.
    const config = { kinds: ALL_KINDS, first: { min: 0, max: 9 }, second: { min: 90, max: 99 }, carry: 'without' } as const;
    expect(generateArithmetic(valueOf({ ...config, count: 200 }), 'v1-MESETA').operations).toHaveLength(75);
    expect(generateArithmetic(valueOf({ ...config, count: 75 }), 'v1-MESETA').operations).toHaveLength(75);
  });

  it('lo que se produce no baja al bajar lo pedido', () => {
    // Dos configuraciones, una por camino: el espacio pequeño se enumera y el grande se muestrea. El muestreo tenía
    // su propia rotura de la monotonía (el presupuesto de intentos dependía de lo pedido), invisible en el primero.
    const enumerated = { kinds: ALL_KINDS, first: { min: 0, max: 9 }, second: { min: 90, max: 99 }, carry: 'without' } as const;
    const sampled = { kinds: { add: false, sub: false, mul: true, div: false }, first: { min: 1000, max: 9999 }, second: { min: 900, max: 999 }, carry: 'without' } as const;
    for (const [config, counts] of [
      [enumerated, Array.from({ length: 120 }, (_, i) => i + 1)],
      [sampled, [1, 2, 3, 5, 8, 13, 17, 21, 34, 55, 89, 100, 101, 144, 200]],
    ] as const) {
      let previous = 0;
      for (const count of counts) {
        const produced = generateArithmetic(valueOf({ ...config, count }), 'v1-MESETA').operations.length;
        expect(produced).toBeGreaterThanOrEqual(previous);
        expect(produced).toBeLessThanOrEqual(count);
        // Y lo que se produce es un punto fijo: es justo lo que la sugerencia `reduce-count` le ofrece al docente.
        if (produced < count) {
          expect(generateArithmetic(valueOf({ ...config, count: produced }), 'v1-MESETA').operations).toHaveLength(produced);
        }
        previous = produced;
      }
    }
  });

  it('el muestreo no encuentra menos por pedirle menos', () => {
    // 1000..9999 × 900..999 sin llevada: el rectángulo son 900 000 pares, así que se muestrea. Con el presupuesto
    // atado a lo pedido, este caso daba 200 → 10 → 1 → 0: la ficha se vaciaba a base de seguir la sugerencia.
    const config = { kinds: { add: false, sub: false, mul: true, div: false }, first: { min: 1000, max: 9999 }, second: { min: 900, max: 999 }, carry: 'without' } as const;
    const full = generateArithmetic(valueOf({ ...config, count: 200 }), 'v1-MUESTR').operations.length;
    expect(full).toBeGreaterThan(0);
    expect(full).toBeLessThan(200);
    expect(generateArithmetic(valueOf({ ...config, count: full }), 'v1-MUESTR').operations).toHaveLength(full);
  });

  // `n ÷ n` y `n − n` no son ejercicio: con 10–99 y división exacta llegaron a ser 2 de cada 5 divisiones de la hoja.
  it('con 10–99 no sale ninguna identidad mientras haya otras operaciones', () => {
    const value = valueOf({ kinds: { add: false, sub: true, mul: false, div: true }, count: 200 });
    for (const seed of ['v1-IDENT1', 'v1-IDENT2', 'v1-PORTADA', 'v1-ABC234']) {
      const ops = generateArithmetic(value, seed).operations;
      expect(ops.length).toBeGreaterThan(100);
      expect(ops.filter((o) => o.a === o.b)).toEqual([]);
    }
  });

  it('las identidades siguen saliendo cuando no queda otra cosa que sortear', () => {
    const only = valueOf({ kinds: { add: false, sub: true, mul: false, div: false }, first: { min: 10, max: 10 }, second: { min: 10, max: 10 }, count: 5 });
    expect(serialize(generateArithmetic(only, 'v1-UNICA1').operations)).toEqual(['sub 10 10 = 0 r0']);
    // Con una sola alternativa, la identidad completa la hoja en vez de dejarla corta, pero va detrás.
    const pair = valueOf({ kinds: { add: false, sub: false, mul: false, div: true }, first: { min: 10, max: 11 }, second: { min: 10, max: 11 }, count: 5 });
    const drawn = generateArithmetic(pair, 'v1-UNICA2').operations;
    expect(serialize(drawn).sort()).toEqual(['div 10 10 = 1 r0', 'div 11 11 = 1 r0']);
  });

  it('el código se lleva a su forma canónica antes de sembrar', () => {
    const value = valueOf({ count: 10 });
    const lower = generateArithmetic(value, ' v1-abc234 ');
    expect(lower.seedCode).toBe('v1-ABC234');
    expect(serialize(lower.operations)).toEqual(serialize(generateArithmetic(value, 'v1-ABC234').operations));
  });
});

describe('readSeedInput', () => {
  it('un código de otra versión se señala como tal', () => {
    expect(readSeedInput('v2-ABC234')).toEqual({ status: 'other-version', version: 2, expected: ARITHMETIC_ALGORITHM_VERSION });
  });

  it('un código que no lo es se señala como no válido', () => {
    expect(readSeedInput('hola')).toEqual({ status: 'invalid' });
  });

  it('la entrada vacía no es un error', () => {
    expect(readSeedInput('   ')).toEqual({ status: 'empty' });
  });

  it('normaliza el código válido a mayúsculas', () => {
    expect(readSeedInput('  v1-abc234 ')).toEqual({ status: 'ok', code: 'v1-ABC234' });
  });
});
