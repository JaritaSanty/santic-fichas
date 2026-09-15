import { describe, expect, it } from 'vitest';
import { validateWordSearch, type DirectionOptions } from '@/generators/wordsearch';
import { generationKey, removeWordLines } from './request';

const DIRS: DirectionOptions = { horizontal: true, vertical: true, diagonal: true, reversed: false };

function keyFor(text: string): string {
  const v = validateWordSearch({ wordsText: text, size: 10, directions: DIRS }, 'es');
  if (!v.ok) throw new Error('entrada inválida');
  return generationKey(v.value.entries, 10, DIRS, 'v1-ABC234', 'es');
}

describe('petición de la sopa de letras', () => {
  it('cambiar solo una tilde o una mayúscula cambia la clave', () => {
    expect(keyFor('arbol\ngato')).not.toBe(keyFor('árbol\ngato'));
    expect(keyFor('arbol\ngato')).not.toBe(keyFor('arbol\nGato'));
    expect(keyFor('arbol\ngato')).toBe(keyFor('arbol\ngato'));
  });

  it('«Generar sin estas palabras» quita las líneas por palabra, no por número de línea', () => {
    // El resultado se calculó con «perro» en la línea 2; después se insertó una línea arriba.
    const text = 'vaca\ngato\nperro\nconejo';
    expect(removeWordLines(text, ['PERRO'], 'es')).toBe('vaca\ngato\nconejo');
  });

  it('quita también las repeticiones y las variantes con tilde de la palabra no colocada', () => {
    expect(removeWordLines('Ñandú\ngato\nñandu\n\naño 2', ['ÑANDU'], 'es')).toBe('gato\n\naño 2');
  });
});
