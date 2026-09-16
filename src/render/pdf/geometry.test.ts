import { describe, expect, it } from 'vitest';
import { capsulePathPt, formatPathNumber, imageBoxMm, linePointsPt, mmToPt, rectBoxPt, roundedRectPathPt } from './geometry';

const MM_TO_PT = 72 / 25.4;
const A4_HEIGHT_PT = 297 * MM_TO_PT;

const NUM = String.raw`-?\d+(?:\.\d+)?(?:e[+-]?\d+)?`;
const POINT_RE = new RegExp(`[ML](${NUM}) (${NUM})`, 'g');

function parsePoints(path: string): Array<[number, number]> {
  return [...path.matchAll(POINT_RE)].map((m) => [Number(m[1]), Number(m[2])]);
}

describe('mmToPt', () => {
  it('convierte mm a puntos con el factor 72/25.4', () => {
    expect(mmToPt(25.4)).toBeCloseTo(72, 9);
    expect(mmToPt(0)).toBe(0);
  });
});

describe('rectBoxPt', () => {
  it('traslada un rectángulo A4 a coordenadas PDF con origen abajo a la izquierda', () => {
    const box = rectBoxPt({ x: 20, y: 60, w: 100, h: 100 }, A4_HEIGHT_PT);
    expect(box.x).toBeCloseTo(20 * MM_TO_PT, 9);
    expect(box.y).toBeCloseTo(A4_HEIGHT_PT - 160 * MM_TO_PT, 9);
    expect(box.width).toBeCloseTo(100 * MM_TO_PT, 9);
    expect(box.height).toBeCloseTo(100 * MM_TO_PT, 9);
  });
});

describe('linePointsPt', () => {
  it('invierte el eje y de inicio y fin, conservando el eje x', () => {
    const { start, end } = linePointsPt({ x1: 20, y1: 170, x2: 190, y2: 170 }, A4_HEIGHT_PT);
    expect(start.x).toBeCloseTo(20 * MM_TO_PT, 9);
    expect(start.y).toBeCloseTo(A4_HEIGHT_PT - 170 * MM_TO_PT, 9);
    expect(end.x).toBeCloseTo(190 * MM_TO_PT, 9);
    expect(end.y).toBeCloseTo(A4_HEIGHT_PT - 170 * MM_TO_PT, 9);
  });
});

describe('imageBoxMm', () => {
  const ratio = 676 / 600;

  it('centra horizontalmente y usa el alto completo cuando la caja es relativamente más ancha que la imagen', () => {
    const box = imageBoxMm({ x: 12, y: 280, w: 6, h: 5 }, ratio);
    expect(box.h).toBeCloseTo(5, 9);
    expect(box.w).toBeCloseTo(5 * ratio, 9);
    expect(box.y).toBeCloseTo(280, 9);
    expect(box.x).toBeCloseTo(12 + (6 - 5 * ratio) / 2, 9);
  });

  it('usa el ancho completo y centra verticalmente cuando la caja es relativamente más alta que la imagen (5.6×5 del brief)', () => {
    const box = imageBoxMm({ x: 12, y: 280, w: 5.6, h: 5 }, ratio);
    expect(box.w).toBeCloseTo(5.6, 9);
    expect(box.h).toBeCloseTo(5.6 / ratio, 9);
    expect(box.x).toBeCloseTo(12, 9);
    expect(box.y).toBeCloseTo(280 + (5 - 5.6 / ratio) / 2, 9);
  });
});

describe('capsulePathPt', () => {
  it('a 0°: el extremo x coincide con la mitad del largo y el extremo y con el radio', () => {
    const points = parsePoints(capsulePathPt(50, 50, 40, 10, 0));
    const xs = points.map(([x]) => x);
    const ys = points.map(([, y]) => y);
    expect(Math.max(...xs)).toBeCloseTo((50 + 20) * MM_TO_PT, 2);
    expect(Math.min(...xs)).toBeCloseTo((50 - 20) * MM_TO_PT, 2);
    expect(Math.max(...ys)).toBeCloseTo((50 + 5) * MM_TO_PT, 2);
    expect(Math.min(...ys)).toBeCloseTo((50 - 5) * MM_TO_PT, 2);
  });

  it('a 90°: los extremos de los ejes x e y se intercambian', () => {
    const points = parsePoints(capsulePathPt(50, 50, 40, 10, 90));
    const xs = points.map(([x]) => x);
    const ys = points.map(([, y]) => y);
    expect(Math.max(...xs)).toBeCloseTo((50 + 5) * MM_TO_PT, 2);
    expect(Math.min(...xs)).toBeCloseTo((50 - 5) * MM_TO_PT, 2);
    expect(Math.max(...ys)).toBeCloseTo((50 + 20) * MM_TO_PT, 2);
    expect(Math.min(...ys)).toBeCloseTo((50 - 20) * MM_TO_PT, 2);
  });

  it('a 45°: el primer punto (tapa derecha, t=-90°) apunta abajo-derecha, como rotate() de SVG', () => {
    const points = parsePoints(capsulePathPt(50, 50, 40, 10, 45));
    const [x0, y0] = points[0]!;
    const cos45 = Math.cos(Math.PI / 4);
    const sin45 = Math.sin(Math.PI / 4);
    const expectedX = (50 + 15 * cos45 + 5 * sin45) * MM_TO_PT;
    const expectedY = (50 + 15 * sin45 - 5 * cos45) * MM_TO_PT;
    expect(x0).toBeCloseTo(expectedX, 2);
    expect(y0).toBeCloseTo(expectedY, 2);
  });
});

describe('roundedRectPathPt', () => {
  it('mantiene todos los puntos dentro de la caja e incluye los puntos de unión de la esquina superior derecha', () => {
    const points = parsePoints(roundedRectPathPt(0, 0, 10, 10, 2));
    const maxPt = mmToPt(10);
    for (const [x, y] of points) {
      expect(x).toBeGreaterThanOrEqual(-1e-3);
      expect(x).toBeLessThanOrEqual(maxPt + 1e-3);
      expect(y).toBeGreaterThanOrEqual(-1e-3);
      expect(y).toBeLessThanOrEqual(maxPt + 1e-3);
    }
    const hasPoint = (px: number, py: number) => points.some(([x, y]) => Math.abs(x - px) < 1e-3 && Math.abs(y - py) < 1e-3);
    expect(hasPoint(mmToPt(2), 0)).toBe(true);
    expect(hasPoint(mmToPt(10), mmToPt(2))).toBe(true);
  });

  it('clampa el radio a min(radio, w/2, h/2)', () => {
    const points = parsePoints(roundedRectPathPt(0, 0, 10, 4, 10));
    const maxX = mmToPt(10);
    const maxY = mmToPt(4);
    for (const [x, y] of points) {
      expect(x).toBeGreaterThanOrEqual(-1e-3);
      expect(x).toBeLessThanOrEqual(maxX + 1e-3);
      expect(y).toBeGreaterThanOrEqual(-1e-3);
      expect(y).toBeLessThanOrEqual(maxY + 1e-3);
    }
  });
});

describe('formatPathNumber', () => {
  it('redondea a 3 decimales sin notación exponencial ni ceros sobrantes', () => {
    expect(formatPathNumber(1.2246467991473532e-16)).toBe('0');
    expect(formatPathNumber(-1e-16)).toBe('0');
    expect(formatPathNumber(12.3456)).toBe('12.346');
    expect(formatPathNumber(-5.5)).toBe('-5.5');
    expect(formatPathNumber(100)).toBe('100');
  });

  it('las rutas de rectángulos redondeados en el origen y de cápsulas no llevan exponentes', () => {
    for (const path of [roundedRectPathPt(0, 0, 10, 10, 2), roundedRectPathPt(0, 0, 10, 4, 0), capsulePathPt(0, 0, 40, 10, 90), capsulePathPt(50, 50, 40, 10, 45)]) {
      expect(path).not.toMatch(/e/i);
      expect(path).toMatch(/^M-?\d+(\.\d{1,3})? -?\d+(\.\d{1,3})?( L-?\d+(\.\d{1,3})? -?\d+(\.\d{1,3})?)* Z$/);
    }
  });
});
