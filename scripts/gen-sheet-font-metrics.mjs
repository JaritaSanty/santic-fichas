import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { extractMetrics, renderMetricsModule, SHEET_FONT_FILES } from './lib/font-metrics.mjs';

const require = createRequire(import.meta.url);
const metrics = Object.fromEntries(
  Object.entries(SHEET_FONT_FILES).map(([id, spec]) => [id, extractMetrics(readFileSync(require.resolve(spec)))]),
);
writeFileSync('src/core/sheetFontMetrics.ts', renderMetricsModule(metrics));
process.stdout.write(`Métricas escritas: sheet ${Object.keys(metrics.sheet.advances).length} glifos, sheetBold ${Object.keys(metrics.sheetBold.advances).length} glifos\n`);
