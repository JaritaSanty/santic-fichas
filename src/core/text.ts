import type { Lang } from '@/core/lang';

export const MIN_WORD_LENGTH = 2;

export type NormalizeError = 'empty' | 'invalid-chars' | 'too-short';

// Carácter de control temporal que protege la Ñ durante la descomposición NFD.
const ENYE_MARK = '\u0001';
const JOINERS = /[\s\-‐‑–'’]/g;
const VALID = /^[A-ZÑ]+$/;
// Caracteres de control C0/C1: nunca son letras y U+0001 es el marcador interno de la Ñ.
const CONTROL = /[\u0000-\u001F\u007F-\u009F]/;
// Tabulador (palabras pegadas desde una hoja de cálculo): cuenta como espacio antes de validar.
const TAB = /\t/g;

/**
 * Normaliza una palabra para la cuadrícula: mayúsculas, sin tildes ni diéresis, Ñ conservada,
 * espacios/guiones/apóstrofos eliminados. Ver spec §5.1.
 */
export function normalizeWord(raw: string, lang: Lang): { ok: true; value: string } | { ok: false; code: NormalizeError } {
  const spaced = raw.replace(TAB, ' ');
  if (CONTROL.test(spaced)) return { ok: false, code: 'invalid-chars' };
  const value = spaced
    .normalize('NFC')
    .trim()
    .toLocaleUpperCase(lang)
    .replace(/Ñ/g, ENYE_MARK)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replaceAll(ENYE_MARK, 'Ñ')
    .replace(JOINERS, '');

  if (value === '') return { ok: false, code: 'empty' };
  if (!VALID.test(value)) return { ok: false, code: 'invalid-chars' };
  if (value.length < MIN_WORD_LENGTH) return { ok: false, code: 'too-short' };
  return { ok: true, value };
}

/** Colapsa cualquier secuencia de espacio en blanco (tabulador, VT, FF, CR, NBSP…) a un espacio y recorta. */
export function collapseSpaces(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export interface WordEntry {
  line: number;
  original: string;
  normalized: string;
}

export type WordListError = { line: number; code: 'invalid-chars' | 'too-short' };

export type WordListWarning =
  | { code: 'duplicate'; line: number; duplicateOf: number }
  | { code: 'contained'; line: number; containerLine: number; reversed: boolean };

/**
 * `reversed`: si las palabras pueden aparecer invertidas, también se avisa cuando una palabra leída al revés
 * está dentro de otra (AMOR dentro de ROMA).
 */
export function parseWordList(
  text: string,
  lang: Lang,
  options: { reversed?: boolean } = {},
): { entries: WordEntry[]; errors: WordListError[]; warnings: WordListWarning[] } {
  const entries: WordEntry[] = [];
  const errors: WordListError[] = [];
  const warnings: WordListWarning[] = [];
  const firstLineByWord = new Map<string, number>();

  text.split(/\r?\n/).forEach((rawLine, index) => {
    const line = index + 1;
    // Espacios seguidos colapsados: SVG los colapsa al pintar y el PDF no, así ambos miden y muestran lo mismo.
    const original = collapseSpaces(rawLine);
    const result = normalizeWord(original, lang);
    if (!result.ok) {
      if (result.code !== 'empty') errors.push({ line, code: result.code });
      return;
    }
    const seen = firstLineByWord.get(result.value);
    if (seen !== undefined) {
      warnings.push({ code: 'duplicate', line, duplicateOf: seen });
      return;
    }
    firstLineByWord.set(result.value, line);
    entries.push({ line, original, normalized: result.value });
  });

  for (const inner of entries) {
    const container = entries.find((outer) => outer !== inner && outer.normalized.includes(inner.normalized));
    if (container) {
      warnings.push({ code: 'contained', line: inner.line, containerLine: container.line, reversed: false });
      continue;
    }
    if (!options.reversed) continue;
    const backwards = Array.from(inner.normalized).reverse().join('');
    const reversedContainer = entries.find((outer) => outer !== inner && outer.normalized.includes(backwards));
    if (reversedContainer) warnings.push({ code: 'contained', line: inner.line, containerLine: reversedContainer.line, reversed: true });
  }

  return { entries, errors, warnings };
}

const BASE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const ES_ALPHABET = [...BASE_ALPHABET.slice(0, 14), 'Ñ', ...BASE_ALPHABET.slice(14)];

export function fillAlphabet(lang: Lang, words: readonly string[] = []): readonly string[] {
  // En inglés la Ñ solo aparece si una palabra la usa; si no, cada Ñ delataría una solución.
  return lang === 'es' || words.some((word) => word.includes('Ñ')) ? ES_ALPHABET : BASE_ALPHABET;
}
