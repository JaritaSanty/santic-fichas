import { describe, expect, it } from 'vitest';
import { fillAlphabet, normalizeWord, parseWordList } from './text';

describe('normalizeWord', () => {
  it.each([
    ['Pingüino', 'PINGUINO'],
    ['ñandú', 'ÑANDU'],
    ['Ñu', 'ÑU'],
    ['oso polar', 'OSOPOLAR'],
    ["don't", 'DONT'],
    ['don’t', 'DONT'],
    ['  Árbol-grande ', 'ARBOLGRANDE'],
    ['Açaí', 'ACAI'],
    ['straße', 'STRASSE'],
  ])('%s → %s', (raw, expected) => {
    expect(normalizeWord(raw, 'es')).toEqual({ ok: true, value: expected });
  });

  it('conserva la Ñ también en inglés', () => {
    expect(normalizeWord('jalapeño', 'en')).toEqual({ ok: true, value: 'JALAPEÑO' });
  });

  it('rechaza dígitos y símbolos', () => {
    expect(normalizeWord('año 2', 'es')).toEqual({ ok: false, code: 'invalid-chars' });
    expect(normalizeWord('sol!', 'es')).toEqual({ ok: false, code: 'invalid-chars' });
  });

  it('rechaza vacías y demasiado cortas', () => {
    expect(normalizeWord('   ', 'es')).toEqual({ ok: false, code: 'empty' });
    expect(normalizeWord('a', 'es')).toEqual({ ok: false, code: 'too-short' });
    expect(normalizeWord('- -', 'es')).toEqual({ ok: false, code: 'empty' });
  });
});

describe('parseWordList', () => {
  it('ignora líneas vacías y numera desde 1', () => {
    const r = parseWordList('gato\n\n  perro  \n', 'es');
    expect(r.entries).toEqual([
      { line: 1, original: 'gato', normalized: 'GATO' },
      { line: 3, original: 'perro', normalized: 'PERRO' },
    ]);
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
  });

  it('acepta CRLF', () => {
    expect(parseWordList('uno\r\ndos', 'es').entries.map((e) => e.normalized)).toEqual(['UNO', 'DOS']);
  });

  it('informa errores por línea sin incluirlos en entries', () => {
    const r = parseWordList('sol\nluna3\nx', 'es');
    expect(r.entries.map((e) => e.normalized)).toEqual(['SOL']);
    expect(r.errors).toEqual([
      { line: 2, code: 'invalid-chars' },
      { line: 3, code: 'too-short' },
    ]);
  });

  it('elimina duplicados tras normalizar con aviso', () => {
    const r = parseWordList('Árbol\narbol', 'es');
    expect(r.entries).toHaveLength(1);
    expect(r.warnings).toEqual([{ code: 'duplicate', line: 2, duplicateOf: 1 }]);
  });

  it('avisa de palabras contenidas en otras', () => {
    const r = parseWordList('girasol\nsol', 'es');
    expect(r.entries).toHaveLength(2);
    expect(r.warnings).toEqual([{ code: 'contained', line: 2, containerLine: 1, reversed: false }]);
  });

  it('avisa de palabras contenidas al revés solo si se permiten invertidas', () => {
    expect(parseWordList('roma\namor', 'es').warnings).toEqual([]);
    expect(parseWordList('roma\namor', 'es', { reversed: true }).warnings).toEqual([
      { code: 'contained', line: 1, containerLine: 2, reversed: true },
      { code: 'contained', line: 2, containerLine: 1, reversed: true },
    ]);
    expect(parseWordList('girasol\nlos', 'es', { reversed: true }).warnings).toEqual([{ code: 'contained', line: 2, containerLine: 1, reversed: true }]);
    expect(parseWordList('girasol\nsol', 'es', { reversed: true }).warnings).toEqual([{ code: 'contained', line: 2, containerLine: 1, reversed: false }]);
  });

  it('convierte tabuladores en espacios y colapsa espacios seguidos en la grafía original', () => {
    expect(parseWordList('oso\tpolar\n  oso   pardo ', 'es').entries).toEqual([
      { line: 1, original: 'oso polar', normalized: 'OSOPOLAR' },
      { line: 2, original: 'oso pardo', normalized: 'OSOPARDO' },
    ]);
    expect(parseWordList('oso\tpolar', 'es').errors).toEqual([]);
  });
});

describe('fillAlphabet', () => {
  it('incluye Ñ solo en español', () => {
    expect(fillAlphabet('es')).toHaveLength(27);
    expect(fillAlphabet('es')).toContain('Ñ');
    expect(fillAlphabet('en')).toHaveLength(26);
    expect(fillAlphabet('en')).not.toContain('Ñ');
  });
});

describe('endurecimiento Fase 2', () => {
  it('rechaza caracteres de control, incluido el marcador interno U+0001', () => {
    expect(normalizeWord('año\u0001z', 'es')).toEqual({ ok: false, code: 'invalid-chars' });
    expect(normalizeWord('sol\u0009luna', 'es')).toEqual({ ok: true, value: 'SOLLUNA' });
    expect(normalizeWord('sol\nluna', 'es')).toEqual({ ok: false, code: 'invalid-chars' });
    expect(normalizeWord('ro\u007Fjo', 'es')).toEqual({ ok: false, code: 'invalid-chars' });
  });

  it('añade la Ñ al relleno inglés solo si alguna palabra la contiene', () => {
    expect(fillAlphabet('en', ['JALAPEÑO', 'CAT'])).toContain('Ñ');
    expect(fillAlphabet('en', ['CAT'])).not.toContain('Ñ');
    expect(fillAlphabet('es', [])).toContain('Ñ');
  });
});
