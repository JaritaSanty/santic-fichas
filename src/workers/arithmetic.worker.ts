import { handleArithmeticRequest, type ArithmeticRequest } from '@/workers/arithmetic';

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<ArithmeticRequest>) => void) | null;
  postMessage: (message: unknown) => void;
};

scope.onmessage = (event) => {
  scope.postMessage(handleArithmeticRequest(event.data));
};
