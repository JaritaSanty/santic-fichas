import type { WordSearchRequest, WordSearchResponse } from '@/workers/wordsearch';

export const GENERATION_TIMEOUT_MS = 1500;

export type GenerationStatus = 'idle' | 'pending' | 'done' | 'failed';

export interface GenerationSnapshot {
  status: GenerationStatus;
  key: string | null;
  /** Última respuesta recibida; durante `pending` se conserva la anterior para no vaciar la vista previa. */
  response: WordSearchResponse | null;
}

export interface WorkerLike {
  postMessage(message: unknown): void;
  terminate(): void;
  onmessage: ((event: { data: WordSearchResponse }) => void) | null;
  onerror: ((event: unknown) => void) | null;
}

/** Almacén externo (useSyncExternalStore): posee el Worker, invalida peticiones viejas y aplica el tiempo máximo. */
export function createGenerationClient(createWorker: () => WorkerLike) {
  let worker: WorkerLike | null = null;
  let busy = false;
  let nextId = 0;
  let currentId = -1;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let snapshot: GenerationSnapshot = { status: 'idle', key: null, response: null };
  const listeners = new Set<() => void>();

  const emit = (next: GenerationSnapshot) => {
    snapshot = next;
    for (const listener of listeners) listener();
  };
  const clearTimer = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  const dropWorker = () => {
    worker?.terminate();
    worker = null;
    busy = false;
  };
  const ensureWorker = () => {
    if (worker) return worker;
    const created = createWorker();
    created.onmessage = (event) => {
      if (event.data.requestId !== currentId) return;
      busy = false;
      clearTimer();
      emit({ status: event.data.ok ? 'done' : 'failed', key: snapshot.key, response: event.data });
    };
    created.onerror = () => {
      if (!busy) return;
      clearTimer();
      dropWorker();
      emit({ status: 'failed', key: snapshot.key, response: null });
    };
    worker = created;
    return created;
  };

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,
    request(key: string, message: Omit<WordSearchRequest, 'requestId'>) {
      if (key === snapshot.key && snapshot.status !== 'failed') return;
      clearTimer();
      if (busy) dropWorker();
      currentId = nextId++;
      busy = true;
      emit({ status: 'pending', key, response: snapshot.response });
      ensureWorker().postMessage({ ...message, requestId: currentId });
      timer = setTimeout(() => {
        if (!busy) return;
        dropWorker();
        emit({ status: 'failed', key, response: null });
      }, GENERATION_TIMEOUT_MS);
    },
    dispose() {
      clearTimer();
      dropWorker();
      listeners.clear();
    },
  };
}

export type GenerationClient = ReturnType<typeof createGenerationClient>;
