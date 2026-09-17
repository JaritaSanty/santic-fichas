import { describe, expect, it } from 'vitest';
import { validateArithmetic } from '@/generators/arithmetic';
import { handleArithmeticRequest } from './arithmetic';

const INPUT = {
  kinds: { add: true, sub: false, mul: false, div: false },
  first: { min: 10, max: 99 },
  second: { min: 10, max: 99 },
  carry: 'any' as const,
  division: 'exact' as const,
  count: 10,
  layout: 'columns' as const,
  columns: 3,
};

describe('handleArithmeticRequest', () => {
  it('devuelve el resultado con el mismo requestId', () => {
    const v = validateArithmetic(INPUT);
    if (!v.ok) throw new Error('entrada');
    const response = handleArithmeticRequest({ requestId: 7, value: v.value, seedCode: 'v1-WORKER' });
    expect(response.requestId).toBe(7);
    expect(response.ok).toBe(true);
    if (!response.ok) throw new Error('respuesta');
    expect(response.result.operations).toHaveLength(10);
    expect(response.result.seedCode).toBe('v1-WORKER');
  });

  it('convierte cualquier excepción en una respuesta genérica sin datos del usuario', () => {
    const broken = { ...INPUT, kinds: null } as unknown as Parameters<typeof handleArithmeticRequest>[0]['value'];
    expect(handleArithmeticRequest({ requestId: 3, value: broken, seedCode: 'v1-WORKER' })).toEqual({ requestId: 3, ok: false });
  });
});
