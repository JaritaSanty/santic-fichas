export interface DirectionOptions {
  horizontal: boolean;
  vertical: boolean;
  diagonal: boolean;
  reversed: boolean;
}

/** [fila, columna] por paso. */
export type Vector = readonly [dr: number, dc: number];

const flip = (n: number) => (n === 0 ? 0 : -n);

export function activeVectors(options: DirectionOptions): Vector[] {
  const base: Vector[] = [];
  if (options.horizontal) base.push([0, 1]);
  if (options.vertical) base.push([1, 0]);
  if (options.diagonal) base.push([1, 1], [-1, 1]);
  return options.reversed ? [...base, ...base.map(([dr, dc]) => [flip(dr), flip(dc)] as const)] : base;
}
