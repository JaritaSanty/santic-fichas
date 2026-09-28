import { ARITHMETIC_LIMITS } from './params';
import type { CarryMode, Operation, OperationKind, Range, ValidArithmetic } from './types';

/** Tamaño máximo del espacio que se enumera entero; por encima se muestrea con rechazo. */
export const ENUMERATE_MAX = 20000;
/** Intentos de muestreo por hoja antes de rendirse; constante, nunca proporcional a lo que se pida. */
export const SAMPLE_ATTEMPTS = 200 * ARITHMETIC_LIMITS.maxCount;

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

/**
 * Rango real del divisor: nunca 0 y nunca por encima del tope de factor. La validación ya lo recorta cuando `div`
 * está activa, pero aquí se repite porque el divisor gobierna un bucle: la multiplicación sí se fía del recorte del
 * validador (solo lee `value.second`), la división no puede permitirse mil millones de vueltas si llega sin recortar.
 */
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

/**
 * `n − n` y `n ÷ n` son operaciones válidas pero no son ejercicio: la respuesta (0 o 1) no depende de los números y
 * una ficha de rangos estrechos se llenaba de ellas (`22 ÷ 22`, `16 ÷ 16`…). No se prohíben —una ficha de
 * `10..10 − 10..10` no tiene otra cosa que sortear—, se dejan en reserva: solo entran cuando el espacio no da más de
 * sí. En la suma y en la multiplicación el par igual sí es ejercicio (`24 + 24`, `7 × 7`), así que no se toca.
 */
function isIdentity(op: Operation): boolean {
  return (op.kind === 'sub' || op.kind === 'div') && op.a === op.b;
}

/**
 * Cocientes válidos de un divisor: nunca 0 y con el dividendo dentro del rango del primer operando.
 * Con resto el dividendo es `b·q + r` con `r` entre 1 y `b - 1`, así que el cociente mínimo baja un escalón
 * (`b·q` puede quedar por debajo de `first.min`) y el máximo sube uno menos (`b·q` debe dejar sitio a `r`).
 */
function quotientRange(first: Range, b: number, exact: boolean): Range {
  if (exact) return { min: Math.max(1, Math.ceil(first.min / b)), max: Math.floor(first.max / b) };
  return { min: Math.max(1, Math.ceil((first.min - b + 1) / b)), max: Math.floor((first.max - 1) / b) };
}

/** Restos que dejan el dividendo dentro del rango para un `(b, q)` dado; vacía si `min > max`. */
function remainderWindow(first: Range, b: number, q: number): Range {
  const base = b * q;
  return { min: Math.max(1, first.min - base), max: Math.min(b - 1, first.max - base) };
}

function divisionAt(b: number, q: number, remainder: number): Operation {
  return { kind: 'div', a: b * q + remainder, b, result: q, remainder };
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

/**
 * Sorteo de un espacio enumerado dejando las identidades (`n − n`, `n ÷ n`) para el final: primero se baraja lo que
 * sí es ejercicio y, solo si no llega a lo pedido, se completa con la reserva barajada. Sin identidades no se toca
 * nada —ni se consume azar de más—, así que las fichas que no las tenían salen exactamente igual que antes.
 */
function takeUseful(ops: Operation[], wanted: number, rand: () => number): Operation[] {
  const reserve = ops.filter(isIdentity);
  if (reserve.length === 0) return takeShuffled(ops, wanted, rand);
  const out = takeShuffled(ops.filter((op) => !isIdentity(op)), wanted, rand);
  if (out.length >= wanted) return out;
  return [...out, ...takeShuffled(reserve, wanted - out.length, rand)];
}

/**
 * Intentos que recorre el muestreo, **fijos**: los de una ficha entera, se pida lo que se pida. Nunca son menos que
 * antes (`wanted <= maxCount` siempre) y ya no dependen de la petición, que es lo que hace falta. Además ponen tope
 * absoluto al coste, que antes crecía con `wanted` sin límite.
 */

/**
 * Muestreo por rechazo con tope de intentos; los pares repetidos no cuentan como resultado pero sí como intento.
 *
 * El tope **no puede depender de lo que se pida**. Con un tope proporcional a lo pedido, pedir menos daba
 * proporcionalmente menos intentos y encontraba proporcionalmente menos operaciones, así que en un espacio muestreado
 * el total producido no era monótono en lo pedido: `mul` de 1000..9999 por 900..999 sin llevada daba 200 → 10 → 1 → 0,
 * y el docente acababa con la ficha vacía por seguir la sugerencia de pedir menos. Con el tope fijo, toda petición
 * recorre el mismo prefijo de sorteos y devuelve `min(wanted, lo que haya en ese prefijo)`: monótono en `wanted` y con
 * punto fijo, que es de lo que vive la sugerencia `reduce-count`.
 */
function sampleOperations(wanted: number, draw: () => Operation | null): Operation[] {
  const out: Operation[] = [];
  // Las identidades salen del mismo sorteo (no cuestan azar aparte) pero esperan al final de la cola.
  const reserve: Operation[] = [];
  const seen = new Set<string>();
  const attempts = SAMPLE_ATTEMPTS;
  for (let attempt = 0; attempt < attempts && out.length < wanted; attempt++) {
    const op = draw();
    if (!op) continue;
    const key = keyOf(op);
    if (seen.has(key)) continue;
    seen.add(key);
    if (isIdentity(op)) reserve.push(op);
    else out.push(op);
  }
  return out.length >= wanted ? out : [...out, ...reserve.slice(0, wanted - out.length)];
}

/**
 * Divisiones por construcción, nunca por rechazo del dividendo: el espacio es el de los tríos `(b, q, r)`
 * (con `r = 0` fijo en modo exacto). Cada trío da un `(a, b)` distinto —`q` y `r` se recuperan de `a` y `b`—,
 * así que la enumeración no necesita quitar repetidos.
 */
function drawDivisions(value: ValidArithmetic, wanted: number, rand: () => number): Operation[] {
  const { first } = value;
  const exact = value.division === 'exact';
  const divisor = divisorRange(value.second);
  // Con resto, el divisor 1 no deja hueco para r en [1, b - 1].
  const bMin = exact ? divisor.min : Math.max(divisor.min, 2);
  const bMax = divisor.max;
  if (bMin > bMax) return [];

  // El recuento se corta en cuanto supera el tope, así que nunca recorre más de ENUMERATE_MAX candidatos.
  let total = 0;
  for (let b = bMin; b <= bMax && total <= ENUMERATE_MAX; b++) {
    const q = quotientRange(first, b, exact);
    if (exact) {
      total += Math.max(0, q.max - q.min + 1);
      continue;
    }
    // Dentro de [q.min, q.max] la ventana de restos nunca es vacía, así que cada vuelta suma al menos 1.
    for (let quotient = q.min; quotient <= q.max && total <= ENUMERATE_MAX; quotient++) {
      const r = remainderWindow(first, b, quotient);
      total += r.max - r.min + 1;
    }
  }

  if (total <= ENUMERATE_MAX) {
    const all: Operation[] = [];
    for (let b = bMin; b <= bMax; b++) {
      const q = quotientRange(first, b, exact);
      for (let quotient = q.min; quotient <= q.max; quotient++) {
        if (exact) {
          all.push(divisionAt(b, quotient, 0));
          continue;
        }
        const r = remainderWindow(first, b, quotient);
        for (let rest = r.min; rest <= r.max; rest++) all.push(divisionAt(b, quotient, rest));
      }
    }
    return takeUseful(all, wanted, rand);
  }

  return sampleOperations(wanted, () => {
    // Sesgo conocido: `b` se sortea uniforme entre divisores, no entre operaciones, así que los divisores
    // pequeños (que admiten muchos más dividendos) salen infrarrepresentados. Para una ficha es preferible:
    // reparte los divisores en vez de llenarla de dividendos del divisor más pequeño.
    const b = bMin + intOf(rand, bMax - bMin + 1);
    const q = quotientRange(first, b, exact);
    if (q.max < q.min) return null;
    const quotient = q.min + intOf(rand, q.max - q.min + 1);
    if (exact) return divisionAt(b, quotient, 0);
    const r = remainderWindow(first, b, quotient);
    if (r.max < r.min) return null;
    return divisionAt(b, quotient, r.min + intOf(rand, r.max - r.min + 1));
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
    return takeUseful(all, wanted, rand);
  }

  return sampleOperations(wanted, () =>
    buildOperation(kind, first.min + intOf(rand, width), second.min + intOf(rand, depth), value),
  );
}
