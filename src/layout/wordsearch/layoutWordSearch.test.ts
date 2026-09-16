import { describe, expect, it } from 'vitest';
import { measureTextMm } from '@/core/measure';
import { PAPER, SHEET_MARGIN_MM, type PaperSize } from '@/core/paper';
import type { Primitive, SheetPage } from '@/core/sheet';
import { generateWordSearch, validateWordSearch, type WordSearchResult } from '@/generators/wordsearch';
import { layoutWordSearch, WORDSEARCH_LAYOUT } from './layoutWordSearch';

const labels = { name: 'Nombre', date: 'Fecha', solutions: 'Soluciones' };
const header = { title: 'Animales', school: 'Escuela Nº 5' };
const ALL = { horizontal: true, vertical: true, diagonal: true, reversed: true };

function result(words: string[], size: number, seed = 'v1-LAYOUT'): WordSearchResult {
  const v = validateWordSearch({ wordsText: words.join('\n'), size, directions: ALL }, 'es');
  if (!v.ok) throw new Error('entrada inválida');
  return generateWordSearch(v.value, seed, 'es');
}

const gridLetters = (page: SheetPage) => page.primitives.filter((p): p is Extract<Primitive, { t: 'text' }> => p.t === 'text' && Array.from(p.text).length === 1);

function bounds(p: Primitive): Array<[number, number]> {
  switch (p.t) {
    case 'text': {
      const w = measureTextMm(p.text, p.font, p.size);
      const left = p.align === 'middle' ? p.x - w / 2 : p.align === 'end' ? p.x - w : p.x;
      return [[left, p.y], [left + w, p.y]];
    }
    case 'rect': return [[p.x, p.y], [p.x + p.w, p.y + p.h]];
    case 'line': return [[p.x1, p.y1], [p.x2, p.y2]];
    case 'capsule': {
      const a = (p.angleDeg * Math.PI) / 180;
      const half = p.length / 2 - p.width / 2;
      const r = p.width / 2;
      const ends: Array<[number, number]> = [
        [p.cx - half * Math.cos(a), p.cy - half * Math.sin(a)],
        [p.cx + half * Math.cos(a), p.cy + half * Math.sin(a)],
      ];
      return ends.flatMap(([x, y]) => [[x - r, y - r], [x + r, y + r]] as Array<[number, number]>);
    }
    case 'image': return [[p.x, p.y], [p.x + p.w, p.y + p.h]];
  }
}

const ANIMALS = ['gato', 'perro', 'conejo', 'caballo', 'oveja', 'vaca', 'gallina', 'pato', 'ñandú', 'pingüino'];

describe.each(['a4', 'letter'] as PaperSize[])('layoutWordSearch en %s', (paper) => {
  it('produce alumno + soluciones con la cuadrícula completa en cada una', () => {
    const r = result(ANIMALS, 12);
    const out = layoutWordSearch({ result: r, header, labels, paper, lang: 'es', includeSolutions: true });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.doc.pages.map((p) => p.role)).toEqual(['student', 'solution']);
    expect(gridLetters(out.doc.pages[0]!)).toHaveLength(144);
    expect(gridLetters(out.doc.pages[1]!)).toHaveLength(144);
    expect(gridLetters(out.doc.pages[0]!).map((p) => p.text)).toEqual(r.cells);
  });

  it('sin soluciones solo hay páginas de alumno', () => {
    const out = layoutWordSearch({ result: result(ANIMALS, 12), header, labels, paper, lang: 'es', includeSolutions: false });
    expect(out.ok && out.doc.pages.every((p) => p.role === 'student')).toBe(true);
  });

  it('todo queda dentro de los márgenes de impresión', () => {
    const out = layoutWordSearch({ result: result(ANIMALS, 25), header, labels, paper, lang: 'es', includeSolutions: true });
    if (!out.ok) throw new Error('layout');
    const { widthMm, heightMm } = PAPER[paper];
    for (const page of out.doc.pages) {
      for (const p of page.primitives) {
        for (const [x, y] of bounds(p)) {
          expect(x).toBeGreaterThanOrEqual(SHEET_MARGIN_MM - 1e-6);
          expect(x).toBeLessThanOrEqual(widthMm - SHEET_MARGIN_MM + 1e-6);
          expect(y).toBeGreaterThanOrEqual(SHEET_MARGIN_MM - 1e-6);
          expect(y).toBeLessThanOrEqual(heightMm - SHEET_MARGIN_MM + 1e-6);
        }
      }
    }
  });

  it('las casillas miden al menos 6 mm con 25×25', () => {
    const out = layoutWordSearch({ result: result(ANIMALS, 25), header, labels, paper, lang: 'es', includeSolutions: false });
    if (!out.ok) throw new Error('layout');
    const border = out.doc.pages[0]!.primitives.find((p): p is Extract<Primitive, { t: 'rect' }> => p.t === 'rect');
    expect(border!.w / 25).toBeGreaterThanOrEqual(WORDSEARCH_LAYOUT.minCellMm);
  });

  it('la lista de palabras queda alineada con el ancho de la cuadrícula, no con el de la caja de contenido', () => {
    const r = result(ANIMALS, 12);
    const out = layoutWordSearch({ result: r, header, labels, paper, lang: 'es', includeSolutions: false });
    if (!out.ok) throw new Error('layout');
    const border = out.doc.pages[0]!.primitives.find((p): p is Extract<Primitive, { t: 'rect' }> => p.t === 'rect')!;
    const listTexts = out.doc.pages[0]!.primitives.filter(
      (p): p is Extract<Primitive, { t: 'text' }> => p.t === 'text' && r.placements.some((pl) => pl.entry.original === p.text),
    );
    expect(listTexts.length).toBeGreaterThan(0);
    for (const text of listTexts) {
      const width = measureTextMm(text.text, text.font, text.size);
      expect(text.x).toBeGreaterThanOrEqual(border.x - 1e-6);
      expect(text.x + width).toBeLessThanOrEqual(border.x + border.w + 1e-6);
    }
  });

  it('las cápsulas que llegan hasta el borde de la cuadrícula (diagonal, horizontal o vertical) no sobresalen del margen', () => {
    const fake: WordSearchResult = {
      size: 25,
      cells: new Array(625).fill('A'),
      placements: [
        { entry: { line: 1, original: 'abcde', normalized: 'ABCDE' }, row: 20, col: 20, dr: 1, dc: 1 },
        { entry: { line: 2, original: 'edcba', normalized: 'EDCBA' }, row: 4, col: 4, dr: -1, dc: -1 },
        { entry: { line: 3, original: 'fghij', normalized: 'FGHIJ' }, row: 12, col: 20, dr: 0, dc: 1 },
        { entry: { line: 4, original: 'klmno', normalized: 'KLMNO' }, row: 20, col: 12, dr: 1, dc: 0 },
      ],
      unplaced: [],
      seedCode: 'v1-DIAG',
    };
    const out = layoutWordSearch({ result: fake, header, labels, paper, lang: 'es', includeSolutions: true });
    if (!out.ok) throw new Error('layout');
    const { widthMm, heightMm } = PAPER[paper];
    const capsules = out.doc.pages.flatMap((page) => page.primitives.filter((p): p is Extract<Primitive, { t: 'capsule' }> => p.t === 'capsule'));
    expect(capsules.length).toBeGreaterThan(0);
    for (const c of capsules) {
      for (const [x, y] of bounds(c)) {
        expect(x).toBeGreaterThanOrEqual(SHEET_MARGIN_MM - 1e-6);
        expect(x).toBeLessThanOrEqual(widthMm - SHEET_MARGIN_MM + 1e-6);
        expect(y).toBeGreaterThanOrEqual(SHEET_MARGIN_MM - 1e-6);
        expect(y).toBeLessThanOrEqual(heightMm - SHEET_MARGIN_MM + 1e-6);
      }
    }
  });
});

describe('lista de palabras y soluciones', () => {
  it('lista las palabras colocadas con su forma original y en orden alfabético', () => {
    const r = result(ANIMALS, 12);
    const out = layoutWordSearch({ result: r, header, labels, paper: 'a4', lang: 'es', includeSolutions: false });
    if (!out.ok) throw new Error('layout');
    const listed = out.doc.pages[0]!.primitives.filter((p): p is Extract<Primitive, { t: 'text' }> => p.t === 'text' && r.placements.some((pl) => pl.entry.original === p.text)).map((p) => p.text);
    expect(listed).toEqual(r.placements.map((p) => p.entry.original).sort((a, b) => a.localeCompare(b, 'es')));
    expect(listed).toContain('ñandú');
  });

  it('ordena la lista con las reglas de orden alfabético del español', () => {
    const words = ['oso', 'árbol', 'ñandú', 'nube', 'zorro'];
    const fake: WordSearchResult = {
      size: 8,
      cells: new Array(64).fill('A'),
      placements: words.map((w, i) => ({ entry: { line: i + 1, original: w, normalized: w.toUpperCase() }, row: 0, col: 0, dr: 0, dc: 1 })),
      unplaced: [],
      seedCode: 'v1-ORDEN',
    };
    const out = layoutWordSearch({ result: fake, header, labels, paper: 'a4', lang: 'es', includeSolutions: false });
    if (!out.ok) throw new Error('layout');
    const listed = out.doc.pages[0]!.primitives.filter((p): p is Extract<Primitive, { t: 'text' }> => p.t === 'text' && words.includes(p.text)).map((p) => p.text);
    expect(listed).toEqual(['árbol', 'nube', 'ñandú', 'oso', 'zorro']);
  });

  it('dibuja una cápsula por palabra centrada dentro de la cuadrícula', () => {
    const r = result(ANIMALS, 12);
    const out = layoutWordSearch({ result: r, header, labels, paper: 'a4', lang: 'es', includeSolutions: true });
    if (!out.ok) throw new Error('layout');
    const solution = out.doc.pages.at(-1)!;
    const border = solution.primitives.find((p): p is Extract<Primitive, { t: 'rect' }> => p.t === 'rect')!;
    const capsules = solution.primitives.filter((p): p is Extract<Primitive, { t: 'capsule' }> => p.t === 'capsule');
    expect(capsules).toHaveLength(r.placements.length);
    for (const c of capsules) {
      expect(c.cx).toBeGreaterThan(border.x);
      expect(c.cx).toBeLessThan(border.x + border.w);
      expect(c.cy).toBeGreaterThan(border.y);
      expect(c.cy).toBeLessThan(border.y + border.h);
    }
  });

  it('una lista larga continúa en otra página sin partir la cuadrícula', () => {
    const words = Array.from({ length: 50 }, (_, i) => `electrodomestico${'abcdefghijklmnopqrstuvwxy'[i % 25]}${'ab'[Math.floor(i / 25)]}`);
    const fake: WordSearchResult = {
      size: 25,
      cells: new Array(625).fill('A'),
      placements: words.map((w, i) => ({ entry: { line: i + 1, original: w, normalized: w.toUpperCase() }, row: 0, col: 0, dr: 0, dc: 1 })),
      unplaced: [],
      seedCode: 'v1-LISTA2',
    };
    const out = layoutWordSearch({ result: fake, header, labels, paper: 'letter', lang: 'es', includeSolutions: false });
    if (!out.ok) throw new Error('layout');
    expect(out.doc.pages.length).toBeGreaterThanOrEqual(2);
    const grids = out.doc.pages.map((p) => gridLetters(p).length);
    expect(grids[0]).toBe(625);
    expect(grids.slice(1).every((n) => n === 0)).toBe(true);
    const listedTexts = out.doc.pages.flatMap((p) => p.primitives.filter((x): x is Extract<Primitive, { t: 'text' }> => x.t === 'text' && words.includes(x.text)));
    expect(listedTexts).toHaveLength(50);
  });

  it('informa si la cuadrícula no cabe con casillas legibles', () => {
    const fake: WordSearchResult = { size: 40, cells: new Array(1600).fill('A'), placements: [], unplaced: [], seedCode: 'v1-ENORME' };
    expect(layoutWordSearch({ result: fake, header, labels, paper: 'a4', lang: 'es', includeSolutions: false })).toEqual({
      ok: false,
      error: { code: 'cells-too-small', maxSize: 31 },
    });
  });
});
