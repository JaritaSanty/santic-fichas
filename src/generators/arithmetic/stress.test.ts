import { describe, expect, it } from 'vitest';
import { generateArithmetic } from './generate';
import { validateArithmetic } from './params';
import type { ArithmeticInput, CarryMode } from './types';

// Tiempo real: margen amplio en CI, donde las máquinas compartidas son más lentas y variables.
const LIMIT_MS = process.env.CI ? 1200 : 400;

/** Peor caso razonable: el tope de operaciones, rangos que obligan a muestrear y división con resto. */
function timeGeneration(carry: CarryMode): number {
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
  generateArithmetic(v.value, 'v1-ESTRES');
  return performance.now() - start;
}

describe('coste de la generación en el peor caso', () => {
  it('200 operaciones mixtas de cinco cifras con división con resto', () => {
    expect(timeGeneration('any')).toBeLessThan(LIMIT_MS);
  });

  it('las mismas sin llevada, donde el muestreo rechaza casi todo', () => {
    expect(timeGeneration('without')).toBeLessThan(LIMIT_MS);
  });
});
