import { describe, expect, it } from 'vitest';
import { validateWordSearch } from '@/generators/wordsearch';
import { handleWordSearchRequest } from './wordsearch';

const ALL = { horizontal: true, vertical: true, diagonal: true, reversed: false };

describe('handleWordSearchRequest', () => {
  it('devuelve el resultado con el mismo requestId', () => {
    const v = validateWordSearch({ wordsText: 'gato\nperro', size: 10, directions: ALL }, 'es');
    if (!v.ok) throw new Error('entrada');
    const response = handleWordSearchRequest({ requestId: 7, value: v.value, seedCode: 'v1-WORKER', lang: 'es' });
    expect(response.requestId).toBe(7);
    expect(response.ok).toBe(true);
  });

  it('convierte cualquier excepción en una respuesta genérica sin datos del usuario', () => {
    const broken = { entries: null, size: 10, directions: ALL } as unknown as Parameters<typeof handleWordSearchRequest>[0]['value'];
    expect(handleWordSearchRequest({ requestId: 3, value: broken, seedCode: 'v1-WORKER', lang: 'es' })).toEqual({ requestId: 3, ok: false });
  });
});
