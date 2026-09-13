import { BRAND_DOMAIN, BRAND_MARK_ASPECT } from '@/core/brand';
import { fitTextToWidth, stripUnsupportedSheetChars, type FittedText } from '@/core/measure';
import { PAPER, SHEET_MARGIN_MM, type PaperSize } from '@/core/paper';
import type { Primitive } from '@/core/sheet';

export interface SheetHeader { title: string; school: string }
export interface FrameLabels { name: string; date: string; solutions: string }
export interface ContentBox { x: number; y: number; w: number; h: number }
export interface Frame { primitives: Primitive[]; content: ContentBox }

export const HEADER_LIMITS = { title: 80, school: 80 } as const;

// Geometría del marco en mm, relativa al margen superior o inferior.
const TITLE_BASELINE = 7;
const TITLE_SIZE = 7;
const SCHOOL_BASELINE = 13;
const SCHOOL_SIZE = 3.5;
const STUDENT_BASELINE = 23;
const LABEL_SIZE = 3.5;
const HEADER_RULE = 28;
const CONTENT_TOP = 32;
const FOOTER_RULE = 8;
const FOOTER_GAP = 2;
const MARK_HEIGHT = 5;
const FOOTER_TEXT_SIZE = 2.5; // ≈ 7 pt

// Ajuste por ancho medido con las métricas de Andika (Anexo C de Fase 1).
const TITLE_MIN_SIZE = 4.5;
const SCHOOL_MIN_SIZE = 2.8;

export interface HeaderFit {
  title: FittedText;
  school: FittedText;
}

const clip = (text: string, limit: number) => stripUnsupportedSheetChars(Array.from(text.trim()).slice(0, limit).join(''));

export function fitHeader(input: { paper: PaperSize; header: SheetHeader; labels: FrameLabels; role: 'student' | 'solution' }): HeaderFit {
  const { widthMm: W } = PAPER[input.paper];
  const maxWidth = W - 2 * SHEET_MARGIN_MM;
  const title = clip(input.header.title, HEADER_LIMITS.title);
  const shownTitle = input.role === 'solution' ? [title, input.labels.solutions].filter(Boolean).join(' — ') : title;
  return {
    title: fitTextToWidth(shownTitle, 'sheetBold', TITLE_SIZE, TITLE_MIN_SIZE, maxWidth),
    school: fitTextToWidth(clip(input.header.school, HEADER_LIMITS.school), 'sheet', SCHOOL_SIZE, SCHOOL_MIN_SIZE, maxWidth),
  };
}

export function buildFrame(input: {
  paper: PaperSize;
  header: SheetHeader;
  labels: FrameLabels;
  role: 'student' | 'solution';
}): Frame {
  const { widthMm: W, heightMm: H } = PAPER[input.paper];
  const m = SHEET_MARGIN_MM;
  const primitives: Primitive[] = [];

  const fit = fitHeader(input);
  if (fit.title.text) {
    primitives.push({ t: 'text', x: W / 2, y: m + TITLE_BASELINE, text: fit.title.text, size: fit.title.size, font: 'sheetBold', align: 'middle', tone: 'ink' });
  }
  if (fit.school.text) {
    primitives.push({ t: 'text', x: W / 2, y: m + SCHOOL_BASELINE, text: fit.school.text, size: fit.school.size, font: 'sheet', align: 'middle', tone: 'muted' });
  }

  if (input.role === 'student') {
    const y = m + STUDENT_BASELINE;
    primitives.push(
      { t: 'text', x: m, y, text: `${input.labels.name}:`, size: LABEL_SIZE, font: 'sheet', align: 'start', tone: 'ink' },
      { t: 'line', x1: m + 22, y1: y + 0.8, x2: W - m - 60, y2: y + 0.8, stroke: 'ink', strokeWidth: 0.2 },
      { t: 'text', x: W - m - 55, y, text: `${input.labels.date}:`, size: LABEL_SIZE, font: 'sheet', align: 'start', tone: 'ink' },
      { t: 'line', x1: W - m - 40, y1: y + 0.8, x2: W - m, y2: y + 0.8, stroke: 'ink', strokeWidth: 0.2 },
    );
  }

  primitives.push({ t: 'line', x1: m, y1: m + HEADER_RULE, x2: W - m, y2: m + HEADER_RULE, stroke: 'faint', strokeWidth: 0.3 });

  const footerRuleY = H - m - FOOTER_RULE;
  const markW = MARK_HEIGHT * BRAND_MARK_ASPECT;
  primitives.push(
    { t: 'line', x1: m, y1: footerRuleY, x2: W - m, y2: footerRuleY, stroke: 'faint', strokeWidth: 0.2 },
    { t: 'image', id: 'brandMark', x: m, y: H - m - MARK_HEIGHT - 0.5, w: markW, h: MARK_HEIGHT },
    { t: 'text', x: m + markW + FOOTER_GAP, y: H - m - 1.8, text: BRAND_DOMAIN, size: FOOTER_TEXT_SIZE, font: 'sheet', align: 'start', tone: 'muted' },
  );

  const contentTop = m + CONTENT_TOP;
  const contentBottom = footerRuleY - FOOTER_GAP;
  return {
    primitives,
    content: { x: m, y: contentTop, w: W - 2 * m, h: contentBottom - contentTop },
  };
}
