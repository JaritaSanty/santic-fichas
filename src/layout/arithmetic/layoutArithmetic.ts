import type { Lang } from '@/core/lang';
import type { PaperSize } from '@/core/paper';
import type { Primitive, SheetDocument, SheetPage } from '@/core/sheet';
import type { ArithmeticResult, SheetLayout } from '@/generators/arithmetic';
import { buildFrame, stampPages, type ContentBox, type FrameLabels, type SheetHeader } from '@/layout/common/frame';
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
  /** Margen que centra la retícula dentro de la caja de contenido. */
  offsetXMm: number;
}

export type ArithmeticLayoutResult =
  | {
      ok: true;
      doc: SheetDocument;
      /** `columns` son las columnas realmente usadas: las pedidas recortadas a las que caben. */
      capacity: { columns: number; perPage: number; pages: number };
    }
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
  /** Columnas pedidas en el parte, en las dos disposiciones; se recortan a las que caben. */
  columns: number;
}

/** Hueco vertical entre bloques: en línea el renglón (`inlineLineMm`) ya es el paso completo. */
export const verticalGapMm = (layout: SheetLayout): number => (layout === 'inline' ? 0 : ARITHMETIC_LAYOUT.blockGapYMm);

/**
 * Retícula de una hoja: cuántos bloques caben y a qué distancia se colocan.
 *
 * Todos los bloques de la hoja usan el ancho del más ancho, así que las columnas quedan alineadas. Las columnas
 * pedidas se recortan a las que caben de verdad (`fitting`); el paso horizontal se estira hasta `maxGapXMm` y, si
 * sobra ancho, la retícula se centra en vez de separar los bloques de par en par. Las filas se apilan desde
 * arriba con `gapY` entre ellas.
 *
 * Devuelve `null` si un solo bloque no cabe en la caja de contenido.
 */
export function arithmeticCapacity(box: ContentBox, block: Pick<BlockBox, 'w' | 'h'>, columns: number, gapY: number): ArithmeticCapacity | null {
  const L = ARITHMETIC_LAYOUT;
  if (block.w > box.w + EPS || block.h > box.h + EPS) return null;
  const fitting = Math.max(1, Math.floor((box.w + L.blockGapXMm) / (block.w + L.blockGapXMm)));
  const wanted = Number.isInteger(columns) && columns > 0 ? columns : fitting;
  const cols = Math.min(fitting, wanted);
  const rows = Math.max(1, Math.floor((box.h + gapY) / (block.h + gapY)));
  const stepXMm = cols > 1 ? Math.min((box.w - block.w) / (cols - 1), block.w + L.maxGapXMm) : 0;
  return {
    columns: cols,
    rows,
    perPage: rows * cols,
    stepXMm,
    stepYMm: block.h + gapY,
    offsetXMm: (box.w - ((cols - 1) * stepXMm + block.w)) / 2,
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
  const stamped = (pages: SheetPage[]): SheetPage[] => stampPages(pages, { paper, labels, code: result.seedCode });

  if (operations.length === 0) {
    const pages: SheetPage[] = [emptyPage('student')];
    if (input.includeSolutions) pages.push(emptyPage('solution'));
    // Sin operaciones no hay retícula que recortar: se devuelven las columnas pedidas para no anunciar un recorte.
    return { ok: true, doc: { paper, lang, pages: stamped(pages) }, capacity: { columns: input.columns, perPage: 0, pages: 1 } };
  }

  const boxes = operations.map((op) => measureBlock(op, layout, lang));
  // La fila se alinea por la línea base del primer operando, no por el borde superior del bloque: la galera inglesa
  // reserva el hueco del cociente **encima** del dividendo, así que alineando por arriba una división quedaba un
  // `answerGapMm` más baja que las sumas de su fila. El alto de fila es entonces lo que sobresale por encima de esa
  // línea más lo que cuelga por debajo, cada uno del bloque que más mida.
  const firstBaseline = boxes.reduce((max, b) => Math.max(max, b.firstBaseline), 0);
  const below = boxes.reduce((max, b) => Math.max(max, b.h - b.firstBaseline), 0);
  const block: BlockBox = {
    w: boxes.reduce((max, b) => Math.max(max, b.w), 0),
    h: firstBaseline + below,
    firstBaseline,
  };

  // La caja de contenido es idéntica en alumno y en soluciones: se calcula una vez y la usan todas las páginas.
  const box = buildFrame({ paper, header, labels, role: 'student' }).content;
  const grid = arithmeticCapacity(box, block, input.columns, verticalGapMm(layout));
  if (!grid) return { ok: false, error: { code: 'block-too-large' } };

  const pageCount = Math.ceil(operations.length / grid.perPage);

  const buildPage = (role: 'student' | 'solution', page: number): SheetPage => {
    const primitives: Primitive[] = [...buildFrame({ paper, header, labels, role }).primitives];
    const start = page * grid.perPage;
    operations.slice(start, start + grid.perPage).forEach((op, slot) => {
      const x = box.x + grid.offsetXMm + (slot % grid.columns) * grid.stepXMm;
      const rowTop = box.y + Math.floor(slot / grid.columns) * grid.stepYMm;
      // Cada bloque baja lo que le falte para que su primer operando caiga en la línea base común de la fila.
      const y = rowTop + block.firstBaseline - (boxes[start + slot] as BlockBox).firstBaseline;
      primitives.push(...blockPrimitives(op, x, y, layout, lang, start + slot, role === 'solution', block.w, rowTop));
    });
    return { role, primitives };
  };

  const pages: SheetPage[] = Array.from({ length: pageCount }, (_, page) => buildPage('student', page));
  if (input.includeSolutions) {
    for (let page = 0; page < pageCount; page++) pages.push(buildPage('solution', page));
  }

  // La marca de página se pone al final, cuando ya se sabe cuántas hojas tiene el cuadernillo.
  return { ok: true, doc: { paper, lang, pages: stamped(pages) }, capacity: { columns: grid.columns, perPage: grid.perPage, pages: pageCount } };
}
