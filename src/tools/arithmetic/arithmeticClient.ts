import { createGenerationClient, type GenerationClient, type WorkerLike } from '@/tools/shared/generationClient';
import type { ArithmeticRequest, ArithmeticResponse } from '@/workers/arithmetic';

export type ArithmeticWorkerLike = WorkerLike<ArithmeticResponse>;
export type ArithmeticClient = GenerationClient<ArithmeticRequest, ArithmeticResponse>;

/** Envoltura tipada del almacén compartido: fija la petición y la respuesta del cuadernillo de operaciones. */
export function createArithmeticClient(createWorker: () => ArithmeticWorkerLike): ArithmeticClient {
  return createGenerationClient<ArithmeticRequest, ArithmeticResponse>(createWorker);
}
