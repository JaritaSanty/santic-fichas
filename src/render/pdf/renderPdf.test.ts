import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { describe, expect, it } from 'vitest';
import { measureTextMm } from '@/core/measure';
import type { SheetDocument } from '@/core/sheet';
import { renderPdf, type PdfAssets } from './renderPdf';

const require = createRequire(import.meta.url);
const assets: PdfAssets = {
  sheetRegular: new Uint8Array(readFileSync(require.resolve('@fontsource/andika/files/andika-latin-400-normal.woff'))),
  sheetBold: new Uint8Array(readFileSync(require.resolve('@fontsource/andika/files/andika-latin-700-normal.woff'))),
  brandMarkPng: new Uint8Array(readFileSync('public/brand/mark-gray.png')),
};
const MM_TO_PT = 72 / 25.4;

const doc: SheetDocument = {
  paper: 'a4',
  lang: 'es',
  pages: [
    {
      role: 'student',
      primitives: [
        { t: 'text', x: 105, y: 30, text: 'ÑANDÚ pingüino ¿Qué? Nº 5 — «años»', size: 7, font: 'sheetBold', align: 'middle', tone: 'ink' },
        { t: 'text', x: 20, y: 50, text: 'Centro', size: 3.5, font: 'sheet', align: 'start', tone: 'muted' },
        { t: 'rect', x: 20, y: 60, w: 100, h: 100, stroke: 'ink', strokeWidth: 0.4 },
        { t: 'line', x1: 20, y1: 170, x2: 190, y2: 170, stroke: 'faint', strokeWidth: 0.3, dash: [1, 0.5] },
        { t: 'image', id: 'brandMark', x: 12, y: 280, w: 5.6, h: 5 },
      ],
    },
    {
      role: 'solution',
      primitives: [{ t: 'capsule', cx: 70, cy: 110, length: 60, width: 8, angleDeg: 45, stroke: 'muted', strokeWidth: 0.35 }],
    },
  ],
};

async function open(bytes: Uint8Array) {
  return getDocument({ data: new Uint8Array(bytes), verbosity: 0 }).promise;
}

describe('renderPdf', () => {
  it('genera una página por página del documento con tamaño físico', async () => {
    const pdf = await open(await renderPdf(doc, assets));
    expect(pdf.numPages).toBe(2);
    const [, , w, h] = (await pdf.getPage(1)).view;
    expect(w).toBeCloseTo(210 * MM_TO_PT, 1);
    expect(h).toBeCloseTo(297 * MM_TO_PT, 1);
  });

  it('extrae tildes, eñes y signos sin sustituciones', async () => {
    const pdf = await open(await renderPdf(doc, assets));
    const text = (await (await pdf.getPage(1)).getTextContent()).items.map((i) => ('str' in i ? i.str : '')).join('|');
    expect(text).toContain('ÑANDÚ pingüino ¿Qué? Nº 5 — «años»');
    expect(text).toContain('Centro');
  });

  it('incrusta la tipografía como TrueType con subconjunto', async () => {
    const raw = Buffer.from(await renderPdf(doc, assets)).toString('latin1');
    expect(raw).toContain('/FontFile2');
    expect(raw.match(/\/FontFile2/g)!.length).toBe(2);
  });

  it('centra el texto con las mismas métricas que la maquetación', async () => {
    const pdf = await open(await renderPdf(doc, assets));
    const item = (await (await pdf.getPage(1)).getTextContent()).items.find((i) => 'str' in i && i.str.startsWith('ÑANDÚ'));
    const expectedLeftMm = 105 - measureTextMm('ÑANDÚ pingüino ¿Qué? Nº 5 — «años»', 'sheetBold', 7) / 2;
    expect(item && 'transform' in item ? item.transform[4] : NaN).toBeCloseTo(expectedLeftMm * MM_TO_PT, 0);
  });
});
