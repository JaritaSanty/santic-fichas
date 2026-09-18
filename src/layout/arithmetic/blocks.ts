import type { Lang } from '@/core/lang';
import { capHeightMm, measureTextMm } from '@/core/measure';
import type { Primitive, TextAlign } from '@/core/sheet';
import { ARITHMETIC_LIMITS, type Operation, type OperationKind, type SheetLayout } from '@/generators/arithmetic';

/** Geometría del bloque de una operación, en milímetros. */
export const ARITHMETIC_LAYOUT = {
  digitSizeMm: 5,
  inlineSizeMm: 4.5,
  indexSizeMm: 2.5,
  ruleWidthMm: 0.3,
  lineGapMm: 2.2,
  answerGapMm: 7,
  blockGapXMm: 6,
  /** Separación horizontal máxima entre bloques: pasada de aquí, la retícula se centra en vez de estirarse. */
  maxGapXMm: 14,
  blockGapYMm: 6,
  inlineLineMm: 11,
  answerRuleMm: 20,
} as const;

const L = ARITHMETIC_LAYOUT;

export interface BlockBox {
  w: number;
  h: number;
}

/** Signos de la ficha; los cuatro tienen glifo en Andika (métricas de `@/core/sheetFontMetrics`). */
const SIGN: Record<OperationKind, string> = { add: '+', sub: '−', mul: '×', div: '÷' };

const num = (value: number): string => String(value);
const digitWidth = (text: string): number => measureTextMm(text, 'sheet', L.digitSizeMm);

/** Índice impreso del bloque; el primero es `1)`. */
export function blockIndexLabel(index: number): string {
  return `${index + 1})`;
}

/**
 * Ancho reservado al índice en la disposición en línea, para que todas las expresiones empiecen a la misma
 * distancia del borde: el del índice más largo que puede pedir una ficha.
 */
const INDEX_RESERVE_MM = measureTextMm(blockIndexLabel(ARITHMETIC_LIMITS.maxCount - 1), 'sheet', L.indexSizeMm);

/**
 * Marca del resto cuando el resto se escribe en línea con el cociente: `17 ÷ 5 = 3 resto 2` en castellano y
 * `17 ÷ 5 = 3 r 2` en inglés, la forma que el plan fija para `en`. En castellano se escribe la palabra entera
 * porque es la que usa la clase —la abreviatura `r` solo aparece en la prueba de la división— y porque la ficha
 * es para niños; cuesta unos milímetros de hueco, que la medida ya reserva.
 *
 * Es el único sitio donde la notación del resto cambia de idioma: la usan la disposición en línea (los dos
 * idiomas) y el cociente de la galera inglesa, siempre a través de `solutionText`.
 */
const REMAINDER_MARK: Record<Lang, string> = { es: 'resto', en: 'r' };

/** Texto de la solución en línea; lo miden y lo dibujan las mismas funciones, así que nunca se desajustan. */
function solutionText(op: Operation, lang: Lang): string {
  return op.remainder > 0 ? `${num(op.result)} ${REMAINDER_MARK[lang]} ${num(op.remainder)}` : num(op.result);
}

interface ColumnsGeometry extends BlockBox {
  indexBaseline: number;
  firstBaseline: number;
  secondBaseline: number;
  ruleY: number;
  answerBaseline: number;
  /** Ancho de la columna de cifras: el signo y la raya se cuelgan de ella, no del borde de la hoja. */
  operandWidth: number;
}

/**
 * Suma, resta y multiplicación en columnas. Todas las medidas son desplazamientos desde la esquina superior
 * izquierda del bloque; el alto termina en la línea base de la respuesta porque las cifras no bajan de ella.
 *
 * El hueco de respuesta reserva siempre el ancho del resultado (aunque no se dibuje): así la hoja de soluciones
 * usa exactamente la misma retícula que la del alumno.
 */
function columnsGeometry(op: Operation): ColumnsGeometry {
  const digitCap = capHeightMm('sheet', L.digitSizeMm);
  const indexBaseline = capHeightMm('sheet', L.indexSizeMm);
  const firstBaseline = indexBaseline + L.lineGapMm + digitCap;
  const secondBaseline = firstBaseline + L.lineGapMm + digitCap;
  const ruleY = secondBaseline + L.lineGapMm;
  const answerBaseline = ruleY + L.answerGapMm;
  const operands = Math.max(digitWidth(num(op.a)), digitWidth(num(op.b)), digitWidth(num(op.result)));
  return {
    w: digitWidth(SIGN[op.kind]) + L.lineGapMm + operands,
    h: answerBaseline,
    indexBaseline,
    firstBaseline,
    secondBaseline,
    ruleY,
    answerBaseline,
    operandWidth: operands,
  };
}

/**
 * El borde derecho es el de la hoja (`width`), pero el signo y la raya se cuelgan de la columna de cifras del
 * propio bloque: en una ficha con multiplicaciones, una suma de dos cifras tendría si no el signo a más de un
 * centímetro de su número y una raya del doble de largo que la operación.
 */
function columnsPrimitives(op: Operation, x: number, y: number, index: number, solved: boolean, width: number): Primitive[] {
  const g = columnsGeometry(op);
  const right = x + width;
  // El signo termina a `lineGapMm` de la columna de cifras; la raya arranca donde empieza el signo.
  const signRight = right - g.operandWidth - L.lineGapMm;
  const ruleLeft = signRight - digitWidth(SIGN[op.kind]);
  const out: Primitive[] = [
    { t: 'text', x, y: y + g.indexBaseline, text: blockIndexLabel(index), size: L.indexSizeMm, font: 'sheet', align: 'start', tone: 'muted' },
    { t: 'text', x: right, y: y + g.firstBaseline, text: num(op.a), size: L.digitSizeMm, font: 'sheet', align: 'end', tone: 'ink' },
    { t: 'text', x: signRight, y: y + g.secondBaseline, text: SIGN[op.kind], size: L.digitSizeMm, font: 'sheet', align: 'end', tone: 'ink' },
    { t: 'text', x: right, y: y + g.secondBaseline, text: num(op.b), size: L.digitSizeMm, font: 'sheet', align: 'end', tone: 'ink' },
    { t: 'line', x1: ruleLeft, y1: y + g.ruleY, x2: right, y2: y + g.ruleY, stroke: 'ink', strokeWidth: L.ruleWidthMm },
  ];
  if (solved) {
    out.push({ t: 'text', x: right, y: y + g.answerBaseline, text: num(op.result), size: L.digitSizeMm, font: 'sheet', align: 'end', tone: 'ink' });
  }
  return out;
}

/** Cifra colocada: `x` es el borde que fija `align` (el izquierdo con `start`, el derecho con `end`). */
interface DigitSlot {
  x: number;
  baseline: number;
  text: string;
  align: TextAlign;
}

/** Trazo recto del esquema, en los ejes del bloque. */
interface Stroke {
  /** Coordenada constante: la `x` del trazo vertical, la `y` de los horizontales. */
  at: number;
  from: number;
  to: number;
}

interface DivisionGeometry extends BlockBox {
  indexBaseline: number;
  /** Trazo vertical (de `from` a `to` en vertical) y raya horizontal del esquema. */
  bar: Stroke;
  rule: Stroke;
  dividend: DigitSlot;
  divisor: DigitSlot;
  /** Hueco del cociente: bajo la raya en la casita, encima en la galera (allí lleva ya el resto). */
  quotient: DigitSlot;
  /** Resta y resto bajo el dividendo; solo en la casita con resto. */
  work: { subtraction: DigitSlot; rule: Stroke; remainder: DigitSlot } | null;
}

/**
 * Casita castellana: el dividendo a la izquierda, el trazo vertical a su derecha —desde el alto de las cifras
 * hasta el fondo del bloque—, el divisor al otro lado y la raya horizontal bajo él; el hueco del cociente queda
 * bajo esa raya, alineado con el divisor.
 *
 * ```
 *  1)            1)
 *      84 │ 7         17 │ 5
 *         └────      −15 └────
 *           12       ───    3
 *                      2
 * ```
 *
 * Con resto se reserva además, bajo el dividendo, la resta que lo produce (`− 15`), su raya y el resto: es lo que
 * el alumno escribe al dividir, así que el hueco existe también en la hoja sin resolver y el bloque es más alto.
 * El dividendo, la resta y el resto se alinean a la derecha entre sí, como en cualquier resta en columnas.
 */
function spanishDivisionGeometry(op: Operation): DivisionGeometry {
  const digitCap = capHeightMm('sheet', L.digitSizeMm);
  const indexBaseline = capHeightMm('sheet', L.indexSizeMm);
  const firstBaseline = indexBaseline + L.lineGapMm + digitCap;
  const ruleY = firstBaseline + L.lineGapMm;
  const quotientBaseline = ruleY + L.answerGapMm;

  const subtraction = `${SIGN.sub} ${num(op.a - op.remainder)}`;
  const leftWidth = Math.max(
    digitWidth(num(op.a)),
    op.remainder > 0 ? Math.max(digitWidth(subtraction), digitWidth(num(op.remainder))) : 0,
  );
  const rightWidth = Math.max(digitWidth(num(op.b)), digitWidth(num(op.result)));
  const barX = leftWidth + L.lineGapMm;
  const rightX = barX + L.lineGapMm;

  // La resta arranca justo bajo el dividendo (su altura de mayúscula empieza en la raya del divisor).
  const subtractionBaseline = ruleY + digitCap;
  const workRuleY = subtractionBaseline + L.lineGapMm;
  const remainderBaseline = workRuleY + L.answerGapMm;
  const work =
    op.remainder > 0
      ? {
          subtraction: { x: leftWidth, baseline: subtractionBaseline, text: subtraction, align: 'end' as const },
          rule: { at: workRuleY, from: 0, to: leftWidth },
          remainder: { x: leftWidth, baseline: remainderBaseline, text: num(op.remainder), align: 'end' as const },
        }
      : null;

  const w = rightX + rightWidth;
  const h = Math.max(quotientBaseline, work?.remainder.baseline ?? 0);
  return {
    w,
    h,
    indexBaseline,
    bar: { at: barX, from: firstBaseline - digitCap, to: h },
    rule: { at: ruleY, from: barX, to: w },
    dividend: { x: leftWidth, baseline: firstBaseline, text: num(op.a), align: 'end' },
    divisor: { x: rightX, baseline: firstBaseline, text: num(op.b), align: 'start' },
    quotient: { x: rightX, baseline: quotientBaseline, text: num(op.result), align: 'start' },
    work,
  };
}

/**
 * Galera inglesa: el divisor a la izquierda, el trazo vertical a su derecha y la raya horizontal sobre el
 * dividendo, formando el corchete; el hueco del cociente queda encima de la raya, alineado con el dividendo, y el
 * resto se escribe a su derecha (`12 r 3`), que es como se resuelve en inglés.
 *
 * ```
 *  1)
 *       3  r 2
 *     5 ┌────
 *       │ 17
 * ```
 *
 * El hueco del cociente mide `answerGapMm` sobre la raya, igual que el de la respuesta en columnas y el de la
 * casita bajo la suya, y la línea base se apoya a `lineGapMm` de la raya: escrito, el cociente queda sobre ella.
 */
function englishDivisionGeometry(op: Operation, lang: Lang): DivisionGeometry {
  const digitCap = capHeightMm('sheet', L.digitSizeMm);
  const indexBaseline = capHeightMm('sheet', L.indexSizeMm);
  const ruleY = indexBaseline + L.lineGapMm + L.answerGapMm;
  const quotientBaseline = ruleY - L.lineGapMm;
  const firstBaseline = ruleY + L.lineGapMm + digitCap;

  // El cociente y el resto van juntos en el mismo renglón, así que el hueco reserva el texto entero.
  const quotient = solutionText(op, lang);
  const dividendWidth = digitWidth(num(op.a));
  const barX = digitWidth(num(op.b)) + L.lineGapMm;
  const rightX = barX + L.lineGapMm;
  // La raya cubre el dividendo, no el renglón entero: el cociente nunca tiene más cifras que el dividendo y la
  // marca del resto (`r 2`) sobresale por la derecha, como se escribe a mano. El ancho sí la reserva.
  const w = rightX + Math.max(dividendWidth, digitWidth(quotient));
  return {
    w,
    h: firstBaseline,
    indexBaseline,
    bar: { at: barX, from: ruleY, to: firstBaseline },
    rule: { at: ruleY, from: barX, to: rightX + dividendWidth },
    dividend: { x: rightX, baseline: firstBaseline, text: num(op.a), align: 'start' },
    divisor: { x: 0, baseline: firstBaseline, text: num(op.b), align: 'start' },
    quotient: { x: rightX, baseline: quotientBaseline, text: quotient, align: 'start' },
    work: null,
  };
}

/** Cada idioma dibuja la división como la enseña: casita en castellano, galera en inglés. */
function divisionGeometry(op: Operation, lang: Lang): DivisionGeometry {
  return lang === 'es' ? spanishDivisionGeometry(op) : englishDivisionGeometry(op, lang);
}

/**
 * El índice se queda en el borde izquierdo de la columna, como en los demás bloques, y el esquema se cuelga del
 * borde derecho común de la hoja (`width`).
 *
 * Todo lo que se dibuja sale de `divisionGeometry` —textos incluidos—, así que la caja que mide `measureBlock`
 * y el dibujo no pueden desajustarse.
 */
function divisionPrimitives(op: Operation, x: number, y: number, lang: Lang, index: number, solved: boolean, width: number): Primitive[] {
  const g = divisionGeometry(op, lang);
  const left = x + width - g.w;
  const digit = (slot: DigitSlot): Primitive => ({
    t: 'text',
    x: left + slot.x,
    y: y + slot.baseline,
    text: slot.text,
    size: L.digitSizeMm,
    font: 'sheet',
    align: slot.align,
    tone: 'ink',
  });
  const horizontal = (s: Stroke): Primitive => ({ t: 'line', x1: left + s.from, y1: y + s.at, x2: left + s.to, y2: y + s.at, stroke: 'ink', strokeWidth: L.ruleWidthMm });
  const out: Primitive[] = [
    { t: 'text', x, y: y + g.indexBaseline, text: blockIndexLabel(index), size: L.indexSizeMm, font: 'sheet', align: 'start', tone: 'muted' },
    digit(g.dividend),
    digit(g.divisor),
    // Los dos renderizadores rematan el trazo a tope (butt cap): la tinta acaba justo en `to`, dentro de la caja.
    { t: 'line', x1: left + g.bar.at, y1: y + g.bar.from, x2: left + g.bar.at, y2: y + g.bar.to, stroke: 'ink', strokeWidth: L.ruleWidthMm },
    horizontal(g.rule),
  ];
  if (solved) {
    out.push(digit(g.quotient));
    if (g.work) out.push(digit(g.work.subtraction), horizontal(g.work.rule), digit(g.work.remainder));
  }
  return out;
}

interface InlineGeometry extends BlockBox {
  baseline: number;
  expressionX: number;
  expression: string;
  answerX: number;
}

/** Una operación por renglón: `23 + 45 = ` y, a continuación, la raya de respuesta. */
function inlineGeometry(op: Operation, lang: Lang): InlineGeometry {
  const cap = capHeightMm('sheet', L.inlineSizeMm);
  const expression = `${num(op.a)} ${SIGN[op.kind]} ${num(op.b)} = `;
  const expressionX = INDEX_RESERVE_MM + L.lineGapMm;
  const answerX = expressionX + measureTextMm(expression, 'sheet', L.inlineSizeMm);
  // La respuesta reserva lo que más ocupe: la raya del alumno o el texto de la solución.
  const answer = Math.max(L.answerRuleMm, measureTextMm(solutionText(op, lang), 'sheet', L.inlineSizeMm));
  return {
    w: answerX + answer,
    h: L.inlineLineMm,
    // El renglón centra el texto: la caja es la altura de línea, no la de la mayúscula.
    baseline: (L.inlineLineMm + cap) / 2,
    expressionX,
    expression,
    answerX,
  };
}

function inlinePrimitives(op: Operation, x: number, y: number, lang: Lang, index: number, solved: boolean): Primitive[] {
  const g = inlineGeometry(op, lang);
  const baseline = y + g.baseline;
  const out: Primitive[] = [
    { t: 'text', x, y: baseline, text: blockIndexLabel(index), size: L.indexSizeMm, font: 'sheet', align: 'start', tone: 'muted' },
    { t: 'text', x: x + g.expressionX, y: baseline, text: g.expression, size: L.inlineSizeMm, font: 'sheet', align: 'start', tone: 'ink' },
  ];
  out.push(
    solved
      ? { t: 'text', x: x + g.answerX, y: baseline, text: solutionText(op, lang), size: L.inlineSizeMm, font: 'sheet', align: 'start', tone: 'ink' }
      : { t: 'line', x1: x + g.answerX, y1: baseline, x2: x + g.answerX + L.answerRuleMm, y2: baseline, stroke: 'ink', strokeWidth: L.ruleWidthMm },
  );
  return out;
}

/** Caja de un bloque sin dibujarlo: es lo que usa la capacidad de la hoja. */
export function measureBlock(op: Operation, layout: SheetLayout, lang: Lang): BlockBox {
  const g = layout === 'inline' ? inlineGeometry(op, lang) : op.kind === 'div' ? divisionGeometry(op, lang) : columnsGeometry(op);
  return { w: g.w, h: g.h };
}

/**
 * Primitivas de un bloque colocado en `(x, y)`.
 *
 * `width` es el ancho común de la hoja (el del bloque más ancho) para que las cifras alineadas a la derecha
 * queden en columna; si no se pasa, el bloque se dibuja con su propio ancho.
 */
export function blockPrimitives(
  op: Operation,
  x: number,
  y: number,
  layout: SheetLayout,
  lang: Lang,
  index: number,
  solved: boolean,
  width: number = measureBlock(op, layout, lang).w,
): Primitive[] {
  if (layout === 'inline') return inlinePrimitives(op, x, y, lang, index, solved);
  if (op.kind === 'div') return divisionPrimitives(op, x, y, lang, index, solved, width);
  return columnsPrimitives(op, x, y, index, solved, width);
}
