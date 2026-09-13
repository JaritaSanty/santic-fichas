import { describe, expect, it } from 'vitest';
import { formatMessage } from './format';

describe('formatMessage', () => {
  it('sustituye marcadores y conserva los desconocidos', () => {
    expect(formatMessage('Hay {count} palabras; el máximo es {max}.', { count: 51, max: 50 })).toBe('Hay 51 palabras; el máximo es 50.');
    expect(formatMessage('«{word}» y {otra}', { word: 'ñandú' })).toBe('«ñandú» y {otra}');
  });
});
