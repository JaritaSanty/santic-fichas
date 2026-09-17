import { describe, expect, it } from 'vitest';
import { capHeightMm, measureTextMm } from '@/core/measure';
import { PAPER, SHEET_MARGIN_MM, type PaperSize } from '@/core/paper';
import type { Primitive, SheetPage } from '@/core/sheet';
import type { ArithmeticResult, Operation, OperationKind, SheetLayout } from '@/generators/arithmetic';
import { ARITHMETIC_LAYOUT, measureBlock } from './blocks';
import { arithmeticCapacity, layoutArithmetic } from './layoutArithmetic';

const L = ARITHMETIC_LAYOUT;
const labels = { name: 'Nombre', date: 'Fecha', solutions: 'Soluciones' };
const header = { title: 'Operaciones', school: 'Escuela Nº 5' };

const op = (kind: OperationKind, a: number, b: number, result: number, remainder = 0): Operation => ({ kind, a, b, result, remainder });

const result = (operations: Operation[]): ArithmeticResult => ({ operations, requested: operations.length, seedCode: 'v1-MAQUET', version: 1 });

/** Sumas de tres cifras: el bloque tipo del cuadernillo. */
const sums = (count: number): Operation[] => Array.from({ length: count }, (_, i) => op('add', 100 + i, 200 + i, 300 + 2 * i));

/** Peor caso del enunciado: cinco cifras en el primer operando y tres en el segundo. */
const worst = (count: number): Operation[] =>
  Array.from({ length: count }, (_, i) => {
    const kinds: OperationKind[] = ['add', 'sub', 'mul', 'div'];
    const kind = kinds[i % 4] as OperationKind;
    const a = 99999 - i;
    const b = 999 - i;
    if (kind === 'mul') return op('mul', a, b, a * b);
    if (kind === 'div') return op('div', a, b, Math.floor(a / b), a % b);
    return kind === 'add' ? op('add', a, b, a + b) : op('sub', a, b, a - b);
  });

const lay = (input: {
  operations: Operation[];
  paper: PaperSize;
  columns: number;
  includeSolutions?: boolean;
  layout?: SheetLayout;
  lang?: 'es' | 'en';
}) =>
  layoutArithmetic({
    result: result(input.operations),
    header,
    labels,
    paper: input.paper,
    lang: input.lang ?? 'es',
    includeSolutions: input.includeSolutions ?? false,
    layout: input.layout ?? 'columns',
    columns: input.columns,
  });

const INDEX = /^\d+\)$/;
const indices = (page: SheetPage): string[] =>
  page.primitives.filter((p): p is Extract<Primitive, { t: 'text' }> => p.t === 'text' && p.size === L.indexSizeMm && INDEX.test(p.text)).map((p) => p.text);

function corners(p: Primitive): Array<[number, number]> {
  switch (p.t) {
    case 'text': {
      const w = measureTextMm(p.text, p.font, p.size);
      const left = p.align === 'middle' ? p.x - w / 2 : p.align === 'end' ? p.x - w : p.x;
      return [[left, p.y - capHeightMm(p.font, p.size)], [left + w, p.y]];
    }
    case 'rect': return [[p.x, p.y], [p.x + p.w, p.y + p.h]];
    case 'line': return [[p.x1, p.y1], [p.x2, p.y2]];
    case 'capsule': return [[p.cx - p.length / 2, p.cy - p.width / 2], [p.cx + p.length / 2, p.cy + p.width / 2]];
    case 'image': return [[p.x, p.y], [p.x + p.w, p.y + p.h]];
  }
}

// Capacidad congelada: alto de bloque 22,66 mm en columnas ⇒ 8 filas en A4 y 7 en Carta.
const EXPECTED: Record<PaperSize, Record<number, number>> = {
  a4: { 2: 16, 5: 40 },
  letter: { 2: 14, 5: 35 },
};

describe.each(['a4', 'letter'] as PaperSize[])('capacidad en %s', (paper) => {
  it.each([2, 5])('con %i columnas coincide con la capacidad esperada y con lo dibujado', (columns) => {
    const out = lay({ operations: sums(200), paper, columns });
    if (!out.ok) throw new Error('maquetación');
    expect(out.capacity.perPage).toBe(EXPECTED[paper][columns]);
    expect(out.capacity.pages).toBe(Math.ceil(200 / out.capacity.perPage));
    expect(out.doc.pages).toHaveLength(out.capacity.pages);
    const drawn = out.doc.pages.map((p) => indices(p).length);
    expect(Math.max(...drawn)).toBe(out.capacity.perPage);
    expect(drawn.reduce((a, b) => a + b, 0)).toBe(200);
  });

  it('el número de bloques dibujados es el de operaciones, con sus índices en orden', () => {
    const out = lay({ operations: sums(47), paper, columns: 3 });
    if (!out.ok) throw new Error('maquetación');
    const drawn = out.doc.pages.flatMap((p) => indices(p));
    expect(drawn).toEqual(Array.from({ length: 47 }, (_, i) => `${i + 1})`));
  });

  it.each(['columns', 'inline'] as SheetLayout[])('nada se sale de los márgenes en el peor caso (%s)', (layout) => {
    const out = lay({ operations: worst(200), paper, columns: 5, includeSolutions: true, layout });
    if (!out.ok) throw new Error('maquetación');
    const { widthMm, heightMm } = PAPER[paper];
    for (const page of out.doc.pages) {
      for (const p of page.primitives) {
        for (const [x, y] of corners(p)) {
          expect(x).toBeGreaterThanOrEqual(SHEET_MARGIN_MM - 1e-6);
          expect(x).toBeLessThanOrEqual(widthMm - SHEET_MARGIN_MM + 1e-6);
          expect(y).toBeGreaterThanOrEqual(SHEET_MARGIN_MM - 1e-6);
          expect(y).toBeLessThanOrEqual(heightMm - SHEET_MARGIN_MM + 1e-6);
        }
      }
    }
  });
});

describe('páginas de soluciones', () => {
  it('hay tantas como de alumno, van después y llevan los mismos índices', () => {
    const out = lay({ operations: sums(90), paper: 'a4', columns: 4, includeSolutions: true });
    if (!out.ok) throw new Error('maquetación');
    const roles = out.doc.pages.map((p) => p.role);
    const students = roles.filter((r) => r === 'student').length;
    expect(students).toBe(out.capacity.pages);
    expect(roles).toEqual([...Array(students).fill('student'), ...Array(students).fill('solution')]);
    for (let i = 0; i < students; i++) {
      expect(indices(out.doc.pages[students + i]!)).toEqual(indices(out.doc.pages[i]!));
    }
  });

  it('solo la hoja de soluciones escribe los resultados, en la misma retícula', () => {
    const out = lay({ operations: [op('add', 128, 47, 175)], paper: 'a4', columns: 2, includeSolutions: true });
    if (!out.ok) throw new Error('maquetación');
    const shown = (page: SheetPage) => page.primitives.some((p) => p.t === 'text' && p.text === '175');
    expect(shown(out.doc.pages[0]!)).toBe(false);
    expect(shown(out.doc.pages[1]!)).toBe(true);
  });

  it('sin soluciones solo hay páginas de alumno', () => {
    const out = lay({ operations: sums(10), paper: 'a4', columns: 2 });
    expect(out.ok && out.doc.pages.every((p) => p.role === 'student')).toBe(true);
  });
});

describe('retícula', () => {
  const box = { x: 12, y: 44, w: 186, h: 231 };

  it('los bloques de una hoja comparten el ancho del más ancho y quedan en columna', () => {
    const mixed = [op('add', 7, 8, 15), op('mul', 99999, 999, 99899001), op('add', 12, 34, 46)];
    const out = lay({ operations: mixed, paper: 'a4', columns: 3 });
    if (!out.ok) throw new Error('maquetación');
    const ends = out.doc.pages[0]!.primitives.filter((p): p is Extract<Primitive, { t: 'text' }> => p.t === 'text' && p.align === 'end');
    const widest = measureBlock(mixed[1]!, 'columns', 'es').w;
    const starts = out.doc.pages[0]!.primitives.filter((p): p is Extract<Primitive, { t: 'text' }> => p.t === 'text' && INDEX.test(p.text)).map((p) => p.x);
    expect(starts).toHaveLength(3);
    for (const [i, start] of starts.entries()) {
      const column = ends.filter((t) => Math.abs(t.x - (start + widest)) < 1e-9);
      // Dos operandos por bloque acabados en el mismo borde derecho.
      expect(column.length, `bloque ${i}`).toBe(2);
    }
  });

  it('recorta las columnas pedidas a las que caben de verdad', () => {
    const wide = measureBlock(op('mul', 99999, 999, 99899001), 'columns', 'es');
    expect(arithmeticCapacity(box, wide, 5)?.columns).toBe(5);
    // 186 mm de contenido solo dan para dos bloques de 60 mm con 6 mm de separación.
    expect(arithmeticCapacity(box, { w: 60, h: 20 }, 5)?.columns).toBe(2);
  });

  it('avisa si un solo bloque no cabe en la caja de contenido', () => {
    expect(arithmeticCapacity(box, { w: 200, h: 20 }, 2)).toBeNull();
    expect(arithmeticCapacity(box, { w: 20, h: 300 }, 2)).toBeNull();
    expect(arithmeticCapacity(box, { w: box.w, h: box.h }, 2)).toEqual({ columns: 1, rows: 1, perPage: 1, stepXMm: 0, stepYMm: box.h + L.blockGapYMm });
  });

  it('las columnas se reparten por todo el ancho y nunca se solapan', () => {
    const block = { w: 30, h: 22 };
    for (const columns of [2, 3, 4, 5]) {
      const grid = arithmeticCapacity(box, block, columns);
      expect(grid?.stepXMm).toBeGreaterThanOrEqual(block.w + L.blockGapXMm - 1e-9);
      expect(box.x + (grid!.columns - 1) * grid!.stepXMm + block.w).toBeCloseTo(box.x + box.w, 10);
    }
  });

  it('en línea la ficha decide sola cuántas columnas caben', () => {
    const out = lay({ operations: sums(60), paper: 'a4', columns: 2, layout: 'inline' });
    if (!out.ok) throw new Error('maquetación');
    const perRow = new Set(out.doc.pages[0]!.primitives.filter((p) => p.t === 'text' && INDEX.test(p.text)).map((p) => (p.t === 'text' ? p.y : 0))).size;
    expect(out.capacity.perPage).toBeGreaterThan(perRow);
  });

  it('una ficha sin operaciones da una sola hoja vacía', () => {
    const out = lay({ operations: [], paper: 'a4', columns: 2, includeSolutions: true });
    if (!out.ok) throw new Error('maquetación');
    expect(out.capacity).toEqual({ perPage: 0, pages: 1 });
    expect(out.doc.pages.map((p) => p.role)).toEqual(['student', 'solution']);
    expect(out.doc.pages.flatMap((p) => indices(p))).toEqual([]);
  });
});
