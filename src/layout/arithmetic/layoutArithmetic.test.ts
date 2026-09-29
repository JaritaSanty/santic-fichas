import { describe, expect, it } from 'vitest';
import { PAPER, SHEET_MARGIN_MM, type PaperSize } from '@/core/paper';
import type { Primitive, SheetPage } from '@/core/sheet';
import type { ArithmeticResult, Operation, OperationKind, SheetLayout } from '@/generators/arithmetic';
import { buildFrame, stampPrimitives } from '@/layout/common/frame';
import { ARITHMETIC_LAYOUT, measureBlock } from './blocks';
import { arithmeticCapacity, layoutArithmetic, verticalGapMm } from './layoutArithmetic';
import { corners } from '@/layout/common/primitiveBounds';

const L = ARITHMETIC_LAYOUT;
const labels = { name: 'Nombre', date: 'Fecha', solutions: 'Soluciones', student: 'Alumno', paperName: 'A4', pageOf: 'Página {page}/{pages}' };
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

const content = (paper: PaperSize, role: 'student' | 'solution' = 'student') => buildFrame({ paper, header, labels, role }).content;
const frameSize = (paper: PaperSize, role: 'student' | 'solution') => buildFrame({ paper, header, labels, role }).primitives.length;
// Cada hoja es marco · bloques · marca de página: la marca vive en los márgenes y se recorta aparte de los bloques.
const stampSize = (paper: PaperSize, role: 'student' | 'solution') =>
  stampPrimitives({ paper, labels, role, stamp: { page: 1, pages: 2, code: 'v1-MAQUET' } }).length;
const blocksOf = (paper: PaperSize, page: SheetPage): Primitive[] =>
  page.primitives.slice(frameSize(paper, page.role), page.primitives.length - stampSize(paper, page.role));

const INDEX = /^\d+\)$/;
const indices = (page: SheetPage): string[] =>
  page.primitives.filter((p): p is Extract<Primitive, { t: 'text' }> => p.t === 'text' && p.size === L.indexSizeMm && INDEX.test(p.text)).map((p) => p.text);

// Capacidad congelada: bloque en columnas de 22,66 mm ⇒ 8 filas en A4 y 7 en Carta; renglón en línea de 11 mm sin
// hueco vertical ⇒ 21 y 19.
const EXPECTED: Record<PaperSize, Record<number, number>> = {
  a4: { 2: 16, 5: 40 },
  letter: { 2: 14, 5: 35 },
};
const EXPECTED_INLINE_ROWS: Record<PaperSize, number> = { a4: 21, letter: 19 };

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

  it('en línea el renglón es el paso completo: no se suma el hueco vertical', () => {
    const line = { w: 60, h: L.inlineLineMm };
    const grid = arithmeticCapacity(content(paper), line, 2, verticalGapMm('inline'));
    expect(grid?.rows).toBe(EXPECTED_INLINE_ROWS[paper]);
    expect(grid?.stepYMm).toBe(L.inlineLineMm);
    // Con el hueco de la disposición en columnas cabrían bastantes menos.
    expect(arithmeticCapacity(content(paper), line, 2, L.blockGapYMm)!.rows).toBeLessThan(EXPECTED_INLINE_ROWS[paper]);
  });

  it('la capacidad en línea de la hoja usa esas filas', () => {
    const out = lay({ operations: sums(200), paper, columns: 2, layout: 'inline' });
    if (!out.ok) throw new Error('maquetación');
    expect(out.capacity.perPage).toBe(EXPECTED_INLINE_ROWS[paper] * 2);
    expect(out.doc.pages.map((p) => indices(p).length).reduce((a, b) => a + b, 0)).toBe(200);
  });

  it('la capacidad dice las columnas usadas, no las pedidas', () => {
    // Renglones anchísimos (cinco cifras entre tres, con resto): no caben cinco columnas y la hoja usa las que quepan.
    const out = lay({ operations: worst(30), paper, columns: 5, layout: 'inline' });
    if (!out.ok) throw new Error('maquetación');
    const starts = new Set(
      out.doc.pages[0]!.primitives.filter((p): p is Extract<Primitive, { t: 'text' }> => p.t === 'text' && p.size === L.indexSizeMm && INDEX.test(p.text)).map((p) => Math.round(p.x * 1000)),
    );
    expect(out.capacity.columns).toBeLessThan(5);
    expect(out.capacity.columns).toBe(starts.size);
    expect(out.capacity.perPage % out.capacity.columns).toBe(0);
  });

  it('la marca de página se queda en los márgenes, fuera de la caja de contenido', () => {
    const out = lay({ operations: sums(40), paper, columns: 2, includeSolutions: true });
    if (!out.ok) throw new Error('maquetación');
    const { widthMm, heightMm } = PAPER[paper];
    for (const page of out.doc.pages) {
      const box = content(paper, page.role);
      const stamp = page.primitives.slice(page.primitives.length - stampSize(paper, page.role));
      expect(stamp.length).toBeGreaterThan(0);
      for (const p of stamp) {
        for (const [x, y] of corners(p)) {
          expect(x).toBeGreaterThanOrEqual(SHEET_MARGIN_MM - 1e-6);
          expect(x).toBeLessThanOrEqual(widthMm - SHEET_MARGIN_MM + 1e-6);
          expect(y).toBeGreaterThanOrEqual(SHEET_MARGIN_MM - 1e-6);
          expect(y).toBeLessThanOrEqual(heightMm - SHEET_MARGIN_MM + 1e-6);
          // Ni un milímetro dentro del área de ejercicios: o está por encima de la caja, o por debajo.
          expect(y <= box.y + 1e-6 || y >= box.y + box.h - 1e-6).toBe(true);
        }
      }
    }
  });

  it('el número de bloques dibujados es el de operaciones, con sus índices en orden', () => {
    const out = lay({ operations: sums(47), paper, columns: 3 });
    if (!out.ok) throw new Error('maquetación');
    const drawn = out.doc.pages.flatMap((p) => indices(p));
    expect(drawn).toEqual(Array.from({ length: 47 }, (_, i) => `${i + 1})`));
  });

  it.each(['columns', 'inline'] as SheetLayout[])('los bloques no salen de la caja de contenido ni de los márgenes (%s)', (layout) => {
    const out = lay({ operations: worst(200), paper, columns: 5, includeSolutions: true, layout });
    if (!out.ok) throw new Error('maquetación');
    const { widthMm, heightMm } = PAPER[paper];
    for (const page of out.doc.pages) {
      // Los bloques van detrás de las primitivas del marco: se comprueban contra la caja de contenido, más
      // estrecha que la hoja, para que un bloque no pueda invadir el encabezado o el pie sin que salte la prueba.
      const box = content(paper, page.role);
      for (const p of blocksOf(paper, page)) {
        for (const [x, y] of corners(p)) {
          expect(x).toBeGreaterThanOrEqual(box.x - 1e-6);
          expect(x).toBeLessThanOrEqual(box.x + box.w + 1e-6);
          expect(y).toBeGreaterThanOrEqual(box.y - 1e-6);
          expect(y).toBeLessThanOrEqual(box.y + box.h + 1e-6);
        }
      }
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
  const gapY = verticalGapMm('columns');

  it('los bloques de una hoja comparten el ancho del más ancho y quedan en columna', () => {
    const mixed = [op('add', 7, 8, 15), op('mul', 99999, 999, 99899001), op('add', 12, 34, 46)];
    const out = lay({ operations: mixed, paper: 'a4', columns: 3 });
    if (!out.ok) throw new Error('maquetación');
    const ends = out.doc.pages[0]!.primitives.filter((p): p is Extract<Primitive, { t: 'text' }> => p.t === 'text' && p.align === 'end');
    const widest = measureBlock(mixed[1]!, 'columns', 'es').w;
    const starts = out.doc.pages[0]!.primitives.filter((p): p is Extract<Primitive, { t: 'text' }> => p.t === 'text' && INDEX.test(p.text)).map((p) => p.x);
    expect(starts).toHaveLength(3);
    for (const [i, start] of starts.entries()) {
      // Dos operandos y el signo por bloque: los operandos acaban en el borde común y el signo, pegado a ellos.
      const column = ends.filter((t) => Math.abs(t.x - (start + widest)) < 1e-9);
      expect(column.length, `bloque ${i}`).toBe(2);
    }
  });

  // La galera inglesa reserva el hueco del cociente encima del dividendo y la casita lo pone debajo de la raya: si la
  // fila se alineara por el borde superior del bloque, la misma ficha saldría cuadrada en español y dentada en inglés.
  it.each(['es', 'en'] as const)('los bloques de una fila comparten la línea base del primer operando (%s)', (lang) => {
    const mixed = [op('add', 15, 34, 49), op('div', 84, 7, 12), op('mul', 23, 45, 1035), op('sub', 98, 56, 42)];
    const out = lay({ operations: mixed, paper: 'a4', columns: 4, lang });
    if (!out.ok) throw new Error('maquetación');
    const drawn = out.doc.pages[0]!.primitives.slice(frameSize('a4', 'student'));
    const baselineOf = (value: number): number => {
      const found = drawn.filter((p): p is Extract<Primitive, { t: 'text' }> => p.t === 'text' && p.text === String(value));
      expect(found, `primer operando ${value}`).toHaveLength(1);
      return found[0]!.y;
    };
    const baselines = mixed.map((operation) => baselineOf(operation.a));
    // Una sola fila (cuatro bloques, cuatro columnas) y una sola línea base para los cuatro primeros operandos.
    expect(new Set(baselines.map((y) => Math.round(y * 1e6))).size).toBe(1);
  });

  // El índice se ancla al borde de la fila, no al del bloque: si siguiera al bloque, la galera —que ha subido para
  // alinear su dividendo— se llevaría su número un `answerGapMm` por encima de los de al lado.
  it.each(['es', 'en'] as const)('los índices de una fila se numeran en un solo renglón (%s)', (lang) => {
    const mixed = [op('add', 15, 34, 49), op('div', 84, 7, 12), op('mul', 23, 45, 1035), op('sub', 98, 56, 42)];
    const out = lay({ operations: mixed, paper: 'a4', columns: 4, lang });
    if (!out.ok) throw new Error('maquetación');
    const drawn = out.doc.pages[0]!.primitives.filter(
      (p): p is Extract<Primitive, { t: 'text' }> => p.t === 'text' && p.size === L.indexSizeMm && INDEX.test(p.text),
    );
    expect(drawn.map((p) => p.text)).toEqual(['1)', '2)', '3)', '4)']);
    expect(new Set(drawn.map((p) => Math.round(p.y * 1e6))).size).toBe(1);
  });

  // El paso vertical es el mismo en todas las filas, se mezclen o no los esquemas: lo que cambia de una fila a otra
  // es cuánto cuelga por debajo de la línea base, no dónde empieza.
  it.each(['es', 'en'] as const)('las filas se reparten con un paso constante (%s)', (lang) => {
    const kinds: OperationKind[] = ['add', 'div', 'mul', 'sub'];
    const mixed = Array.from({ length: 16 }, (_, i) => {
      const kind = kinds[(i + Math.floor(i / 4)) % 4] as OperationKind;
      if (kind === 'div') return op('div', 84, 7, 12);
      if (kind === 'mul') return op('mul', 23, 45, 1035);
      return kind === 'add' ? op('add', 15, 34, 49) : op('sub', 98, 56, 42);
    });
    const out = lay({ operations: mixed, paper: 'a4', columns: 4, lang });
    if (!out.ok) throw new Error('maquetación');
    const rows = [
      ...new Set(
        out.doc.pages[0]!.primitives
          .filter((p): p is Extract<Primitive, { t: 'text' }> => p.t === 'text' && p.size === L.indexSizeMm && INDEX.test(p.text))
          .map((p) => p.y),
      ),
    ].sort((a, b) => a - b);
    expect(rows.length).toBeGreaterThan(2);
    const steps = rows.slice(1).map((y, i) => y - (rows[i] as number));
    for (const step of steps) expect(step).toBeCloseTo(steps[0] as number, 9);
  });

  it('recorta las columnas pedidas a las que caben de verdad', () => {
    const wide = measureBlock(op('mul', 99999, 999, 99899001), 'columns', 'es');
    expect(arithmeticCapacity(box, wide, 5, gapY)?.columns).toBe(5);
    // 186 mm de contenido solo dan para dos bloques de 60 mm con 6 mm de separación.
    expect(arithmeticCapacity(box, { w: 60, h: 20 }, 5, gapY)?.columns).toBe(2);
  });

  it('avisa si un solo bloque no cabe en la caja de contenido', () => {
    expect(arithmeticCapacity(box, { w: 200, h: 20 }, 2, gapY)).toBeNull();
    expect(arithmeticCapacity(box, { w: 20, h: 300 }, 2, gapY)).toBeNull();
    expect(arithmeticCapacity(box, { w: box.w, h: box.h }, 2, gapY)).toEqual({
      columns: 1,
      rows: 1,
      perPage: 1,
      stepXMm: 0,
      stepYMm: box.h + gapY,
      offsetXMm: 0,
    });
  });

  it('las columnas nunca se solapan, nunca se separan más de maxGapXMm y la retícula queda centrada', () => {
    const block = { w: 30, h: 22 };
    for (const columns of [2, 3, 4, 5]) {
      const grid = arithmeticCapacity(box, block, columns, gapY)!;
      expect(grid.stepXMm).toBeGreaterThanOrEqual(block.w + L.blockGapXMm - 1e-9);
      expect(grid.stepXMm).toBeLessThanOrEqual(block.w + L.maxGapXMm + 1e-9);
      const used = (grid.columns - 1) * grid.stepXMm + block.w;
      expect(grid.offsetXMm).toBeCloseTo((box.w - used) / 2, 10);
      expect(grid.offsetXMm * 2 + used).toBeCloseTo(box.w, 10);
    }
  });

  it('con pocos bloques anchos la retícula se estira hasta el borde, sin hueco muerto', () => {
    const block = { w: 88, h: 22 };
    const grid = arithmeticCapacity(box, block, 2, gapY)!;
    expect(grid.columns).toBe(2);
    expect(grid.stepXMm).toBeCloseTo(box.w - block.w, 10);
    expect(grid.offsetXMm).toBeCloseTo(0, 10);
  });

  it('en línea la ficha respeta las columnas pedidas mientras quepan', () => {
    const out = lay({ operations: sums(60), paper: 'a4', columns: 2, layout: 'inline' });
    if (!out.ok) throw new Error('maquetación');
    const rows = new Set(
      out.doc.pages[0]!.primitives.filter((p): p is Extract<Primitive, { t: 'text' }> => p.t === 'text' && INDEX.test(p.text)).map((p) => p.y),
    ).size;
    expect(out.capacity.perPage).toBe(rows * 2);
  });

  it('una ficha sin operaciones da una sola hoja vacía', () => {
    const out = lay({ operations: [], paper: 'a4', columns: 2, includeSolutions: true });
    if (!out.ok) throw new Error('maquetación');
    expect(out.capacity).toEqual({ columns: 2, perPage: 0, pages: 1 });
    expect(out.doc.pages.map((p) => p.role)).toEqual(['student', 'solution']);
    expect(out.doc.pages.flatMap((p) => indices(p))).toEqual([]);
  });
});
