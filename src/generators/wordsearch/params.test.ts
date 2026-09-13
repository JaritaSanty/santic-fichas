import { describe, expect, it } from 'vitest';
import type { WordEntry } from '@/core/text';
import { activeVectors, type DirectionOptions } from './directions';
import { suggestGridSize, validateWordSearch, WORDSEARCH_LIMITS } from './params';
import { suggestAdjustments } from './suggest';

const ALL: DirectionOptions = { horizontal: true, vertical: true, diagonal: true, reversed: true };
const H_ONLY: DirectionOptions = { horizontal: true, vertical: false, diagonal: false, reversed: false };
const entry = (line: number, word: string): WordEntry => ({ line, original: word.toLowerCase(), normalized: word });

describe('activeVectors', () => {
  it('traduce las casillas a vectores sin ceros negativos', () => {
    expect(activeVectors(H_ONLY)).toEqual([[0, 1]]);
    expect(activeVectors({ ...H_ONLY, vertical: true, diagonal: true })).toEqual([[0, 1], [1, 0], [1, 1], [-1, 1]]);
    expect(activeVectors({ ...H_ONLY, reversed: true })).toEqual([[0, 1], [0, -1]]);
    expect(activeVectors(ALL)).toHaveLength(8);
    expect(activeVectors({ horizontal: false, vertical: false, diagonal: false, reversed: true })).toEqual([]);
  });
});

describe('validateWordSearch', () => {
  it('acepta una lista válida', () => {
    const r = validateWordSearch({ wordsText: 'gato\nperro\nñandú', size: 10, directions: ALL }, 'es');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.entries.map((e) => e.normalized)).toEqual(['GATO', 'PERRO', 'ÑANDU']);
  });

  it('una sola palabra es válida', () => {
    expect(validateWordSearch({ wordsText: 'sol', size: 8, directions: H_ONLY }, 'es').ok).toBe(true);
  });

  it('sin palabras válidas bloquea y conserva las líneas rechazadas', () => {
    const r = validateWordSearch({ wordsText: 'año 2\nx', size: 10, directions: ALL }, 'es');
    expect(r.ok).toBe(false);
    expect(r.rejected).toEqual([
      { code: 'invalid-chars', line: 1 },
      { code: 'too-short', line: 2 },
    ]);
    if (!r.ok) expect(r.errors).toEqual([{ code: 'no-words' }]);
    expect(validateWordSearch({ wordsText: '', size: 10, directions: ALL }, 'es')).toMatchObject({ ok: false, errors: [{ code: 'no-words' }] });
  });

  it('las líneas inválidas no bloquean si quedan palabras', () => {
    const r = validateWordSearch({ wordsText: 'gato\n12', size: 10, directions: ALL }, 'es');
    expect(r.ok).toBe(true);
    expect(r.rejected).toEqual([{ code: 'invalid-chars', line: 2 }]);
  });

  it('rechaza glifos que la tipografía de ficha no tiene', () => {
    // «ő» se normaliza a O (válida en la cuadrícula) pero la tipografía de ficha no tiene su glifo.
    const r = validateWordSearch({ wordsText: 'gato\nkő', size: 10, directions: ALL }, 'es');
    expect(r.rejected).toEqual([{ code: 'unsupported-glyph', line: 2, chars: ['ő'] }]);
  });

  it('más de 50 palabras bloquea', () => {
    const words = Array.from({ length: 51 }, (_, i) => `palabra${'abcdefghijklmnopqrstuvwxyz'[i % 26]}${'abcdefghij'[Math.floor(i / 26)]}`);
    const r = validateWordSearch({ wordsText: words.join('\n'), size: 25, directions: ALL }, 'es');
    expect(r).toMatchObject({ ok: false, errors: [{ code: 'too-many-words', count: 51, max: 50 }] });
  });

  it('palabra más larga que la cuadrícula bloquea con la forma original', () => {
    const r = validateWordSearch({ wordsText: 'Mariposas', size: 8, directions: ALL }, 'es');
    expect(r).toMatchObject({ ok: false, errors: [{ code: 'word-too-long', line: 1, word: 'Mariposas', length: 9 }] });
  });

  it('tamaño fuera de rango o no entero bloquea', () => {
    for (const size of [7, 26, 8.5]) {
      expect(validateWordSearch({ wordsText: 'gato', size, directions: ALL }, 'es')).toMatchObject({
        ok: false,
        errors: [{ code: 'size-out-of-range', min: 8, max: 25 }],
      });
    }
  });

  it('solo «invertidas» no cuenta como dirección', () => {
    const r = validateWordSearch({ wordsText: 'gato', size: 10, directions: { horizontal: false, vertical: false, diagonal: false, reversed: true } }, 'es');
    expect(r).toMatchObject({ ok: false, errors: [{ code: 'no-direction' }] });
  });

  it('avisa con listas grandes si la cuadrícula es pequeña', () => {
    const words = Array.from({ length: 30 }, (_, i) => `gato${'abcdefghijklmnopqrstuvwxyz'[i % 26]}${'abc'[Math.floor(i / 26)]}`);
    const r = validateWordSearch({ wordsText: words.join('\n'), size: 8, directions: ALL }, 'es');
    expect(r.warnings).toContainEqual({ code: 'large-list', suggestedSize: suggestGridSize(r.ok ? r.value.entries : []) });
  });
});

describe('suggestGridSize', () => {
  it('respeta la palabra más larga y los límites', () => {
    expect(suggestGridSize([entry(1, 'SOL')])).toBe(WORDSEARCH_LIMITS.minSize);
    expect(suggestGridSize([entry(1, 'ELECTRODOMESTICOS')])).toBe(17);
    expect(suggestGridSize(Array.from({ length: 50 }, (_, i) => entry(i + 1, 'PALABRAS')))).toBe(25);
  });
});

describe('suggestAdjustments', () => {
  it('no sugiere nada si todo se colocó', () => {
    expect(suggestAdjustments({ entries: [entry(1, 'GATO')], size: 10, directions: ALL }, [])).toEqual([]);
  });

  it('propone tamaño, direcciones que faltan y retirar las más largas', () => {
    const entries = [entry(1, 'HIPOPOTAMO'), entry(2, 'COCODRILO'), entry(3, 'GATO'), entry(4, 'RINOCERONTE')];
    const out = suggestAdjustments({ entries, size: 12, directions: H_ONLY }, [entries[0]!, entries[3]!, entries[2]!]);
    expect(out).toEqual([
      { code: 'increase-size', size: 14 },
      { code: 'enable-diagonal' },
      { code: 'enable-reversed' },
      { code: 'remove-words', words: ['rinoceronte', 'hipopotamo', 'gato'] },
    ]);
  });

  it('no propone crecer por encima del máximo', () => {
    const entries = [entry(1, 'GATO')];
    expect(suggestAdjustments({ entries, size: 25, directions: ALL }, entries)).toEqual([{ code: 'remove-words', words: ['gato'] }]);
  });
});
