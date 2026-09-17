import type { Lang } from '@/core/lang';
import type { PaperSize } from '@/core/paper';
import type { Primitive, SheetDocument, SheetPage } from '@/core/sheet';
import type { ArithmeticResult, SheetLayout } from '@/generators/arithmetic';
import { buildFrame, type ContentBox, type FrameLabels, type SheetHeader } from '@/layout/common/frame';
import { ARITHMETIC_LAYOUT, blockPrimitives, measureBlock, type BlockBox } from './blocks';

const EPS = 1e-9;

export interface ArithmeticCapacity {
  columns: number;
  rows: number;
  perPage: number;
  /** Distancia horizontal entre los orígenes de dos bloques contiguos. */
  stepXMm: number;
  /** Distancia vertical entre los orígenes de dos filas contiguas. */
  stepYMm: number;
}

export type ArithmeticLayoutResult =
  | { ok: true; doc: SheetDocument; capacity: { perPage: number; pages: number } }
  | { ok: false; error: { code: 'block-too-large' } };

export interface ArithmeticLayoutInput {
  result: ArithmeticResult;
  header: SheetHeader;
  labels: FrameLabels;
  paper: PaperSize;
  lang: Lang;
  includeSolutions: boolean;
  /** Disposición pedida en el parte; no viaja en `ArithmeticResult` porque no cambia las operaciones. */
  layout: SheetLayout;
  /** Columnas pedidas en el parte (solo en la disposición en columnas); se recorta a las que caben. */
  columns: number;
}

/**
 * Retícula de una hoja: cuántos bloques caben y a qué distancia se colocan.
 *
 * Todos los bloques de la hoja usan el ancho del más ancho, así que las columnas quedan alineadas. Las columnas
 * pedidas se recortan a las que caben de verdad (`fitting`) y se reparten por todo el ancho del contenido, de modo
 * que la última termina en el margen derecho; las filas se apilan desde arriba con `blockGapYMm` entre ellas.
 *
 * Devuelve `null` si un solo bloque no cabe en la caja de contenido.
 */
export function arithmeticCapacity(box: ContentBox, block: BlockBox, columns: number): ArithmeticCapacity | null {
  const L = ARITHMETIC_LAYOUT;
  if (block.w > box.w + EPS || block.h > box.h + EPS) return null;
  const fitting = Math.max(1, Math.floor((box.w + L.blockGapXMm) / (block.w + L.blockGapXMm)));
  const wanted = Number.isInteger(columns) && columns > 0 ? columns : fitting;
  const cols = Math.min(fitting, wanted);
  const rows = Math.max(1, Math.floor((box.h + L.blockGapYMm) / (block.h + L.blockGapYMm)));
  return {
    columns: cols,
    rows,
    perPage: rows * cols,
    stepXMm: cols > 1 ? (box.w - block.w) / (cols - 1) : 0,
    stepYMm: block.h + L.blockGapYMm,
  };
}

/**
 * Cuadernillo completo: páginas de alumno y, si se piden, las mismas páginas resueltas.
 *
 * Las hojas de soluciones repiten la paginación del alumno (mismos bloques, mismos índices y misma retícula) y van
 * después de todas las de alumno, como en la sopa de letras.
 */
export function layoutArithmetic(input: ArithmeticLayoutInput): ArithmeticLayoutResult {
  const { result, header, labels, paper, lang, layout } = input;
  const operations = result.operations;

  const emptyPage = (role: 'student' | 'solution'): SheetPage => ({ role, primitives: buildFrame({ paper, header, labels, role }).primitives });
  if (operations.length === 0) {
    const pages: SheetPage[] = [emptyPage('student')];
    if (input.includeSolutions) pages.push(emptyPage('solution'));
    return { ok: true, doc: { paper, lang, pages }, capacity: { perPage: 0, pages: 1 } };
  }

  const boxes = operations.map((op) => measureBlock(op, layout, lang));
  const block: BlockBox = {
    w: boxes.reduce((max, b) => Math.max(max, b.w), 0),
    h: boxes.reduce((max, b) => Math.max(max, b.h), 0),
  };

  const first = buildFrame({ paper, header, labels, role: 'student' });
  const grid = arithmeticCapacity(first.content, block, input.columns);
  if (!grid) return { ok: false, error: { code: 'block-too-large' } };

  const pageCount = Math.ceil(operations.length / grid.perPage);

  const buildPage = (role: 'student' | 'solution', page: number): SheetPage => {
    const frame = buildFrame({ paper, header, labels, role });
    const primitives: Primitive[] = [...frame.primitives];
    const start = page * grid.perPage;
    operations.slice(start, start + grid.perPage).forEach((op, slot) => {
      const x = frame.content.x + (slot % grid.columns) * grid.stepXMm;
      const y = frame.content.y + Math.floor(slot / grid.columns) * grid.stepYMm;
      primitives.push(...blockPrimitives(op, x, y, layout, lang, start + slot, role === 'solution', block.w));
    });
    return { role, primitives };
  };

  const pages: SheetPage[] = Array.from({ length: pageCount }, (_, page) => buildPage('student', page));
  if (input.includeSolutions) {
    for (let page = 0; page < pageCount; page++) pages.push(buildPage('solution', page));
  }

  return { ok: true, doc: { paper, lang, pages }, capacity: { perPage: grid.perPage, pages: pageCount } };
}
