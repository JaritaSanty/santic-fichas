import type { ArithmeticError, ArithmeticSuggestion, ArithmeticWarning, OperationKind, SeedInput } from '@/generators/arithmetic';
import type { Dictionary } from '@/i18n/dictionary';
import { formatMessage } from '@/i18n/format';

type Strings = Dictionary['arithmetic'];

/** Nombre de la operación dentro de una frase: minúscula y singular. */
export function kindName(kind: OperationKind, t: Strings): string {
  return t.kindNames[kind];
}

const operandName = (operand: 'first' | 'second', t: Strings): string => (operand === 'first' ? t.firstName : t.secondName);

export function describeError(error: ArithmeticError, t: Strings): string {
  switch (error.code) {
    case 'no-kind':
      return t.errors.noKind;
    case 'range-inverted':
      return formatMessage(t.errors.rangeInverted, { operand: operandName(error.operand, t) });
    case 'operand-out-of-range':
      return formatMessage(t.errors.operandOutOfRange, { operand: operandName(error.operand, t), min: error.min, max: error.max });
    case 'count-out-of-range':
      return formatMessage(t.errors.countOutOfRange, { min: error.min, max: error.max });
    case 'columns-out-of-range':
      return formatMessage(t.errors.columnsOutOfRange, { min: error.min, max: error.max });
    case 'divisor-zero':
      return t.errors.divisorZero;
    case 'empty-space':
      return formatMessage(t.errors.emptySpace, { kind: kindName(error.kind, t) });
  }
}

export function describeWarning(warning: ArithmeticWarning, t: Strings): string {
  switch (warning.code) {
    case 'carry-ignored':
      return formatMessage(t.warnings.carryIgnored, { kinds: warning.kinds.map((kind) => kindName(kind, t)).join(', ') });
    case 'factor-capped':
      return formatMessage(t.warnings.factorCapped, { max: warning.max });
  }
}

/**
 * Aviso de una operación elegida que no ha aportado ninguna a la ficha. No es un `ArithmeticWarning`: el generador no
 * cuenta por operación (ruling de la Tarea 4), así que la herramienta lo deduce de `result.operations`.
 */
export function describeKindMissing(kind: OperationKind, t: Strings): string {
  return formatMessage(t.warnings.kindMissing, { kind: kindName(kind, t) });
}

/**
 * `fills: false` es «no se ha podido comprobar que llene la ficha» (informe de la Tarea 4), así que su texto no promete
 * la ficha completa; solo la variante con `fills: true` lo hace.
 */
export function describeSuggestion(s: ArithmeticSuggestion, t: Strings): string {
  switch (s.code) {
    case 'raise-first-max':
      return formatMessage(s.fills ? t.suggestions.raiseFirstMax : t.suggestions.raiseFirstMaxPartial, { to: s.to });
    case 'lower-first-min':
      return formatMessage(s.fills ? t.suggestions.lowerFirstMin : t.suggestions.lowerFirstMinPartial, { to: s.to });
    case 'widen-second':
      return formatMessage(s.fills ? t.suggestions.widenSecond : t.suggestions.widenSecondPartial, { min: s.min, max: s.max });
    case 'allow-remainder':
      return s.fills ? t.suggestions.allowRemainder : t.suggestions.allowRemainderPartial;
    case 'allow-carry':
      return s.fills ? t.suggestions.allowCarry : t.suggestions.allowCarryPartial;
    case 'allow-any-carry':
      return s.fills ? t.suggestions.allowAnyCarry : t.suggestions.allowAnyCarryPartial;
    case 'reduce-count':
      return formatMessage(t.suggestions.reduceCount, { to: s.to });
  }
}

export function describeSeed(seed: SeedInput, t: Strings): string | null {
  switch (seed.status) {
    case 'invalid':
      return t.seedInvalid;
    case 'other-version':
      return formatMessage(t.seedOtherVersion, { found: seed.version, version: seed.expected });
    default:
      return null;
  }
}
