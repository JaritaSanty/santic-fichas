import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WordSearchResponse } from '@/workers/wordsearch';
import { createGenerationClient, GENERATION_TIMEOUT_MS, type WorkerLike } from './wordSearchClient';

class FakeWorker implements WorkerLike {
  static created: FakeWorker[] = [];
  messages: Array<{ requestId: number }> = [];
  terminated = false;
  onmessage: ((event: { data: WordSearchResponse }) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  constructor() {
    FakeWorker.created.push(this);
  }
  postMessage(message: unknown) {
    this.messages.push(message as { requestId: number });
  }
  terminate() {
    this.terminated = true;
  }
  reply(response: WordSearchResponse) {
    this.onmessage?.({ data: response });
  }
}

const message = { value: { entries: [], size: 10, directions: { horizontal: true, vertical: false, diagonal: false, reversed: false } }, seedCode: 'v1-FAKE22', lang: 'es' as const };
const okResponse = (requestId: number) => ({ requestId, ok: true, result: { size: 10, cells: [], placements: [], unplaced: [], seedCode: 'v1-FAKE22' } }) as WordSearchResponse;

describe('createGenerationClient', () => {
  beforeEach(() => {
    FakeWorker.created = [];
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('no crea el Worker hasta la primera petición', () => {
    const client = createGenerationClient(() => new FakeWorker());
    expect(FakeWorker.created).toHaveLength(0);
    expect(client.getSnapshot()).toEqual({ status: 'idle', key: null, response: null });
  });

  it('pasa por pending y done notificando a los suscriptores', () => {
    const client = createGenerationClient(() => new FakeWorker());
    const listener = vi.fn();
    client.subscribe(listener);
    client.request('k1', message);
    expect(client.getSnapshot()).toMatchObject({ status: 'pending', key: 'k1' });
    const worker = FakeWorker.created[0]!;
    worker.reply(okResponse(worker.messages[0]!.requestId));
    expect(client.getSnapshot()).toMatchObject({ status: 'done', key: 'k1' });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('no reenvía una clave ya servida', () => {
    const client = createGenerationClient(() => new FakeWorker());
    client.request('k1', message);
    const worker = FakeWorker.created[0]!;
    worker.reply(okResponse(worker.messages[0]!.requestId));
    client.request('k1', message);
    expect(worker.messages).toHaveLength(1);
  });

  it('una petición nueva con el Worker ocupado lo termina y descarta la respuesta vieja', () => {
    const client = createGenerationClient(() => new FakeWorker());
    client.request('k1', message);
    const first = FakeWorker.created[0]!;
    client.request('k2', message);
    expect(first.terminated).toBe(true);
    const second = FakeWorker.created[1]!;
    first.reply(okResponse(first.messages[0]!.requestId));
    expect(client.getSnapshot()).toMatchObject({ status: 'pending', key: 'k2' });
    second.reply(okResponse(second.messages[0]!.requestId));
    expect(client.getSnapshot()).toMatchObject({ status: 'done', key: 'k2' });
  });

  it('agota el tiempo, termina el Worker y permite reintentar la misma clave', () => {
    const client = createGenerationClient(() => new FakeWorker());
    client.request('k1', message);
    vi.advanceTimersByTime(GENERATION_TIMEOUT_MS + 1);
    expect(client.getSnapshot()).toEqual({ status: 'failed', key: 'k1', response: null });
    expect(FakeWorker.created[0]!.terminated).toBe(true);
    client.request('k1', message);
    expect(FakeWorker.created).toHaveLength(2);
  });

  it('un error del Worker marca la petición como fallida', () => {
    const client = createGenerationClient(() => new FakeWorker());
    client.request('k1', message);
    FakeWorker.created[0]!.onerror?.(new Event('error'));
    expect(client.getSnapshot().status).toBe('failed');
  });

  it('dispose termina el Worker y cancela el temporizador', () => {
    const client = createGenerationClient(() => new FakeWorker());
    client.request('k1', message);
    client.dispose();
    expect(FakeWorker.created[0]!.terminated).toBe(true);
    vi.advanceTimersByTime(GENERATION_TIMEOUT_MS + 1);
    expect(client.getSnapshot().status).toBe('pending');
  });
});
