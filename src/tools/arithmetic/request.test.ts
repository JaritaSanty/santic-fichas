import { describe, expect, it } from 'vitest';
import { validateArithmetic, type ArithmeticInput, type Operation, type OperationKind } from '@/generators/arithmetic';
import { generationKey, missingKinds, readNumberField } from './request';

const BASE: ArithmeticInput = {
  kinds: { add: true, sub: true, mul: false, div: false },
  first: { min: 10, max: 99 },
  second: { min: 10, max: 99 },
  carry: 'any',
  division: 'exact',
  count: 20,
  layout: 'columns',
  columns: 4,
};

function keyFor(patch: Partial<ArithmeticInput> = {}, seedCode = 'v1-ABC234'): string {
  const validation = validateArithmetic({ ...BASE, ...patch });
  if (!validation.ok) throw new Error('entrada inválida');
  return generationKey(validation.value, seedCode);
}

describe('petición del cuadernillo', () => {
  it('la misma entrada da la misma clave', () => {
    expect(keyFor()).toBe(keyFor());
  });

  it.each([
    ['operaciones', { kinds: { add: true, sub: false, mul: false, div: false } }],
    ['primer número', { first: { min: 10, max: 98 } }],
    ['segundo número', { second: { min: 11, max: 99 } }],
    ['llevada', { carry: 'without' }],
    ['cantidad', { count: 21 }],
  ] as [string, Partial<ArithmeticInput>][])('cambiar %s cambia la clave', (_label, patch) => {
    expect(keyFor(patch)).not.toBe(keyFor());
  });

  // La disposición y las columnas son de la maquetación, como el papel o el encabezado: `generateArithmetic` no las
  // lee, así que volver a sortear devolvería el mismo cuadernillo tras un debounce y una vuelta al Worker, dejando
  // mientras tanto la ficha sin vigencia (y sin el aviso de columnas recortadas ni el panel de ficha corta).
  it.each([
    ['disposición', { layout: 'inline' }],
    ['columnas', { columns: 3 }],
  ] as [string, Partial<ArithmeticInput>][])('cambiar %s no cambia la clave', (_label, patch) => {
    expect(keyFor(patch)).toBe(keyFor());
  });

  it('el modo de división cambia la clave cuando hay divisiones', () => {
    const withDiv: Partial<ArithmeticInput> = { kinds: { add: false, sub: false, mul: false, div: true }, second: { min: 2, max: 9 } };
    expect(keyFor({ ...withDiv, division: 'remainder' })).not.toBe(keyFor(withDiv));
  });

  it('cambiar la semilla cambia la clave', () => {
    expect(keyFor({}, 'v1-ZZZ999')).not.toBe(keyFor());
  });

  it('usa el segundo operando ya recortado a los factores', () => {
    // Con multiplicación, `validateArithmetic` recorta el segundo número a 999: dos rangos distintos por encima del
    // tope sortean lo mismo y deben compartir clave.
    const mul = { add: false, sub: false, mul: true, div: false };
    expect(keyFor({ kinds: mul, second: { min: 10, max: 5000 } })).toBe(keyFor({ kinds: mul, second: { min: 10, max: 9999 } }));
  });
});

describe('operaciones que no han salido', () => {
  const op = (kind: OperationKind): Operation => ({ kind, a: 10, b: 2, result: 5, remainder: 0 });
  const ALL: OperationKind[] = ['add', 'sub', 'mul', 'div'];

  it('señala la operación elegida que no ha aportado ninguna', () => {
    expect(missingKinds(ALL, [op('add'), op('sub'), op('mul')], 20)).toEqual(['div']);
    expect(missingKinds(ALL, ALL.map(op), 20)).toEqual([]);
  });

  // `shareOut(2, 4)` es [1, 1, 0, 0]: a la multiplicación y a la división no se les ha pedido ninguna, así que no
  // haberlas sacado no es culpa de los rangos y la ficha está completa.
  it('calla cuando el cupo repartido deja alguna operación en cero', () => {
    expect(missingKinds(ALL, [op('add'), op('sub')], 2)).toEqual([]);
    expect(missingKinds(ALL, [op('add'), op('sub'), op('mul')], 3)).toEqual([]);
    // Con tantos ejercicios como operaciones a todas les toca al menos una, y entonces sí se dice.
    expect(missingKinds(ALL, [op('add'), op('sub'), op('mul')], 4)).toEqual(['div']);
  });
});

describe('campos numéricos', () => {
  it('lee las cifras escritas, con espacios alrededor', () => {
    expect(readNumberField('20')).toBe(20);
    expect(readNumberField(' 007 ')).toBe(7);
    expect(readNumberField('0')).toBe(0);
  });

  it('un campo vacío o a medias da NaN en vez de un número inventado', () => {
    for (const text of ['', '   ', '-', '-3', '1e3', '2,5', '2.5', '12a', '1234567890']) {
      expect(readNumberField(text)).toBeNaN();
    }
  });

  it('la cantidad vacía la rechaza la validación por el camino de siempre', () => {
    const validation = validateArithmetic({ ...BASE, count: readNumberField('') });
    expect(validation.ok).toBe(false);
    expect(!validation.ok && validation.errors).toContainEqual({ code: 'count-out-of-range', min: 1, max: 200 });
  });

  it('un extremo de rango vacío lo rechaza la validación como valor fuera de rango', () => {
    const validation = validateArithmetic({ ...BASE, first: { min: readNumberField(''), max: 99 } });
    expect(validation.ok).toBe(false);
    expect(!validation.ok && validation.errors).toContainEqual({ code: 'operand-out-of-range', operand: 'first', min: 0, max: 99999 });
  });
});
