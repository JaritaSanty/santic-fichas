import type { Lang } from '@/core/lang';
import { capHeightMm, measureTextMm } from '@/core/measure';
import type { PaperSize } from '@/core/paper';
import type { Primitive, SheetDocument, SheetPage } from '@/core/sheet';
import type { WordSearchResult } from '@/generators/wordsearch';
import { buildFrame, type ContentBox, type FrameLabels, type SheetHeader } from '@/layout/common/frame';

export const WORDSEARCH_LAYOUT = {
  maxCellMm: 12,
  minCellMm: 6,
  gapMm: 6,
  listSizeMm: 4,
  listLineMm: 6.5,
  listColumnGapMm: 6,
  letterRatio: 0.62,
  capsuleRatio: 0.78,
} as const;

export type WordSearchLayout = { ok: true; doc: SheetDocument } | { ok: false; error: { code: 'cells-too-small'; maxSize: number } };

interface LayoutInput {
  result: WordSearchResult;
  header: SheetHeader;
  labels: FrameLabels;
  paper: PaperSize;
  lang: Lang;
  includeSolutions: boolean;
}

interface GridGeometry {
  x: number;
  y: number;
  cell: number;
  side: number;
}

function gridPrimitives(result: WordSearchResult, g: GridGeometry): Primitive[] {
  const L = WORDSEARCH_LAYOUT;
  const letterSize = g.cell * L.letterRatio;
  const baselineOffset = capHeightMm('sheet', letterSize) / 2;
  const out: Primitive[] = [{ t: 'rect', x: g.x, y: g.y, w: g.side, h: g.side, stroke: 'ink', strokeWidth: 0.4 }];
  result.cells.forEach((letter, i) => {
    const row = Math.floor(i / result.size);
    const col = i % result.size;
    out.push({
      t: 'text',
      x: g.x + (col + 0.5) * g.cell,
      y: g.y + (row + 0.5) * g.cell + baselineOffset,
      text: letter,
      size: letterSize,
      font: 'sheet',
      align: 'middle',
      tone: 'ink',
    });
  });
  return out;
}

function capsules(result: WordSearchResult, g: GridGeometry): Primitive[] {
  return result.placements.map((p) => {
    const last = p.entry.normalized.length - 1;
    const r1 = p.row + p.dr * last;
    const c1 = p.col + p.dc * last;
    return {
      t: 'capsule',
      cx: g.x + ((p.col + c1) / 2 + 0.5) * g.cell,
      cy: g.y + ((p.row + r1) / 2 + 0.5) * g.cell,
      length: Math.hypot(c1 - p.col, r1 - p.row) * g.cell + g.cell * 0.8,
      width: g.cell * WORDSEARCH_LAYOUT.capsuleRatio,
      angleDeg: (Math.atan2(r1 - p.row, c1 - p.col) * 180) / Math.PI,
      stroke: 'muted',
      strokeWidth: 0.35,
    };
  });
}

function listPrimitives(words: readonly string[], box: ContentBox, top: number, columns: number, colWidth: number): Primitive[] {
  const L = WORDSEARCH_LAYOUT;
  return words.map((text, k) => ({
    t: 'text',
    x: box.x + (k % columns) * colWidth,
    y: top + Math.floor(k / columns) * L.listLineMm + L.listSizeMm,
    text,
    size: L.listSizeMm,
    font: 'sheet',
    align: 'start',
    tone: 'ink',
  }));
}

export function layoutWordSearch(input: LayoutInput): WordSearchLayout {
  const L = WORDSEARCH_LAYOUT;
  const { result, header, labels, paper, lang } = input;
  const first = buildFrame({ paper, header, labels, role: 'student' });
  const box = first.content;

  const words = result.placements.map((p) => p.entry.original).sort((a, b) => a.localeCompare(b, lang));
  const widest = words.reduce((max, w) => Math.max(max, measureTextMm(w, 'sheet', L.listSizeMm)), 0);
  const colWidth = widest + L.listColumnGapMm;
  const columns = Math.max(1, Math.floor((box.w + L.listColumnGapMm) / colWidth));
  const listHeight = Math.ceil(words.length / columns) * L.listLineMm;

  const byWidth = box.w / result.size;
  const withList = Math.min(L.maxCellMm, byWidth, (box.h - L.gapMm - listHeight) / result.size);
  const cell = withList >= L.minCellMm ? withList : Math.min(L.maxCellMm, byWidth, box.h / result.size);
  if (cell < L.minCellMm) {
    return { ok: false, error: { code: 'cells-too-small', maxSize: Math.floor(Math.min(box.w, box.h) / L.minCellMm) } };
  }

  const side = cell * result.size;
  const grid: GridGeometry = { x: box.x + (box.w - side) / 2, y: box.y, cell, side };
  const listTop = grid.y + side + L.gapMm;
  const firstLines = Math.max(0, Math.floor((box.y + box.h - listTop) / L.listLineMm));
  const firstCount = Math.min(words.length, firstLines * columns);

  const pages: SheetPage[] = [
    {
      role: 'student',
      primitives: [...first.primitives, ...gridPrimitives(result, grid), ...listPrimitives(words.slice(0, firstCount), box, listTop, columns, colWidth)],
    },
  ];

  const perPage = Math.max(1, Math.floor(box.h / L.listLineMm)) * columns;
  for (let start = firstCount; start < words.length; start += perPage) {
    const frame = buildFrame({ paper, header, labels, role: 'student' });
    pages.push({ role: 'student', primitives: [...frame.primitives, ...listPrimitives(words.slice(start, start + perPage), frame.content, frame.content.y, columns, colWidth)] });
  }

  if (input.includeSolutions) {
    const frame = buildFrame({ paper, header, labels, role: 'solution' });
    pages.push({ role: 'solution', primitives: [...frame.primitives, ...gridPrimitives(result, grid), ...capsules(result, grid)] });
  }

  return { ok: true, doc: { paper, lang, pages } };
}
