import { describe, expect, it } from 'vitest';
import { defaultPaperFor, PAPER } from './paper';

describe('PAPER', () => {
  it('tiene las dimensiones físicas correctas', () => {
    expect(PAPER.a4).toEqual({ widthMm: 210, heightMm: 297, cssPageSize: 'A4' });
    expect(PAPER.letter).toEqual({ widthMm: 215.9, heightMm: 279.4, cssPageSize: 'letter' });
  });
});

describe('defaultPaperFor', () => {
  it.each([
    [['es-MX'], 'letter'],
    [['en-US'], 'letter'],
    [['es-CO', 'es'], 'letter'],
    [['es-ES'], 'a4'],
    [['es-419'], 'a4'],
    [['en'], 'a4'],
    [['es', 'en-US'], 'letter'],
    [[], 'a4'],
    [['no es un locale!!'], 'a4'],
  ] as const)('%j → %s', (locales, expected) => {
    expect(defaultPaperFor(locales)).toBe(expected);
  });
});
