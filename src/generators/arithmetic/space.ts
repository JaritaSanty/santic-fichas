import { ARITHMETIC_LIMITS } from './params';
import type { CarryMode, Operation, OperationKind, Range, ValidArithmetic } from './types';

/** Tamaño máximo del espacio que se enumera entero; por encima se muestrea con rechazo. */
export const ENUMERATE_MAX = 20000;
/** Intentos de muestreo por operación pedida antes de rendirse. */
export const SAMPLE_ATTEMPTS_PER_ITEM = 200;

/** Dígitos decimales de menor a mayor peso; 0 da [0]. */
function digitsOf(n: number): number[] {
  const out: number[] = [];
  let rest = n;
  do {
    out.push(rest % 10);
    rest = Math.floor(rest / 10);
  } while (rest > 0);
  return out;
}

/** Si ninguna columna pasa de 9 no hay arrastre, así que basta con mirarlas sin propagar. */
function addHasCarry(a: number, b: number): boolean {
  let x = a;
  let y = b;
  while (x > 0 || y > 0) {
    if ((x % 10) + (y % 10) > 9) return true;
    x = Math.floor(x / 10);
    y = Math.floor(y / 10);
  }
  return false;
}

/** Solo para a >= b: hay préstamo si alguna columna del minuendo es menor que la del sustraendo. */
function subNeedsBorrow(a: number, b: number): boolean {
  let x = a;
  let y = b;
  while (y > 0) {
    if (x % 10 < y % 10) return true;
    x = Math.floor(x / 10);
    y = Math.floor(y / 10);
  }
  return false;
}

/**
 * Llevada de la multiplicación en columna: la columna k del total vale la suma de da[j]·db[i] con i + j = k,
 * así que un solo acumulado cubre las dos condiciones (ningún producto parcial pasa de 9 y su suma no arrastra).
 */
function mulHasCarry(a: number, b: number): boolean {
  const da = digitsOf(a);
  const db = digitsOf(b);
  const columns = new Array<number>(da.length + db.length).fill(0);
  for (let i = 0; i < db.length; i++) {
    for (let j = 0; j < da.length; j++) {
      const total = (columns[i + j] as number) + (da[j] as number) * (db[i] as number);
      if (total > 9) return true;
      columns[i + j] = total;
    }
  }
  return false;
}

function carryFits(kind: OperationKind, a: number, b: number, carry: CarryMode): boolean {
  if (carry === 'any') return true;
  let has: boolean;
  if (kind === 'add') has = addHasCarry(a, b);
  else if (kind === 'sub') has = subNeedsBorrow(a, b);
  else if (kind === 'mul') has = mulHasCarry(a, b);
  else return true; // la división no se plantea en columnas con llevada
  return carry === 'with' ? has : !has;
}

function inRange(n: number, range: Range): boolean {
  return n >= range.min && n <= range.max;
}

/** Rango real del divisor: nunca 0 y nunca por encima del tope de factor (la validación ya lo recorta si `div` está activa). */
function divisorRange(second: Range): Range {
  const { maxFactor } = ARITHMETIC_LIMITS;
  return { min: Math.max(1, Math.min(second.min, maxFactor)), max: Math.min(second.max, maxFactor) };
}

/** Entero en [0, maxExclusive) sin salirse aunque `rand` devuelva 1. */
function intOf(rand: () => number, maxExclusive: number): number {
  return Math.min(Math.floor(rand() * maxExclusive), maxExclusive - 1);
}

function keyOf(op: Operation): string {
  return `${op.a}:${op.b}`;
}

/** Cocientes válidos de un divisor: nunca 0 y siempre dentro del rango del primer operando. */
function quotientRange(first: Range, b: number): Range {
  return { min: Math.max(1, Math.ceil(first.min / b)), max: Math.floor(first.max / b) };
}

function buildDivision(a: number, b: number, value: ValidArithmetic): Operation | null {
  if (!inRange(a, value.first) || !inRange(b, divisorRange(value.second))) return null;
  const result = Math.floor(a / b);
  if (result < 1) return null;
  const remainder = a - b * result;
  if (value.division === 'exact' ? remainder !== 0 : remainder === 0) return null;
  return { kind: 'div', a, b, result, remainder };
}

/** Construye la operación si el par cumple las reglas; si no, null. */
export function buildOperation(kind: OperationKind, a: number, b: number, value: ValidArithmetic): Operation | null {
  if (!Number.isInteger(a) || !Number.isInteger(b)) return null;
  if (kind === 'div') return buildDivision(a, b, value);

  // La resta se ordena para que nunca dé negativo; el par intercambiado tiene que seguir cabiendo en los rangos.
  const swap = kind === 'sub' && a < b;
  const x = swap ? b : a;
  const y = swap ? a : b;
  if (!inRange(x, value.first) || !inRange(y, value.second)) return null;
  if (!carryFits(kind, x, y, value.carry)) return null;

  const result = kind === 'add' ? x + y : kind === 'sub' ? x - y : x * y;
  return { kind, a: x, b: y, result, remainder: 0 };
}

/** Fisher–Yates parcial: solo baraja (y muta) el prefijo que se devuelve. */
function takeShuffled(ops: Operation[], wanted: number, rand: () => number): Operation[] {
  const total = Math.min(wanted, ops.length);
  for (let i = 0; i < total; i++) {
    const j = i + intOf(rand, ops.length - i);
    const picked = ops[j] as Operation;
    ops[j] = ops[i] as Operation;
    ops[i] = picked;
  }
  return ops.slice(0, total);
}

/** Muestreo por rechazo con tope de intentos; los pares repetidos no cuentan como resultado pero sí como intento. */
function sampleOperations(wanted: number, draw: () => Operation | null): Operation[] {
  const out: Operation[] = [];
  const seen = new Set<string>();
  const attempts = wanted * SAMPLE_ATTEMPTS_PER_ITEM;
  for (let attempt = 0; attempt < attempts && out.length < wanted; attempt++) {
    const op = draw();
    if (!op) continue;
    const key = keyOf(op);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(op);
  }
  return out;
}

/** Divisiones por construcción (divisor y cociente), nunca por rechazo del dividendo. */
function divisionFrom(b: number, q: number, value: ValidArithmetic, rand: () => number): Operation | null {
  if (value.division === 'exact') return { kind: 'div', a: b * q, b, result: q, remainder: 0 };
  const remainder = 1 + intOf(rand, b - 1);
  const a = b * q + remainder;
  if (a > value.first.max) return null;
  return { kind: 'div', a, b, result: q, remainder };
}

function drawDivisions(value: ValidArithmetic, wanted: number, rand: () => number): Operation[] {
  const { first } = value;
  const divisor = divisorRange(value.second);
  // Con resto, el divisor 1 no deja hueco para r en [1, b - 1].
  const bMin = value.division === 'remainder' ? Math.max(divisor.min, 2) : divisor.min;
  const bMax = divisor.max;
  if (bMin > bMax) return [];

  // El divisor está acotado a maxFactor, así que contar los pares (b, q) cuesta como mucho mil vueltas.
  let pairs = 0;
  for (let b = bMin; b <= bMax && pairs <= ENUMERATE_MAX; b++) {
    const q = quotientRange(first, b);
    pairs += Math.max(0, q.max - q.min + 1);
  }

  if (pairs <= ENUMERATE_MAX) {
    const all: Operation[] = [];
    const seen = new Set<string>();
    for (let b = bMin; b <= bMax; b++) {
      const q = quotientRange(first, b);
      for (let quotient = q.min; quotient <= q.max; quotient++) {
        const op = divisionFrom(b, quotient, value, rand);
        if (!op || seen.has(keyOf(op))) continue;
        seen.add(keyOf(op));
        all.push(op);
      }
    }
    return takeShuffled(all, wanted, rand);
  }

  return sampleOperations(wanted, () => {
    const b = bMin + intOf(rand, bMax - bMin + 1);
    const q = quotientRange(first, b);
    if (q.max < q.min) return null;
    return divisionFrom(b, q.min + intOf(rand, q.max - q.min + 1), value, rand);
  });
}

/** Operaciones distintas de una operación concreta, barajadas con `rand`. Devuelve como mucho `wanted`. */
export function drawOperations(kind: OperationKind, value: ValidArithmetic, wanted: number, rand: () => number): Operation[] {
  if (wanted <= 0) return [];
  if (kind === 'div') return drawDivisions(value, wanted, rand);

  const { first, second } = value;
  const width = first.max - first.min + 1;
  const depth = second.max - second.min + 1;
  if (width <= 0 || depth <= 0) return [];

  // Espacio pequeño: enumerarlo entero da un resultado exacto (y detecta que no hay ninguna operación posible).
  if (width * depth <= ENUMERATE_MAX) {
    const all: Operation[] = [];
    const seen = new Set<string>();
    for (let a = first.min; a <= first.max; a++) {
      for (let b = second.min; b <= second.max; b++) {
        const op = buildOperation(kind, a, b, value);
        // La resta ordena el par, así que dos celdas distintas pueden dar la misma operación.
        if (!op || seen.has(keyOf(op))) continue;
        seen.add(keyOf(op));
        all.push(op);
      }
    }
    return takeShuffled(all, wanted, rand);
  }

  return sampleOperations(wanted, () =>
    buildOperation(kind, first.min + intOf(rand, width), second.min + intOf(rand, depth), value),
  );
}
