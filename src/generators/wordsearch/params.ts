import type { Lang } from '@/core/lang';
import { unsupportedSheetChars } from '@/core/measure';
import { parseWordList, type WordEntry, type WordListWarning } from '@/core/text';
import type { DirectionOptions } from './directions';

export const WORDSEARCH_LIMITS = { minSize: 8, maxSize: 25, maxWords: 50, largeListFrom: 30 } as const;
/** Proporción de casillas ocupadas por letras que se considera cómoda al sugerir tamaño. */
const COMFORTABLE_DENSITY = 0.5;

export interface WordSearchInput {
  wordsText: string;
  size: number;
  directions: DirectionOptions;
}

export interface ValidWordSearch {
  entries: WordEntry[];
  size: number;
  directions: DirectionOptions;
}

export type RejectedLine =
  | { code: 'invalid-chars' | 'too-short'; line: number }
  | { code: 'unsupported-glyph'; line: number; chars: string[] };

export type WordSearchError =
  | { code: 'no-words' }
  | { code: 'too-many-words'; count: number; max: number }
  | { code: 'word-too-long'; line: number; word: string; length: number }
  | { code: 'size-out-of-range'; min: number; max: number }
  | { code: 'no-direction' };

export type WordSearchWarning = WordListWarning | { code: 'large-list'; suggestedSize: number };

export type WordSearchValidation =
  | { ok: true; value: ValidWordSearch; rejected: RejectedLine[]; warnings: WordSearchWarning[] }
  | { ok: false; errors: WordSearchError[]; rejected: RejectedLine[]; warnings: WordSearchWarning[] };

export function suggestGridSize(entries: readonly WordEntry[]): number {
  const longest = entries.reduce((max, e) => Math.max(max, e.normalized.length), 0);
  const letters = entries.reduce((sum, e) => sum + e.normalized.length, 0);
  const bySpace = Math.ceil(Math.sqrt(letters / COMFORTABLE_DENSITY));
  return Math.min(WORDSEARCH_LIMITS.maxSize, Math.max(WORDSEARCH_LIMITS.minSize, longest, bySpace));
}

export function validateWordSearch(input: WordSearchInput, lang: Lang): WordSearchValidation {
  const parsed = parseWordList(input.wordsText, lang);
  const rejected: RejectedLine[] = parsed.errors.map((e) => ({ code: e.code, line: e.line }));
  const entries: WordEntry[] = [];
  for (const e of parsed.entries) {
    const chars = unsupportedSheetChars(e.original);
    if (chars.length > 0) rejected.push({ code: 'unsupported-glyph', line: e.line, chars });
    else entries.push(e);
  }
  rejected.sort((a, b) => a.line - b.line);

  const warnings: WordSearchWarning[] = [...parsed.warnings];
  const errors: WordSearchError[] = [];
  const { minSize, maxSize, maxWords, largeListFrom } = WORDSEARCH_LIMITS;
  const sizeValid = Number.isInteger(input.size) && input.size >= minSize && input.size <= maxSize;

  if (entries.length === 0) errors.push({ code: 'no-words' });
  if (entries.length > maxWords) errors.push({ code: 'too-many-words', count: entries.length, max: maxWords });
  if (!sizeValid) errors.push({ code: 'size-out-of-range', min: minSize, max: maxSize });
  if (!input.directions.horizontal && !input.directions.vertical && !input.directions.diagonal) errors.push({ code: 'no-direction' });
  if (sizeValid) {
    for (const e of entries) {
      if (e.normalized.length > input.size) errors.push({ code: 'word-too-long', line: e.line, word: e.original, length: e.normalized.length });
    }
  }
  if (entries.length >= largeListFrom) {
    const suggestedSize = suggestGridSize(entries);
    if (suggestedSize > input.size) warnings.push({ code: 'large-list', suggestedSize });
  }

  return errors.length > 0
    ? { ok: false, errors, rejected, warnings }
    : { ok: true, value: { entries, size: input.size, directions: input.directions }, rejected, warnings };
}
