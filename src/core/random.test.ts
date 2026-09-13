import { describe, expect, it } from 'vitest';
import { createRng, formatSeedCode, parseSeedCode, randomSeedBody, SEED_ALPHABET } from './random';

describe('createRng', () => {
  it('produce la secuencia de referencia (detecta cambios de algoritmo)', () => {
    const rng = createRng('v1-K7Q2M9');
    expect(rng.next()).toBeCloseTo(0.8593022204004228, 15);
    expect(rng.next()).toBeCloseTo(0.03764587943442166, 15);
    expect(rng.next()).toBeCloseTo(0.7274851009715348, 15);
  });

  it('es determinista para la misma semilla y distinta para otra', () => {
    const a = createRng('abc');
    const b = createRng('abc');
    const c = createRng('abd');
    const seqA = Array.from({ length: 20 }, () => a.next());
    expect(Array.from({ length: 20 }, () => b.next())).toEqual(seqA);
    expect(Array.from({ length: 20 }, () => c.next())).not.toEqual(seqA);
  });

  it('int devuelve enteros en [0, max)', () => {
    const rng = createRng('v1-K7Q2M9');
    expect(Array.from({ length: 5 }, () => rng.int(100))).toEqual([85, 3, 72, 11, 78]);
    const other = createRng('rango');
    for (let i = 0; i < 1000; i++) {
      const v = other.int(7);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(7);
    }
    expect(() => other.int(0)).toThrow();
  });

  it('shuffle devuelve una permutación sin mutar la entrada', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = createRng('s').shuffle(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect([...out].sort((x, y) => x - y)).toEqual(input);
  });

  it('pick falla con lista vacía', () => {
    expect(() => createRng('p').pick([])).toThrow();
  });

  it('fork es determinista e independiente del consumo posterior del padre', () => {
    const p1 = createRng('padre');
    const f1 = p1.fork('intento-1');
    const p2 = createRng('padre');
    const f2 = p2.fork('intento-1');
    p2.next();
    expect(f1.next()).toBe(f2.next());
    expect(createRng('padre').fork('intento-2').next()).not.toBe(createRng('padre').fork('intento-1').next());
  });
});

describe('códigos de semilla', () => {
  it('formatea y analiza', () => {
    expect(formatSeedCode(1, 'K7Q2M9')).toBe('v1-K7Q2M9');
    expect(parseSeedCode('v1-K7Q2M9')).toEqual({ version: 1, body: 'K7Q2M9' });
    expect(parseSeedCode(' v12-abcd23 ')).toEqual({ version: 12, body: 'ABCD23' });
  });
  it('rechaza códigos mal formados', () => {
    expect(parseSeedCode('K7Q2M9')).toBeNull();
    expect(parseSeedCode('v1-')).toBeNull();
    expect(parseSeedCode('v0-ABC')).toBeNull();
    expect(parseSeedCode('v1-AB C')).toBeNull();
  });
  it('randomSeedBody usa solo el alfabeto sin caracteres ambiguos', () => {
    const body = randomSeedBody();
    expect(body).toHaveLength(6);
    for (const ch of body) expect(SEED_ALPHABET).toContain(ch);
    expect(SEED_ALPHABET).not.toMatch(/[01OIL]/);
  });
});
