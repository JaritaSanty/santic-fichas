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

interface Frame {
  entry: WordEntry;
  codes: Uint8Array;
  /** Posiciones geométricas para la longitud de la palabra, planas: [inicio, paso, vector]. */
  pool: Int32Array;
  /** Índices en `pool` de los candidatos que caben; se barajan de forma perezosa según se prueban. */
  fitting: Int32Array;
  count: number;
  next: number;
  /** Candidatos de la palabra siguiente sobre la cuadrícula previa a esta colocación: los hijos solo la filtran. */
  ahead: Int32Array | null;
  aheadCount: number;
  written: number[];
  placement: Placement | null;
}

/**
 * Retroceso simple (spec §5.2): palabras de mayor a menor longitud; candidatos en orden barajado con la semilla;
 * solapamiento solo con letra coincidente y escribiendo al menos una casilla nueva. Cuenta intentos (no tiempo).
 * Si se rinde, parte de la colocación parcial más profunda e intenta una vez cada palabra restante, en el mismo
 * orden y con el mismo generador.
 */
export function placeWords(entries: readonly WordEntry[], size: number, vectors: readonly Vector[], rng: Rng, maxSteps: number): PlacementOutcome {
  const words = [...entries].sort((a, b) => b.normalized.length - a.normalized.length || a.line - b.line);
  if (words.length === 0) return { placements: [], complete: true, steps: 0 };
  if (vectors.length === 0) return { placements: [], complete: false, steps: 0 };

  // Letras como códigos (0 = libre) para comparar sin cadenas en el bucle caliente.
  const grid = new Uint8Array(size * size);
  const letterCodes = new Map<string, number>();
  const codesFor = words.map((entry) =>
    Uint8Array.from(entry.normalized, (ch) => letterCodes.get(ch) ?? (letterCodes.set(ch, letterCodes.size + 1), letterCodes.size)),
  );

  const pools = new Map<number, Int32Array>();
  const poolFor = (length: number): Int32Array => {
    const cached = pools.get(length);
    if (cached) return cached;
    const out: number[] = [];
    vectors.forEach(([dr, dc], v) => {
      for (let row = 0; row < size; row++) {
        const endRow = row + dr * (length - 1);
        if (endRow < 0 || endRow >= size) continue;
        for (let col = 0; col < size; col++) {
          const endCol = col + dc * (length - 1);
          if (endCol < 0 || endCol >= size) continue;
          out.push(row * size + col, dr * size + dc, v);
        }
      }
    });
    const pool = Int32Array.from(out);
    pools.set(length, pool);
    return pool;
  };

  // Búferes por profundidad: cada profundidad tiene como mucho un marco vivo.
  const maxPositions = vectors.length * size * size;
  const fittingBuffers = words.map(() => new Int32Array(maxPositions));
  const aheadBuffers = words.map(() => new Int32Array(maxPositions));

  /** Copia en `out` las posiciones (de `source`, o de todo el `pool`) que caben: casillas libres o coincidentes y al menos una nueva. */
  const collect = (codes: Uint8Array, pool: Int32Array, source: Int32Array | null, sourceCount: number, out: Int32Array): number => {
    const len = codes.length;
    const total = source ? sourceCount : pool.length / 3;
    let count = 0;
    for (let k = 0; k < total; k++) {
      const c = source ? (source[k] as number) : k * 3;
      const start = pool[c] as number;
      const step = pool[c + 1] as number;
      let fresh = false;
      let i = 0;
      for (; i < len; i++) {
        const cell = grid[start + step * i] as number;
        if (cell === 0) fresh = true;
        else if (cell !== codes[i]) break;
      }
      if (i === len && fresh) out[count++] = c;
    }
    return count;
  };

  const frameFor = (depth: number, source: Int32Array | null, sourceCount: number): Frame => {
    const codes = codesFor[depth] as Uint8Array;
    const pool = poolFor(codes.length);
    const fitting = fittingBuffers[depth] as Int32Array;
    const count = collect(codes, pool, source, sourceCount, fitting);
    return { entry: words[depth] as WordEntry, codes, pool, fitting, count, next: 0, ahead: null, aheadCount: 0, written: [], placement: null };
  };

  const nextCandidate = (frame: Frame): number => {
    if (frame.next >= frame.count) return -1;
    const k = frame.next++;
    const j = k + rng.int(frame.count - k);
    const picked = frame.fitting[j] as number;
    frame.fitting[j] = frame.fitting[k] as number;
    return picked;
  };

  const place = (frame: Frame, picked: number): Placement => {
    const start = frame.pool[picked] as number;
    const step = frame.pool[picked + 1] as number;
    const [dr, dc] = vectors[frame.pool[picked + 2] as number] as Vector;
    frame.written = [];
    for (let i = 0; i < frame.codes.length; i++) {
      const index = start + step * i;
      if (grid[index] === 0) {
        grid[index] = frame.codes[i] as number;
        frame.written.push(index);
      }
    }
    return { entry: frame.entry, row: Math.floor(start / size), col: start % size, dr, dc };
  };

  const stack: Frame[] = [frameFor(0, null, 0)];
  let best: Placement[] = [];
  let steps = 0;

  while (stack.length > 0 && steps < maxSteps) {
    const depth = stack.length - 1;
    const frame = stack[depth] as Frame;
    for (const index of frame.written) grid[index] = 0;
    frame.written = [];
    frame.placement = null;

    const picked = nextCandidate(frame);
    if (picked < 0) {
      stack.pop();
      continue;
    }
    if (!frame.ahead && depth + 1 < words.length) {
      // Añadir letras nunca da sitio a una posición que no cabía: basta una pasada por marco para todos sus hijos.
      const nextCodes = codesFor[depth + 1] as Uint8Array;
      frame.ahead = aheadBuffers[depth] as Int32Array;
      frame.aheadCount = collect(nextCodes, poolFor(nextCodes.length), null, 0, frame.ahead);
    }
    steps += 1;
    frame.placement = place(frame, picked);

    // Los marcos por debajo de la cima siempre tienen colocación; solo se copia al batir la profundidad.
    if (depth + 1 > best.length) best = stack.map((f) => f.placement as Placement);
    if (depth + 1 === words.length) return { placements: best, complete: true, steps };
    stack.push(frameFor(depth + 1, frame.ahead, frame.aheadCount));
  }

  grid.fill(0);
  const placements = [...best];
  placements.forEach((p, depth) => {
    (codesFor[depth] as Uint8Array).forEach((code, i) => {
      grid[(p.row + p.dr * i) * size + p.col + p.dc * i] = code;
    });
  });
  for (let depth = best.length; depth < words.length; depth++) {
    const frame = frameFor(depth, null, 0);
    const picked = nextCandidate(frame);
    if (picked >= 0) placements.push(place(frame, picked));
  }
  return { placements, complete: placements.length === words.length, steps };
}
