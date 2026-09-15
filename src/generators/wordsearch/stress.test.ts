import { describe, expect, it } from 'vitest';
import { createRng } from '@/core/random';
import { generateWordSearch } from './generate';
import { validateWordSearch } from './params';

const ALL = { horizontal: true, vertical: true, diagonal: true, reversed: true };
// Tiempo real: margen amplio en CI, donde las máquinas compartidas son más lentas y variables.
const LIMIT_MS = process.env.CI ? 1200 : 400;

function randomWords(seed: string, count: number, length: number, alphabet: string): string[] {
  const rng = createRng(seed);
  const words = new Set<string>();
  while (words.size < count) words.add(Array.from({ length }, () => rng.pick(alphabet.split(''))).join(''));
  return [...words];
}

function timeGeneration(words: string[]): number {
  const v = validateWordSearch({ wordsText: words.join('\n'), size: 25, directions: ALL }, 'en');
  if (!v.ok) throw new Error('entrada inválida');
  const start = performance.now();
  generateWordSearch(v.value, 'v1-ESTRES', 'en');
  return performance.now() - start;
}

describe('coste de la colocación en el peor caso', () => {
  it('50 palabras de 16 letras sobre un alfabeto de 2 letras en 25×25', () => {
    expect(timeGeneration(randomWords('binario', 50, 16, 'AB'))).toBeLessThan(LIMIT_MS);
  });

  it('50 palabras aleatorias de 12 letras en 25×25', () => {
    expect(timeGeneration(randomWords('aleatorio', 50, 12, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'))).toBeLessThan(LIMIT_MS);
  });
});
