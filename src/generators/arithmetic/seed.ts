import { formatSeedCode, parseSeedCode } from '@/core/random';
import { ARITHMETIC_ALGORITHM_VERSION } from './generate';

export type SeedInput =
  | { status: 'empty' }
  | { status: 'ok'; code: string }
  | { status: 'invalid' }
  | { status: 'other-version'; version: number; expected: number };

/** Lee el código escrito por el docente: solo se acepta la versión actual, porque otra no reproduciría su ficha. */
export function readSeedInput(input: string): SeedInput {
  if (input.trim() === '') return { status: 'empty' };
  const parsed = parseSeedCode(input);
  if (!parsed) return { status: 'invalid' };
  if (parsed.version !== ARITHMETIC_ALGORITHM_VERSION) return { status: 'other-version', version: parsed.version, expected: ARITHMETIC_ALGORITHM_VERSION };
  return { status: 'ok', code: formatSeedCode(parsed.version, parsed.body) };
}
