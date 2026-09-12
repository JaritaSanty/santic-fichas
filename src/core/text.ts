import type { Lang } from '@/core/lang';

export const MIN_WORD_LENGTH = 2;

export type NormalizeError = 'empty' | 'invalid-chars' | 'too-short';

// Carácter de control temporal que protege la Ñ durante la descomposición NFD.
const ENYE_MARK = '\u0001';
const JOINERS = /[\s\-‐‑–'’]/g;
const VALID = /^[A-ZÑ]+$/;

/**
 * Normaliza una palabra para la cuadrícula: mayúsculas, sin tildes ni diéresis, Ñ conservada,
 * espacios/guiones/apóstrofos eliminados. Ver spec §5.1.
 */
export function normalizeWord(raw: string, lang: Lang): { ok: true; value: string } | { ok: false; code: NormalizeError } {
  const value = raw
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

export interface WordEntry {
  line: number;
  original: string;
  normalized: string;
}

export type WordListError = { line: number; code: 'invalid-chars' | 'too-short' };

export type WordListWarning =
  | { code: 'duplicate'; line: number; duplicateOf: number }
  | { code: 'contained'; line: number; containerLine: number };

export function parseWordList(text: string, lang: Lang): { entries: WordEntry[]; errors: WordListError[]; warnings: WordListWarning[] } {
  const entries: WordEntry[] = [];
  const errors: WordListError[] = [];
  const warnings: WordListWarning[] = [];
  const firstLineByWord = new Map<string, number>();

  text.split(/\r?\n/).forEach((rawLine, index) => {
    const line = index + 1;
    const original = rawLine.trim();
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
    if (container) warnings.push({ code: 'contained', line: inner.line, containerLine: container.line });
  }

  return { entries, errors, warnings };
}

const BASE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const ES_ALPHABET = [...BASE_ALPHABET.slice(0, 14), 'Ñ', ...BASE_ALPHABET.slice(14)];

export function fillAlphabet(lang: Lang): readonly string[] {
  return lang === 'es' ? ES_ALPHABET : BASE_ALPHABET;
}
