import type { Rng } from '@/core/random';
import type { WordEntry } from '@/core/text';
import type { Vector } from './directions';

export interface Placement {
  entry: WordEntry;
  row: number;
  col: number;
  dr: number;
  dc: number;
}

export interface PlacementOutcome {
  placements: Placement[];
  complete: boolean;
  steps: number;
}

interface Candidate {
  row: number;
  col: number;
  dr: number;
  dc: number;
}

interface Frame {
  candidates: Candidate[];
  next: number;
  written: number[];
  placement: Placement | null;
}

function fits(word: string, c: Candidate, size: number, grid: readonly string[]): boolean {
  for (let i = 0; i < word.length; i++) {
    const cell = grid[(c.row + c.dr * i) * size + c.col + c.dc * i];
    if (cell !== '' && cell !== word[i]) return false;
  }
  return true;
}

function candidatesFor(word: string, size: number, vectors: readonly Vector[], grid: readonly string[], rng: Rng): Candidate[] {
  const out: Candidate[] = [];
  const last = word.length - 1;
  for (const [dr, dc] of vectors) {
    for (let row = 0; row < size; row++) {
      const endRow = row + dr * last;
      if (endRow < 0 || endRow >= size) continue;
      for (let col = 0; col < size; col++) {
        const endCol = col + dc * last;
        if (endCol < 0 || endCol >= size) continue;
        const c = { row, col, dr, dc };
        if (fits(word, c, size, grid)) out.push(c);
      }
    }
  }
  return rng.shuffle(out);
}

/**
 * Retroceso simple (spec §5.2): palabras de mayor a menor longitud; candidatos barajados con la semilla;
 * solapamiento solo con letra coincidente. Cuenta intentos (no tiempo) y devuelve la mejor colocación parcial.
 */
export function placeWords(entries: readonly WordEntry[], size: number, vectors: readonly Vector[], rng: Rng, maxSteps: number): PlacementOutcome {
  const words = [...entries].sort((a, b) => b.normalized.length - a.normalized.length || a.line - b.line);
  if (words.length === 0) return { placements: [], complete: true, steps: 0 };
  if (vectors.length === 0) return { placements: [], complete: false, steps: 0 };

  const grid: string[] = new Array<string>(size * size).fill('');
  const stack: Frame[] = [{ candidates: candidatesFor((words[0] as WordEntry).normalized, size, vectors, grid, rng), next: 0, written: [], placement: null }];
  let best: Placement[] = [];
  let steps = 0;

  while (stack.length > 0 && steps < maxSteps) {
    const depth = stack.length - 1;
    const frame = stack[depth] as Frame;
    for (const index of frame.written) grid[index] = '';
    frame.written = [];
    frame.placement = null;

    const candidate = frame.candidates[frame.next];
    if (!candidate) {
      stack.pop();
      continue;
    }
    frame.next += 1;
    steps += 1;

    const entry = words[depth] as WordEntry;
    const word = entry.normalized;
    for (let i = 0; i < word.length; i++) {
      const index = (candidate.row + candidate.dr * i) * size + candidate.col + candidate.dc * i;
      if (grid[index] === '') {
        grid[index] = word[i] as string;
        frame.written.push(index);
      }
    }
    frame.placement = { entry, ...candidate };

    const placed = stack.map((f) => f.placement).filter((p): p is Placement => p !== null);
    if (placed.length > best.length) best = placed;
    if (depth + 1 === words.length) return { placements: placed, complete: true, steps };

    const nextWord = (words[depth + 1] as WordEntry).normalized;
    stack.push({ candidates: candidatesFor(nextWord, size, vectors, grid, rng), next: 0, written: [], placement: null });
  }

  return { placements: best, complete: false, steps };
}
