import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib';
import { measureTextMm } from '@/core/measure';
import { PAPER } from '@/core/paper';
import { TONE_HEX, type Primitive, type SheetDocument, type Tone } from '@/core/sheet';

export interface PdfAssets {
  sheetRegular: Uint8Array;
  sheetBold: Uint8Array;
  brandMarkPng: Uint8Array;
}

const MM_TO_PT = 72 / 25.4;
const pt = (mm: number) => mm * MM_TO_PT;
const ARC_SEGMENTS = 12;

function color(tone: Tone) {
  const n = Number.parseInt(TONE_HEX[tone].slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

/** Contorno de una cápsula girada en puntos, con el eje y hacia abajo (convención de drawSvgPath). */
function capsulePath(cx: number, cy: number, length: number, width: number, angleDeg: number): string {
  const r = width / 2;
  const half = Math.max(0, length / 2 - r);
  const a = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const points: Array<[number, number]> = [];
  for (let i = 0; i <= ARC_SEGMENTS; i++) {
    const t = -Math.PI / 2 + (Math.PI * i) / ARC_SEGMENTS;
    points.push([half + r * Math.cos(t), r * Math.sin(t)]);
  }
  for (let i = 0; i <= ARC_SEGMENTS; i++) {
    const t = Math.PI / 2 + (Math.PI * i) / ARC_SEGMENTS;
    points.push([-half + r * Math.cos(t), r * Math.sin(t)]);
  }
  return `${points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${pt(cx + x * cos - y * sin).toFixed(3)} ${pt(cy + x * sin + y * cos).toFixed(3)}`)
    .join(' ')} Z`;
}

function drawPrimitive(page: PDFPage, p: Primitive, pageHeightPt: number, fonts: { regular: PDFFont; bold: PDFFont }, brandMark: PDFImage) {
  switch (p.t) {
    case 'text': {
      const width = measureTextMm(p.text, p.font, p.size);
      const left = p.align === 'middle' ? p.x - width / 2 : p.align === 'end' ? p.x - width : p.x;
      page.drawText(p.text, { x: pt(left), y: pageHeightPt - pt(p.y), size: pt(p.size), font: p.font === 'sheetBold' ? fonts.bold : fonts.regular, color: color(p.tone) });
      return;
    }
    case 'rect':
      page.drawRectangle({
        x: pt(p.x),
        y: pageHeightPt - pt(p.y + p.h),
        width: pt(p.w),
        height: pt(p.h),
        borderColor: p.stroke ? color(p.stroke) : undefined,
        borderWidth: p.stroke ? pt(p.strokeWidth ?? 0.2) : 0,
        color: p.fill ? color(p.fill) : undefined,
      });
      return;
    case 'line':
      page.drawLine({
        start: { x: pt(p.x1), y: pageHeightPt - pt(p.y1) },
        end: { x: pt(p.x2), y: pageHeightPt - pt(p.y2) },
        thickness: pt(p.strokeWidth),
        color: color(p.stroke),
        dashArray: p.dash?.map(pt),
      });
      return;
    case 'capsule':
      page.drawSvgPath(capsulePath(p.cx, p.cy, p.length, p.width, p.angleDeg), { x: 0, y: pageHeightPt, borderColor: color(p.stroke), borderWidth: pt(p.strokeWidth) });
      return;
    case 'image': {
      const ratio = brandMark.width / brandMark.height;
      const w = Math.min(p.w, p.h * ratio);
      const h = w / ratio;
      page.drawImage(brandMark, { x: pt(p.x + (p.w - w) / 2), y: pageHeightPt - pt(p.y + (p.h + h) / 2), width: pt(w), height: pt(h) });
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
  const heightPt = pt(heightMm);

  for (const sheetPage of doc.pages) {
    const page = pdf.addPage([pt(widthMm), heightPt]);
    for (const primitive of sheetPage.primitives) drawPrimitive(page, primitive, heightPt, fonts, brandMark);
  }
  // Sin flujos de objetos: el PDF sigue siendo inspeccionable y comprobable (FontFile2, /Count).
  return pdf.save({ useObjectStreams: false });
}
