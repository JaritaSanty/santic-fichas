import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import fontkit from '@pdf-lib/fontkit';
import { describe, expect, it } from 'vitest';
import { capHeightMm, ELLIPSIS, fitTextToWidth, measureTextMm, stripUnsupportedSheetChars, unsupportedSheetChars } from './measure';

const require = createRequire(import.meta.url);
const FILES = {
  sheet: '@fontsource/andika/files/andika-latin-400-normal.woff',
  sheetBold: '@fontsource/andika/files/andika-latin-700-normal.woff',
} as const;

describe('measureTextMm', () => {
  for (const [id, spec] of Object.entries(FILES) as ['sheet' | 'sheetBold', string][]) {
    it(`coincide con fontkit para ${id}`, () => {
      const font = fontkit.create(readFileSync(require.resolve(spec)));
      for (const text of ['ÑANDÚ pingüino', 'Sopa de letras — Soluciones', 'AVATAR To Wä', '¿Qué? Nº 5']) {
        const expected = (font.layout(text).advanceWidth / font.unitsPerEm) * 7;
        expect(measureTextMm(text, id, 7)).toBeCloseTo(expected, 6);
      }
    });
  }

  it('escala linealmente con el tamaño', () => {
    expect(measureTextMm('GATO', 'sheet', 10)).toBeCloseTo(measureTextMm('GATO', 'sheet', 5) * 2, 9);
  });
});

describe('glifos disponibles', () => {
  it('detecta caracteres sin glifo en la tipografía de ficha', () => {
    expect(unsupportedSheetChars('ñandú pingüino ¿Qué? Nº — «»')).toEqual([]);
    expect(unsupportedSheetChars('Łódź')).toEqual(['Ł', 'ź']);
    expect(stripUnsupportedSheetChars('Łódź')).toBe('ód');
  });

  it('la elipsis elegida existe en la tipografía', () => {
    expect(unsupportedSheetChars(ELLIPSIS)).toEqual([]);
  });
});

describe('capHeightMm', () => {
  it('usa la altura de mayúsculas de la fuente', () => {
    expect(capHeightMm('sheet', 10)).toBeCloseTo((1485 / 2048) * 10, 3);
  });
});

describe('fitTextToWidth', () => {
  it('conserva tamaño y texto si caben', () => {
    expect(fitTextToWidth('Gato', 'sheetBold', 7, 4.5, 100)).toEqual({ text: 'Gato', size: 7, truncated: false });
  });

  it('reduce el cuerpo sin bajar del mínimo', () => {
    const text = 'Los animales de la granja y del bosque';
    const max = measureTextMm(text, 'sheetBold', 7) * 0.8;
    const fitted = fitTextToWidth(text, 'sheetBold', 7, 4.5, max);
    expect(fitted.truncated).toBe(false);
    expect(fitted.size).toBeCloseTo(5.6, 6);
    expect(measureTextMm(fitted.text, 'sheetBold', fitted.size)).toBeLessThanOrEqual(max + 1e-9);
  });

  it('acorta con elipsis cuando ni el mínimo cabe', () => {
    const fitted = fitTextToWidth('W'.repeat(120), 'sheetBold', 7, 4.5, 186);
    expect(fitted.truncated).toBe(true);
    expect(fitted.size).toBe(4.5);
    expect(fitted.text.endsWith(ELLIPSIS)).toBe(true);
    expect(measureTextMm(fitted.text, 'sheetBold', 4.5)).toBeLessThanOrEqual(186);
  });
});
