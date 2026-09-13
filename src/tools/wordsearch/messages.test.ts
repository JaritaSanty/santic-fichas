import { describe, expect, it } from 'vitest';
import { getDictionary } from '@/i18n/dictionary';
import { describeError, describeRejected, describeSuggestion, describeWarning } from './messages';

const es = getDictionary('es').wordsearch;
const en = getDictionary('en').wordsearch;

describe('mensajes de la sopa de letras', () => {
  it('errores bloqueantes con datos concretos', () => {
    expect(describeError({ code: 'too-many-words', count: 51, max: 50 }, es)).toBe('Hay 51 palabras; el máximo es 50.');
    expect(describeError({ code: 'word-too-long', line: 1, word: 'Mariposas', length: 9 }, es)).toBe('«Mariposas» tiene 9 letras: la cuadrícula debe medir al menos 9.');
    expect(describeError({ code: 'word-too-long', line: 1, word: 'Electroencefalografista', length: 27 }, es)).toBe('«Electroencefalografista» tiene 27 letras y no cabe en la cuadrícula máxima de 25.');
    expect(describeError({ code: 'no-direction' }, en)).toBe('At least one direction is needed: horizontal, vertical or diagonal.');
  });

  it('líneas rechazadas y avisos', () => {
    expect(describeRejected({ code: 'unsupported-glyph', line: 3, chars: ['ő'] }, es)).toBe('Línea 3: la tipografía de la ficha no incluye «ő».');
    expect(describeWarning({ code: 'duplicate', line: 4, duplicateOf: 1 }, es)).toBe('Línea 4: palabra repetida (igual que la línea 1); se ignora.');
    expect(describeWarning({ code: 'large-list', suggestedSize: 19 }, en)).toBe('For this list a grid of 19 or more is recommended.');
  });

  it('sugerencias', () => {
    expect(describeSuggestion({ code: 'increase-size', size: 14 }, es)).toBe('Aumentar la cuadrícula a 14.');
    expect(describeSuggestion({ code: 'remove-words', words: ['rinoceronte', 'hipopótamo'] }, es)).toBe('Retirar las más largas: rinoceronte, hipopótamo.');
  });

  it('ningún texto en español usa tuteo ni usted', () => {
    const all = JSON.stringify(getDictionary('es'));
    expect(all).not.toMatch(/\b(tu|tus|usted|activa|elige|escribe|descarga tu)\b/i);
  });
});
