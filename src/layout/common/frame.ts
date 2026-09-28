import { BRAND_DOMAIN, BRAND_MARK_ASPECT } from '@/core/brand';
import { capHeightMm, ELLIPSIS, fitTextToWidth, measureTextMm, stripUnsupportedSheetChars, type FittedText } from '@/core/measure';
import { PAPER, SHEET_MARGIN_MM, type PaperSize } from '@/core/paper';
import type { Primitive, SheetPage } from '@/core/sheet';
import { collapseSpaces } from '@/core/text';

export interface SheetHeader { title: string; school: string }
export interface FrameLabels {
  name: string;
  date: string;
  /** Marca de rol de la hoja del docente; también acompaña al título de esa hoja. */
  solutions: string;
  /** Marca de rol de la hoja del alumno. */
  student: string;
  /** Nombre del papel tal como lo dice la interfaz: «A4» o «Carta». */
  paperName: string;
  /** Línea de datos del margen: plantilla con `{page}` y `{pages}`. */
  pageOf: string;
}
export interface ContentBox { x: number; y: number; w: number; h: number }
export interface Frame { primitives: Primitive[]; content: ContentBox }

/** Sitio de una hoja dentro del cuadernillo, para la marca de página. */
export interface PageStamp {
  /** Número de hoja, empezando en 1. */
  page: number;
  pages: number;
  /** Código de ficha; si viene vacío, la línea de datos no lo menciona. */
  code: string;
}

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

// Marca de página, en el margen: la línea de datos comparte la línea base del pie de marca, y la pestaña de rol
// cuelga del filete del encabezado sin llegar a la caja de contenido (`CONTENT_TOP`).
const STAMP_SEPARATOR = ' · ';
const TAG_HEIGHT = 3.4;
const TAG_PAD_X = 1.8;
const TAG_TEXT_SIZE = 2.5;
const TAG_STROKE = 0.2;

// Ajuste por ancho medido con las métricas de Andika (Anexo C de Fase 1).
const TITLE_MIN_SIZE = 4.5;
const SCHOOL_MIN_SIZE = 2.8;

export interface HeaderFit {
  title: FittedText;
  school: FittedText;
}

// Espacios en blanco colapsados (antes y después de quitar glifos ausentes): SVG los colapsa al pintar y el PDF no.
const clip = (text: string, limit: number) => Array.from(collapseSpaces(stripUnsupportedSheetChars(collapseSpaces(text)))).slice(0, limit).join('');

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

/**
 * Sustitución de `{page}` y `{pages}` sin pasar por `@/i18n`: `layout/common` solo puede depender de `core`, así que
 * la plantilla llega en `FrameLabels` y se rellena aquí.
 */
function fillPage(template: string, stamp: PageStamp): string {
  return template.replace('{page}', String(stamp.page)).replace('{pages}', String(stamp.pages));
}

/**
 * Recorte por **ancho medido**, no por número de caracteres: el código de ficha lo escribe el docente y uno muy largo
 * hacía una línea de datos de 183 mm que se imprimía encima del isotipo y del dominio. La hoja se mide, nunca se
 * calcula a ojo, así que la línea se corta donde acaba el sitio que deja el pie.
 */
function clipToWidth(text: string, sizeMm: number, maxWidth: number): string {
  if (measureTextMm(text, 'sheet', sizeMm) <= maxWidth) return text;
  const chars = Array.from(text);
  while (chars.length > 0 && measureTextMm(`${chars.join('').trimEnd()}${ELLIPSIS}`, 'sheet', sizeMm) > maxWidth) chars.pop();
  return chars.length === 0 ? '' : `${chars.join('').trimEnd()}${ELLIPSIS}`;
}

/**
 * Marca de página del marco: la línea de datos del margen inferior (`página n/N · papel · código`) y la pestaña de
 * rol colgada del filete del encabezado (alumno / soluciones).
 *
 * Es navegación de una pila de fotocopias: ocho hojas casi idénticas no dicen por sí solas cuál es cada una ni dónde
 * empiezan las soluciones. Va entera en los márgenes —ni un milímetro dentro de la caja de contenido—, en los grises
 * de la hoja y en su tipografía, para no competir con el ejercicio.
 */
export function stampPrimitives(input: { paper: PaperSize; labels: FrameLabels; role: 'student' | 'solution'; stamp: PageStamp }): Primitive[] {
  const { widthMm: W, heightMm: H } = PAPER[input.paper];
  const m = SHEET_MARGIN_MM;
  const { labels, stamp } = input;

  const parts = [fillPage(labels.pageOf, stamp), labels.paperName, ...(stamp.code ? [stamp.code] : [])];
  // Sitio libre del pie: lo que queda a la derecha del isotipo y el dominio, con un hueco entre los dos bloques.
  const footerEnd = m + MARK_HEIGHT * BRAND_MARK_ASPECT + FOOTER_GAP + measureTextMm(BRAND_DOMAIN, 'sheet', FOOTER_TEXT_SIZE);
  const dataLine = clipToWidth(clip(parts.join(STAMP_SEPARATOR), 120), FOOTER_TEXT_SIZE, W - m - footerEnd - 2 * FOOTER_GAP);

  const roleText = clip(input.role === 'solution' ? labels.solutions : labels.student, 40);
  const tagWidth = measureTextMm(roleText, 'sheet', TAG_TEXT_SIZE) + 2 * TAG_PAD_X;
  const tagTop = m + HEADER_RULE;
  // El borde derecho se mete medio trazo para que la tinta del filete quepa dentro del margen de impresión.
  const tagRight = W - m - TAG_STROKE / 2;

  const out: Primitive[] = [];
  if (roleText) {
    out.push(
      // La hoja del docente lleva la pestaña rellena: en una pila reducida a miniaturas es lo único que se ve desde
      // lejos, y es justo lo que hay que encontrar.
      input.role === 'solution'
        ? { t: 'rect', x: tagRight - tagWidth, y: tagTop, w: tagWidth, h: TAG_HEIGHT, fill: 'faint' }
        : { t: 'rect', x: tagRight - tagWidth, y: tagTop, w: tagWidth, h: TAG_HEIGHT, stroke: 'faint', strokeWidth: TAG_STROKE },
      {
        t: 'text',
        x: tagRight - TAG_PAD_X,
        y: tagTop + (TAG_HEIGHT + capHeightMm('sheet', TAG_TEXT_SIZE)) / 2,
        text: roleText,
        size: TAG_TEXT_SIZE,
        font: 'sheet',
        align: 'end',
        tone: input.role === 'solution' ? 'ink' : 'muted',
      },
    );
  }
  if (dataLine) {
    out.push({ t: 'text', x: W - m, y: H - m - 1.8, text: dataLine, size: FOOTER_TEXT_SIZE, font: 'sheet', align: 'end', tone: 'muted' });
  }
  return out;
}

/** Marca cada hoja del documento con su sitio en la pila; `pages` es el total, así que se aplica al final. */
export function stampPages(pages: SheetPage[], input: { paper: PaperSize; labels: FrameLabels; code: string }): SheetPage[] {
  return pages.map((page, i) => ({
    ...page,
    primitives: [
      ...page.primitives,
      ...stampPrimitives({ paper: input.paper, labels: input.labels, role: page.role, stamp: { page: i + 1, pages: pages.length, code: input.code } }),
    ],
  }));
}
