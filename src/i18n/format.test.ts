import { describe, expect, it } from 'vitest';
import { formatMessage, formatPlural } from './format';

describe('formatMessage', () => {
  it('sustituye marcadores y conserva los desconocidos', () => {
    expect(formatMessage('Hay {count} palabras; el máximo es {max}.', { count: 51, max: 50 })).toBe('Hay 51 palabras; el máximo es 50.');
    expect(formatMessage('«{word}» y {otra}', { word: 'ñandú' })).toBe('«ñandú» y {otra}');
  });

  it('elige singular solo para 1', () => {
    const message = { one: 'No cabe 1 palabra:', other: 'No caben {count} palabras:' };
    expect(formatPlural(message, 1)).toBe('No cabe 1 palabra:');
    expect(formatPlural(message, 0)).toBe('No caben 0 palabras:');
    expect(formatPlural(message, 3)).toBe('No caben 3 palabras:');
    expect(formatPlural({ one: '1 word · {size}', other: '{count} words · {size}' }, 1, { size: 12 })).toBe('1 word · 12');
  });
});
