import type {
  ArithmeticError,
  ArithmeticInput,
  ArithmeticValidation,
  ArithmeticWarning,
  OperationKind,
  Range,
  ValidArithmetic,
} from './types';

export const ARITHMETIC_LIMITS = {
  minCount: 1,
  maxCount: 200,
  minOperand: 0,
  maxOperand: 99999,
  maxFactor: 999,
  minDigits: 1,
  maxDigits: 5,
  maxFactorDigits: 3,
  minColumns: 2,
  maxColumns: 5,
} as const;

/** Orden canónico de las operaciones; lo reutilizan las tareas siguientes al repartir el cupo. */
export const KIND_ORDER: OperationKind[] = ['add', 'sub', 'mul', 'div'];

/** Operaciones a las que la llevada/pedida afecta visualmente. */
const CARRY_AFFECTED_KINDS: readonly OperationKind[] = ['add', 'sub', 'mul'] as const;

export function rangeForDigits(digits: number, maxDigits: number): Range {
  const d = Math.min(Math.max(digits, 1), maxDigits);
  return { min: d === 1 ? 0 : 10 ** (d - 1), max: 10 ** d - 1 };
}

function validateRange(range: Range, operand: 'first' | 'second', errors: ArithmeticError[]): void {
  const { minOperand, maxOperand } = ARITHMETIC_LIMITS;
  if (range.min < minOperand || range.max > maxOperand) {
    errors.push({ code: 'operand-out-of-range', operand, min: minOperand, max: maxOperand });
  }
  if (range.min > range.max) errors.push({ code: 'range-inverted', operand });
}

export function validateArithmetic(input: ArithmeticInput): ArithmeticValidation {
  const errors: ArithmeticError[] = [];
  const warnings: ArithmeticWarning[] = [];
  const { minCount, maxCount, minColumns, maxColumns, maxFactor } = ARITHMETIC_LIMITS;

  const kinds = KIND_ORDER.filter((kind) => input.kinds[kind]);
  if (kinds.length === 0) errors.push({ code: 'no-kind' });

  validateRange(input.first, 'first', errors);
  validateRange(input.second, 'second', errors);

  const hasFactorLimit = kinds.includes('mul') || kinds.includes('div');
  let second = input.second;
  // Se recorta min y max: si solo se recortara max, min > max rompería el invariante de ValidArithmetic.
  if (hasFactorLimit && (second.min > maxFactor || second.max > maxFactor)) {
    second = { min: Math.min(second.min, maxFactor), max: Math.min(second.max, maxFactor) };
    warnings.push({ code: 'factor-capped', max: maxFactor });
  }

  if (kinds.includes('div') && second.max <= 0) errors.push({ code: 'divisor-zero' });

  if (!Number.isInteger(input.count) || input.count < minCount || input.count > maxCount) {
    errors.push({ code: 'count-out-of-range', min: minCount, max: maxCount });
  }

  if (input.layout === 'columns' && (!Number.isInteger(input.columns) || input.columns < minColumns || input.columns > maxColumns)) {
    errors.push({ code: 'columns-out-of-range', min: minColumns, max: maxColumns });
  }

  if (kinds.length > 0 && input.carry !== 'any' && !kinds.some((kind) => CARRY_AFFECTED_KINDS.includes(kind))) {
    warnings.push({ code: 'carry-ignored', kinds });
  }

  if (errors.length > 0) return { ok: false, errors, warnings };

  const value: ValidArithmetic = {
    kinds,
    first: input.first,
    second,
    carry: input.carry,
    division: input.division,
    count: input.count,
    layout: input.layout,
    columns: input.columns,
  };
  return { ok: true, value, warnings };
}
