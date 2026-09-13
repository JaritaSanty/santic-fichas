import type { Lang } from '@/core/lang';
import { generateWordSearch, type ValidWordSearch, type WordSearchResult } from '@/generators/wordsearch';

export interface WordSearchRequest {
  requestId: number;
  value: ValidWordSearch;
  seedCode: string;
  lang: Lang;
}

export type WordSearchResponse = { requestId: number; ok: true; result: WordSearchResult } | { requestId: number; ok: false };

export function handleWordSearchRequest(request: WordSearchRequest): WordSearchResponse {
  try {
    return { requestId: request.requestId, ok: true, result: generateWordSearch(request.value, request.seedCode, request.lang) };
  } catch {
    // Nunca se reenvía el error: podría contener palabras del docente.
    return { requestId: request.requestId, ok: false };
  }
}
