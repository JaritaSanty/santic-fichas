import { generateArithmetic, type ArithmeticResult, type ValidArithmetic } from '@/generators/arithmetic';

export interface ArithmeticRequest {
  requestId: number;
  value: ValidArithmetic;
  seedCode: string;
}

export type ArithmeticResponse = { requestId: number; ok: true; result: ArithmeticResult } | { requestId: number; ok: false };

export function handleArithmeticRequest(request: ArithmeticRequest): ArithmeticResponse {
  try {
    return { requestId: request.requestId, ok: true, result: generateArithmetic(request.value, request.seedCode) };
  } catch {
    // Nunca se reenvía el error: podría contener los parámetros del docente.
    return { requestId: request.requestId, ok: false };
  }
}
