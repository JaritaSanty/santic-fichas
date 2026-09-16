import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { extractMetrics, renderMetricsModule, SHEET_FONT_FILES } from './font-metrics.mjs';

const require = createRequire(import.meta.url);

describe('métricas de la tipografía de ficha', () => {
  it('src/core/sheetFontMetrics.ts coincide con las fuentes instaladas (ejecutar pnpm metrics:fonts si falla)', () => {
    const metrics = Object.fromEntries(
      Object.entries(SHEET_FONT_FILES).map(([id, spec]) => [id, extractMetrics(readFileSync(require.resolve(spec)))]),
    );
    expect(readFileSync('src/core/sheetFontMetrics.ts', 'utf8')).toBe(renderMetricsModule(metrics));
  });
});
