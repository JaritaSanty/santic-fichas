import { describe, expect, it } from 'vitest';
import { generateArithmetic } from './generate';
import { validateArithmetic } from './params';
import type { ArithmeticInput, CarryMode } from './types';

// Tiempo real: margen amplio en CI, donde las máquinas compartidas son más lentas y variables.
const LIMIT_MS = process.env.CI ? 1200 : 400;

/** Peor caso razonable: el tope de operaciones, rangos que obligan a muestrear y división con resto. */
function timeGeneration(carry: CarryMode): { ms: number; produced: number } {
  const input: ArithmeticInput = {
    kinds: { add: true, sub: true, mul: true, div: true },
    first: { min: 10000, max: 99999 },
    second: { min: 100, max: 999 },
    carry,
    division: 'remainder',
    count: 200,
    layout: 'columns',
    columns: 2,
  };
  const v = validateArithmetic(input);
  if (!v.ok) throw new Error('entrada inválida');
  const start = performance.now();
  const result = generateArithmetic(v.value, 'v1-ESTRES');
  return { ms: performance.now() - start, produced: result.operations.length };
}

describe('coste de la generación en el peor caso', () => {
  it('200 operaciones mixtas de cinco cifras con división con resto', () => {
    const { ms, produced } = timeGeneration('any');
    // Se comprueba el trabajo hecho, no solo el reloj: rendirse y devolver una lista corta también sería rápido.
    expect(produced).toBe(200);
    expect(ms).toBeLessThan(LIMIT_MS);
  });

  it('las mismas sin llevada, donde el muestreo rechaza casi todo', () => {
    const { ms, produced } = timeGeneration('without');
    expect(produced).toBe(200);
    expect(ms).toBeLessThan(LIMIT_MS);
  });
});
