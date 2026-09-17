import { ARITHMETIC_LIMITS } from './params';
import { buildOperation, ENUMERATE_MAX } from './space';
import type { OperationKind, Range, ValidArithmetic } from './types';

/**
 * `fills` dice si aplicar el ajuste deja sitio para **todas** las operaciones pedidas o solo desatasca el espacio:
 * `false` significa que la ficha seguirá saliendo corta (a veces con una sola operación), y el texto tiene que decirlo.
 * Se calcula contando el espacio resultante, y es conservador: nunca es `true` sin haberlo comprobado.
 */
export type ArithmeticSuggestion =
  | { code: 'raise-first-max'; to: number; fills: boolean }
  | { code: 'lower-first-min'; to: number; fills: boolean }
  | { code: 'widen-second'; min: number; max: number; fills: boolean }
  | { code: 'allow-remainder'; fills: boolean }
  | { code: 'allow-carry' }
  | { code: 'allow-any-carry' }
  | { code: 'reduce-count'; to: number };

/**
 * Sondeos que se permite gastar cada búsqueda. Es el mismo tope con el que `drawOperations` decide si enumera:
 * un espacio que no cabe entero no se puede declarar vacío (informe de la Tarea 2), así que cuando el presupuesto se
 * agota la sugerencia no se emite. Preferimos callar a proponer un ajuste que no arregle nada.
 */
const PROBE_BUDGET = ENUMERATE_MAX;

/**
 * Suelo de lo que se **propone**: nunca un segundo operando 0 (ni «× 0» ni «÷ 0» son ejercicio) ni un divisor 1
 * (dividir por 1 tampoco lo es). Es una regla sobre el rango que se sugiere, no sobre los divisores que ya existen:
 * si el docente eligió el 1 y la división exacta, `divisionCount` cuenta sus operaciones con normalidad y
 * `dividendAbove`/`dividendBelow` calculan sobre `b = 1` como sobre cualquier otro divisor.
 */
const SECOND_FLOOR = 1;
const DIVISOR_FLOOR = 2;

interface Budget {
  left: number;
}

/**
 * Recuento del espacio mientras se explora. `minB`/`maxB` son los segundos operandos que las operaciones contadas
 * necesitan de verdad: `buildOperation` solo exige del rango el operando `op.b`, así que cualquier rango que los
 * contenga mantiene válidas todas las contadas. Explorar un valor que no aporta nada no ensancha la sugerencia.
 *
 * `track` acota qué operaciones mueven esos extremos: cuando la meta es revivir las que no tienen espacio, lo que
 * aporten las demás por el camino no debe ensanchar la propuesta (si no, buscar un divisor por abajo se llevaba por
 * delante las sumas que aparecían por arriba: `9..179` donde bastaba `9..99`). `null` es «todas».
 */
interface Pool {
  total: number;
  seen: Set<string>;
  alive: Set<OperationKind>;
  minB: number;
  maxB: number;
  track: Set<OperationKind> | null;
}

/** Mismo recorte del divisor que `space.ts`: nunca 0, nunca por encima del tope de factor y nunca 1 si hay resto. */
function divisorBounds(value: ValidArithmetic): Range {
  const { maxFactor } = ARITHMETIC_LIMITS;
  const min = Math.max(1, Math.min(value.second.min, maxFactor));
  return {
    min: value.division === 'exact' ? min : Math.max(min, 2),
    max: Math.min(value.second.max, maxFactor),
  };
}

/**
 * Cuántos dividendos del rango admite este divisor. Forma cerrada, sin recorrer nada: cada trío (divisor, cociente,
 * resto) da un dividendo distinto, así que contar dividendos es contar operaciones.
 * Exacta: los múltiplos de `b` dentro del rango con cociente ≥ 1. Con resto: los `a ≥ b + 1` del rango que no son
 * múltiplos de `b`.
 */
function divisionCount(first: Range, b: number, exact: boolean): number {
  if (b < (exact ? 1 : 2) || b > ARITHMETIC_LIMITS.maxFactor) return 0;
  if (exact) {
    const qMin = Math.max(1, Math.ceil(first.min / b));
    return Math.max(0, Math.floor(first.max / b) - qMin + 1);
  }
  const lo = Math.max(first.min, b + 1);
  if (lo > first.max) return 0;
  const multiples = Math.floor(first.max / b) - Math.floor((lo - 1) / b);
  return first.max - lo + 1 - multiples;
}

/** Primer dividendo válido por encima de `first.max`, o `null` si se saldría del tope de operando. */
function dividendAbove(first: Range, b: number, exact: boolean): number | null {
  let a: number;
  if (exact) {
    a = b * (Math.floor(first.max / b) + 1);
  } else {
    if (b < 2) return null;
    a = Math.max(first.max + 1, b + 1);
    if (a % b === 0) a += 1;
  }
  return a <= ARITHMETIC_LIMITS.maxOperand ? a : null;
}

/** Último dividendo válido por debajo de `first.min`, o `null` si no hay ninguno (el cociente tiene que ser ≥ 1). */
function dividendBelow(first: Range, b: number, exact: boolean): number | null {
  let a: number;
  if (exact) {
    const q = Math.ceil(first.min / b) - 1;
    if (q < 1) return null;
    a = b * q;
  } else {
    if (b < 2) return null;
    a = first.min - 1;
    if (a % b === 0) a -= 1;
    if (a < b + 1) return null;
  }
  return a >= ARITHMETIC_LIMITS.minOperand ? a : null;
}

/** Estira los extremos necesarios, si esta operación es de las que cuentan para la meta. */
function widen(pool: Pool, kind: OperationKind, b: number): void {
  if (pool.track !== null && !pool.track.has(kind)) return;
  pool.minB = Math.min(pool.minB, b);
  pool.maxB = Math.max(pool.maxB, b);
}

/**
 * Suma al recuento lo que aporta un segundo operando concreto dentro de `second`, y apunta qué operaciones tienen al
 * menos una posible. Devuelve `false` si se agota el presupuesto: entonces no se puede afirmar nada del espacio.
 *
 * La división se cuenta en forma cerrada; el resto se sondea con `buildOperation`, el mismo oráculo que usa el sorteo,
 * así que la llevada y el orden del par de la resta salen gratis. El recuento de la resta puede quedarse corto (un par
 * intercambiado necesita que el otro operando quepa en el rango que se está considerando, y el rango crece después),
 * y quedarse corto es seguro: es una cota inferior, así que «el espacio llega a `count`» nunca es un falso positivo.
 */
function addColumn(value: ValidArithmetic, second: Range, b: number, pool: Pool, budget: Budget): boolean {
  const probe: ValidArithmetic = { ...value, second };
  for (const kind of value.kinds) {
    if (kind === 'div') {
      const found = divisionCount(value.first, b, value.division === 'exact');
      if (found > 0) {
        pool.total += found;
        pool.alive.add(kind);
        widen(pool, kind, b);
      }
      continue;
    }
    for (let a = value.first.min; a <= value.first.max; a++) {
      if (budget.left <= 0) return false;
      budget.left -= 1;
      const op = buildOperation(kind, a, b, probe);
      if (op === null) continue;
      const key = `${kind}:${op.a}:${op.b}`;
      if (pool.seen.has(key)) continue;
      pool.seen.add(key);
      pool.total += 1;
      pool.alive.add(kind);
      widen(pool, kind, op.b);
    }
  }
  return true;
}

function newPool(second: Range): Pool {
  return { total: 0, seen: new Set<string>(), alive: new Set<OperationKind>(), minB: second.min, maxB: second.max, track: null };
}

/**
 * Espacio total de unos parámetros, o `null` si no cabe en el presupuesto de sondeos. Sirve para responder a
 * «¿con este ajuste sale la ficha entera?» sin sortear nada. Como el recuento de la resta es una cota inferior,
 * un `null` o un recuento corto solo pueden hacer que se prometa **de menos**.
 */
function countSpace(value: ValidArithmetic, budget: Budget): number | null {
  const pool = newPool(value.second);
  for (let b = value.second.min; b <= value.second.max; b++) {
    if (!addColumn(value, value.second, b, pool, budget)) return null;
  }
  return pool.total;
}

/** ¿Llega a lo pedido el espacio de estos parámetros? Conservador: si no se puede contar, no se promete. */
function fillsCount(value: ValidArithmetic): boolean {
  const total = countSpace(value, { left: PROBE_BUDGET });
  return total !== null && total >= value.count;
}

/**
 * Rango de segundo operando que arregla el espacio, o `null` si no hay ninguno al alcance.
 *
 * Se explora alternando hacia abajo y hacia arriba desde el rango del docente —empezando por abajo, porque un segundo
 * operando menor es más fácil para el alumno y admite más operaciones— y se para en cuanto se cumple la meta: revivir
 * las operaciones que no tenían ninguna posible si las hay, o llegar a `count` operaciones si no. El rango que se
 * devuelve es el que necesitan las operaciones que cuentan para esa meta, no hasta dónde se ha explorado.
 * Si con el rango actual ninguna operación está bloqueada y el espacio ya llega a `count`, el segundo operando no es
 * el problema y no se sugiere nada.
 *
 * `fills` sale gratis cuando la meta era llegar a `count` (el rango devuelto contiene todo lo contado); cuando la meta
 * era revivir, se vuelve a contar el espacio del rango propuesto, que es el único sobre el que se puede prometer.
 */
function widenSecond(value: ValidArithmetic, budget: Budget): { range: Range; fills: boolean } | null {
  const pool = newPool(value.second);
  for (let b = value.second.min; b <= value.second.max; b++) {
    if (!addColumn(value, value.second, b, pool, budget)) return null;
  }
  const blocked = value.kinds.filter((kind) => !pool.alive.has(kind));
  if (blocked.length === 0 && pool.total >= value.count) return null;
  pool.track = blocked.length > 0 ? new Set(blocked) : null;

  const hasFactorLimit = value.kinds.includes('mul') || value.kinds.includes('div');
  const ceiling = hasFactorLimit ? ARITHMETIC_LIMITS.maxFactor : ARITHMETIC_LIMITS.maxOperand;
  const floor = value.kinds.includes('div') ? DIVISOR_FLOOR : SECOND_FLOOR;
  const reached = (): boolean =>
    blocked.length > 0 ? value.kinds.every((kind) => pool.alive.has(kind)) : pool.total >= value.count;

  let { min, max } = value.second;
  let down = true;
  while (min > floor || max < ceiling) {
    const b = down && min > floor ? min - 1 : max < ceiling ? max + 1 : min - 1;
    if (b < min) min = b;
    else max = b;
    down = !down;
    if (!addColumn(value, { min, max }, b, pool, budget)) return null;
    if (reached()) {
      const range: Range = { min: pool.minB, max: pool.maxB };
      return { range, fills: blocked.length === 0 || fillsCount({ ...value, second: range }) };
    }
  }
  return null;
}

/** ¿Descarta la restricción de llevada algún par que sin ella valdría? La división no la mira, así que se salta. */
function carryBlocks(value: ValidArithmetic): boolean {
  const relaxed: ValidArithmetic = { ...value, carry: 'any' };
  const budget: Budget = { left: PROBE_BUDGET };
  for (const kind of value.kinds) {
    if (kind === 'div') continue;
    for (let a = value.first.min; a <= value.first.max; a++) {
      for (let b = value.second.min; b <= value.second.max; b++) {
        if (budget.left <= 0) return false;
        budget.left -= 1;
        if (buildOperation(kind, a, b, relaxed) !== null && buildOperation(kind, a, b, value) === null) return true;
      }
    }
  }
  return false;
}

/**
 * Ajustes concretos cuando los parámetros no dan para la ficha pedida. Función pura: razona sobre los parámetros, y
 * `available` es lo que el generador consiguió producir (`ArithmeticResult.operations.length`).
 *
 * Se emite una sugerencia solo cuando está **comprobado** que amplía el espacio; una que no arregle nada es peor que
 * ninguna. Por eso la división se decide en forma cerrada y lo demás se cuenta con `buildOperation` y un presupuesto
 * de sondeos: de un espacio que no cabe en el presupuesto no se afirma nada.
 *
 * El orden es de menos a más invasivo para el docente: mover un extremo del primer operando, ampliar el segundo,
 * cambiar el tipo de división, levantar la restricción de llevada y, en último lugar, pedir menos operaciones.
 *
 * Límites conocidos, para los textos (Tarea 8) y la herramienta (Tarea 9):
 * - `raise-first-max` y `lower-first-min` son de la **división** y solo salen cuando su espacio es realmente vacío.
 * - `allow-carry` sale con `carry: 'without'` y `allow-any-carry` con `carry: 'with'`; nunca los dos.
 * - `fills` distingue «así sale la ficha entera» de «así deja de estar vacía», y es conservador.
 * - Con la ficha completa (`available >= count`) no se sugiere nada, aunque alguna operación elegida no haya salido:
 *   el reparto del cupo absorbe una operación imposible y esta función no ve el recuento por tipo.
 */
export function suggestArithmetic(value: ValidArithmetic, available: number): ArithmeticSuggestion[] {
  if (available >= value.count) return [];
  const out: ArithmeticSuggestion[] = [];
  const { first, kinds } = value;
  const exact = value.division === 'exact';
  let remainderHelps = false;

  if (kinds.includes('div')) {
    const bounds = divisorBounds(value);
    let empty = true;
    for (let b = bounds.min; b <= bounds.max && empty; b++) empty = divisionCount(first, b, exact) === 0;
    if (empty) {
      let above: number | null = null;
      let below: number | null = null;
      for (let b = bounds.min; b <= bounds.max; b++) {
        const up = dividendAbove(first, b, exact);
        if (up !== null && (above === null || up < above)) above = up;
        const down = dividendBelow(first, b, exact);
        if (down !== null && (below === null || down > below)) below = down;
        if (exact && divisionCount(first, b, false) > 0) remainderHelps = true;
      }
      if (above !== null) {
        out.push({ code: 'raise-first-max', to: above, fills: fillsCount({ ...value, first: { ...first, max: above } }) });
      }
      if (below !== null) {
        out.push({ code: 'lower-first-min', to: below, fills: fillsCount({ ...value, first: { ...first, min: below } }) });
      }
    }
  }

  const wider = widenSecond(value, { left: PROBE_BUDGET });
  if (wider) out.push({ code: 'widen-second', min: wider.range.min, max: wider.range.max, fills: wider.fills });

  if (remainderHelps) {
    out.push({ code: 'allow-remainder', fills: fillsCount({ ...value, division: 'remainder' }) });
  }
  if (value.carry === 'without' && carryBlocks(value)) out.push({ code: 'allow-carry' });
  // `carry: 'with'` no tiene un ajuste parcial: o hay operaciones con llevada o no las hay. Se propone quitar la
  // exigencia solo cuando está comprobado que el espacio está vacío con ella y deja de estarlo sin ella.
  if (value.carry === 'with' && countSpace(value, { left: PROBE_BUDGET }) === 0) {
    const relaxed = countSpace({ ...value, carry: 'any' }, { left: PROBE_BUDGET });
    if (relaxed !== null && relaxed > 0) out.push({ code: 'allow-any-carry' });
  }
  if (available >= ARITHMETIC_LIMITS.minCount) out.push({ code: 'reduce-count', to: available });
  return out;
}
