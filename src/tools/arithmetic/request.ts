import type { ValidArithmetic } from '@/generators/arithmetic';

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
 * Clave de la petición: todo lo que cambia la ficha —operaciones, rangos, llevada, modo de división, cantidad,
 * disposición, columnas y código de semilla—, tomado del valor ya validado (el segundo operando puede venir
 * recortado por `factor-capped`, y es el recortado el que se sortea).
 *
 * El encabezado y el papel **no** entran: solo cambian el marco, que se vuelve a maquetar sin sortear de nuevo.
 * Tampoco el idioma: `generateArithmetic` no lo recibe; la maquetación sí lo usa y se rehace sola.
 */
export function generationKey(value: ValidArithmetic, seedCode: string): string {
  return JSON.stringify({
    kinds: value.kinds,
    first: [value.first.min, value.first.max],
    second: [value.second.min, value.second.max],
    carry: value.carry,
    division: value.division,
    count: value.count,
    layout: value.layout,
    columns: value.columns,
    seedCode,
  });
}
