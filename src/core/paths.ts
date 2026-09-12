const VALID_SEGMENTS = /^(\/[A-Za-z0-9._~-]+)*$/;

/** Normaliza NEXT_PUBLIC_BASE_PATH a '' o '/segmento[/segmento]'. Lanza si es inválido. */
export function normalizeBasePath(raw: string | undefined): string {
  const trimmed = (raw ?? '').trim().replace(/\/+$/, '');
  if (trimmed === '') return '';
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  if (!VALID_SEGMENTS.test(withSlash)) {
    throw new Error(`NEXT_PUBLIC_BASE_PATH inválido: "${raw}". Usa un valor como "/fichas" o déjalo vacío.`);
  }
  return withSlash;
}

export const BASE_PATH: string = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/** Prefija una ruta interna absoluta con el basePath. Usar para todo recurso que no pase por next/link. */
export function withBasePath(path: string, basePath: string = BASE_PATH): string {
  if (!path.startsWith('/')) throw new Error(`La ruta "${path}" debe empezar por /`);
  return `${basePath}${path}`;
}
