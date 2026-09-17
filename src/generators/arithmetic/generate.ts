import { createRng, formatSeedCode, parseSeedCode } from '@/core/random';
import { drawOperations } from './space';
import type { Operation, OperationKind, ValidArithmetic } from './types';

export const ARITHMETIC_ALGORITHM_VERSION = 1;

export interface ArithmeticResult {
  operations: Operation[];
  /** Operaciones pedidas; si `operations.length` es menor, el espacio no daba para más. */
  requested: number;
  seedCode: string;
  version: number;
}

/** Reparto entero de `total` en `parts`: `base` para todas y el resto de una en una, en orden. */
function shareOut(total: number, parts: number): number[] {
  const base = Math.floor(total / parts);
  const rest = total - base * parts;
  return Array.from({ length: parts }, (_, i) => base + (i < rest ? 1 : 0));
}

/**
 * Forma canónica del código antes de sembrar: el hash distingue mayúsculas de minúsculas, así que sin esto
 * `v1-abc234` y `v1-ABC234` —el mismo código para el docente— darían fichas distintas. Un código que no se puede
 * interpretar se siembra tal cual (recortado): generar algo reproducible es mejor que rechazarlo aquí.
 */
function canonicalSeed(seedCode: string): string {
  const parsed = parseSeedCode(seedCode);
  return parsed ? formatSeedCode(parsed.version, parsed.body) : seedCode.trim();
}

/**
 * Operaciones de una ficha a partir de los parámetros validados y el código de semilla.
 *
 * El cupo se reparte a partes iguales entre las operaciones elegidas (el resto, de una en una, siguiendo el orden
 * canónico). Cada operación se sortea con su propio subgenerador: `drawOperations` consume el azar una cantidad
 * variable según el camino y los rechazos, así que compartir un generador haría que cada operación dependiera de
 * las anteriores. Con el subgenerador propio, cambiar una operación no cambia las demás.
 *
 * Si alguna aporta menos de lo que le tocaba (su espacio se agotó) el déficit se reparte entre las que sí cubrieron
 * su cupo, y cada una de ellas se vuelve a sortear entera —con el mismo subgenerador, así que el lote nuevo empieza
 * por el anterior— en lugar de pedirle un segundo lote, que podría repetir pares. Las que se quedaron cortas no se
 * reintentan: un sorteo corto es autoritativo, con los mismos parámetros no van a aparecer más.
 *
 * Ese reparto se repite **mientras queden operaciones pendientes y alguna elegible haya crecido**, no una sola vez.
 * Con una sola vuelta el total producido no era monótono en `count`: con dos operaciones sin espacio, pedir 200 daba
 * 75 y pedir esas mismas 75 daba 58, así que seguir la sugerencia de «pide menos» encogía la ficha una y otra vez.
 * El bucle termina siempre y en pocas vueltas: una elegible que entrega menos de lo que se le pide deja de serlo para
 * siempre (el sorteo corto es autoritativo), y si todas entregan lo pedido no queda nada pendiente, así que hay como
 * mucho una vuelta por operación elegida más una.
 *
 * El código de semilla se lleva a su forma canónica antes de sembrar, y es esa la que vuelve en el resultado.
 */
export function generateArithmetic(value: ValidArithmetic, seedCode: string): ArithmeticResult {
  const code = canonicalSeed(seedCode);
  const root = createRng(code);
  const kinds = value.kinds;
  const requested = value.count;

  // `wanted[i]` es lo que se le está pidiendo a cada operación: empieza en su cupo y crece con el déficit que asuma.
  const wanted = shareOut(requested, kinds.length);
  const drawOf = (index: number, n: number): Operation[] => {
    const kind = kinds[index] as OperationKind;
    const rng = root.fork(kind);
    return drawOperations(kind, value, n, () => rng.next());
  };

  const drawn = kinds.map((_, i) => drawOf(i, wanted[i] as number));
  const placed = (): number => drawn.reduce((sum, ops) => sum + ops.length, 0);

  // Vueltas de reparto: el déficit se reparte entre las operaciones que entregaron todo lo que se les pidió, en el
  // orden canónico y redondeando hacia arriba (las primeras cargan con el resto, igual que en el reparto inicial).
  // La parte de la que no pueda dar más pasa a las siguientes, porque el reparto se recalcula sobre lo que queda.
  // El orden y el redondeo son parte del algoritmo v1 (los congela el fixture dorado).
  let grew = true;
  while (grew && placed() < requested) {
    grew = false;
    const eligible = kinds.map((_, i) => i).filter((i) => (drawn[i] as Operation[]).length >= (wanted[i] as number));
    for (let n = 0; n < eligible.length; n++) {
      const pending = requested - placed();
      if (pending <= 0) break;
      const i = eligible[n] as number;
      const extra = Math.ceil(pending / (eligible.length - n));
      const before = (drawn[i] as Operation[]).length;
      // `wanted + extra` nunca supera lo pedido: en una elegible `wanted == before` y `extra <= requested - sorteadas`.
      wanted[i] = (wanted[i] as number) + extra;
      const again = drawOf(i, wanted[i] as number);
      drawn[i] = again;
      if (again.length > before) grew = true;
    }
  }

  // Se baraja la lista combinada: cada sublista ya viene barajada, pero saldrían agrupadas por operación.
  return {
    operations: root.fork('shuffle').shuffle(drawn.flat()),
    requested,
    seedCode: code,
    version: ARITHMETIC_ALGORITHM_VERSION,
  };
}
