import { describe, expect, it } from 'vitest';
import type { Lang } from '@/core/lang';
import { capHeightMm, measureTextMm } from '@/core/measure';
import type { Primitive } from '@/core/sheet';
import { ARITHMETIC_LIMITS, type Operation, type OperationKind } from '@/generators/arithmetic';
import { ARITHMETIC_LAYOUT, blockIndexLabel, blockPrimitives, measureBlock } from './blocks';
import { corners } from './primitiveBounds';

const L = ARITHMETIC_LAYOUT;

const op = (kind: OperationKind, a: number, b: number, result: number, remainder = 0): Operation => ({ kind, a, b, result, remainder });

function expectInsideBox(primitives: Primitive[], x: number, y: number, w: number, h: number): void {
  expect(primitives.length).toBeGreaterThan(0);
  for (const p of primitives) {
    for (const [px, py] of corners(p)) {
      expect(px).toBeGreaterThanOrEqual(x - 1e-9);
      expect(px).toBeLessThanOrEqual(x + w + 1e-9);
      expect(py).toBeGreaterThanOrEqual(y - 1e-9);
      expect(py).toBeLessThanOrEqual(y + h + 1e-9);
    }
  }
}

const texts = (primitives: Primitive[]) => primitives.filter((p): p is Extract<Primitive, { t: 'text' }> => p.t === 'text');
const lines = (primitives: Primitive[]) => primitives.filter((p): p is Extract<Primitive, { t: 'line' }> => p.t === 'line');
const digits = (text: string) => measureTextMm(text, 'sheet', L.digitSizeMm);

describe('bloque en columnas', () => {
  const sum = op('add', 128, 47, 175);

  it('mide una caja no vacía y dibuja dentro de ella', () => {
    const box = measureBlock(sum, 'columns', 'es');
    expect(box.w).toBeGreaterThan(0);
    expect(box.h).toBeGreaterThan(0);
    expectInsideBox(blockPrimitives(sum, 10, 20, 'columns', 'es', 0, true), 10, 20, box.w, box.h);
  });

  it('lleva el índice pequeño arriba a la izquierda', () => {
    const drawn = blockPrimitives(sum, 10, 20, 'columns', 'es', 6, false);
    const index = texts(drawn).find((t) => t.text === blockIndexLabel(6));
    expect(index).toBeDefined();
    expect(index?.size).toBe(L.indexSizeMm);
    expect(index?.x).toBe(10);
    expect(index?.align).toBe('start');
    // Por encima de la primera cifra.
    const first = texts(drawn).find((t) => t.text === '128');
    expect(index!.y).toBeLessThan(first!.y);
  });

  it('alinea los dos operandos al borde derecho común y pone el signo a su izquierda', () => {
    const width = measureBlock(sum, 'columns', 'es').w + 12;
    const drawn = blockPrimitives(sum, 10, 20, 'columns', 'es', 0, false, width);
    const a = texts(drawn).find((t) => t.text === '128');
    const b = texts(drawn).find((t) => t.text === '47');
    const sign = texts(drawn).find((t) => t.text === '+');
    expect(a?.align).toBe('end');
    expect(b?.align).toBe('end');
    expect(a?.x).toBe(10 + width);
    expect(b?.x).toBe(10 + width);
    expect(sign?.align).toBe('end');
    expect(sign?.y).toBe(b?.y);
    expect(a!.y).toBeLessThan(b!.y);
  });

  it('el signo y la raya se cuelgan de la columna de cifras, no del ancho común de la hoja', () => {
    // Ficha mixta: el ancho común es el de una multiplicación de cinco cifras y la suma es mucho más estrecha.
    const shared = measureBlock(op('mul', 99999, 999, 99899001), 'columns', 'es').w;
    const narrow = op('add', 999, 999, 1998);
    const drawn = blockPrimitives(narrow, 10, 20, 'columns', 'es', 0, false, shared);
    const sign = texts(drawn).find((t) => t.text === '+')!;
    const rule = lines(drawn)[0]!;
    const operandColumnLeft = 10 + shared - digits('1998');
    expect(sign.x).toBeCloseTo(operandColumnLeft - L.lineGapMm, 10);
    expect(rule.x1).toBeCloseTo(sign.x - digits('+'), 10);
    expect(rule.x2).toBe(10 + shared);
    // La raya mide lo que la operación, no lo que la hoja.
    expect(rule.x2 - rule.x1).toBeCloseTo(measureBlock(narrow, 'columns', 'es').w, 10);
  });

  it('la raya ocupa el ancho del bloque y separa la respuesta', () => {
    const drawn = blockPrimitives(sum, 10, 20, 'columns', 'es', 0, false);
    const box = measureBlock(sum, 'columns', 'es');
    const [rule] = lines(drawn);
    expect(lines(drawn)).toHaveLength(1);
    expect(rule?.x1).toBeCloseTo(10, 10);
    expect(rule?.x2).toBeCloseTo(10 + box.w, 10);
    expect(rule?.y1).toBe(rule?.y2);
    expect(rule?.strokeWidth).toBe(L.ruleWidthMm);
    const b = texts(drawn).find((t) => t.text === '47');
    expect(rule!.y1).toBeGreaterThan(b!.y);
  });

  it('sin resolver no escribe el resultado; resuelto lo escribe en el hueco, alineado a la derecha', () => {
    const blank = blockPrimitives(sum, 10, 20, 'columns', 'es', 0, false, 40);
    expect(texts(blank).some((t) => t.text === '175')).toBe(false);
    const solved = blockPrimitives(sum, 10, 20, 'columns', 'es', 0, true, 40);
    const answer = texts(solved).find((t) => t.text === '175');
    expect(answer?.align).toBe('end');
    expect(answer?.x).toBe(50);
    const rule = lines(solved)[0];
    expect(answer!.y).toBeCloseTo(rule!.y1 + L.answerGapMm, 10);
  });

  it('reserva el ancho del resultado aunque no se dibuje, para que alumno y soluciones compartan retícula', () => {
    const product = op('mul', 999, 999, 998001);
    const box = measureBlock(product, 'columns', 'es');
    expect(box.w).toBeCloseTo(digits('×') + L.lineGapMm + digits('998001'), 10);
    expectInsideBox(blockPrimitives(product, 0, 0, 'columns', 'es', 0, true), 0, 0, box.w, box.h);
  });

  it.each([
    ['add', '+'],
    ['sub', '−'],
    ['mul', '×'],
  ] as Array<[OperationKind, string]>)('usa el signo de %s', (kind, sign) => {
    const drawn = blockPrimitives(op(kind, 40, 8, 48), 0, 0, 'columns', 'es', 0, false);
    expect(texts(drawn).some((t) => t.text === sign)).toBe(true);
  });

  it('el índice más largo posible cabe en el bloque más estrecho', () => {
    const tiny = op('add', 0, 0, 0);
    const longest = blockIndexLabel(ARITHMETIC_LIMITS.maxCount - 1);
    expect(measureTextMm(longest, 'sheet', L.indexSizeMm)).toBeLessThanOrEqual(measureBlock(tiny, 'columns', 'es').w);
  });
});

describe('bloque en línea', () => {
  const sum = op('add', 23, 45, 68);

  it('escribe la expresión y deja una raya de respuesta de answerRuleMm', () => {
    const box = measureBlock(sum, 'inline', 'es');
    expect(box.h).toBe(L.inlineLineMm);
    const drawn = blockPrimitives(sum, 5, 7, 'inline', 'es', 0, false);
    expect(texts(drawn).some((t) => t.text === '23 + 45 = ')).toBe(true);
    const [rule] = lines(drawn);
    expect(rule).toBeDefined();
    expect(rule!.x2 - rule!.x1).toBeCloseTo(L.answerRuleMm, 10);
    expect(rule!.y1).toBe(rule!.y2);
    expectInsideBox(drawn, 5, 7, box.w, box.h);
  });

  it('resuelto sustituye la raya por el resultado', () => {
    const drawn = blockPrimitives(sum, 5, 7, 'inline', 'es', 0, true);
    expect(lines(drawn)).toHaveLength(0);
    expect(texts(drawn).some((t) => t.text === '68')).toBe(true);
    expectInsideBox(drawn, 5, 7, measureBlock(sum, 'inline', 'es').w, L.inlineLineMm);
  });

  it('todas las expresiones empiezan a la misma distancia del borde, sea cual sea el índice', () => {
    const one = blockPrimitives(sum, 0, 0, 'inline', 'es', 0, false);
    const many = blockPrimitives(sum, 0, 0, 'inline', 'es', ARITHMETIC_LIMITS.maxCount - 1, false);
    const expr = (drawn: Primitive[]) => texts(drawn).find((t) => t.text === '23 + 45 = ')?.x;
    expect(expr(one)).toBe(expr(many));
  });

  it.each([
    ['es', '3 resto 2'],
    ['en', '3 r 2'],
  ] as Array<[Lang, string]>)('en división con resto el texto resuelto muestra cociente y resto en %s', (lang, answer) => {
    const division = op('div', 17, 5, 3, 2);
    const drawn = blockPrimitives(division, 0, 0, 'inline', lang, 0, true);
    expect(texts(drawn).some((t) => t.text === answer)).toBe(true);
    // La medida conoce el idioma, así que la caja contiene el texto resuelto de ese idioma.
    expectInsideBox(drawn, 0, 0, measureBlock(division, 'inline', lang).w, L.inlineLineMm);
  });

  it('sin resto no se escribe ninguna marca de resto', () => {
    const exact = op('div', 84, 7, 12);
    for (const lang of ['es', 'en'] as Lang[]) {
      const drawn = blockPrimitives(exact, 0, 0, 'inline', lang, 0, true);
      expect(texts(drawn).some((t) => t.text === '12')).toBe(true);
      expect(texts(drawn).some((t) => /resto|r/.test(t.text))).toBe(false);
    }
  });
});

// Geometría esperada, calculada con las mismas constantes y las mismas medidas que el módulo (nunca con números
// inventados): así la prueba fija el dibujo en milímetros sin congelar la tipografía.
const DIGIT_CAP = capHeightMm('sheet', L.digitSizeMm);
const INDEX_BASELINE = capHeightMm('sheet', L.indexSizeMm);

const vertical = (primitives: Primitive[]) => lines(primitives).filter((l) => l.x1 === l.x2);
const horizontal = (primitives: Primitive[]) => lines(primitives).filter((l) => l.y1 === l.y2);
/** Caja horizontal de un texto, con el `align` con el que se dibuja. */
const span = (t: Extract<Primitive, { t: 'text' }>): [number, number] => {
  const w = measureTextMm(t.text, 'sheet', t.size);
  const left = t.align === 'end' ? t.x - w : t.align === 'middle' ? t.x - w / 2 : t.x;
  return [left, left + w];
};

describe('bloque de división: casita castellana', () => {
  const division = op('div', 84, 7, 12);
  // 1,8127 índice · 2,2 hueco · 3,6255 cifras ⇒ línea base del dividendo y del divisor.
  const firstBaseline = INDEX_BASELINE + L.lineGapMm + DIGIT_CAP;
  const ruleY = firstBaseline + L.lineGapMm;
  const quotientBaseline = ruleY + L.answerGapMm;
  const left = digits('84');
  const barX = left + L.lineGapMm;
  const w = barX + L.lineGapMm + Math.max(digits('7'), digits('12'));

  it('mide la caja del esquema y dibuja dentro de ella, resuelta o no', () => {
    const box = measureBlock(division, 'columns', 'es');
    expect(box.w).toBeCloseTo(w, 10);
    expect(box.h).toBeCloseTo(quotientBaseline, 10);
    expectInsideBox(blockPrimitives(division, 3, 4, 'columns', 'es', 0, false), 3, 4, box.w, box.h);
    expectInsideBox(blockPrimitives(division, 3, 4, 'columns', 'es', 0, true), 3, 4, box.w, box.h);
  });

  it('el trazo vertical va del alto de las cifras al fondo del bloque, a la derecha del dividendo', () => {
    const drawn = blockPrimitives(division, 0, 0, 'columns', 'es', 0, false);
    expect(vertical(drawn)).toHaveLength(1);
    const bar = vertical(drawn)[0]!;
    expect(bar.x1).toBeCloseTo(barX, 10);
    expect(bar.y1).toBeCloseTo(firstBaseline - DIGIT_CAP, 10);
    expect(bar.y2).toBeCloseTo(quotientBaseline, 10);
    expect(bar.strokeWidth).toBe(L.ruleWidthMm);
  });

  it('la raya horizontal va bajo el divisor, del trazo vertical al borde derecho', () => {
    const drawn = blockPrimitives(division, 0, 0, 'columns', 'es', 0, false);
    expect(horizontal(drawn)).toHaveLength(1);
    const rule = horizontal(drawn)[0]!;
    expect(rule.y1).toBeCloseTo(ruleY, 10);
    expect(rule.x1).toBeCloseTo(barX, 10);
    expect(rule.x2).toBeCloseTo(w, 10);
    // Por debajo de la línea base del divisor, no por encima.
    expect(rule.y1).toBeGreaterThan(texts(drawn).find((t) => t.text === '7')!.y);
  });

  it('el dividendo queda a la izquierda del trazo y el divisor a su derecha, sin tocarse', () => {
    const drawn = blockPrimitives(division, 0, 0, 'columns', 'es', 0, false);
    const bar = vertical(drawn)[0]!;
    const [, dividendRight] = span(texts(drawn).find((t) => t.text === '84')!);
    const [divisorLeft] = span(texts(drawn).find((t) => t.text === '7')!);
    expect(dividendRight).toBeLessThan(bar.x1);
    expect(divisorLeft).toBeGreaterThan(bar.x1);
    expect(dividendRight).toBeLessThanOrEqual(divisorLeft);
    expect(dividendRight).toBeCloseTo(left, 10);
  });

  it('deja el hueco del cociente bajo la raya y solo lo escribe al resolver, alineado con el divisor', () => {
    expect(texts(blockPrimitives(division, 0, 0, 'columns', 'es', 0, false)).some((t) => t.text === '12')).toBe(false);
    const solved = blockPrimitives(division, 0, 0, 'columns', 'es', 0, true);
    const quotient = texts(solved).find((t) => t.text === '12')!;
    const rule = horizontal(solved)[0]!;
    expect(quotient.y).toBeCloseTo(quotientBaseline, 10);
    expect(quotient.y - DIGIT_CAP).toBeGreaterThan(rule.y1);
    expect(quotient.align).toBe('start');
    expect(quotient.x).toBeCloseTo(texts(solved).find((t) => t.text === '7')!.x, 10);
  });

  it('con resto lo escribe bajo el dividendo, en el renglón del cociente y solo al resolver', () => {
    const withRemainder = op('div', 17, 5, 3, 2);
    const box = measureBlock(withRemainder, 'columns', 'es');
    // El resto no añade renglones: es el estado final de la cuenta, no el algoritmo paso a paso.
    expect(box.h).toBeCloseTo(quotientBaseline, 10);
    expect(box.w).toBeCloseTo(digits('17') + 2 * L.lineGapMm + Math.max(digits('5'), digits('3')), 10);

    const blank = blockPrimitives(withRemainder, 0, 0, 'columns', 'es', 0, false);
    expect(texts(blank).some((t) => t.text === '2')).toBe(false);
    expect(lines(blank)).toHaveLength(2);
    expectInsideBox(blank, 0, 0, box.w, box.h);

    const solved = blockPrimitives(withRemainder, 0, 0, 'columns', 'es', 0, true);
    const remainder = texts(solved).filter((t) => t.text === '2');
    expect(remainder).toHaveLength(1);
    // Mismo renglón que el cociente, al otro lado del trazo y alineado a la derecha con el dividendo.
    expect(remainder[0]!.y).toBeCloseTo(texts(solved).find((t) => t.text === '3')!.y, 10);
    expect(remainder[0]!.y).toBeCloseTo(quotientBaseline, 10);
    expect(span(remainder[0]!)[1]).toBeLessThan(vertical(solved)[0]!.x1);
    expect(span(remainder[0]!)[1]).toBeCloseTo(span(texts(solved).find((t) => t.text === '17')!)[1], 10);
    expectInsideBox(solved, 0, 0, box.w, box.h);
  });
});

describe('bloque de división: galera inglesa', () => {
  const division = op('div', 84, 7, 12);
  const ruleY = INDEX_BASELINE + L.lineGapMm + L.answerGapMm;
  const quotientBaseline = ruleY - L.lineGapMm;
  const firstBaseline = ruleY + L.lineGapMm + DIGIT_CAP;
  const barX = digits('7') + L.lineGapMm;
  const dividendX = barX + L.lineGapMm;
  const w = dividendX + Math.max(digits('84'), digits('12'));

  it('mide la caja del esquema y dibuja dentro de ella, resuelta o no', () => {
    const box = measureBlock(division, 'columns', 'en');
    expect(box.w).toBeCloseTo(w, 10);
    expect(box.h).toBeCloseTo(firstBaseline, 10);
    expectInsideBox(blockPrimitives(division, 3, 4, 'columns', 'en', 0, false), 3, 4, box.w, box.h);
    expectInsideBox(blockPrimitives(division, 3, 4, 'columns', 'en', 0, true), 3, 4, box.w, box.h);
  });

  it('el corchete es un trazo vertical a la derecha del divisor y una raya sobre el dividendo', () => {
    const drawn = blockPrimitives(division, 0, 0, 'columns', 'en', 0, false);
    expect(vertical(drawn)).toHaveLength(1);
    expect(horizontal(drawn)).toHaveLength(1);
    const bar = vertical(drawn)[0]!;
    const rule = horizontal(drawn)[0]!;
    expect(bar.x1).toBeCloseTo(barX, 10);
    expect(bar.y1).toBeCloseTo(ruleY, 10);
    expect(bar.y2).toBeCloseTo(firstBaseline, 10);
    expect(rule.y1).toBeCloseTo(ruleY, 10);
    expect(rule.x1).toBeCloseTo(barX, 10);
    // Sin resto el renglón del cociente no es más ancho que el dividendo: la raya llega al borde del bloque.
    expect(rule.x2).toBeCloseTo(dividendX + digits('84'), 10);
    expect(rule.x2).toBeCloseTo(w, 10);
    // Las dos rayas se encuentran en la esquina del corchete y la horizontal cubre el dividendo.
    expect(rule.x1).toBeCloseTo(bar.x1, 10);
    expect(rule.y1).toBeLessThan(texts(drawn).find((t) => t.text === '84')!.y - DIGIT_CAP);
    expect(span(texts(drawn).find((t) => t.text === '84')!)[1]).toBeCloseTo(rule.x2, 10);
  });

  it('el divisor queda a la izquierda del trazo y el dividendo a su derecha, sin tocarse', () => {
    const drawn = blockPrimitives(division, 0, 0, 'columns', 'en', 0, false);
    const bar = vertical(drawn)[0]!;
    const [divisorLeft, divisorRight] = span(texts(drawn).find((t) => t.text === '7')!);
    const [dividendLeft] = span(texts(drawn).find((t) => t.text === '84')!);
    expect(divisorLeft).toBeCloseTo(0, 10);
    expect(divisorRight).toBeLessThan(bar.x1);
    expect(dividendLeft).toBeGreaterThan(bar.x1);
    expect(divisorRight).toBeLessThanOrEqual(dividendLeft);
  });

  it('el cociente va encima de la raya, alineado con el dividendo, y solo al resolver', () => {
    expect(texts(blockPrimitives(division, 0, 0, 'columns', 'en', 0, false)).some((t) => t.text === '12')).toBe(false);
    const solved = blockPrimitives(division, 0, 0, 'columns', 'en', 0, true);
    const quotient = texts(solved).find((t) => t.text === '12')!;
    const rule = horizontal(solved)[0]!;
    expect(quotient.y).toBeCloseTo(quotientBaseline, 10);
    expect(quotient.y).toBeLessThan(rule.y1);
    expect(quotient.align).toBe('start');
    expect(quotient.x).toBeCloseTo(texts(solved).find((t) => t.text === '84')!.x, 10);
  });

  it('con resto lo escribe a la derecha del cociente como «r 2», solo al resolver', () => {
    const withRemainder = op('div', 17, 5, 3, 2);
    const box = measureBlock(withRemainder, 'columns', 'en');
    const blank = blockPrimitives(withRemainder, 0, 0, 'columns', 'en', 0, false);
    expect(texts(blank).some((t) => t.text.includes('r'))).toBe(false);
    expectInsideBox(blank, 0, 0, box.w, box.h);

    const solved = blockPrimitives(withRemainder, 0, 0, 'columns', 'en', 0, true);
    const quotient = texts(solved).find((t) => t.text === '3 r 2')!;
    const rule = horizontal(solved)[0]!;
    expect(quotient.y).toBeLessThan(rule.y1);
    // La raya cubre el dividendo y la marca del resto sobresale por la derecha, pero dentro de la caja medida.
    expect(rule.x2).toBeCloseTo(span(texts(solved).find((t) => t.text === '17')!)[1], 10);
    expect(span(quotient)[1]).toBeGreaterThan(rule.x2);
    expect(span(quotient)[1]).toBeCloseTo(box.w, 10);
    expectInsideBox(solved, 0, 0, box.w, box.h);
  });
});

describe('bloque de división común a los dos idiomas', () => {
  const division = op('div', 84, 7, 12);

  it('el cociente va debajo de la raya en español y encima en inglés', () => {
    const quotient = (lang: Lang) => {
      const drawn = blockPrimitives(division, 0, 0, 'columns', lang, 0, true);
      return { q: texts(drawn).find((t) => t.text === '12')!.y, rule: horizontal(drawn)[0]!.y1 };
    };
    expect(quotient('es').q).toBeGreaterThan(quotient('es').rule);
    expect(quotient('en').q).toBeLessThan(quotient('en').rule);
  });

  it('el divisor va a la derecha del trazo en español y a la izquierda en inglés', () => {
    const side = (lang: Lang) => {
      const drawn = blockPrimitives(division, 0, 0, 'columns', lang, 0, false);
      return texts(drawn).find((t) => t.text === '7')!.x > vertical(drawn)[0]!.x1 ? 'right' : 'left';
    };
    expect(side('es')).toBe('right');
    expect(side('en')).toBe('left');
  });

  it.each(['es', 'en'] as Lang[])('en una hoja más ancha el esquema se cuelga del borde derecho y el índice se queda en la columna (%s)', (lang) => {
    const box = measureBlock(division, 'columns', lang);
    const width = box.w + 15;
    const own = blockPrimitives(division, 10, 20, 'columns', lang, 0, false);
    const wide = blockPrimitives(division, 10, 20, 'columns', lang, 0, false, width);
    expect(texts(wide).find((t) => t.text === blockIndexLabel(0))?.x).toBe(10);
    expect(vertical(wide)[0]!.x1).toBeCloseTo(vertical(own)[0]!.x1 + 15, 10);
    expect(horizontal(wide)[0]!.x2).toBeCloseTo(10 + width, 10);
    expectInsideBox(wide, 10, 20, width, box.h);
  });

  it.each(['es', 'en'] as Lang[])('el peor caso del generador también cabe en su caja (%s)', (lang) => {
    const worst = op('div', 99999, 999, 100, 99);
    const box = measureBlock(worst, 'columns', lang);
    expectInsideBox(blockPrimitives(worst, 0, 0, 'columns', lang, 0, false), 0, 0, box.w, box.h);
    expectInsideBox(blockPrimitives(worst, 0, 0, 'columns', lang, 0, true), 0, 0, box.w, box.h);
  });
});
