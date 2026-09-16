import { describe, expect, it } from 'vitest';
import { getDictionary } from '@/i18n/dictionary';
import { formatPlural } from '@/i18n/format';
import { readSeedInput } from '@/generators/wordsearch';
import { describeError, describeRejected, describeSeed, describeSuggestion, describeWarning } from './messages';

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
    expect(describeWarning({ code: 'contained', line: 2, containerLine: 1, reversed: false }, es)).toBe('Línea 2: la palabra aparece dentro de la línea 1; la solución puede ser ambigua.');
    expect(describeWarning({ code: 'contained', line: 2, containerLine: 1, reversed: true }, en)).toBe('Line 2: the word appears backwards inside line 1; with reversed words the answer may be ambiguous.');
    expect(describeWarning({ code: 'large-list', suggestedSize: 19 }, en)).toBe('For this list a grid of 19 or more is recommended.');
  });

  it('sugerencias', () => {
    expect(describeSuggestion({ code: 'increase-size', size: 14 }, es)).toBe('Aumentar la cuadrícula a 14.');
    expect(describeSuggestion({ code: 'remove-words', words: ['rinoceronte', 'hipopótamo'] }, es)).toBe('Retirar las más largas: rinoceronte, hipopótamo.');
  });

  it('códigos de ficha de otra versión se rechazan con un mensaje concreto', () => {
    expect(readSeedInput(' v1-abc234 ')).toEqual({ status: 'ok', code: 'v1-ABC234' });
    expect(readSeedInput('   ')).toEqual({ status: 'empty' });
    expect(readSeedInput('hola')).toEqual({ status: 'invalid' });
    expect(readSeedInput('v2-ABC234')).toEqual({ status: 'other-version', version: 2, expected: 1 });
    expect(describeSeed(readSeedInput('v2-ABC234'), es)).toBe('Este código es de otra versión del generador (v2) y no reproduciría su ficha. Se admiten códigos v1; «Nueva sopa» crea uno nuevo.');
    expect(describeSeed(readSeedInput('v7-XYZ'), en)).toBe('This code belongs to another version of the generator (v7) and would not reproduce its worksheet. Codes must start with v1; “New puzzle” creates a new one.');
    expect(describeSeed(readSeedInput('hola'), es)).toBe('Código no válido. Formato: v1-ABC234.');
    expect(describeSeed(readSeedInput('v1-ABC234'), es)).toBeNull();
  });

  it('recuentos con singular y plural en es y en', () => {
    expect(formatPlural(es.unplaced.intro, 1)).toBe('No cabe 1 palabra:');
    expect(formatPlural(es.unplaced.intro, 3)).toBe('No caben 3 palabras:');
    expect(formatPlural(en.unplaced.intro, 1)).toBe('1 word does not fit:');
    const tool = { es: getDictionary('es').tool, en: getDictionary('en').tool };
    expect(formatPlural(tool.es.optionsDetail, 1, { size: 12, seed: 'v1-ABC234' })).toBe('1 palabra · 12 × 12 · v1-ABC234');
    expect(formatPlural(tool.en.optionsDetail, 2, { size: 12, seed: 'v1-ABC234' })).toBe('2 words · 12 × 12 · v1-ABC234');
  });

  it('ningún texto en español usa tuteo ni usted', () => {
    const all = JSON.stringify(getDictionary('es'));
    expect(all).not.toMatch(/\b(tu|tus|usted|activa|elige|escribe|descarga tu)\b/i);
  });
});
