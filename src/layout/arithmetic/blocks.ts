import type { Lang } from '@/core/lang';
import { capHeightMm, measureTextMm } from '@/core/measure';
import type { Primitive } from '@/core/sheet';
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
 * Marca del resto en la disposición en línea. Hoy es la misma en los dos idiomas —la forma `r 3` que el plan fija
 * para `en`—; **la Tarea 7 decide la castellana**. La tabla existe para que ese cambio entre por un solo sitio.
 */
const REMAINDER_MARK: Record<Lang, string> = { es: 'r', en: 'r' };

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

interface DivisionGeometry extends BlockBox {
  indexBaseline: number;
  lineTop: number;
  firstBaseline: number;
  ruleY: number;
  quotientBaseline: number;
  barX: number;
  dividendX: number;
  divisorX: number;
  ruleFrom: number;
  ruleTo: number;
}

/**
 * Esquema neutro mínimo de la división: dividendo, divisor y hueco de cociente separados por un trazo vertical,
 * con el divisor del lado que le corresponde a cada idioma (`es` a la derecha, `en` a la izquierda).
 *
 * **La Tarea 7 sustituye este dibujo** por la casita española (corchete bajo el divisor, resto bajo el dividendo)
 * y la galera inglesa (corchete sobre el dividendo, cociente encima). Aquí solo se garantiza que la rama exista,
 * que mida una caja no vacía y que lo dibujado quepa dentro de ella.
 */
function divisionGeometry(op: Operation, lang: Lang): DivisionGeometry {
  const digitCap = capHeightMm('sheet', L.digitSizeMm);
  const indexBaseline = capHeightMm('sheet', L.indexSizeMm);
  const lineTop = indexBaseline + L.lineGapMm;
  const firstBaseline = lineTop + digitCap;
  const ruleY = firstBaseline + L.lineGapMm;
  const quotientBaseline = ruleY + L.answerGapMm;
  const dividend = digitWidth(num(op.a));
  // El lado del divisor carga también con el cociente, que se escribe debajo.
  const divisor = Math.max(digitWidth(num(op.b)), digitWidth(num(op.result)));
  const spanish = lang === 'es';
  const barX = (spanish ? dividend : divisor) + L.lineGapMm;
  const dividendX = spanish ? 0 : barX + L.lineGapMm;
  const divisorX = spanish ? barX + L.lineGapMm : 0;
  return {
    w: spanish ? divisorX + divisor : dividendX + dividend,
    h: quotientBaseline,
    indexBaseline,
    lineTop,
    firstBaseline,
    ruleY,
    quotientBaseline,
    barX,
    dividendX,
    divisorX,
    ruleFrom: spanish ? barX : 0,
    ruleTo: divisorX + divisor,
  };
}

/**
 * El índice se queda en el borde izquierdo de la columna, como en los demás bloques, y el dibujo se cuelga del
 * borde derecho común de la hoja (`width`). La Tarea 7 hereda ese desplazamiento para colocar la casita y la
 * galera en la misma retícula.
 */
function divisionPrimitives(op: Operation, x: number, y: number, lang: Lang, index: number, solved: boolean, width: number): Primitive[] {
  const g = divisionGeometry(op, lang);
  const left = x + width - g.w;
  const out: Primitive[] = [
    { t: 'text', x, y: y + g.indexBaseline, text: blockIndexLabel(index), size: L.indexSizeMm, font: 'sheet', align: 'start', tone: 'muted' },
    { t: 'text', x: left + g.dividendX, y: y + g.firstBaseline, text: num(op.a), size: L.digitSizeMm, font: 'sheet', align: 'start', tone: 'ink' },
    { t: 'text', x: left + g.divisorX, y: y + g.firstBaseline, text: num(op.b), size: L.digitSizeMm, font: 'sheet', align: 'start', tone: 'ink' },
    // El trazo vertical se detiene medio grosor antes del borde inferior: así la caja medida contiene la tinta.
    { t: 'line', x1: left + g.barX, y1: y + g.lineTop, x2: left + g.barX, y2: y + g.h - L.ruleWidthMm / 2, stroke: 'ink', strokeWidth: L.ruleWidthMm },
    { t: 'line', x1: left + g.ruleFrom, y1: y + g.ruleY, x2: left + g.ruleTo, y2: y + g.ruleY, stroke: 'ink', strokeWidth: L.ruleWidthMm },
  ];
  if (solved) {
    out.push({ t: 'text', x: left + g.divisorX, y: y + g.quotientBaseline, text: num(op.result), size: L.digitSizeMm, font: 'sheet', align: 'start', tone: 'ink' });
    if (op.remainder > 0) {
      out.push({ t: 'text', x: left + g.dividendX, y: y + g.quotientBaseline, text: num(op.remainder), size: L.digitSizeMm, font: 'sheet', align: 'start', tone: 'ink' });
    }
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
