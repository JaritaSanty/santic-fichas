export const GENERATION_TIMEOUT_MS = 1500;

export type GenerationStatus = 'idle' | 'pending' | 'done' | 'failed';

/** Contrato mínimo que el cliente necesita de cualquier Worker de generación: nunca reenvía el texto de un error. */
export interface GenerationResponse {
  requestId: number;
  ok: boolean;
}

export interface GenerationRequest {
  requestId: number;
}

export interface GenerationSnapshot<R extends GenerationResponse> {
  status: GenerationStatus;
  key: string | null;
  /** Última respuesta recibida; durante `pending` se conserva la anterior para no vaciar la vista previa. */
  response: R | null;
}

export interface WorkerLike<R extends GenerationResponse> {
  postMessage(message: unknown): void;
  terminate(): void;
  onmessage: ((event: { data: R }) => void) | null;
  onerror: ((event: unknown) => void) | null;
}

export interface GenerationClient<Req extends GenerationRequest, R extends GenerationResponse> {
  subscribe(listener: () => void): () => void;
  getSnapshot(): GenerationSnapshot<R>;
  request(key: string, message: Omit<Req, 'requestId'>): void;
  dispose(): void;
}

/**
 * Almacén externo (useSyncExternalStore): posee el Worker, invalida peticiones viejas y aplica el tiempo máximo.
 * No conoce ningún generador: la herramienta concreta fija `Req` y `R` al crear su cliente.
 */
export function createGenerationClient<Req extends GenerationRequest, R extends GenerationResponse>(
  createWorker: () => WorkerLike<R>,
): GenerationClient<Req, R> {
  let worker: WorkerLike<R> | null = null;
  let busy = false;
  let nextId = 0;
  let currentId = -1;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let snapshot: GenerationSnapshot<R> = { status: 'idle', key: null, response: null };
  const listeners = new Set<() => void>();

  const emit = (next: GenerationSnapshot<R>) => {
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
    request(key: string, message: Omit<Req, 'requestId'>) {
      if (key === snapshot.key && snapshot.status !== 'failed') return;
      clearTimer();
      if (busy) dropWorker();
      currentId = nextId++;
      busy = true;
      emit({ status: 'pending', key, response: snapshot.response });
      try {
        ensureWorker().postMessage({ ...message, requestId: currentId });
      } catch {
        // Sin Worker (creación bloqueada o mensaje no clonable): error genérico en vez de quedar pendiente.
        dropWorker();
        emit({ status: 'failed', key, response: null });
        return;
      }
      timer = setTimeout(() => {
        timer = null;
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
