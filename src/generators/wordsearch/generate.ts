import type { Lang } from '@/core/lang';
import { createRng } from '@/core/random';
import { fillAlphabet, type WordEntry } from '@/core/text';
import { activeVectors } from './directions';
import type { ValidWordSearch } from './params';
import { placeWords, type Placement, type PlacementOutcome } from './place';

export const WORDSEARCH_ALGORITHM_VERSION = 1;
export const PLACEMENT_MAX_STEPS = 3000;
export const PLACEMENT_ATTEMPTS = 3;

export interface WordSearchResult {
  size: number;
  /** Letras fila a fila (size × size). */
  cells: string[];
  placements: Placement[];
  unplaced: WordEntry[];
  seedCode: string;
}

export function generateWordSearch(value: ValidWordSearch, seedCode: string, lang: Lang): WordSearchResult {
  const vectors = activeVectors(value.directions);
  const root = createRng(seedCode);

  let best: PlacementOutcome | null = null;
  for (let attempt = 0; attempt < PLACEMENT_ATTEMPTS; attempt++) {
    const outcome = placeWords(value.entries, value.size, vectors, root.fork(`attempt-${attempt}`), PLACEMENT_MAX_STEPS);
    if (!best || outcome.placements.length > best.placements.length) best = outcome;
    if (outcome.complete) break;
  }
  const placements = best?.placements ?? [];

  const cells = new Array<string>(value.size * value.size).fill('');
  for (const p of placements) {
    for (let i = 0; i < p.entry.normalized.length; i++) {
      cells[(p.row + p.dr * i) * value.size + p.col + p.dc * i] = p.entry.normalized[i] as string;
    }
  }

  const alphabet = fillAlphabet(lang, value.entries.map((e) => e.normalized));
  const fill = root.fork('fill');
  const placedLines = new Set(placements.map((p) => p.entry.line));

  return {
    size: value.size,
    cells: cells.map((cell) => (cell === '' ? fill.pick(alphabet) : cell)),
    placements,
    unplaced: value.entries.filter((e) => !placedLines.has(e.line)),
    seedCode,
  };
}
