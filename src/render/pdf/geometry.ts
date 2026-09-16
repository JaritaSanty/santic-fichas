/**
 * Geometría pura del renderizador PDF: traduce primitivas en mm (origen arriba a la izquierda,
 * eje y hacia abajo, igual que `@/core/sheet`) a puntos PDF. Sin dependencias de pdf-lib para
 * poder probar la conversión numéricamente y garantizar paridad con `render/svg`.
 */

const MM_TO_PT = 72 / 25.4;
const CAPSULE_ARC_SEGMENTS = 12;
const CORNER_ARC_SEGMENTS = 6;

export function mmToPt(mm: number): number {
  return mm * MM_TO_PT;
}

/** Caja de un rectángulo en puntos PDF (origen abajo a la izquierda). */
export function rectBoxPt(
  p: { x: number; y: number; w: number; h: number },
  pageHeightPt: number,
): { x: number; y: number; width: number; height: number } {
  return {
    x: mmToPt(p.x),
    y: pageHeightPt - mmToPt(p.y + p.h),
    width: mmToPt(p.w),
    height: mmToPt(p.h),
  };
}

/** Extremos de una línea en puntos PDF (origen abajo a la izquierda). */
export function linePointsPt(
  p: { x1: number; y1: number; x2: number; y2: number },
  pageHeightPt: number,
): { start: { x: number; y: number }; end: { x: number; y: number } } {
  return {
    start: { x: mmToPt(p.x1), y: pageHeightPt - mmToPt(p.y1) },
    end: { x: mmToPt(p.x2), y: pageHeightPt - mmToPt(p.y2) },
  };
}

/** Ajuste «meet»: la imagen se centra en la caja y se escala al mayor tamaño que cabe manteniendo su proporción. */
export function imageBoxMm(
  box: { x: number; y: number; w: number; h: number },
  imageRatio: number,
): { x: number; y: number; w: number; h: number } {
  const w = Math.min(box.w, box.h * imageRatio);
  const h = w / imageRatio;
  return {
    x: box.x + (box.w - w) / 2,
    y: box.y + (box.h - h) / 2,
    w,
    h,
  };
}

/**
 * Número de trazado en puntos con 3 decimales fijos y sin notación exponencial (el parser de rutas de pdf-lib no
 * entiende `1e-16`, que aparece por errores de coma flotante en coordenadas nulas). 0.001 pt ≈ 0.0004 mm.
 */
export function formatPathNumber(n: number): string {
  const rounded = Math.round(n * 1000) / 1000;
  return Object.is(rounded, -0) ? '0' : rounded.toFixed(3).replace(/\.?0+$/, '');
}

function pathFromPoints(points: ReadonlyArray<readonly [number, number]>): string {
  return `${points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${formatPathNumber(mmToPt(x))} ${formatPathNumber(mmToPt(y))}`).join(' ')} Z`;
}

/** Contorno de una cápsula girada en puntos, con el eje y hacia abajo (convención de drawSvgPath). */
export function capsulePathPt(cx: number, cy: number, length: number, width: number, angleDeg: number): string {
  const r = width / 2;
  const half = Math.max(0, length / 2 - r);
  const a = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const points: Array<[number, number]> = [];
  for (let i = 0; i <= CAPSULE_ARC_SEGMENTS; i++) {
    const t = -Math.PI / 2 + (Math.PI * i) / CAPSULE_ARC_SEGMENTS;
    points.push([half + r * Math.cos(t), r * Math.sin(t)]);
  }
  for (let i = 0; i <= CAPSULE_ARC_SEGMENTS; i++) {
    const t = Math.PI / 2 + (Math.PI * i) / CAPSULE_ARC_SEGMENTS;
    points.push([-half + r * Math.cos(t), r * Math.sin(t)]);
  }
  return pathFromPoints(points.map(([x, y]) => [cx + x * cos - y * sin, cy + x * sin + y * cos]));
}

/** Contorno de un rectángulo de esquinas redondeadas en puntos, mismo eje y que capsulePathPt. */
export function roundedRectPathPt(x: number, y: number, w: number, h: number, radius: number): string {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  if (r === 0) {
    return pathFromPoints([
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h],
    ]);
  }
  const corner = (ccx: number, ccy: number, startAngle: number): Array<[number, number]> => {
    const out: Array<[number, number]> = [];
    for (let i = 1; i <= CORNER_ARC_SEGMENTS; i++) {
      const t = startAngle + (Math.PI / 2) * (i / CORNER_ARC_SEGMENTS);
      out.push([ccx + r * Math.cos(t), ccy + r * Math.sin(t)]);
    }
    return out;
  };
  const points: Array<[number, number]> = [
    [x + r, y],
    [x + w - r, y],
    ...corner(x + w - r, y + r, -Math.PI / 2),
    [x + w, y + h - r],
    ...corner(x + w - r, y + h - r, 0),
    [x + r, y + h],
    ...corner(x + r, y + h - r, Math.PI / 2),
    [x, y + r],
    ...corner(x + r, y + r, Math.PI),
  ];
  return pathFromPoints(points);
}
