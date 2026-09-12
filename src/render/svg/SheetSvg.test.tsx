import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { SheetPage } from '@/core/sheet';
import { SheetSvg } from './SheetSvg';

const page: SheetPage = {
  role: 'student',
  primitives: [
    { t: 'text', x: 105, y: 20, text: 'Ñandú & <b>', size: 7, font: 'sheetBold', align: 'middle', tone: 'ink' },
    { t: 'rect', x: 10, y: 10, w: 20, h: 5, stroke: 'muted', strokeWidth: 0.3, radius: 1 },
    { t: 'line', x1: 0, y1: 1, x2: 5, y2: 1, stroke: 'faint', strokeWidth: 0.2, dash: [1, 0.5] },
    { t: 'capsule', cx: 50, cy: 60, length: 40, width: 6, angleDeg: 45, stroke: 'ink', strokeWidth: 0.4 },
    { t: 'image', id: 'brandMark', x: 12, y: 280, w: 5, h: 5 },
  ],
};

const render = (sizing: 'fluid' | 'physical', paper: 'a4' | 'letter' = 'a4') =>
  renderToStaticMarkup(<SheetSvg paper={paper} page={page} sizing={sizing} label="Ficha" />);

describe('SheetSvg', () => {
  it('usa el tamaño físico del papel en milímetros', () => {
    const html = render('physical');
    expect(html).toContain('viewBox="0 0 210 297"');
    expect(html).toContain('width="210mm"');
    expect(html).toContain('height="297mm"');
    expect(render('physical', 'letter')).toContain('viewBox="0 0 215.9 279.4"');
  });

  it('en modo fluido ocupa el ancho disponible', () => {
    const html = render('fluid');
    expect(html).toContain('width="100%"');
    expect(html).not.toContain('297mm');
  });

  it('escapa el texto y conserva tildes y eñes', () => {
    const html = render('fluid');
    expect(html).toContain('Ñandú &amp; &lt;b&gt;');
    expect(html).toContain('text-anchor="middle"');
    expect(html).toContain('font-weight="700"');
    expect(html).toContain('font-family:var(--font-sheet)');
  });

  it('dibuja cápsulas giradas, líneas discontinuas e isotipo', () => {
    const html = render('fluid');
    expect(html).toContain('transform="rotate(45 50 60)"');
    expect(html).toContain('stroke-dasharray="1 0.5"');
    expect(html).toContain('href="/brand/mark-gray.svg"');
  });

  it('expone una etiqueta accesible', () => {
    expect(render('fluid')).toMatch(/role="img"[^>]*aria-label="Ficha"|aria-label="Ficha"[^>]*role="img"/);
  });
});
