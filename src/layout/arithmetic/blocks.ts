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
  /**
   * Línea base del primer operando, desde el borde superior del bloque. Es la línea por la que se alinean entre sí
   * los bloques de una fila: cada esquema reparte de otra manera lo que va encima de ella (la galera inglesa pone ahí
   * el hueco del cociente, las columnas solo el índice), así que alinear por el borde superior desnivelaba la fila.
   */
  firstBaseline: number;
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

/**
 * Cola del resto cuando se escribe a continuación del cociente: ` resto 2` o ` r 2`, con el espacio que la separa
 * del cociente incluido (la galera la dibuja aparte, alineada a la izquierda donde acaba el cociente).
 */
function remainderSuffix(op: Operation, lang: Lang): string {
  return op.remainder > 0 ? ` ${REMAINDER_MARK[lang]} ${num(op.remainder)}` : '';
}

/** Texto de la solución en línea; lo miden y lo dibujan las mismas funciones, así que nunca se desajustan. */
function solutionText(op: Operation, lang: Lang): string {
  return `${num(op.result)}${remainderSuffix(op, lang)}`;
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
function columnsPrimitives(op: Operation, x: number, y: number, rowTop: number, index: number, solved: boolean, width: number): Primitive[] {
  const g = columnsGeometry(op);
  const right = x + width;
  // El signo termina a `lineGapMm` de la columna de cifras; la raya arranca donde empieza el signo.
  const signRight = right - g.operandWidth - L.lineGapMm;
  const ruleLeft = signRight - digitWidth(SIGN[op.kind]);
  const out: Primitive[] = [
    { t: 'text', x, y: rowTop + g.indexBaseline, text: blockIndexLabel(index), size: L.indexSizeMm, font: 'sheet', align: 'start', tone: 'muted' },
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
  /** Línea base del dividendo: el primer operando de la división en los dos esquemas. */
  firstBaseline: number;
  /** Trazo vertical (de `from` a `to` en vertical) y raya horizontal del esquema. */
  bar: Stroke;
  rule: Stroke;
  dividend: DigitSlot;
  divisor: DigitSlot;
  /** Hueco del cociente: bajo la raya en la casita, encima en la galera. */
  quotient: DigitSlot;
  /** Resto, en el mismo renglón del cociente: bajo el dividendo en la casita, como cola (` r 2`) en la galera. */
  remainder: DigitSlot | null;
}

/**
 * Casita castellana: el dividendo a la izquierda, el trazo vertical a su derecha —desde el alto de las cifras
 * hasta el fondo del bloque—, el divisor al otro lado y la raya horizontal bajo él; el hueco del cociente queda
 * bajo esa raya, alineado con el divisor.
 *
 * ```
 *  1)            1)
 *      84 │ 7         17 │ 5
 *         ├────          ├────
 *         │ 12         2 │ 3
 * ```
 *
 * El trazo vertical sigue por debajo de la raya hasta el fondo del bloque: es lo que deja el resto del lado del
 * dividendo y el cociente del lado del divisor.
 *
 * Con resto, el resto se escribe bajo el dividendo en el mismo renglón del cociente, alineado a la derecha con él
 * como en cualquier cuenta en columnas: es el estado final de la división, no el algoritmo paso a paso —la hoja
 * de soluciones no lleva las restas parciales—, así que el bloque mide lo mismo con resto que sin él.
 */
function spanishDivisionGeometry(op: Operation): DivisionGeometry {
  const digitCap = capHeightMm('sheet', L.digitSizeMm);
  const indexBaseline = capHeightMm('sheet', L.indexSizeMm);
  const firstBaseline = indexBaseline + L.lineGapMm + digitCap;
  const ruleY = firstBaseline + L.lineGapMm;
  const quotientBaseline = ruleY + L.answerGapMm;

  // Las cifras de Andika son tabulares y el resto nunca tiene más que el dividendo, pero el máximo lo deja dicho.
  const leftWidth = Math.max(digitWidth(num(op.a)), op.remainder > 0 ? digitWidth(num(op.remainder)) : 0);
  const rightWidth = Math.max(digitWidth(num(op.b)), digitWidth(num(op.result)));
  const barX = leftWidth + L.lineGapMm;
  const rightX = barX + L.lineGapMm;

  const w = rightX + rightWidth;
  return {
    w,
    h: quotientBaseline,
    indexBaseline,
    firstBaseline,
    bar: { at: barX, from: firstBaseline - digitCap, to: quotientBaseline },
    rule: { at: ruleY, from: barX, to: w },
    dividend: { x: leftWidth, baseline: firstBaseline, text: num(op.a), align: 'end' },
    divisor: { x: rightX, baseline: firstBaseline, text: num(op.b), align: 'start' },
    quotient: { x: rightX, baseline: quotientBaseline, text: num(op.result), align: 'start' },
    remainder: op.remainder > 0 ? { x: leftWidth, baseline: quotientBaseline, text: num(op.remainder), align: 'end' } : null,
  };
}

/**
 * Galera inglesa: el divisor a la izquierda, el trazo vertical a su derecha y la raya horizontal sobre el
 * dividendo, formando el corchete; el hueco del cociente queda encima de la raya y el resto se escribe a su
 * derecha (`r 2`), que es como se resuelve en inglés.
 *
 * ```
 *  1)
 *          3 r 2
 *     5 ┌────
 *       │ 17
 * ```
 *
 * **El cociente se alinea por las unidades, no por la izquierda**: su última cifra va sobre la última del
 * dividendo (el `3` sobre el `7`), que es la columna en la que se escribe al dividir. Por eso se dibuja con
 * `align: 'end'` en el borde derecho del dividendo, y no pegado a su borde izquierdo: `100 ÷ 4` pondría si no el
 * `25` sobre el `10`. Cabe siempre, porque un cociente nunca tiene más cifras que su dividendo.
 *
 * El hueco del cociente mide `answerGapMm` sobre la raya, igual que el de la respuesta en columnas y el de la
 * casita bajo la suya, y la línea base se apoya a `lineGapMm` de la raya: escrito, el cociente queda sobre ella.
 *
 * `lang` viaja solo para `REMAINDER_MARK`: si algún día otro idioma se dibujara con galera, traería su marca.
 */
function englishDivisionGeometry(op: Operation, lang: Lang): DivisionGeometry {
  const digitCap = capHeightMm('sheet', L.digitSizeMm);
  const indexBaseline = capHeightMm('sheet', L.indexSizeMm);
  const ruleY = indexBaseline + L.lineGapMm + L.answerGapMm;
  const quotientBaseline = ruleY - L.lineGapMm;
  const firstBaseline = ruleY + L.lineGapMm + digitCap;

  const dividendWidth = digitWidth(num(op.a));
  const barX = digitWidth(num(op.b)) + L.lineGapMm;
  const rightX = barX + L.lineGapMm;
  // El resto va pegado al cociente, pero fuera de las columnas del dividendo: es una cola, no una cifra más.
  const suffix = remainderSuffix(op, lang);
  const unitsX = rightX + dividendWidth;
  // La raya cubre el dividendo, no el renglón entero: la cola del resto sobresale por la derecha, como se escribe
  // a mano. El ancho del bloque sí la reserva.
  return {
    w: unitsX + digitWidth(suffix),
    h: firstBaseline,
    indexBaseline,
    firstBaseline,
    bar: { at: barX, from: ruleY, to: firstBaseline },
    rule: { at: ruleY, from: barX, to: unitsX },
    dividend: { x: rightX, baseline: firstBaseline, text: num(op.a), align: 'start' },
    divisor: { x: 0, baseline: firstBaseline, text: num(op.b), align: 'start' },
    quotient: { x: unitsX, baseline: quotientBaseline, text: num(op.result), align: 'end' },
    remainder: suffix === '' ? null : { x: unitsX, baseline: quotientBaseline, text: suffix, align: 'start' },
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
function divisionPrimitives(op: Operation, x: number, y: number, rowTop: number, lang: Lang, index: number, solved: boolean, width: number): Primitive[] {
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
    { t: 'text', x, y: rowTop + g.indexBaseline, text: blockIndexLabel(index), size: L.indexSizeMm, font: 'sheet', align: 'start', tone: 'muted' },
    digit(g.dividend),
    digit(g.divisor),
    // Los dos renderizadores rematan el trazo a tope (butt cap): la tinta acaba justo en `to`, dentro de la caja.
    { t: 'line', x1: left + g.bar.at, y1: y + g.bar.from, x2: left + g.bar.at, y2: y + g.bar.to, stroke: 'ink', strokeWidth: L.ruleWidthMm },
    horizontal(g.rule),
  ];
  if (solved) {
    out.push(digit(g.quotient));
    if (g.remainder) out.push(digit(g.remainder));
  }
  return out;
}

interface InlineGeometry extends BlockBox {
  baseline: number;
  /** En línea los dos operandos van en el mismo renglón: su línea base es la del renglón. */
  firstBaseline: number;
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
  // El renglón centra el texto: la caja es la altura de línea, no la de la mayúscula.
  const baseline = (L.inlineLineMm + cap) / 2;
  return {
    w: answerX + answer,
    h: L.inlineLineMm,
    baseline,
    firstBaseline: baseline,
    expressionX,
    expression,
    answerX,
  };
}

function inlinePrimitives(op: Operation, x: number, y: number, rowTop: number, lang: Lang, index: number, solved: boolean): Primitive[] {
  const g = inlineGeometry(op, lang);
  const baseline = y + g.baseline;
  const out: Primitive[] = [
    { t: 'text', x, y: rowTop + g.baseline, text: blockIndexLabel(index), size: L.indexSizeMm, font: 'sheet', align: 'start', tone: 'muted' },
    { t: 'text', x: x + g.expressionX, y: baseline, text: g.expression, size: L.inlineSizeMm, font: 'sheet', align: 'start', tone: 'ink' },
  ];
  out.push(
    solved
      ? { t: 'text', x: x + g.answerX, y: baseline, text: solutionText(op, lang), size: L.inlineSizeMm, font: 'sheet', align: 'start', tone: 'ink' }
      : { t: 'line', x1: x + g.answerX, y1: baseline, x2: x + g.answerX + L.answerRuleMm, y2: baseline, stroke: 'ink', strokeWidth: L.ruleWidthMm },
  );
  return out;
}

/**
 * Caja de un bloque sin dibujarlo: es lo que usa la capacidad de la hoja. Además del ancho y el alto lleva la línea
 * base del primer operando, que es por donde se alinean los bloques de una misma fila.
 */
export function measureBlock(op: Operation, layout: SheetLayout, lang: Lang): BlockBox {
  const g = layout === 'inline' ? inlineGeometry(op, lang) : op.kind === 'div' ? divisionGeometry(op, lang) : columnsGeometry(op);
  return { w: g.w, h: g.h, firstBaseline: g.firstBaseline };
}

/**
 * Primitivas de un bloque colocado en `(x, y)`.
 *
 * `width` es el ancho común de la hoja (el del bloque más ancho) para que las cifras alineadas a la derecha
 * queden en columna; si no se pasa, el bloque se dibuja con su propio ancho.
 *
 * `rowTop` es el borde superior de la **fila**, que no es el del bloque cuando este ha bajado para alinear su
 * primer operando (la galera inglesa reserva el hueco del cociente encima del dividendo). El índice se ancla ahí:
 * los ejercicios de una fila se numeran en un solo renglón, sea cual sea el esquema que venga debajo. Por defecto
 * es el borde del propio bloque, que es lo que vale cuando se dibuja suelto.
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
  rowTop: number = y,
): Primitive[] {
  if (layout === 'inline') return inlinePrimitives(op, x, y, rowTop, lang, index, solved);
  if (op.kind === 'div') return divisionPrimitives(op, x, y, rowTop, lang, index, solved, width);
  return columnsPrimitives(op, x, y, rowTop, index, solved, width);
}
