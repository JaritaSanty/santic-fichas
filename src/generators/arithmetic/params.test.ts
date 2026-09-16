import { describe, expect, it } from 'vitest';
import { ARITHMETIC_LIMITS, rangeForDigits, validateArithmetic } from './params';
import type { ArithmeticInput } from './types';

const base: ArithmeticInput = {
  kinds: { add: true, sub: false, mul: false, div: false },
  first: { min: 10, max: 99 },
  second: { min: 10, max: 99 },
  carry: 'any',
  division: 'exact',
  count: 20,
  layout: 'columns',
  columns: 3,
};

describe('rangeForDigits', () => {
  it('un dígito empieza en 0 y cinco dígitos llegan al máximo', () => {
    expect(rangeForDigits(1, 5)).toEqual({ min: 0, max: 9 });
    expect(rangeForDigits(3, 5)).toEqual({ min: 100, max: 999 });
    expect(rangeForDigits(5, 5)).toEqual({ min: 10000, max: 99999 });
  });

  it('acota al máximo de dígitos del operando', () => {
    expect(rangeForDigits(9, 3)).toEqual({ min: 100, max: 999 });
    expect(rangeForDigits(0, 5)).toEqual({ min: 0, max: 9 });
  });
});

describe('validateArithmetic', () => {
  it('acepta los parámetros por defecto', () => {
    const v = validateArithmetic(base);
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.value.kinds).toEqual(['add']);
  });

  it('exige al menos una operación', () => {
    const v = validateArithmetic({ ...base, kinds: { add: false, sub: false, mul: false, div: false } });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.errors).toContainEqual({ code: 'no-kind' });
  });

  it('rechaza rangos invertidos y fuera de límites', () => {
    const inverted = validateArithmetic({ ...base, first: { min: 90, max: 10 } });
    expect(inverted.ok).toBe(false);
    if (!inverted.ok) expect(inverted.errors).toContainEqual({ code: 'range-inverted', operand: 'first' });

    const tooBig = validateArithmetic({ ...base, first: { min: 10, max: 1000000 } });
    expect(tooBig.ok).toBe(false);
    if (!tooBig.ok) {
      expect(tooBig.errors).toContainEqual({
        code: 'operand-out-of-range',
        operand: 'first',
        min: ARITHMETIC_LIMITS.minOperand,
        max: ARITHMETIC_LIMITS.maxOperand,
      });
    }
  });

  it('recorta el segundo operando a tres dígitos con multiplicación y avisa', () => {
    const v = validateArithmetic({ ...base, kinds: { add: false, sub: false, mul: true, div: false }, second: { min: 10, max: 5000 } });
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.value.second.max).toBe(ARITHMETIC_LIMITS.maxFactor);
      expect(v.warnings).toContainEqual({ code: 'factor-capped', max: ARITHMETIC_LIMITS.maxFactor });
    }
  });

  it('rechaza un divisor máximo de 0', () => {
    const v = validateArithmetic({ ...base, kinds: { add: false, sub: false, mul: false, div: true }, second: { min: 0, max: 0 } });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.errors).toContainEqual({ code: 'divisor-zero' });
  });

  it('rechaza cantidades y columnas fuera de rango', () => {
    const count = validateArithmetic({ ...base, count: 201 });
    expect(count.ok).toBe(false);
    if (!count.ok) {
      expect(count.errors).toContainEqual({
        code: 'count-out-of-range',
        min: ARITHMETIC_LIMITS.minCount,
        max: ARITHMETIC_LIMITS.maxCount,
      });
    }

    const columns = validateArithmetic({ ...base, columns: 6 });
    expect(columns.ok).toBe(false);
    if (!columns.ok) {
      expect(columns.errors).toContainEqual({
        code: 'columns-out-of-range',
        min: ARITHMETIC_LIMITS.minColumns,
        max: ARITHMETIC_LIMITS.maxColumns,
      });
    }
  });

  it('ignora las columnas cuando la disposición es en línea', () => {
    expect(validateArithmetic({ ...base, layout: 'inline', columns: 9 }).ok).toBe(true);
  });

  it('avisa de que la llevada no afecta a la división sola', () => {
    const v = validateArithmetic({ ...base, kinds: { add: false, sub: false, mul: false, div: true }, carry: 'without' });
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.warnings).toContainEqual({ code: 'carry-ignored', kinds: ['div'] });
  });

  it('conserva el orden canónico de operaciones', () => {
    const v = validateArithmetic({ ...base, kinds: { add: true, sub: true, mul: true, div: true } });
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.value.kinds).toEqual(['add', 'sub', 'mul', 'div']);
  });
});
