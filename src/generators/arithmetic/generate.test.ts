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
    // Restas: 10 pares (20..29 menos 3). Divisiones exactas: solo 21, 24 y 27, tres de las seis que le tocaban.
    const value = valueOf({
      kinds: { add: false, sub: true, mul: false, div: true },
      first: { min: 20, max: 29 },
      second: { min: 3, max: 3 },
      division: 'exact',
      count: 12,
    });
    const { operations, requested } = generateArithmetic(value, 'v1-DEFICI');
    expect(requested).toBe(12);
    expect(operations).toHaveLength(12);
    expect(countOf(operations, 'div')).toBe(3);
    expect(countOf(operations, 'sub')).toBe(9);
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
      kinds: { add: false, sub: true, mul: false, div: true },
      first: { min: 20, max: 29 },
      second: { min: 3, max: 3 },
      division: 'exact',
      count: 12,
    });
    const { operations } = generateArithmetic(value, 'v1-DEFICI');
    expect(new Set(operations.map((o) => `${o.kind}:${o.a}:${o.b}`)).size).toBe(operations.length);
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
