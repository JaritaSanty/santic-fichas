import { handleWordSearchRequest, type WordSearchRequest } from '@/workers/wordsearch';

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<WordSearchRequest>) => void) | null;
  postMessage: (message: unknown) => void;
};

scope.onmessage = (event) => {
  scope.postMessage(handleWordSearchRequest(event.data));
};
