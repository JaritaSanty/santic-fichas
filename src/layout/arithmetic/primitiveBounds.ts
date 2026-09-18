import { capHeightMm, measureTextMm } from '@/core/measure';
import type { FontId, Primitive } from '@/core/sheet';
import { SHEET_FONT_METRICS } from '@/core/sheetFontMetrics';

/**
 * Esquinas en milímetros de la tinta de una primitiva. Lo usan las pruebas de geometría de este módulo
 * (`blocks.test.ts` y `layoutArithmetic.test.ts`) para comprobar que nada se sale de la caja del bloque ni de la
 * caja de contenido de la hoja.
 *
 * La cota es generosa por los dos lados: el texto va de la altura de mayúscula sobre la línea base hasta el
 * descendente de la tipografía cuando el texto lleva algún carácter que baja (en la ficha, solo el paréntesis del
 * índice; cifras, signos y `=` se apoyan en la base), y las rayas se ensanchan medio grosor a cada lado, en
 * perpendicular a su trazado.
 */
const DESCENDING = /[()[\]{}gjpqy,;]/;

function descentMm(text: string, font: FontId, sizeMm: number): number {
  if (!DESCENDING.test(text)) return 0;
  const m = SHEET_FONT_METRICS[font];
  return (-m.descent / m.unitsPerEm) * sizeMm;
}

export function corners(p: Primitive): Array<[number, number]> {
  switch (p.t) {
    case 'text': {
      const w = measureTextMm(p.text, p.font, p.size);
      const left = p.align === 'middle' ? p.x - w / 2 : p.align === 'end' ? p.x - w : p.x;
      return [
        [left, p.y - capHeightMm(p.font, p.size)],
        [left + w, p.y + descentMm(p.text, p.font, p.size)],
      ];
    }
    case 'rect': {
      const half = (p.stroke ? (p.strokeWidth ?? 0.2) : 0) / 2;
      return [[p.x - half, p.y - half], [p.x + p.w + half, p.y + p.h + half]];
    }
    case 'line': {
      // El trazo se ensancha en perpendicular; en una diagonal se ensancha por los dos ejes (cota holgada).
      const halfX = p.y1 === p.y2 ? 0 : p.strokeWidth / 2;
      const halfY = p.x1 === p.x2 ? 0 : p.strokeWidth / 2;
      return [
        [Math.min(p.x1, p.x2) - halfX, Math.min(p.y1, p.y2) - halfY],
        [Math.max(p.x1, p.x2) + halfX, Math.max(p.y1, p.y2) + halfY],
      ];
    }
    case 'capsule': {
      const half = p.length / 2 + p.strokeWidth / 2;
      const across = p.width / 2 + p.strokeWidth / 2;
      return [[p.cx - half, p.cy - across], [p.cx + half, p.cy + across]];
    }
    case 'image': return [[p.x, p.y], [p.x + p.w, p.y + p.h]];
  }
}
