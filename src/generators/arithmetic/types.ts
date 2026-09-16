export type OperationKind = 'add' | 'sub' | 'mul' | 'div';
export type CarryMode = 'any' | 'with' | 'without';
export type DivisionMode = 'exact' | 'remainder';
export type SheetLayout = 'columns' | 'inline';

export interface Range {
  min: number;
  max: number;
}

/** `remainder` es 0 salvo en división con resto. */
export interface Operation {
  kind: OperationKind;
  a: number;
  b: number;
  result: number;
  remainder: number;
}

export interface ArithmeticInput {
  kinds: Record<OperationKind, boolean>;
  first: Range;
  second: Range;
  carry: CarryMode;
  division: DivisionMode;
  count: number;
  layout: SheetLayout;
  columns: number;
}

export interface ValidArithmetic extends Omit<ArithmeticInput, 'kinds'> {
  kinds: OperationKind[];
}

export type ArithmeticError =
  | { code: 'no-kind' }
  | { code: 'range-inverted'; operand: 'first' | 'second' }
  | { code: 'operand-out-of-range'; operand: 'first' | 'second'; min: number; max: number }
  | { code: 'count-out-of-range'; min: number; max: number }
  | { code: 'columns-out-of-range'; min: number; max: number }
  | { code: 'divisor-zero' }
  | { code: 'empty-space'; kind: OperationKind };

export type ArithmeticWarning =
  | { code: 'carry-ignored'; kinds: OperationKind[] }
  | { code: 'factor-capped'; max: number };

export type ArithmeticValidation =
  | { ok: true; value: ValidArithmetic; warnings: ArithmeticWarning[] }
  | { ok: false; errors: ArithmeticError[]; warnings: ArithmeticWarning[] };
