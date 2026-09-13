import type { FontId } from '@/core/sheet';
import { SHEET_FONT_METRICS } from '@/core/sheetFontMetrics';

interface FontMetrics {
  unitsPerEm: number;
  ascent: number;
  descent: number;
  capHeight: number;
  advances: Readonly<Record<number, number>>;
}

const METRICS: Record<FontId, FontMetrics> = SHEET_FONT_METRICS;
const QUESTION_MARK = 63;

const hasGlyph = (cp: number) => METRICS.sheet.advances[cp] !== undefined && METRICS.sheetBold.advances[cp] !== undefined;

/** Caracteres (sin repetir) que la tipografía de ficha no puede dibujar. */
export function unsupportedSheetChars(text: string): string[] {
  const out = new Set<string>();
  for (const ch of text) if (!hasGlyph(ch.codePointAt(0) as number)) out.add(ch);
  return [...out];
}

export function stripUnsupportedSheetChars(text: string): string {
  return Array.from(text)
    .filter((ch) => hasGlyph(ch.codePointAt(0) as number))
    .join('');
}

export const ELLIPSIS = hasGlyph(0x2026) ? '…' : '...';

/** Ancho en mm con la suma de avances (Andika no tiene kerning; SVG y PDF lo desactivan). */
export function measureTextMm(text: string, font: FontId, sizeMm: number): number {
  const m = METRICS[font];
  let units = 0;
  for (const ch of text) units += m.advances[ch.codePointAt(0) as number] ?? m.advances[QUESTION_MARK] ?? m.unitsPerEm / 2;
  return (units / m.unitsPerEm) * sizeMm;
}

export function capHeightMm(font: FontId, sizeMm: number): number {
  const m = METRICS[font];
  return (m.capHeight / m.unitsPerEm) * sizeMm;
}

export interface FittedText {
  text: string;
  size: number;
  truncated: boolean;
}

export function fitTextToWidth(text: string, font: FontId, preferredSize: number, minSize: number, maxWidth: number): FittedText {
  const width = measureTextMm(text, font, preferredSize);
  if (width <= maxWidth) return { text, size: preferredSize, truncated: false };
  const scaled = preferredSize * (maxWidth / width);
  if (scaled >= minSize) return { text, size: scaled, truncated: false };
  const chars = Array.from(text);
  while (chars.length > 0 && measureTextMm(`${chars.join('').trimEnd()}${ELLIPSIS}`, font, minSize) > maxWidth) chars.pop();
  return { text: `${chars.join('').trimEnd()}${ELLIPSIS}`, size: minSize, truncated: true };
}
