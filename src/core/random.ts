/** Hash de cadena a generador de semillas de 32 bits (xmur3). */
function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

/** Generador sfc32: rápido, periodo amplio, reproducible en cualquier motor JS. */
function sfc32(a: number, b: number, c: number, d: number): () => number {
  return () => {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

export interface Rng {
  /** Real en [0, 1). */
  next(): number;
  /** Entero en [0, maxExclusive). */
  int(maxExclusive: number): number;
  pick<T>(items: readonly T[]): T;
  /** Copia barajada (Fisher–Yates); no muta la entrada. */
  shuffle<T>(items: readonly T[]): T[];
  /** Subgenerador determinista derivado de la semilla original y una etiqueta. */
  fork(label: string): Rng;
}

export function createRng(seed: string): Rng {
  const hash = xmur3(seed);
  const next = sfc32(hash(), hash(), hash(), hash());
  for (let i = 0; i < 15; i++) next(); // descarta los primeros valores, poco mezclados

  const rng: Rng = {
    next,
    int(maxExclusive) {
      if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) throw new RangeError('maxExclusive debe ser un entero positivo');
      return Math.floor(next() * maxExclusive);
    },
    pick(items) {
      if (items.length === 0) throw new RangeError('No se puede elegir de una lista vacía');
      return items[rng.int(items.length)] as (typeof items)[number];
    },
    shuffle(items) {
      const out = [...items];
      for (let i = out.length - 1; i > 0; i--) {
        const j = rng.int(i + 1);
        [out[i], out[j]] = [out[j] as (typeof out)[number], out[i] as (typeof out)[number]];
      }
      return out;
    },
    fork(label) {
      return createRng(`${seed}::${label}`);
    },
  };
  return rng;
}

/** Sin 0/O, 1/I/L para que el docente pueda copiar el código sin ambigüedad. */
export const SEED_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export function randomSeedBody(length = 6): string {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => SEED_ALPHABET[b % SEED_ALPHABET.length]).join('');
}

export function formatSeedCode(version: number, body: string): string {
  return `v${version}-${body}`;
}

export function parseSeedCode(code: string): { version: number; body: string } | null {
  const match = /^v([1-9]\d*)-([A-Za-z0-9]+)$/.exec(code.trim());
  if (!match) return null;
  return { version: Number(match[1]), body: (match[2] as string).toUpperCase() };
}
