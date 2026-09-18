import { describe, expect, it } from 'vitest';
import type { Lang } from '@/core/lang';
import { measureTextMm } from '@/core/measure';
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

  it.each(['es', 'en'] as Lang[])('en división con resto el texto resuelto muestra cociente y resto en %s', (lang) => {
    const division = op('div', 17, 5, 3, 2);
    const drawn = blockPrimitives(division, 0, 0, 'inline', lang, 0, true);
    const answer = texts(drawn).find((t) => t.text.includes('3') && t.text.includes('2'));
    expect(answer).toBeDefined();
    // La medida conoce el idioma, así que la caja contiene el texto resuelto de ese idioma.
    expectInsideBox(drawn, 0, 0, measureBlock(division, 'inline', lang).w, L.inlineLineMm);
  });
});

// La Tarea 7 sustituye este dibujo por la casita y la galera; aquí solo se comprueba que la rama existe y mide.
describe('bloque de división (esquema neutro de la Tarea 6)', () => {
  const division = op('div', 84, 7, 12);

  it.each(['es', 'en'] as Lang[])('mide una caja no vacía y dibuja dentro de ella en %s', (lang) => {
    const box = measureBlock(division, 'columns', lang);
    expect(box.w).toBeGreaterThan(0);
    expect(box.h).toBeGreaterThan(0);
    expectInsideBox(blockPrimitives(division, 3, 4, 'columns', lang, 0, true), 3, 4, box.w, box.h);
  });

  it.each(['es', 'en'] as Lang[])('separa dividendo y divisor con un trazo vertical y una raya horizontal en %s', (lang) => {
    const drawn = lines(blockPrimitives(division, 0, 0, 'columns', lang, 0, false));
    expect(drawn.filter((l) => l.x1 === l.x2)).toHaveLength(1);
    expect(drawn.filter((l) => l.y1 === l.y2)).toHaveLength(1);
  });

  it('coloca el divisor a la derecha del trazo en español y a la izquierda en inglés', () => {
    const side = (lang: Lang) => {
      const drawn = blockPrimitives(division, 0, 0, 'columns', lang, 0, false);
      const bar = lines(drawn).find((l) => l.x1 === l.x2)!;
      const divisor = texts(drawn).find((t) => t.text === '7')!;
      return divisor.x > bar.x1 ? 'right' : 'left';
    };
    expect(side('es')).toBe('right');
    expect(side('en')).toBe('left');
  });

  it('en una hoja más ancha el dibujo se cuelga del borde derecho común y el índice se queda en la columna', () => {
    const box = measureBlock(division, 'columns', 'es');
    const width = box.w + 15;
    const drawn = blockPrimitives(division, 10, 20, 'columns', 'es', 0, false, width);
    expect(texts(drawn).find((t) => t.text === blockIndexLabel(0))?.x).toBe(10);
    expect(texts(drawn).find((t) => t.text === '84')?.x).toBeCloseTo(10 + 15, 10);
    expectInsideBox(drawn, 10, 20, width, box.h);
  });

  it('deja hueco para el cociente y solo lo escribe al resolver', () => {
    const blank = blockPrimitives(division, 0, 0, 'columns', 'es', 0, false);
    expect(texts(blank).some((t) => t.text === '12')).toBe(false);
    const solved = blockPrimitives(division, 0, 0, 'columns', 'es', 0, true);
    const quotient = texts(solved).find((t) => t.text === '12');
    const rule = lines(solved).find((l) => l.y1 === l.y2)!;
    expect(quotient?.y).toBeGreaterThan(rule.y1);
  });

  it('con resto lo escribe solo al resolver y dentro de la caja', () => {
    const withRemainder = op('div', 17, 5, 3, 2);
    const box = measureBlock(withRemainder, 'columns', 'es');
    expect(texts(blockPrimitives(withRemainder, 0, 0, 'columns', 'es', 0, false)).some((t) => t.text === '2')).toBe(false);
    const solved = blockPrimitives(withRemainder, 0, 0, 'columns', 'es', 0, true);
    expect(texts(solved).filter((t) => t.text === '2')).toHaveLength(1);
    expectInsideBox(solved, 0, 0, box.w, box.h);
  });
});
