import { createGenerationClient, type GenerationClient, type WorkerLike } from '@/tools/shared/generationClient';
import type { WordSearchRequest, WordSearchResponse } from '@/workers/wordsearch';

export type WordSearchWorkerLike = WorkerLike<WordSearchResponse>;
export type WordSearchClient = GenerationClient<WordSearchRequest, WordSearchResponse>;

/** Envoltura tipada del almacén compartido: fija la petición y la respuesta de la sopa de letras. */
export function createWordSearchClient(createWorker: () => WordSearchWorkerLike): WordSearchClient {
  return createGenerationClient<WordSearchRequest, WordSearchResponse>(createWorker);
}
