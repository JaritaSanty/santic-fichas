import { describe, expect, it } from 'vitest';
import type { Lang } from '@/core/lang';
import { fillAlphabet } from '@/core/text';
import { activeVectors, type DirectionOptions } from './directions';
import { generateWordSearch, type WordSearchResult } from './generate';
import { validateWordSearch, type ValidWordSearch } from './params';

const ALL: DirectionOptions = { horizontal: true, vertical: true, diagonal: true, reversed: true };
const H_ONLY: DirectionOptions = { horizontal: true, vertical: false, diagonal: false, reversed: false };

function valid(words: string[], size: number, directions: DirectionOptions, lang: Lang = 'es'): ValidWordSearch {
  const r = validateWordSearch({ wordsText: words.join('\n'), size, directions }, lang);
  if (!r.ok) throw new Error(`entrada inválida: ${JSON.stringify(r.errors)}`);
  return r.value;
}

function readPlacement(result: WordSearchResult, index: number): string {
  const p = result.placements[index]!;
  return Array.from({ length: p.entry.normalized.length }, (_, i) => result.cells[(p.row + p.dr * i) * result.size + p.col + p.dc * i]).join('');
}

const ANIMALS = ['gato', 'perro', 'conejo', 'caballo', 'oveja', 'vaca', 'gallina', 'pato', 'ñandú', 'pingüino'];

describe('generateWordSearch', () => {
  it('coloca cada palabra legible en su posición para 200 semillas', () => {
    const value = valid(ANIMALS, 12, ALL);
    const vectors = activeVectors(ALL).map(([dr, dc]) => `${dr},${dc}`);
    for (let n = 0; n < 200; n++) {
      const result = generateWordSearch(value, `v1-SEMILLA${n}`, 'es');
      expect(result.cells).toHaveLength(144);
      expect(result.placements.length + result.unplaced.length).toBe(ANIMALS.length);
      result.placements.forEach((p, i) => {
        expect(readPlacement(result, i)).toBe(p.entry.normalized);
        expect(vectors).toContain(`${p.dr},${p.dc}`);
      });
    }
  });

  it('respeta las direcciones permitidas', () => {
    const result = generateWordSearch(valid(ANIMALS.slice(0, 6), 10, H_ONLY), 'v1-HORIZ2', 'es');
    for (const p of result.placements) expect([p.dr, p.dc]).toEqual([0, 1]);
  });

  it('rellena todas las casillas con letras del alfabeto del idioma', () => {
    const es = generateWordSearch(valid(['gato', 'perro'], 10, ALL), 'v1-FILL22', 'es');
    for (const c of es.cells) expect(fillAlphabet('es')).toContain(c);
    const en = generateWordSearch(valid(['cat', 'dog'], 10, ALL, 'en'), 'v1-FILL22', 'en');
    for (const c of en.cells) expect(fillAlphabet('en')).toContain(c);
  });

  it('es determinista por semilla y cambia con otra semilla', () => {
    const value = valid(ANIMALS, 12, ALL);
    expect(generateWordSearch(value, 'v1-ABC234', 'es')).toEqual(generateWordSearch(value, 'v1-ABC234', 'es'));
    expect(generateWordSearch(value, 'v1-ABC234', 'es').cells).not.toEqual(generateWordSearch(value, 'v1-ABC235', 'es').cells);
  });

  it('una sola palabra', () => {
    const result = generateWordSearch(valid(['sol'], 8, H_ONLY), 'v1-SOLO22', 'es');
    expect(result.placements).toHaveLength(1);
    expect(result.unplaced).toEqual([]);
  });

  it('informa de lo que no cabe tras agotar intentos, sin fallar', () => {
    const letters = 'ABCDEFGHI'.split('');
    const words = letters.map((l) => l.repeat(8));
    const result = generateWordSearch(valid(words, 8, H_ONLY), 'v1-LLENO2', 'es');
    expect(result.placements).toHaveLength(8);
    expect(result.unplaced).toHaveLength(1);
    expect(result.cells.every((c) => c !== '')).toBe(true);
  });

  it('coloca cincuenta palabras en 25×25 con todas las direcciones', () => {
    const words = [
      'abeja', 'aguila', 'alce', 'araña', 'ardilla', 'ballena', 'buho', 'burro', 'cabra', 'camello',
      'canguro', 'castor', 'cebra', 'cerdo', 'ciervo', 'cisne', 'cobra', 'colibri', 'delfin', 'elefante',
      'erizo', 'foca', 'gacela', 'garza', 'gorila', 'grillo', 'halcon', 'hiena', 'hormiga', 'iguana',
      'jabali', 'jaguar', 'jirafa', 'koala', 'lagarto', 'lechuza', 'leon', 'lobo', 'loro', 'mapache',
      'medusa', 'mono', 'morsa', 'nutria', 'orca', 'oso', 'panda', 'puma', 'rana', 'tigre',
    ];
    for (const seed of ['v1-GRANDE', 'v1-GRAND2', 'v1-GRAND3']) {
      const result = generateWordSearch(valid(words, 25, ALL), seed, 'es');
      expect(result.unplaced).toEqual([]);
    }
  });
});
