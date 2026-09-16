import { withBasePath } from '@/core/paths';
import type { PdfAssets } from './renderPdf';

/** webpack emite estos ficheros con huella en _next/static/media y respeta basePath; el SW los precarga. */
export const PDF_ASSET_URLS = {
  sheetRegular: new URL('@fontsource/andika/files/andika-latin-400-normal.woff', import.meta.url).href,
  sheetBold: new URL('@fontsource/andika/files/andika-latin-700-normal.woff', import.meta.url).href,
} as const;

export async function loadPdfAssets(fetcher: typeof fetch = fetch): Promise<PdfAssets> {
  const get = async (url: string) => {
    const response = await fetcher(url);
    if (!response.ok) throw new Error(`Recurso del PDF no disponible (${response.status})`);
    return new Uint8Array(await response.arrayBuffer());
  };
  const [sheetRegular, sheetBold, brandMarkPng] = await Promise.all([
    get(PDF_ASSET_URLS.sheetRegular),
    get(PDF_ASSET_URLS.sheetBold),
    get(withBasePath('/brand/mark-gray.png')),
  ]);
  return { sheetRegular, sheetBold, brandMarkPng };
}
