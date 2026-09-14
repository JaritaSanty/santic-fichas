import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib';
import { measureTextMm } from '@/core/measure';
import { PAPER } from '@/core/paper';
import { TONE_HEX, type Primitive, type SheetDocument, type Tone } from '@/core/sheet';
import { capsulePathPt, imageBoxMm, linePointsPt, mmToPt, rectBoxPt, roundedRectPathPt } from './geometry';

export interface PdfAssets {
  sheetRegular: Uint8Array;
  sheetBold: Uint8Array;
  brandMarkPng: Uint8Array;
}

function color(tone: Tone) {
  const n = Number.parseInt(TONE_HEX[tone].slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

function drawPrimitive(page: PDFPage, p: Primitive, pageHeightPt: number, fonts: { regular: PDFFont; bold: PDFFont }, brandMark: PDFImage) {
  switch (p.t) {
    case 'text': {
      const width = measureTextMm(p.text, p.font, p.size);
      const left = p.align === 'middle' ? p.x - width / 2 : p.align === 'end' ? p.x - width : p.x;
      page.drawText(p.text, {
        x: mmToPt(left),
        y: pageHeightPt - mmToPt(p.y),
        size: mmToPt(p.size),
        font: p.font === 'sheetBold' ? fonts.bold : fonts.regular,
        color: color(p.tone),
      });
      return;
    }
    case 'rect': {
      if (p.radius && p.radius > 0) {
        page.drawSvgPath(roundedRectPathPt(p.x, p.y, p.w, p.h, p.radius), {
          x: 0,
          y: pageHeightPt,
          borderColor: p.stroke ? color(p.stroke) : undefined,
          borderWidth: p.stroke ? mmToPt(p.strokeWidth ?? 0.2) : undefined,
          color: p.fill ? color(p.fill) : undefined,
        });
        return;
      }
      const box = rectBoxPt(p, pageHeightPt);
      page.drawRectangle({
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        borderColor: p.stroke ? color(p.stroke) : undefined,
        borderWidth: p.stroke ? mmToPt(p.strokeWidth ?? 0.2) : 0,
        color: p.fill ? color(p.fill) : undefined,
      });
      return;
    }
    case 'line': {
      const { start, end } = linePointsPt(p, pageHeightPt);
      page.drawLine({ start, end, thickness: mmToPt(p.strokeWidth), color: color(p.stroke), dashArray: p.dash?.map(mmToPt) });
      return;
    }
    case 'capsule':
      page.drawSvgPath(capsulePathPt(p.cx, p.cy, p.length, p.width, p.angleDeg), {
        x: 0,
        y: pageHeightPt,
        borderColor: color(p.stroke),
        borderWidth: mmToPt(p.strokeWidth),
      });
      return;
    case 'image': {
      const ratio = brandMark.width / brandMark.height;
      const box = imageBoxMm(p, ratio);
      page.drawImage(brandMark, { x: mmToPt(box.x), y: pageHeightPt - mmToPt(box.y + box.h), width: mmToPt(box.w), height: mmToPt(box.h) });
      return;
    }
  }
}

export async function renderPdf(doc: SheetDocument, assets: PdfAssets): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  // WOFF con subconjunto: verificado en Fase 2 (WOFF2 con subconjunto rompe @pdf-lib/fontkit).
  const fonts = {
    regular: await pdf.embedFont(assets.sheetRegular, { subset: true }),
    bold: await pdf.embedFont(assets.sheetBold, { subset: true }),
  };
  const brandMark = await pdf.embedPng(assets.brandMarkPng);
  const { widthMm, heightMm } = PAPER[doc.paper];
  const heightPt = mmToPt(heightMm);

  for (const sheetPage of doc.pages) {
    const page = pdf.addPage([mmToPt(widthMm), heightPt]);
    for (const primitive of sheetPage.primitives) drawPrimitive(page, primitive, heightPt, fonts, brandMark);
  }
  // Sin flujos de objetos: el PDF sigue siendo inspeccionable y comprobable (FontFile2, /Count).
  return pdf.save({ useObjectStreams: false });
}
