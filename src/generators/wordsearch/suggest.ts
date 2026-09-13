import type { WordEntry } from '@/core/text';
import { suggestGridSize, WORDSEARCH_LIMITS, type ValidWordSearch } from './params';

export type Suggestion =
  | { code: 'increase-size'; size: number }
  | { code: 'enable-diagonal' }
  | { code: 'enable-reversed' }
  | { code: 'remove-words'; words: string[] };

const MAX_WORDS_TO_REMOVE = 3;

export function suggestAdjustments(value: ValidWordSearch, unplaced: readonly WordEntry[]): Suggestion[] {
  if (unplaced.length === 0) return [];
  const out: Suggestion[] = [];
  if (value.size < WORDSEARCH_LIMITS.maxSize) {
    out.push({ code: 'increase-size', size: Math.min(WORDSEARCH_LIMITS.maxSize, Math.max(value.size + 2, suggestGridSize(value.entries))) });
  }
  if (!value.directions.diagonal) out.push({ code: 'enable-diagonal' });
  if (!value.directions.reversed) out.push({ code: 'enable-reversed' });
  const longest = [...unplaced].sort((a, b) => b.normalized.length - a.normalized.length || a.line - b.line).slice(0, MAX_WORDS_TO_REMOVE);
  out.push({ code: 'remove-words', words: longest.map((e) => e.original) });
  return out;
}
