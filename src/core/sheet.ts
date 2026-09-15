import type { Lang } from '@/core/lang';
import type { PaperSize } from '@/core/paper';

export type FontId = 'sheet' | 'sheetBold';
export type Tone = 'ink' | 'muted' | 'faint' | 'paper';
export type TextAlign = 'start' | 'middle' | 'end';

/** Escala de grises compartida por los renderizadores SVG y PDF. */
export const TONE_HEX: Record<Tone, string> = {
  ink: '#000000',
  muted: '#4d4d4d',
  faint: '#b3b3b3',
  paper: '#ffffff',
};

export const PT_TO_MM = 25.4 / 72;

/** Grosor de trazo (mm) de un `rect` con `stroke` sin `strokeWidth`; lo aplican igual los renderizadores SVG y PDF. */
export const DEFAULT_STROKE_WIDTH_MM = 0.2;

/**
 * Primitivas en milímetros, origen arriba a la izquierda.
 * En `text`, `y` es la línea base y `size` el cuerpo tipográfico en mm.
 */
export type Primitive =
  | { t: 'text'; x: number; y: number; text: string; size: number; font: FontId; align: TextAlign; tone: Tone }
  | { t: 'rect'; x: number; y: number; w: number; h: number; stroke?: Tone; fill?: Tone; strokeWidth?: number; radius?: number }
  | { t: 'line'; x1: number; y1: number; x2: number; y2: number; stroke: Tone; strokeWidth: number; dash?: number[] }
  | { t: 'capsule'; cx: number; cy: number; length: number; width: number; angleDeg: number; stroke: Tone; strokeWidth: number }
  | { t: 'image'; id: 'brandMark'; x: number; y: number; w: number; h: number };

export interface SheetPage {
  role: 'student' | 'solution';
  primitives: Primitive[];
}

export interface SheetDocument {
  paper: PaperSize;
  lang: Lang;
  pages: SheetPage[];
}
