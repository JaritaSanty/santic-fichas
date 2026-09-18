import { describe, expect, it } from 'vitest';
import { readSeedInput, type ArithmeticError, type ArithmeticSuggestion, type ArithmeticWarning } from '@/generators/arithmetic';
import { getDictionary } from '@/i18n/dictionary';
import { formatPlural } from '@/i18n/format';
import { describeError, describeKindMissing, describeSeed, describeSuggestion, describeWarning } from './messages';

const es = getDictionary('es').arithmetic;
const en = getDictionary('en').arithmetic;

const ERRORS: ArithmeticError[] = [
  { code: 'no-kind' },
  { code: 'range-inverted', operand: 'first' },
  { code: 'range-inverted', operand: 'second' },
  { code: 'operand-out-of-range', operand: 'first', min: 0, max: 99999 },
  { code: 'operand-out-of-range', operand: 'second', min: 0, max: 99999 },
  { code: 'count-out-of-range', min: 1, max: 200 },
  { code: 'columns-out-of-range', min: 2, max: 5 },
  { code: 'divisor-zero' },
  { code: 'empty-space', kind: 'div' },
];

const WARNINGS: ArithmeticWarning[] = [
  { code: 'carry-ignored', kinds: ['div'] },
  { code: 'factor-capped', max: 999 },
];

const SUGGESTIONS: ArithmeticSuggestion[] = [
  { code: 'raise-first-max', to: 105, fills: true },
  { code: 'raise-first-max', to: 105, fills: false },
  { code: 'lower-first-min', to: 98, fills: true },
  { code: 'lower-first-min', to: 98, fills: false },
  { code: 'widen-second', min: 2, max: 14, fills: true },
  { code: 'widen-second', min: 2, max: 14, fills: false },
  { code: 'allow-remainder', fills: true },
  { code: 'allow-remainder', fills: false },
  { code: 'allow-carry', fills: true },
  { code: 'allow-carry', fills: false },
  { code: 'allow-any-carry', fills: true },
  { code: 'allow-any-carry', fills: false },
  { code: 'reduce-count', to: 17 },
];

describe('mensajes del cuadernillo de operaciones', () => {
  it('cada código de error tiene texto en los dos idiomas, sin marcadores sin sustituir', () => {
    for (const error of ERRORS) {
      for (const t of [es, en]) {
        const text = describeError(error, t);
        expect(text, error.code).not.toBe('');
        expect(text, error.code).not.toMatch(/\{\w+\}/);
      }
    }
  });

  it('errores con datos concretos', () => {
    expect(describeError({ code: 'range-inverted', operand: 'first' }, es)).toBe('En el primer número, el mínimo no puede ser mayor que el máximo.');
    expect(describeError({ code: 'operand-out-of-range', operand: 'second', min: 0, max: 99999 }, es)).toBe('En el segundo número, los valores deben estar entre 0 y 99999.');
    expect(describeError({ code: 'count-out-of-range', min: 1, max: 200 }, es)).toBe('El número de operaciones debe estar entre 1 y 200.');
    expect(describeError({ code: 'columns-out-of-range', min: 2, max: 5 }, en)).toBe('Columns per sheet must be between 2 and 5.');
    expect(describeError({ code: 'empty-space', kind: 'div' }, en)).toBe('No division is possible with these ranges.');
    expect(describeError({ code: 'no-kind' }, en)).toBe('At least one operation is needed: addition, subtraction, multiplication or division.');
  });

  it('cada aviso tiene texto en los dos idiomas', () => {
    for (const warning of WARNINGS) {
      for (const t of [es, en]) {
        expect(describeWarning(warning, t), warning.code).not.toMatch(/\{\w+\}/);
      }
    }
    expect(describeWarning({ code: 'carry-ignored', kinds: ['div'] }, es)).toBe('La llevada no afecta a las operaciones elegidas (división); se ignora.');
    expect(describeWarning({ code: 'factor-capped', max: 999 }, es)).toBe('Con multiplicación o división, el segundo número se limita a 999; el rango se recorta.');
    expect(describeWarning({ code: 'factor-capped', max: 999 }, en)).toBe('With multiplication or division the second number is capped at 999; the range is trimmed.');
  });

  it('una operación elegida sin resultados se nombra en la frase', () => {
    expect(describeKindMissing('add', es)).toBe('No ha salido ninguna suma con estas opciones.');
    expect(describeKindMissing('div', en)).toBe('These options produced no division exercises.');
  });

  it('cada código de sugerencia tiene texto en los dos idiomas, con y sin fills', () => {
    for (const suggestion of SUGGESTIONS) {
      for (const t of [es, en]) {
        const text = describeSuggestion(suggestion, t);
        expect(text, suggestion.code).not.toBe('');
        expect(text, suggestion.code).not.toMatch(/\{\w+\}/);
      }
    }
  });

  it('solo la variante comprobada promete la ficha completa', () => {
    const promise = { es: /sale la ficha completa/, en: /fills the whole worksheet/ };
    for (const suggestion of SUGGESTIONS) {
      if (suggestion.code === 'reduce-count') continue;
      expect(describeSuggestion(suggestion, es), suggestion.code).toMatch(suggestion.fills ? promise.es : /puede que no lleguen/);
      expect(describeSuggestion(suggestion, en), suggestion.code).toMatch(suggestion.fills ? promise.en : /may not be enough/);
      if (!suggestion.fills) {
        expect(describeSuggestion(suggestion, es), suggestion.code).not.toMatch(promise.es);
        expect(describeSuggestion(suggestion, en), suggestion.code).not.toMatch(promise.en);
      }
    }
  });

  it('sugerencias con sus números', () => {
    expect(describeSuggestion({ code: 'raise-first-max', to: 105, fills: true }, es)).toBe('Ampliar el máximo del primer número hasta 105: con ese cambio sale la ficha completa.');
    expect(describeSuggestion({ code: 'lower-first-min', to: 98, fills: false }, es)).toBe('Reducir el mínimo del primer número hasta 98: así hay divisiones posibles, aunque puede que no lleguen para la ficha completa.');
    expect(describeSuggestion({ code: 'widen-second', min: 2, max: 14, fills: true }, en)).toBe('Widen the second number to the range 2–14: that fills the whole worksheet.');
    expect(describeSuggestion({ code: 'reduce-count', to: 17 }, es)).toBe('Pedir 17 operaciones: es todo lo que permiten estas opciones.');
  });

  it('códigos de ficha de otra versión se rechazan con un mensaje concreto', () => {
    expect(describeSeed(readSeedInput('v2-ABC234'), es)).toBe('Este código es de otra versión del generador (v2) y no reproduciría su ficha. Se admiten códigos v1; «Nuevo cuadernillo» crea uno nuevo.');
    expect(describeSeed(readSeedInput('hola'), en)).toBe('Invalid code. Format: v1-ABC234.');
    expect(describeSeed(readSeedInput('v1-ABC234'), es)).toBeNull();
    expect(describeSeed(readSeedInput('   '), es)).toBeNull();
  });

  it('paginación y ficha corta usan el singular y el plural correctos', () => {
    expect(formatPlural(es.pagination, 1, { pages: 1, perPage: 30 })).toBe('Se generará 1 hoja, máx. 30 por hoja.');
    expect(formatPlural(es.pagination, 3, { pages: 3, perPage: 30 })).toBe('Se generarán 3 hojas, máx. 30 por hoja.');
    expect(formatPlural(en.pagination, 1, { pages: 1, perPage: 30 })).toBe('1 sheet will be generated, up to 30 per sheet.');
    expect(formatPlural(en.pagination, 3, { pages: 3, perPage: 30 })).toBe('3 sheets will be generated, up to 30 per sheet.');
    expect(formatPlural(es.shortfall.intro, 1, { requested: 20 })).toBe('Con estas opciones solo hay 1 operación distinta y se han pedido 20.');
    expect(formatPlural(es.shortfall.intro, 17, { requested: 20 })).toBe('Con estas opciones solo hay 17 operaciones distintas y se han pedido 20.');
    expect(formatPlural(en.shortfall.intro, 17, { requested: 20 })).toBe('With these options there are only 17 distinct operations and 20 were requested.');
    expect(formatPlural(es.shortfall.apply, 1)).toBe('Generar 1 operación');
    expect(formatPlural(en.shortfall.apply, 17)).toBe('Generate 17 operations');
  });
});
