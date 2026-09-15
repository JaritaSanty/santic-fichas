import { describe, expect, it } from 'vitest';
import { createRng } from '@/core/random';
import type { WordEntry } from '@/core/text';
import { activeVectors, type DirectionOptions } from './directions';
import { generateWordSearch } from './generate';
import { validateWordSearch } from './params';
import { placeWords } from './place';

const entries = (words: string[]): WordEntry[] => words.map((w, i) => ({ line: i + 1, original: w.toLowerCase(), normalized: w }));
const H_ONLY: DirectionOptions = { horizontal: true, vertical: false, diagonal: false, reversed: false };

describe('placeWords', () => {
  it('tras rendirse coloca las palabras restantes que aún caben sobre la mejor colocación parcial', () => {
    const diagonalOnly: DirectionOptions = { horizontal: false, vertical: false, diagonal: true, reversed: false };
    const v = validateWordSearch({ wordsText: 'ABCDEFGH\nIJKLMNOP\nQRSTUVWX\nYZ\nZY\nQQ', size: 8, directions: diagonalOnly }, 'es');
    if (!v.ok) throw new Error('entrada inválida');
    for (const seed of ['v1-DIAG22', 'v1-DIAG23', 'v1-DIAG24']) {
      const result = generateWordSearch(v.value, seed, 'es');
      // Solo caben dos palabras de 8 en las diagonales mayores; las cortas siempre tienen sitio.
      expect(result.unplaced.map((e) => e.normalized)).toEqual(['QRSTUVWX']);
      expect(result.placements.map((p) => p.entry.normalized).sort()).toEqual(['ABCDEFGH', 'IJKLMNOP', 'QQ', 'YZ', 'ZY']);
    }
  });

  it('nunca esconde una palabra entera dentro de otra ya colocada', () => {
    const rows = ['GIRASOL', 'AAAAAAA', 'BBBBBBB', 'CCCCCCC', 'DDDDDDD', 'EEEEEEE', 'FFFFFFF'];
    for (let n = 0; n < 20; n++) {
      const outcome = placeWords(entries([...rows, 'SOL']), 7, activeVectors(H_ONLY), createRng(`sol-${n}`), 3000);
      expect(outcome.placements.map((p) => p.entry.normalized)).not.toContain('SOL');
      expect(outcome.complete).toBe(false);
    }
  });

  it('es determinista para la misma semilla', () => {
    const list = entries(['GATO', 'PERRO', 'CONEJO', 'OVEJA', 'VACA']);
    const vectors = activeVectors({ horizontal: true, vertical: true, diagonal: true, reversed: true });
    expect(placeWords(list, 8, vectors, createRng('det'), 3000)).toEqual(placeWords(list, 8, vectors, createRng('det'), 3000));
  });
});
