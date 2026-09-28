import { describe, expect, it } from 'vitest';
import { BRAND_DOMAIN } from '@/core/brand';
import { measureTextMm } from '@/core/measure';
import { PAPER, type PaperSize } from '@/core/paper';
import type { Primitive } from '@/core/sheet';
import { buildFrame, fitHeader, stampPages, stampPrimitives } from './frame';
import { corners } from './primitiveBounds';

const labels = { name: 'Nombre', date: 'Fecha', solutions: 'Soluciones', student: 'Alumno', paperName: 'A4', pageOf: 'Página {page}/{pages}' };
const header = { title: 'Los animales', school: 'Escuela Santa Ana' };

const texts = (ps: Primitive[]) => ps.flatMap((p) => (p.t === 'text' ? [p.text] : []));

function pointsOf(p: Primitive): Array<[number, number]> {
  switch (p.t) {
    case 'text': return [[p.x, p.y]];
    case 'rect': return [[p.x, p.y], [p.x + p.w, p.y + p.h]];
    case 'line': return [[p.x1, p.y1], [p.x2, p.y2]];
    case 'capsule': return [[p.cx, p.cy]];
    case 'image': return [[p.x, p.y], [p.x + p.w, p.y + p.h]];
  }
}

describe.each(['a4', 'letter'] as PaperSize[])('buildFrame en %s', (paper) => {
  const { widthMm, heightMm } = PAPER[paper];

  it('mantiene todas las primitivas dentro de los márgenes de impresión', () => {
    for (const role of ['student', 'solution'] as const) {
      const { primitives } = buildFrame({ paper, header, labels, role });
      for (const p of primitives) {
        for (const [x, y] of pointsOf(p)) {
          expect(x).toBeGreaterThanOrEqual(12);
          expect(x).toBeLessThanOrEqual(widthMm - 12);
          expect(y).toBeGreaterThanOrEqual(12);
          expect(y).toBeLessThanOrEqual(heightMm - 12);
        }
      }
    }
  });

  it('reserva una caja de contenido útil entre encabezado y pie', () => {
    const { content } = buildFrame({ paper, header, labels, role: 'student' });
    expect(content.x).toBe(12);
    expect(content.w).toBeCloseTo(widthMm - 24, 5);
    expect(content.y).toBeGreaterThan(30);
    expect(content.y + content.h).toBeLessThan(heightMm - 12 - 8);
    expect(content.h).toBeGreaterThan(200);
  });
});

describe('buildFrame contenido', () => {
  it('la hoja del alumno incluye título, centro, nombre, fecha y pie de marca', () => {
    const { primitives } = buildFrame({ paper: 'a4', header, labels, role: 'student' });
    expect(texts(primitives)).toEqual(expect.arrayContaining(['Los animales', 'Escuela Santa Ana', 'Nombre:', 'Fecha:', BRAND_DOMAIN]));
    expect(primitives.some((p) => p.t === 'image' && p.id === 'brandMark')).toBe(true);
  });

  it('la hoja de soluciones marca el título y no pide nombre ni fecha', () => {
    const { primitives } = buildFrame({ paper: 'a4', header, labels, role: 'solution' });
    const t = texts(primitives);
    expect(t).toContain('Los animales — Soluciones');
    expect(t).not.toContain('Nombre:');
    expect(t).not.toContain('Fecha:');
    expect(t).toContain(BRAND_DOMAIN);
  });

  it('omite título y centro vacíos sin mover la caja de contenido', () => {
    const full = buildFrame({ paper: 'a4', header, labels, role: 'student' });
    const empty = buildFrame({ paper: 'a4', header: { title: '  ', school: '' }, labels, role: 'student' });
    expect(texts(empty.primitives)).not.toContain('');
    expect(empty.content).toEqual(full.content);
  });

  it('colapsa espacios y tabuladores del encabezado para que SVG y PDF muestren lo mismo', () => {
    const frame = buildFrame({ paper: 'a4', header: { title: ' Los\tanimales   de  granja ', school: 'Escuela\u00A0 Santa Ana' }, labels, role: 'student' });
    expect(texts(frame.primitives)).toContain('Los animales de granja');
    expect(texts(frame.primitives)).toContain('Escuela Santa Ana');
  });

});

describe('marca de página', () => {
  const stamp = { page: 2, pages: 6, code: 'v1-ABC234' };
  const marks = (paper: PaperSize, role: 'student' | 'solution') => stampPrimitives({ paper, labels, role, stamp });

  it.each(['a4', 'letter'] as PaperSize[])('dice página, papel y código en el margen de %s', (paper) => {
    expect(texts(marks(paper, 'student'))).toContain('Página 2/6 · A4 · v1-ABC234');
  });

  it('sin código la línea de datos no lo menciona', () => {
    expect(texts(stampPrimitives({ paper: 'a4', labels, role: 'student', stamp: { page: 1, pages: 1, code: '' } }))).toContain('Página 1/1 · A4');
  });

  it('cada hoja lleva su rol: alumno con filete, soluciones con pastilla llena', () => {
    const student = marks('a4', 'student');
    const solution = marks('a4', 'solution');
    expect(texts(student)).toContain('Alumno');
    expect(texts(solution)).toContain('Soluciones');
    expect(student.some((p) => p.t === 'rect' && p.stroke === 'faint' && p.fill === undefined)).toBe(true);
    expect(solution.some((p) => p.t === 'rect' && p.fill === 'faint')).toBe(true);
  });

  it.each(['a4', 'letter'] as PaperSize[])('se queda en los márgenes y fuera de la caja de contenido en %s', (paper) => {
    const { widthMm, heightMm } = PAPER[paper];
    for (const role of ['student', 'solution'] as const) {
      const { content } = buildFrame({ paper, header, labels, role });
      for (const p of marks(paper, role)) {
        for (const [x, y] of corners(p)) {
          expect(x).toBeGreaterThanOrEqual(12 - 1e-6);
          expect(x).toBeLessThanOrEqual(widthMm - 12 + 1e-6);
          expect(y).toBeGreaterThanOrEqual(12 - 1e-6);
          expect(y).toBeLessThanOrEqual(heightMm - 12 + 1e-6);
          expect(y <= content.y + 1e-6 || y >= content.y + content.h - 1e-6).toBe(true);
        }
      }
    }
  });

  it.each(['a4', 'letter'] as PaperSize[])('la línea de datos no pisa la marca del pie en %s', (paper) => {
    const { primitives } = buildFrame({ paper, header, labels, role: 'student' });
    const domain = primitives.find((p): p is Extract<Primitive, { t: 'text' }> => p.t === 'text' && p.text === BRAND_DOMAIN);
    const data = marks(paper, 'student').find((p): p is Extract<Primitive, { t: 'text' }> => p.t === 'text' && p.text.startsWith('Página'));
    const footerEnd = domain!.x + measureTextMm(domain!.text, domain!.font, domain!.size);
    expect(data!.x - measureTextMm(data!.text, data!.font, data!.size)).toBeGreaterThan(footerEnd);
  });

  it('numera las hojas de un documento y deja el resto de primitivas intacto', () => {
    const page = (role: 'student' | 'solution') => ({ role, primitives: buildFrame({ paper: 'a4', header, labels, role }).primitives });
    const pages = stampPages([page('student'), page('student'), page('solution')], { paper: 'a4', labels, code: 'v1-ABC234' });
    expect(pages.map((p) => texts(p.primitives).find((t) => t.startsWith('Página')))).toEqual([
      'Página 1/3 · A4 · v1-ABC234',
      'Página 2/3 · A4 · v1-ABC234',
      'Página 3/3 · A4 · v1-ABC234',
    ]);
    expect(pages.map((p) => p.role)).toEqual(['student', 'student', 'solution']);
    expect(pages[0]!.primitives.slice(0, page('student').primitives.length)).toEqual(page('student').primitives);
  });
});

describe('encabezado ajustado por ancho', () => {
  const widthOf = (p: Primitive) => (p.t === 'text' ? measureTextMm(p.text, p.font, p.size) : 0);

  it.each(['a4', 'letter'] as const)('ningún texto del encabezado desborda la caja en %s', (paper) => {
    const long = 'Ñandúes y pingüinos del hemisferio sur en la granja escolar de invierno';
    for (const role of ['student', 'solution'] as const) {
      const { primitives, content } = buildFrame({ paper, header: { title: long, school: long }, labels, role });
      for (const p of primitives) {
        if (p.t !== 'text') continue;
        const left = p.align === 'middle' ? p.x - widthOf(p) / 2 : p.x;
        expect(left).toBeGreaterThanOrEqual(content.x - 1e-6);
        expect(left + widthOf(p)).toBeLessThanOrEqual(content.x + content.w + 1e-6);
      }
    }
  });

  it('reduce primero el cuerpo y solo acorta cuando no basta', () => {
    const medium = fitHeader({ paper: 'a4', header: { title: 'Vocabulario de los animales de la granja', school: '' }, labels, role: 'student' });
    expect(medium.title.truncated).toBe(false);
    const huge = fitHeader({ paper: 'a4', header: { title: 'W'.repeat(80), school: '' }, labels, role: 'student' });
    expect(huge.title.truncated).toBe(true);
    expect(huge.title.size).toBe(4.5);
  });

  it('respeta el límite de 80 puntos de código sin partir pares suplentes', () => {
    const fit = fitHeader({ paper: 'a4', header: { title: `${'a'.repeat(79)}😀x`, school: '' }, labels, role: 'student' });
    expect(fit.title.text).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/);
  });

  it('elimina de la hoja los caracteres sin glifo', () => {
    const { primitives } = buildFrame({ paper: 'a4', header: { title: 'Łódź', school: '' }, labels, role: 'student' });
    expect(texts(primitives)).toContain('ód');
  });
});
