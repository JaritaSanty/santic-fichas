import type { Operation, OperationKind, ValidArithmetic } from '@/generators/arithmetic';

/** Solo cifras: un campo vacío o a medias («», «-», «1e», «2,5») da NaN y la validación lo rechaza sin romper la vista. */
const DIGITS = /^\d{1,9}$/;

/**
 * Número escrito por el docente. Nunca lanza ni inventa un valor: devuelve `NaN`, que `validateArithmetic` convierte
 * en el mismo error que un valor fuera de rango, así que la vista previa conserva la ficha anterior y no se pide nada.
 */
export function readNumberField(text: string): number {
  const trimmed = text.trim();
  return DIGITS.test(trimmed) ? Number(trimmed) : Number.NaN;
}

/**
 * Clave de la petición: todo lo que cambia **el sorteo** —operaciones, rangos, llevada, modo de división, cantidad y
 * código de semilla—, tomado del valor ya validado (el segundo operando puede venir recortado por `factor-capped`,
 * y es el recortado el que se sortea).
 *
 * El encabezado y el papel **no** entran: solo cambian el marco, que se vuelve a maquetar sin sortear de nuevo.
 * Tampoco la disposición ni las columnas: `generateArithmetic` no las lee, así que pedirlas de nuevo costaba un
 * debounce y una vuelta al Worker para recibir el mismo cuadernillo, y mientras tanto la ficha dejaba de estar
 * vigente y desaparecían justo los avisos que ese cambio debe destapar (columnas recortadas, ficha corta). Tampoco
 * el idioma: `generateArithmetic` no lo recibe; la maquetación sí lo usa y se rehace sola.
 */
export function generationKey(value: ValidArithmetic, seedCode: string): string {
  return JSON.stringify({
    kinds: value.kinds,
    first: [value.first.min, value.first.max],
    second: [value.second.min, value.second.max],
    carry: value.carry,
    division: value.division,
    count: value.count,
    seedCode,
  });
}

/**
 * Operaciones elegidas que no han aportado ninguna a la ficha. El generador reparte el cupo a partes iguales
 * (`shareOut`), así que **con menos ejercicios que operaciones elegidas hay operaciones a las que les tocan cero**:
 * con 2 ejercicios y las cuatro marcadas, la multiplicación y la división no salen porque no se les ha pedido
 * ninguna, y decir «no ha salido ninguna multiplicación con estas opciones» culparía a los rangos de algo que no
 * han hecho, con la ficha además completa. Por eso solo se señala cuando a todas les tocaba al menos una.
 */
export function missingKinds(kinds: readonly OperationKind[], operations: readonly Operation[], requested: number): OperationKind[] {
  if (requested < kinds.length) return [];
  return kinds.filter((kind) => !operations.some((op) => op.kind === kind));
}
