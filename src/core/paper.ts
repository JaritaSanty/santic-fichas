export type PaperSize = 'a4' | 'letter';

export interface PaperSpec {
  widthMm: number;
  heightMm: number;
  cssPageSize: 'A4' | 'letter';
}

export const PAPER: Record<PaperSize, PaperSpec> = {
  a4: { widthMm: 210, heightMm: 297, cssPageSize: 'A4' },
  letter: { widthMm: 215.9, heightMm: 279.4, cssPageSize: 'letter' },
};

export const SHEET_MARGIN_MM = 12;

/** Regiones donde el papel Carta es el habitual en centros educativos. */
export const LETTER_REGIONS: ReadonlySet<string> = new Set([
  'US', 'CA', 'MX', 'PH', 'CL', 'CO', 'VE', 'CR', 'GT', 'PA', 'DO', 'PR', 'SV', 'NI', 'HN',
]);

/** Usa la primera etiqueta de idioma que declare región; sin región conocida, A4. */
export function defaultPaperFor(locales: readonly string[]): PaperSize {
  for (const tag of locales) {
    let region: string | undefined;
    try {
      region = new Intl.Locale(tag).region;
    } catch {
      continue;
    }
    if (region) return LETTER_REGIONS.has(region) ? 'letter' : 'a4';
  }
  return 'a4';
}
