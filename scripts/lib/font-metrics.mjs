import fontkit from '@pdf-lib/fontkit';

/** Ficheros de la tipografía de ficha (mismo subconjunto latin que la web y que el PDF). */
export const SHEET_FONT_FILES = {
  sheet: '@fontsource/andika/files/andika-latin-400-normal.woff',
  sheetBold: '@fontsource/andika/files/andika-latin-700-normal.woff',
};

/** Avances por punto de código (unidades de diseño) de los glifos presentes en la fuente. */
export function extractMetrics(bytes) {
  const font = fontkit.create(bytes);
  const advances = {};
  for (const cp of [...font.characterSet].sort((a, b) => a - b)) {
    if (cp >= 0xfffe) continue;
    const glyph = font.glyphForCodePoint(cp);
    if (!glyph || glyph.id === 0) continue;
    advances[cp] = glyph.advanceWidth;
  }
  return { unitsPerEm: font.unitsPerEm, ascent: font.ascent, descent: font.descent, capHeight: font.capHeight, advances };
}

export function renderMetricsModule(metrics) {
  const block = (m) =>
    `{ unitsPerEm: ${m.unitsPerEm}, ascent: ${m.ascent}, descent: ${m.descent}, capHeight: ${m.capHeight}, advances: { ${Object.entries(m.advances)
      .map(([cp, adv]) => `${cp}: ${adv}`)
      .join(', ')} } }`;
  return [
    '// Generado por scripts/gen-sheet-font-metrics.mjs desde @fontsource/andika (woff, subconjunto latin). No editar a mano.',
    '',
    'export const SHEET_FONT_METRICS = {',
    `  sheet: ${block(metrics.sheet)},`,
    `  sheetBold: ${block(metrics.sheetBold)},`,
    '} as const;',
    '',
  ].join('\n');
}
