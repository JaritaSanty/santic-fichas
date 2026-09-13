import http from 'node:http';
import { expect, test } from '@playwright/test';

/** Pide `path` (relativo a `baseURL`) por HTTP crudo, sin que el cliente de Playwright rechace la URL mal codificada. */
function rawGetStatus(baseURL: string, path: string): Promise<number> {
  const url = new URL(path, baseURL);
  return new Promise((resolve, reject) => {
    const req = http.request(url, (res) => {
      res.resume();
      res.on('end', () => resolve(res.statusCode ?? 0));
    });
    req.on('error', reject);
    req.end();
  });
}

test.describe('servidor estático', () => {
  test('una URL mal codificada responde 400 y no tumba el servidor', async ({ request, baseURL }) => {
    let status: number;
    try {
      status = (await request.get('%')).status();
    } catch {
      // El cliente de Playwright puede rechazar la URL mal codificada antes de enviarla:
      // se comprueba entonces con una petición HTTP cruda.
      status = await rawGetStatus(baseURL!, '%');
    }
    expect(status).toBe(400);

    // El servidor debe seguir respondiendo con normalidad tras la petición mal codificada.
    expect((await request.get('es/')).status()).toBe(200);
  });
});
