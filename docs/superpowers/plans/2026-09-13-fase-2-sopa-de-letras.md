# Fase 2 — Generador de sopa de letras de extremo a extremo: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sopa de letras completa: entrada validada, colocación con retroceso y semilla reproducible en un Web Worker, maquetación con lista y hoja de soluciones, vista previa de prueba de imprenta, impresión directa y descarga en PDF con tipografía incrustada, en español e inglés.

**Architecture:** El generador (`generators/wordsearch`) produce datos puros; `layout/wordsearch` los convierte en un `SheetDocument` en milímetros medido con métricas reales de Andika guardadas en `core`; `render/svg` y el nuevo `render/pdf` (carga diferida) dibujan el mismo documento. La UI (`tools/wordsearch`) orquesta el Worker mediante un almacén externo leído con `useSyncExternalStore`.

**Tech Stack:** Next.js 16.3.5 (webpack), React 19.2.8, TypeScript 5.9.3, Tailwind CSS 4.3.3, pdf-lib 1.17.1, @pdf-lib/fontkit 1.1.1, pdfjs-dist 6.3.289 (solo pruebas), Vitest 5.0.0, Playwright 1.63.0.

**Spec:** [docs/superpowers/specs/2026-09-12-generador-fichas-design.md](../specs/2026-09-12-generador-fichas-design.md) · Informe de Fase 1 (Anexo C = pendientes de esta fase): [docs/superpowers/reports/2026-09-12-fase-1-cierre.md](../reports/2026-09-12-fase-1-cierre.md) · Contrato de dirección con aplazamientos: `.impeccable/surfaces/src-app-lang-section-page-tsx.md`

## Global Constraints

- Procesamiento 100 % en navegador. Sin backend, rutas de API, base de datos, autenticación ni analítica.
- Build y dev con webpack; `output: 'export'`; `basePath` desde `NEXT_PUBLIC_BASE_PATH`; ninguna ruta absoluta escrita a mano (`next/link` o `withBasePath()`).
- TypeScript estricto con `noUncheckedIndexedAccess`; ESLint 0 errores y 0 advertencias; `no-console` es error; `../` prohibido en importaciones (sí se permite dentro de cadenas `new URL('../…', import.meta.url)`).
- Fronteras (spec §4.3): `generators/wordsearch` solo `core`; `layout/wordsearch` solo `core`, `layout/common` y `generators/wordsearch`; `render/pdf` solo `core` y paquetes; `workers` solo `core` y `generators`; `tools/*` nunca `ads`, `components`, `content` ni otras herramientas, y `render/pdf` solo mediante `import()` dinámico.
- Presupuesto de primera vista < 300 KB; `pdf-lib`/fontkit nunca en chunks iniciales.
- Sin estado del usuario en URL ni almacenamiento (única clave: `santic-lang`); nada de lo escrito en consola, peticiones ni cachés.
- Fichas en escala de grises (`TONE_HEX`). Voz de la interfaz en español impersonal (sin tuteo ni usted).
- Límites de la sopa (spec §5.2): 1–50 palabras, cuadrícula 8–25, direcciones horizontal/vertical/diagonal + invertidas, al menos una base activa; celda mínima 6 mm; cuadrícula nunca partida entre páginas.
- Semilla: código `v{versión}-{cuerpo}`; misma semilla canónica + mismos parámetros + misma versión → misma ficha.
- PDF: pdf-lib + @pdf-lib/fontkit con **WOFF y `subset: true`** (verificado en Fase 2: WOFF2 con subconjunto rompe fontkit; WOFF incrusta TrueType `FontFile2` y extrae «ÑANDÚ pingüino ¿Qué? Nº 5 — «años» Ç ß» sin sustituciones). Andika no tiene `kern`: la suma de avances coincide con el ancho de pdf-lib.
- Antes de cualquier edición de UI: leer `.claude/skills/impeccable/reference/craft-floor.md`, `DESIGN.md` y el contrato de dirección.
- Commits: Conventional Commits en español terminados con `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`.
- E2E: `pnpm build:e2e`, servidor manual `NEXT_PUBLIC_BASE_PATH=/fichas PORT=4173 node scripts/serve-out.mjs` y `pnpm exec playwright test` (reutiliza el servidor fuera de CI).

## Decisiones de diseño de esta fase

- Las métricas de Andika (regular y bold, subconjunto latin) se generan con `scripts/gen-sheet-font-metrics.mjs` y se versionan en `src/core/sheetFontMetrics.ts`; una prueba detecta desfase respecto a `@fontsource/andika`.
- Los textos del encabezado se ajustan por ancho medido (título 7→4,5 mm; centro 3,5→2,8 mm) y, si aún no caben, se acortan con «…». Los caracteres sin glifo en la tipografía de ficha se eliminan de la hoja y la UI lo avisa; así pantalla, impresión y PDF coinciden. Se mantiene solo el subconjunto `latin` (decisión pendiente del Anexo C cerrada así).
- Las líneas inválidas de la lista se rechazan con aviso y no bloquean; bloquean: sin palabras, más de 50, palabra más larga que la cuadrícula, tamaño fuera de rango y sin dirección base.
- La vista previa se regenera sola (250 ms tras el último cambio) con la semilla vigente; «Nueva sopa» cambia la semilla.
- `PrintRoot` sigue montado siempre (Ctrl+P fiable); con 25×25 y soluciones son ~2 500 nodos de texto, aceptable.
- Las fuentes del PDF se referencian con `new URL('@fontsource/andika/files/…woff', import.meta.url)`: webpack las emite con huella en `_next/static/media` respetando `basePath` y el service worker ya las precarga.

## Estructura de ficheros de la fase

```
scripts/lib/font-metrics.mjs (+test)   scripts/gen-sheet-font-metrics.mjs
src/core/  text.ts random.ts filename.ts measure.ts sheetFontMetrics.ts (generado) (+tests)
src/layout/common/frame.ts (+test)
src/generators/wordsearch/  directions.ts params.ts suggest.ts place.ts generate.ts index.ts (+tests)
src/layout/wordsearch/  layoutWordSearch.ts index.ts (+test)
src/workers/  wordsearch.ts wordsearch.worker.ts (+test)
src/render/pdf/  renderPdf.ts assets.ts index.ts (+test)
src/i18n/  format.ts dictionary.ts dictionaries/es.ts dictionaries/en.ts (+tests)
src/tools/wordsearch/  WordSearchTool.tsx wordSearchClient.ts messages.ts WordListField.tsx GridOptions.tsx UnplacedPanel.tsx (+tests)
src/tools/shared/  SeedField.tsx IncludeSolutionsField.tsx JobLine.tsx DownloadPdfButton.tsx ProofSheet.tsx ToneWedge.tsx Docket.tsx SheetHeaderFields.tsx
tests/e2e/  wordsearch.spec.ts pdf.spec.ts print.spec.ts network.spec.ts
tests/e2e-root/smoke.spec.ts   playwright.root.config.ts
```

---

### Task 1: Endurecimiento del núcleo (control, alfabeto, semilla canónica, nombre de fichero)

**Files:**
- Modify: `src/core/text.ts`, `src/core/text.test.ts`, `src/core/random.ts`, `src/core/random.test.ts`
- Create: `src/core/filename.ts`, `src/core/filename.test.ts`

**Interfaces:**
- Consumes: `normalizeWord`, `fillAlphabet`, `parseSeedCode`, `formatSeedCode`, `randomSeedBody` (Fase 1).
- Produces:
  - `normalizeWord` rechaza con `invalid-chars` cualquier carácter de control (U+0000–U+001F, U+007F–U+009F).
  - `fillAlphabet(lang: Lang, words?: readonly string[]): readonly string[]` — incluye Ñ en español o si alguna palabra normalizada contiene Ñ.
  - `canonicalSeedCode(code: string): string | null`, `newSeedCode(version: number): string` en `@/core/random`.
  - `worksheetFilename(title: string, fallback: string): string` en `@/core/filename`.

- [ ] **Step 1: Añadir pruebas que fallan**

Añade al final de `src/core/text.test.ts`:

```ts
describe('endurecimiento Fase 2', () => {
  it('rechaza caracteres de control, incluido el marcador interno U+0001', () => {
    expect(normalizeWord('año\u0001z', 'es')).toEqual({ ok: false, code: 'invalid-chars' });
    expect(normalizeWord('sol\tluna', 'es')).toEqual({ ok: false, code: 'invalid-chars' });
    expect(normalizeWord('ro\u007Fjo', 'es')).toEqual({ ok: false, code: 'invalid-chars' });
  });

  it('añade la Ñ al relleno inglés solo si alguna palabra la contiene', () => {
    expect(fillAlphabet('en', ['JALAPEÑO', 'CAT'])).toContain('Ñ');
    expect(fillAlphabet('en', ['CAT'])).not.toContain('Ñ');
    expect(fillAlphabet('es', [])).toContain('Ñ');
  });
});
```

Añade al final de `src/core/random.test.ts` (y amplía el import a `canonicalSeedCode, newSeedCode`):

```ts
describe('semilla canónica', () => {
  it('normaliza espacios y mayúsculas', () => {
    expect(canonicalSeedCode(' v1-abc234 ')).toBe('v1-ABC234');
    expect(canonicalSeedCode('v1-ABC234')).toBe('v1-ABC234');
  });
  it('devuelve null si no es un código', () => {
    expect(canonicalSeedCode('hola')).toBeNull();
    expect(canonicalSeedCode('')).toBeNull();
  });
  it('newSeedCode produce códigos canónicos de la versión pedida', () => {
    const code = newSeedCode(1);
    expect(code).toMatch(/^v1-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/);
    expect(canonicalSeedCode(code)).toBe(code);
  });
});
```

`src/core/filename.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { worksheetFilename } from './filename';

describe('worksheetFilename', () => {
  it('convierte el título en un nombre ASCII seguro', () => {
    expect(worksheetFilename('Animales de la granja: ñandú', 'ficha')).toBe('animales-de-la-granja-nandu.pdf');
  });
  it('usa el respaldo si no queda nada utilizable', () => {
    expect(worksheetFilename('¡¡!!', 'ficha')).toBe('ficha.pdf');
    expect(worksheetFilename('   ', 'worksheet')).toBe('worksheet.pdf');
  });
  it('limita la longitud sin guion final', () => {
    const name = worksheetFilename('palabra '.repeat(20), 'ficha');
    expect(name.length).toBeLessThanOrEqual(64);
    expect(name).not.toMatch(/-\.pdf$/);
  });
});
```

- [ ] **Step 2: Ejecutar para verlas fallar**

Run: `pnpm test src/core`
Expected: FAIL — `fillAlphabet` ignora `words`, `canonicalSeedCode` no existe, `./filename` no se resuelve, el control U+0001 no se rechaza.

- [ ] **Step 3: Implementar**

En `src/core/text.ts`, añade tras las constantes existentes:

```ts
// Caracteres de control C0/C1: nunca son letras y U+0001 es el marcador interno de la Ñ.
const CONTROL = /[\u0000-\u001F\u007F-\u009F]/;
```

y como primera línea de `normalizeWord`:

```ts
  if (CONTROL.test(raw)) return { ok: false, code: 'invalid-chars' };
```

Sustituye `fillAlphabet` por:

```ts
export function fillAlphabet(lang: Lang, words: readonly string[] = []): readonly string[] {
  // En inglés la Ñ solo aparece si una palabra la usa; si no, cada Ñ delataría una solución.
  return lang === 'es' || words.some((word) => word.includes('Ñ')) ? ES_ALPHABET : BASE_ALPHABET;
}
```

Añade al final de `src/core/random.ts`:

```ts
/** Forma canónica de un código de semilla escrito por el docente, o null si no es válido. */
export function canonicalSeedCode(code: string): string | null {
  const parsed = parseSeedCode(code);
  return parsed ? formatSeedCode(parsed.version, parsed.body) : null;
}

export function newSeedCode(version: number): string {
  return formatSeedCode(version, randomSeedBody());
}
```

`src/core/filename.ts`:

```ts
const MAX_SLUG = 60;

/** Nombre de fichero PDF derivado del título: ASCII, minúsculas y guiones. */
export function worksheetFilename(title: string, fallback: string): string {
  const slug = title
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG)
    .replace(/-+$/, '');
  return `${slug || fallback}.pdf`;
}
```

- [ ] **Step 4: Ejecutar pruebas**

Run: `pnpm test src/core && pnpm lint && pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core
git commit -m "feat(core): rechazo de caracteres de control, Ñ condicional en inglés, semilla canónica y nombre de fichero"
```

---

### Task 2: Métricas reales de la tipografía de ficha (`core/measure`)

**Files:**
- Create: `scripts/lib/font-metrics.mjs`, `scripts/lib/font-metrics.test.mjs`, `scripts/gen-sheet-font-metrics.mjs`, `src/core/sheetFontMetrics.ts` (generado), `src/core/measure.ts`, `src/core/measure.test.ts`
- Modify: `package.json` (dependencias y script `metrics:fonts`), `src/render/svg/SheetSvg.tsx` (estilo de texto)

**Interfaces:**
- Produces:
  - `SHEET_FONT_METRICS: Record<'sheet' | 'sheetBold', { unitsPerEm; ascent; descent; capHeight; advances: Record<number, number> }>` en `@/core/sheetFontMetrics`.
  - En `@/core/measure`: `unsupportedSheetChars(text: string): string[]`, `stripUnsupportedSheetChars(text: string): string`, `measureTextMm(text: string, font: FontId, sizeMm: number): number`, `capHeightMm(font: FontId, sizeMm: number): number`, `interface FittedText { text: string; size: number; truncated: boolean }`, `fitTextToWidth(text: string, font: FontId, preferredSize: number, minSize: number, maxWidth: number): FittedText`, `ELLIPSIS: string`.
  - `scripts/lib/font-metrics.mjs`: `SHEET_FONT_FILES`, `extractMetrics(bytes)`, `renderMetricsModule(metrics)`.

- [ ] **Step 1: Dependencias**

```bash
pnpm add pdf-lib@1.17.1 @pdf-lib/fontkit@1.1.1
pnpm add -D pdfjs-dist@6.3.289
```

Añade a `scripts` de `package.json`: `"metrics:fonts": "node scripts/gen-sheet-font-metrics.mjs"`.

- [ ] **Step 2: Utilidad de extracción y su prueba de desfase**

`scripts/lib/font-metrics.mjs`:

```js
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
```

`scripts/lib/font-metrics.test.mjs`:

```js
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
```

`scripts/gen-sheet-font-metrics.mjs`:

```js
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { extractMetrics, renderMetricsModule, SHEET_FONT_FILES } from './lib/font-metrics.mjs';

const require = createRequire(import.meta.url);
const metrics = Object.fromEntries(
  Object.entries(SHEET_FONT_FILES).map(([id, spec]) => [id, extractMetrics(readFileSync(require.resolve(spec)))]),
);
writeFileSync('src/core/sheetFontMetrics.ts', renderMetricsModule(metrics));
process.stdout.write(`Métricas escritas: sheet ${Object.keys(metrics.sheet.advances).length} glifos, sheetBold ${Object.keys(metrics.sheetBold.advances).length} glifos\n`);
```

Run: `pnpm test scripts/lib/font-metrics.test.mjs`
Expected: FAIL — no existe `src/core/sheetFontMetrics.ts`.

Run: `pnpm metrics:fonts && pnpm test scripts/lib/font-metrics.test.mjs`
Expected: `Métricas escritas: sheet 2xx glifos…` y PASS. Comprueba a mano que `src/core/sheetFontMetrics.ts` contiene `unitsPerEm: 2048` y la clave `209` (Ñ).

- [ ] **Step 3: Escribir la prueba de medición**

`src/core/measure.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import fontkit from '@pdf-lib/fontkit';
import { describe, expect, it } from 'vitest';
import { capHeightMm, ELLIPSIS, fitTextToWidth, measureTextMm, stripUnsupportedSheetChars, unsupportedSheetChars } from './measure';

const require = createRequire(import.meta.url);
const FILES = {
  sheet: '@fontsource/andika/files/andika-latin-400-normal.woff',
  sheetBold: '@fontsource/andika/files/andika-latin-700-normal.woff',
} as const;

describe('measureTextMm', () => {
  for (const [id, spec] of Object.entries(FILES) as ['sheet' | 'sheetBold', string][]) {
    it(`coincide con fontkit para ${id}`, () => {
      const font = fontkit.create(readFileSync(require.resolve(spec)));
      for (const text of ['ÑANDÚ pingüino', 'Sopa de letras — Soluciones', 'AVATAR To Wä', '¿Qué? Nº 5']) {
        const expected = (font.layout(text).advanceWidth / font.unitsPerEm) * 7;
        expect(measureTextMm(text, id, 7)).toBeCloseTo(expected, 6);
      }
    });
  }

  it('escala linealmente con el tamaño', () => {
    expect(measureTextMm('GATO', 'sheet', 10)).toBeCloseTo(measureTextMm('GATO', 'sheet', 5) * 2, 9);
  });
});

describe('glifos disponibles', () => {
  it('detecta caracteres sin glifo en la tipografía de ficha', () => {
    expect(unsupportedSheetChars('ñandú pingüino ¿Qué? Nº — «»')).toEqual([]);
    expect(unsupportedSheetChars('Łódź')).toEqual(['Ł', 'ź']);
    expect(stripUnsupportedSheetChars('Łódź')).toBe('ód');
  });

  it('la elipsis elegida existe en la tipografía', () => {
    expect(unsupportedSheetChars(ELLIPSIS)).toEqual([]);
  });
});

describe('capHeightMm', () => {
  it('usa la altura de mayúsculas de la fuente', () => {
    expect(capHeightMm('sheet', 10)).toBeCloseTo((1485 / 2048) * 10, 3);
  });
});

describe('fitTextToWidth', () => {
  it('conserva tamaño y texto si caben', () => {
    expect(fitTextToWidth('Gato', 'sheetBold', 7, 4.5, 100)).toEqual({ text: 'Gato', size: 7, truncated: false });
  });

  it('reduce el cuerpo sin bajar del mínimo', () => {
    const text = 'Los animales de la granja y del bosque';
    const max = measureTextMm(text, 'sheetBold', 7) * 0.8;
    const fitted = fitTextToWidth(text, 'sheetBold', 7, 4.5, max);
    expect(fitted.truncated).toBe(false);
    expect(fitted.size).toBeCloseTo(5.6, 6);
    expect(measureTextMm(fitted.text, 'sheetBold', fitted.size)).toBeLessThanOrEqual(max + 1e-9);
  });

  it('acorta con elipsis cuando ni el mínimo cabe', () => {
    const fitted = fitTextToWidth('W'.repeat(120), 'sheetBold', 7, 4.5, 186);
    expect(fitted.truncated).toBe(true);
    expect(fitted.size).toBe(4.5);
    expect(fitted.text.endsWith(ELLIPSIS)).toBe(true);
    expect(measureTextMm(fitted.text, 'sheetBold', 4.5)).toBeLessThanOrEqual(186);
  });
});
```

Run: `pnpm test src/core/measure.test.ts`
Expected: FAIL — no se resuelve `./measure`. Si `pnpm typecheck` informa de que `@pdf-lib/fontkit` no tiene declaración de tipos, crea `src/types/pdf-lib-fontkit.d.ts` con `declare module '@pdf-lib/fontkit';` y menciónalo en el informe.

- [ ] **Step 4: Implementar `src/core/measure.ts`**

```ts
import type { FontId } from '@/core/sheet';
import { SHEET_FONT_METRICS } from '@/core/sheetFontMetrics';

interface FontMetrics {
  unitsPerEm: number;
  ascent: number;
  descent: number;
  capHeight: number;
  advances: Readonly<Record<number, number>>;
}

const METRICS: Record<FontId, FontMetrics> = SHEET_FONT_METRICS;
const QUESTION_MARK = 63;

const hasGlyph = (cp: number) => METRICS.sheet.advances[cp] !== undefined && METRICS.sheetBold.advances[cp] !== undefined;

/** Caracteres (sin repetir) que la tipografía de ficha no puede dibujar. */
export function unsupportedSheetChars(text: string): string[] {
  const out = new Set<string>();
  for (const ch of text) if (!hasGlyph(ch.codePointAt(0) as number)) out.add(ch);
  return [...out];
}

export function stripUnsupportedSheetChars(text: string): string {
  return Array.from(text)
    .filter((ch) => hasGlyph(ch.codePointAt(0) as number))
    .join('');
}

export const ELLIPSIS = hasGlyph(0x2026) ? '…' : '...';

/** Ancho en mm con la suma de avances (Andika no tiene kerning; SVG y PDF lo desactivan). */
export function measureTextMm(text: string, font: FontId, sizeMm: number): number {
  const m = METRICS[font];
  let units = 0;
  for (const ch of text) units += m.advances[ch.codePointAt(0) as number] ?? m.advances[QUESTION_MARK] ?? m.unitsPerEm / 2;
  return (units / m.unitsPerEm) * sizeMm;
}

export function capHeightMm(font: FontId, sizeMm: number): number {
  const m = METRICS[font];
  return (m.capHeight / m.unitsPerEm) * sizeMm;
}

export interface FittedText {
  text: string;
  size: number;
  truncated: boolean;
}

export function fitTextToWidth(text: string, font: FontId, preferredSize: number, minSize: number, maxWidth: number): FittedText {
  const width = measureTextMm(text, font, preferredSize);
  if (width <= maxWidth) return { text, size: preferredSize, truncated: false };
  const scaled = preferredSize * (maxWidth / width);
  if (scaled >= minSize) return { text, size: scaled, truncated: false };
  const chars = Array.from(text);
  while (chars.length > 0 && measureTextMm(`${chars.join('').trimEnd()}${ELLIPSIS}`, font, minSize) > maxWidth) chars.pop();
  return { text: `${chars.join('').trimEnd()}${ELLIPSIS}`, size: minSize, truncated: true };
}
```

- [ ] **Step 5: Texto SVG sin kerning ni ligaduras**

En `src/render/svg/SheetSvg.tsx` sustituye la constante de estilo por:

```ts
// Sin kerning ni ligaduras: la maquetación mide con la suma de avances, igual que el PDF.
const FONT_STYLE = { fontFamily: 'var(--font-sheet)', fontKerning: 'none', fontVariantLigatures: 'none' } as const;
```

- [ ] **Step 6: Verificar**

Run: `pnpm test && pnpm lint && pnpm typecheck`
Expected: PASS (la prueba existente de `SheetSvg` sigue encontrando `font-family:var(--font-sheet)`).

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml scripts/lib/font-metrics.mjs scripts/lib/font-metrics.test.mjs scripts/gen-sheet-font-metrics.mjs src/core/sheetFontMetrics.ts src/core/measure.ts src/core/measure.test.ts src/render/svg/SheetSvg.tsx
git commit -m "feat(core): métricas reales de Andika para medir y ajustar texto igual en SVG y PDF"
```

---

### Task 3: Encabezado ajustado por ancho medido (`layout/common/frame`)

**Files:**
- Modify: `src/layout/common/frame.ts`, `src/layout/common/frame.test.ts`

**Interfaces:**
- Consumes: `fitTextToWidth`, `stripUnsupportedSheetChars`, `measureTextMm` (`@/core/measure`).
- Produces: `HEADER_LIMITS = { title: 80, school: 80 }`; `interface HeaderFit { title: FittedText; school: FittedText }`; `fitHeader(input: { paper: PaperSize; header: SheetHeader; labels: FrameLabels; role: 'student' | 'solution' }): HeaderFit`; `buildFrame` usa `fitHeader` (misma firma y resultado que en Fase 1).

- [ ] **Step 1: Sustituir las pruebas de límite**

En `src/layout/common/frame.test.ts`, elimina el test «recorta título y centro a su longitud máxima» y el test del emoji en el límite (bloques de la ronda final de Fase 1). Añade `import { measureTextMm } from '@/core/measure';` a los imports del principio, amplía el import de `./frame` con `fitHeader`, y añade al final:

```ts

describe('encabezado ajustado por ancho', () => {
  const widthOf = (p: Primitive) => (p.t === 'text' ? measureTextMm(p.text, p.font, p.size) : 0);

  it.each(['a4', 'letter'] as const)('ningún texto del encabezado desborda la caja en %s', (paper) => {
    const long = 'Ñandúes y pingüinos del hemisferio sur en la granja escolar de invierno';
    for (const role of ['student', 'solution'] as const) {
      const { primitives, content } = buildFrame({ paper, header: { title: long, school: long }, labels, role });
      for (const p of primitives) {
        if (p.t !== 'text') continue;
        const left = p.align === 'middle' ? p.x - widthOf(p) / 2 : p.x;
        expect(left).toBeGreaterThanOrEqual(content.x - 1e-6);
        expect(left + widthOf(p)).toBeLessThanOrEqual(content.x + content.w + 1e-6);
      }
    }
  });

  it('reduce primero el cuerpo y solo acorta cuando no basta', () => {
    const medium = fitHeader({ paper: 'a4', header: { title: 'Vocabulario de los animales de la granja', school: '' }, labels, role: 'student' });
    expect(medium.title.truncated).toBe(false);
    const huge = fitHeader({ paper: 'a4', header: { title: 'W'.repeat(80), school: '' }, labels, role: 'student' });
    expect(huge.title.truncated).toBe(true);
    expect(huge.title.size).toBe(4.5);
  });

  it('respeta el límite de 80 puntos de código sin partir pares suplentes', () => {
    const fit = fitHeader({ paper: 'a4', header: { title: `${'a'.repeat(79)}😀x`, school: '' }, labels, role: 'student' });
    expect(fit.title.text).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/);
  });

  it('elimina de la hoja los caracteres sin glifo', () => {
    const { primitives } = buildFrame({ paper: 'a4', header: { title: 'Łódź', school: '' }, labels, role: 'student' });
    expect(texts(primitives)).toContain('ód');
  });
});
```

Run: `pnpm test src/layout/common`
Expected: FAIL — `fitHeader` no existe.

- [ ] **Step 2: Implementar en `src/layout/common/frame.ts`**

Sustituye la línea de `HEADER_LIMITS` y su comentario por:

```ts
export const HEADER_LIMITS = { title: 80, school: 80 } as const;

// Ajuste por ancho medido con las métricas de Andika (Anexo C de Fase 1).
const TITLE_MIN_SIZE = 4.5;
const SCHOOL_MIN_SIZE = 2.8;

export interface HeaderFit {
  title: FittedText;
  school: FittedText;
}

const clip = (text: string, limit: number) => stripUnsupportedSheetChars(Array.from(text.trim()).slice(0, limit).join(''));

export function fitHeader(input: { paper: PaperSize; header: SheetHeader; labels: FrameLabels; role: 'student' | 'solution' }): HeaderFit {
  const { widthMm: W } = PAPER[input.paper];
  const maxWidth = W - 2 * SHEET_MARGIN_MM;
  const title = clip(input.header.title, HEADER_LIMITS.title);
  const shownTitle = input.role === 'solution' ? [title, input.labels.solutions].filter(Boolean).join(' — ') : title;
  return {
    title: fitTextToWidth(shownTitle, 'sheetBold', TITLE_SIZE, TITLE_MIN_SIZE, maxWidth),
    school: fitTextToWidth(clip(input.header.school, HEADER_LIMITS.school), 'sheet', SCHOOL_SIZE, SCHOOL_MIN_SIZE, maxWidth),
  };
}
```

Añade los imports `import { fitTextToWidth, stripUnsupportedSheetChars, type FittedText } from '@/core/measure';`. Mueve las constantes `TITLE_SIZE` y `SCHOOL_SIZE` por encima de `fitHeader` si el orden lo requiere.

Dentro de `buildFrame`, sustituye el cálculo de `title`, `school`, `shownTitle` y los dos `push` del título y el centro por:

```ts
  const fit = fitHeader(input);
  if (fit.title.text) {
    primitives.push({ t: 'text', x: W / 2, y: m + TITLE_BASELINE, text: fit.title.text, size: fit.title.size, font: 'sheetBold', align: 'middle', tone: 'ink' });
  }
  if (fit.school.text) {
    primitives.push({ t: 'text', x: W / 2, y: m + SCHOOL_BASELINE, text: fit.school.text, size: fit.school.size, font: 'sheet', align: 'middle', tone: 'muted' });
  }
```

Elimina el comentario sobre recorte por puntos de código que ya queda cubierto por `clip`.

- [ ] **Step 3: Verificar**

Run: `pnpm test && pnpm lint && pnpm typecheck`
Expected: PASS. La prueba e2e `print.spec` sigue esperando el título «Animales de la granja: ñandú», que cabe a 7 mm.

- [ ] **Step 4: Commit**

```bash
git add src/layout/common
git commit -m "feat(layout): título y centro ajustados por ancho medido, sin glifos ausentes"
```

---

### Task 4: Validación de parámetros, direcciones y sugerencias (`generators/wordsearch`)

**Files:**
- Create: `src/generators/wordsearch/directions.ts`, `src/generators/wordsearch/params.ts`, `src/generators/wordsearch/suggest.ts`, `src/generators/wordsearch/params.test.ts`

**Interfaces:**
- Consumes: `parseWordList`, `WordEntry`, `WordListWarning` (`@/core/text`); `unsupportedSheetChars` (`@/core/measure`); `Lang`.
- Produces:
  - `directions.ts`: `interface DirectionOptions { horizontal: boolean; vertical: boolean; diagonal: boolean; reversed: boolean }`, `type Vector = readonly [dr: number, dc: number]`, `activeVectors(options: DirectionOptions): Vector[]` (horizontal `[0,1]`, vertical `[1,0]`, diagonal `[1,1]` y `[-1,1]`; invertidas añade los opuestos).
  - `params.ts`: `WORDSEARCH_LIMITS = { minSize: 8, maxSize: 25, maxWords: 50, largeListFrom: 30 }`; `interface WordSearchInput { wordsText: string; size: number; directions: DirectionOptions }`; `interface ValidWordSearch { entries: WordEntry[]; size: number; directions: DirectionOptions }`; `type RejectedLine = { code: 'invalid-chars' | 'too-short'; line: number } | { code: 'unsupported-glyph'; line: number; chars: string[] }`; `type WordSearchError = { code: 'no-words' } | { code: 'too-many-words'; count: number; max: number } | { code: 'word-too-long'; line: number; word: string; length: number } | { code: 'size-out-of-range'; min: number; max: number } | { code: 'no-direction' }`; `type WordSearchWarning = WordListWarning | { code: 'large-list'; suggestedSize: number }`; `type WordSearchValidation = { ok: true; value: ValidWordSearch; rejected: RejectedLine[]; warnings: WordSearchWarning[] } | { ok: false; errors: WordSearchError[]; rejected: RejectedLine[]; warnings: WordSearchWarning[] }`; `suggestGridSize(entries: readonly WordEntry[]): number`; `validateWordSearch(input: WordSearchInput, lang: Lang): WordSearchValidation`.
  - `suggest.ts`: `type Suggestion = { code: 'increase-size'; size: number } | { code: 'enable-diagonal' } | { code: 'enable-reversed' } | { code: 'remove-words'; words: string[] }`; `suggestAdjustments(value: ValidWordSearch, unplaced: readonly WordEntry[]): Suggestion[]`.

- [ ] **Step 1: Escribir la prueba**

`src/generators/wordsearch/params.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { WordEntry } from '@/core/text';
import { activeVectors, type DirectionOptions } from './directions';
import { suggestGridSize, validateWordSearch, WORDSEARCH_LIMITS } from './params';
import { suggestAdjustments } from './suggest';

const ALL: DirectionOptions = { horizontal: true, vertical: true, diagonal: true, reversed: true };
const H_ONLY: DirectionOptions = { horizontal: true, vertical: false, diagonal: false, reversed: false };
const entry = (line: number, word: string): WordEntry => ({ line, original: word.toLowerCase(), normalized: word });

describe('activeVectors', () => {
  it('traduce las casillas a vectores sin ceros negativos', () => {
    expect(activeVectors(H_ONLY)).toEqual([[0, 1]]);
    expect(activeVectors({ ...H_ONLY, vertical: true, diagonal: true })).toEqual([[0, 1], [1, 0], [1, 1], [-1, 1]]);
    expect(activeVectors({ ...H_ONLY, reversed: true })).toEqual([[0, 1], [0, -1]]);
    expect(activeVectors(ALL)).toHaveLength(8);
    expect(activeVectors({ horizontal: false, vertical: false, diagonal: false, reversed: true })).toEqual([]);
  });
});

describe('validateWordSearch', () => {
  it('acepta una lista válida', () => {
    const r = validateWordSearch({ wordsText: 'gato\nperro\nñandú', size: 10, directions: ALL }, 'es');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.entries.map((e) => e.normalized)).toEqual(['GATO', 'PERRO', 'ÑANDU']);
  });

  it('una sola palabra es válida', () => {
    expect(validateWordSearch({ wordsText: 'sol', size: 8, directions: H_ONLY }, 'es').ok).toBe(true);
  });

  it('sin palabras válidas bloquea y conserva las líneas rechazadas', () => {
    const r = validateWordSearch({ wordsText: 'año 2\nx', size: 10, directions: ALL }, 'es');
    expect(r.ok).toBe(false);
    expect(r.rejected).toEqual([
      { code: 'invalid-chars', line: 1 },
      { code: 'too-short', line: 2 },
    ]);
    if (!r.ok) expect(r.errors).toEqual([{ code: 'no-words' }]);
    expect(validateWordSearch({ wordsText: '', size: 10, directions: ALL }, 'es')).toMatchObject({ ok: false, errors: [{ code: 'no-words' }] });
  });

  it('las líneas inválidas no bloquean si quedan palabras', () => {
    const r = validateWordSearch({ wordsText: 'gato\n12', size: 10, directions: ALL }, 'es');
    expect(r.ok).toBe(true);
    expect(r.rejected).toEqual([{ code: 'invalid-chars', line: 2 }]);
  });

  it('rechaza glifos que la tipografía de ficha no tiene', () => {
    // «ő» se normaliza a O (válida en la cuadrícula) pero la tipografía de ficha no tiene su glifo.
    const r = validateWordSearch({ wordsText: 'gato\nkő', size: 10, directions: ALL }, 'es');
    expect(r.rejected).toEqual([{ code: 'unsupported-glyph', line: 2, chars: ['ő'] }]);
  });

  it('más de 50 palabras bloquea', () => {
    const words = Array.from({ length: 51 }, (_, i) => `palabra${'abcdefghijklmnopqrstuvwxyz'[i % 26]}${'abcdefghij'[Math.floor(i / 26)]}`);
    const r = validateWordSearch({ wordsText: words.join('\n'), size: 25, directions: ALL }, 'es');
    expect(r).toMatchObject({ ok: false, errors: [{ code: 'too-many-words', count: 51, max: 50 }] });
  });

  it('palabra más larga que la cuadrícula bloquea con la forma original', () => {
    const r = validateWordSearch({ wordsText: 'Mariposas', size: 8, directions: ALL }, 'es');
    expect(r).toMatchObject({ ok: false, errors: [{ code: 'word-too-long', line: 1, word: 'Mariposas', length: 9 }] });
  });

  it('tamaño fuera de rango o no entero bloquea', () => {
    for (const size of [7, 26, 8.5]) {
      expect(validateWordSearch({ wordsText: 'gato', size, directions: ALL }, 'es')).toMatchObject({
        ok: false,
        errors: [{ code: 'size-out-of-range', min: 8, max: 25 }],
      });
    }
  });

  it('solo «invertidas» no cuenta como dirección', () => {
    const r = validateWordSearch({ wordsText: 'gato', size: 10, directions: { horizontal: false, vertical: false, diagonal: false, reversed: true } }, 'es');
    expect(r).toMatchObject({ ok: false, errors: [{ code: 'no-direction' }] });
  });

  it('avisa con listas grandes si la cuadrícula es pequeña', () => {
    const words = Array.from({ length: 30 }, (_, i) => `gato${'abcdefghijklmnopqrstuvwxyz'[i % 26]}${'abc'[Math.floor(i / 26)]}`);
    const r = validateWordSearch({ wordsText: words.join('\n'), size: 8, directions: ALL }, 'es');
    expect(r.warnings).toContainEqual({ code: 'large-list', suggestedSize: suggestGridSize(r.ok ? r.value.entries : []) });
  });
});

describe('suggestGridSize', () => {
  it('respeta la palabra más larga y los límites', () => {
    expect(suggestGridSize([entry(1, 'SOL')])).toBe(WORDSEARCH_LIMITS.minSize);
    expect(suggestGridSize([entry(1, 'ELECTRODOMESTICOS')])).toBe(17);
    expect(suggestGridSize(Array.from({ length: 50 }, (_, i) => entry(i + 1, 'PALABRAS')))).toBe(25);
  });
});

describe('suggestAdjustments', () => {
  it('no sugiere nada si todo se colocó', () => {
    expect(suggestAdjustments({ entries: [entry(1, 'GATO')], size: 10, directions: ALL }, [])).toEqual([]);
  });

  it('propone tamaño, direcciones que faltan y retirar las más largas', () => {
    const entries = [entry(1, 'HIPOPOTAMO'), entry(2, 'COCODRILO'), entry(3, 'GATO'), entry(4, 'RINOCERONTE')];
    const out = suggestAdjustments({ entries, size: 12, directions: H_ONLY }, [entries[0]!, entries[3]!, entries[2]!]);
    expect(out).toEqual([
      { code: 'increase-size', size: 14 },
      { code: 'enable-diagonal' },
      { code: 'enable-reversed' },
      { code: 'remove-words', words: ['rinoceronte', 'hipopotamo', 'gato'] },
    ]);
  });

  it('no propone crecer por encima del máximo', () => {
    const entries = [entry(1, 'GATO')];
    expect(suggestAdjustments({ entries, size: 25, directions: ALL }, entries)).toEqual([{ code: 'remove-words', words: ['gato'] }]);
  });
});
```

Run: `pnpm test src/generators`
Expected: FAIL — no se resuelven los módulos.

- [ ] **Step 2: Implementar `directions.ts`**

```ts
export interface DirectionOptions {
  horizontal: boolean;
  vertical: boolean;
  diagonal: boolean;
  reversed: boolean;
}

/** [fila, columna] por paso. */
export type Vector = readonly [dr: number, dc: number];

const flip = (n: number) => (n === 0 ? 0 : -n);

export function activeVectors(options: DirectionOptions): Vector[] {
  const base: Vector[] = [];
  if (options.horizontal) base.push([0, 1]);
  if (options.vertical) base.push([1, 0]);
  if (options.diagonal) base.push([1, 1], [-1, 1]);
  return options.reversed ? [...base, ...base.map(([dr, dc]) => [flip(dr), flip(dc)] as const)] : base;
}
```

- [ ] **Step 3: Implementar `params.ts`**

```ts
import type { Lang } from '@/core/lang';
import { unsupportedSheetChars } from '@/core/measure';
import { parseWordList, type WordEntry, type WordListWarning } from '@/core/text';
import type { DirectionOptions } from './directions';

export const WORDSEARCH_LIMITS = { minSize: 8, maxSize: 25, maxWords: 50, largeListFrom: 30 } as const;
/** Proporción de casillas ocupadas por letras que se considera cómoda al sugerir tamaño. */
const COMFORTABLE_DENSITY = 0.5;

export interface WordSearchInput {
  wordsText: string;
  size: number;
  directions: DirectionOptions;
}

export interface ValidWordSearch {
  entries: WordEntry[];
  size: number;
  directions: DirectionOptions;
}

export type RejectedLine =
  | { code: 'invalid-chars' | 'too-short'; line: number }
  | { code: 'unsupported-glyph'; line: number; chars: string[] };

export type WordSearchError =
  | { code: 'no-words' }
  | { code: 'too-many-words'; count: number; max: number }
  | { code: 'word-too-long'; line: number; word: string; length: number }
  | { code: 'size-out-of-range'; min: number; max: number }
  | { code: 'no-direction' };

export type WordSearchWarning = WordListWarning | { code: 'large-list'; suggestedSize: number };

export type WordSearchValidation =
  | { ok: true; value: ValidWordSearch; rejected: RejectedLine[]; warnings: WordSearchWarning[] }
  | { ok: false; errors: WordSearchError[]; rejected: RejectedLine[]; warnings: WordSearchWarning[] };

export function suggestGridSize(entries: readonly WordEntry[]): number {
  const longest = entries.reduce((max, e) => Math.max(max, e.normalized.length), 0);
  const letters = entries.reduce((sum, e) => sum + e.normalized.length, 0);
  const bySpace = Math.ceil(Math.sqrt(letters / COMFORTABLE_DENSITY));
  return Math.min(WORDSEARCH_LIMITS.maxSize, Math.max(WORDSEARCH_LIMITS.minSize, longest, bySpace));
}

export function validateWordSearch(input: WordSearchInput, lang: Lang): WordSearchValidation {
  const parsed = parseWordList(input.wordsText, lang);
  const rejected: RejectedLine[] = parsed.errors.map((e) => ({ code: e.code, line: e.line }));
  const entries: WordEntry[] = [];
  for (const e of parsed.entries) {
    const chars = unsupportedSheetChars(e.original);
    if (chars.length > 0) rejected.push({ code: 'unsupported-glyph', line: e.line, chars });
    else entries.push(e);
  }
  rejected.sort((a, b) => a.line - b.line);

  const warnings: WordSearchWarning[] = [...parsed.warnings];
  const errors: WordSearchError[] = [];
  const { minSize, maxSize, maxWords, largeListFrom } = WORDSEARCH_LIMITS;
  const sizeValid = Number.isInteger(input.size) && input.size >= minSize && input.size <= maxSize;

  if (entries.length === 0) errors.push({ code: 'no-words' });
  if (entries.length > maxWords) errors.push({ code: 'too-many-words', count: entries.length, max: maxWords });
  if (!sizeValid) errors.push({ code: 'size-out-of-range', min: minSize, max: maxSize });
  if (!input.directions.horizontal && !input.directions.vertical && !input.directions.diagonal) errors.push({ code: 'no-direction' });
  if (sizeValid) {
    for (const e of entries) {
      if (e.normalized.length > input.size) errors.push({ code: 'word-too-long', line: e.line, word: e.original, length: e.normalized.length });
    }
  }
  if (entries.length >= largeListFrom) {
    const suggestedSize = suggestGridSize(entries);
    if (suggestedSize > input.size) warnings.push({ code: 'large-list', suggestedSize });
  }

  return errors.length > 0
    ? { ok: false, errors, rejected, warnings }
    : { ok: true, value: { entries, size: input.size, directions: input.directions }, rejected, warnings };
}
```

- [ ] **Step 4: Implementar `suggest.ts`**

```ts
import type { WordEntry } from '@/core/text';
import { suggestGridSize, WORDSEARCH_LIMITS, type ValidWordSearch } from './params';

export type Suggestion =
  | { code: 'increase-size'; size: number }
  | { code: 'enable-diagonal' }
  | { code: 'enable-reversed' }
  | { code: 'remove-words'; words: string[] };

const MAX_WORDS_TO_REMOVE = 3;

export function suggestAdjustments(value: ValidWordSearch, unplaced: readonly WordEntry[]): Suggestion[] {
  if (unplaced.length === 0) return [];
  const out: Suggestion[] = [];
  if (value.size < WORDSEARCH_LIMITS.maxSize) {
    out.push({ code: 'increase-size', size: Math.min(WORDSEARCH_LIMITS.maxSize, Math.max(value.size + 2, suggestGridSize(value.entries))) });
  }
  if (!value.directions.diagonal) out.push({ code: 'enable-diagonal' });
  if (!value.directions.reversed) out.push({ code: 'enable-reversed' });
  const longest = [...unplaced].sort((a, b) => b.normalized.length - a.normalized.length || a.line - b.line).slice(0, MAX_WORDS_TO_REMOVE);
  out.push({ code: 'remove-words', words: longest.map((e) => e.original) });
  return out;
}
```

- [ ] **Step 5: Verificar**

Run: `pnpm test src/generators && pnpm lint && pnpm typecheck`
Expected: PASS. En la prueba de `suggestAdjustments` la longitud 12 + 2 = 14 supera `suggestGridSize` (letras 34 → √68 ≈ 8,2; más larga 11), por eso la sugerencia es 14.

- [ ] **Step 6: Commit**

```bash
git add src/generators/wordsearch
git commit -m "feat(sopa-de-letras): validación de parámetros, direcciones activas y sugerencias de ajuste"
```

---

### Task 5: Colocación con retroceso y generación reproducible

**Files:**
- Create: `src/generators/wordsearch/place.ts`, `src/generators/wordsearch/generate.ts`, `src/generators/wordsearch/index.ts`, `src/generators/wordsearch/generate.test.ts`

**Interfaces:**
- Consumes: `createRng`, `Rng` (`@/core/random`); `fillAlphabet`, `WordEntry` (`@/core/text`); `activeVectors`, `Vector`; `ValidWordSearch`.
- Produces:
  - `place.ts`: `interface Placement { entry: WordEntry; row: number; col: number; dr: number; dc: number }`; `interface PlacementOutcome { placements: Placement[]; complete: boolean; steps: number }`; `placeWords(entries: readonly WordEntry[], size: number, vectors: readonly Vector[], rng: Rng, maxSteps: number): PlacementOutcome`.
  - `generate.ts`: `WORDSEARCH_ALGORITHM_VERSION = 1`, `PLACEMENT_MAX_STEPS = 3000`, `PLACEMENT_ATTEMPTS = 3`; `interface WordSearchResult { size: number; cells: string[]; placements: Placement[]; unplaced: WordEntry[]; seedCode: string }` (`cells` fila a fila, `size × size`); `generateWordSearch(value: ValidWordSearch, seedCode: string, lang: Lang): WordSearchResult`.
  - `index.ts`: reexporta todo lo público de `directions`, `params`, `suggest`, `place` y `generate`.

- [ ] **Step 1: Escribir la prueba**

`src/generators/wordsearch/generate.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Lang } from '@/core/lang';
import { fillAlphabet } from '@/core/text';
import { activeVectors, type DirectionOptions } from './directions';
import { generateWordSearch, type WordSearchResult } from './generate';
import { validateWordSearch, type ValidWordSearch } from './params';

const ALL: DirectionOptions = { horizontal: true, vertical: true, diagonal: true, reversed: true };
const H_ONLY: DirectionOptions = { horizontal: true, vertical: false, diagonal: false, reversed: false };

function valid(words: string[], size: number, directions: DirectionOptions, lang: Lang = 'es'): ValidWordSearch {
  const r = validateWordSearch({ wordsText: words.join('\n'), size, directions }, lang);
  if (!r.ok) throw new Error(`entrada inválida: ${JSON.stringify(r.errors)}`);
  return r.value;
}

function readPlacement(result: WordSearchResult, index: number): string {
  const p = result.placements[index]!;
  return Array.from({ length: p.entry.normalized.length }, (_, i) => result.cells[(p.row + p.dr * i) * result.size + p.col + p.dc * i]).join('');
}

const ANIMALS = ['gato', 'perro', 'conejo', 'caballo', 'oveja', 'vaca', 'gallina', 'pato', 'ñandú', 'pingüino'];

describe('generateWordSearch', () => {
  it('coloca cada palabra legible en su posición para 200 semillas', () => {
    const value = valid(ANIMALS, 12, ALL);
    const vectors = activeVectors(ALL).map(([dr, dc]) => `${dr},${dc}`);
    for (let n = 0; n < 200; n++) {
      const result = generateWordSearch(value, `v1-SEMILLA${n}`, 'es');
      expect(result.cells).toHaveLength(144);
      expect(result.placements.length + result.unplaced.length).toBe(ANIMALS.length);
      result.placements.forEach((p, i) => {
        expect(readPlacement(result, i)).toBe(p.entry.normalized);
        expect(vectors).toContain(`${p.dr},${p.dc}`);
      });
    }
  });

  it('respeta las direcciones permitidas', () => {
    const result = generateWordSearch(valid(ANIMALS.slice(0, 6), 10, H_ONLY), 'v1-HORIZ2', 'es');
    for (const p of result.placements) expect([p.dr, p.dc]).toEqual([0, 1]);
  });

  it('rellena todas las casillas con letras del alfabeto del idioma', () => {
    const es = generateWordSearch(valid(['gato', 'perro'], 10, ALL), 'v1-FILL22', 'es');
    for (const c of es.cells) expect(fillAlphabet('es')).toContain(c);
    const en = generateWordSearch(valid(['cat', 'dog'], 10, ALL, 'en'), 'v1-FILL22', 'en');
    for (const c of en.cells) expect(fillAlphabet('en')).toContain(c);
  });

  it('es determinista por semilla y cambia con otra semilla', () => {
    const value = valid(ANIMALS, 12, ALL);
    expect(generateWordSearch(value, 'v1-ABC234', 'es')).toEqual(generateWordSearch(value, 'v1-ABC234', 'es'));
    expect(generateWordSearch(value, 'v1-ABC234', 'es').cells).not.toEqual(generateWordSearch(value, 'v1-ABC235', 'es').cells);
  });

  it('una sola palabra', () => {
    const result = generateWordSearch(valid(['sol'], 8, H_ONLY), 'v1-SOLO22', 'es');
    expect(result.placements).toHaveLength(1);
    expect(result.unplaced).toEqual([]);
  });

  it('informa de lo que no cabe tras agotar intentos, sin fallar', () => {
    const letters = 'ABCDEFGHI'.split('');
    const words = letters.map((l) => l.repeat(8));
    const result = generateWordSearch(valid(words, 8, H_ONLY), 'v1-LLENO2', 'es');
    expect(result.placements).toHaveLength(8);
    expect(result.unplaced).toHaveLength(1);
    expect(result.cells.every((c) => c !== '')).toBe(true);
  });

  it('coloca cincuenta palabras en 25×25 con todas las direcciones', () => {
    const words = [
      'abeja', 'aguila', 'alce', 'araña', 'ardilla', 'ballena', 'buho', 'burro', 'cabra', 'camello',
      'canguro', 'castor', 'cebra', 'cerdo', 'ciervo', 'cisne', 'cobra', 'colibri', 'delfin', 'elefante',
      'erizo', 'foca', 'gacela', 'garza', 'gorila', 'grillo', 'halcon', 'hiena', 'hormiga', 'iguana',
      'jabali', 'jaguar', 'jirafa', 'koala', 'lagarto', 'lechuza', 'leon', 'lobo', 'loro', 'mapache',
      'medusa', 'mono', 'morsa', 'nutria', 'orca', 'oso', 'panda', 'puma', 'rana', 'tigre',
    ];
    for (const seed of ['v1-GRANDE', 'v1-GRAND2', 'v1-GRAND3']) {
      const result = generateWordSearch(valid(words, 25, ALL), seed, 'es');
      expect(result.unplaced).toEqual([]);
    }
  });
});
```

Run: `pnpm test src/generators/wordsearch/generate.test.ts`
Expected: FAIL — no se resuelve `./generate`.

- [ ] **Step 2: Implementar `place.ts`**

```ts
import type { Rng } from '@/core/random';
import type { WordEntry } from '@/core/text';
import type { Vector } from './directions';

export interface Placement {
  entry: WordEntry;
  row: number;
  col: number;
  dr: number;
  dc: number;
}

export interface PlacementOutcome {
  placements: Placement[];
  complete: boolean;
  steps: number;
}

interface Candidate {
  row: number;
  col: number;
  dr: number;
  dc: number;
}

interface Frame {
  candidates: Candidate[];
  next: number;
  written: number[];
  placement: Placement | null;
}

function fits(word: string, c: Candidate, size: number, grid: readonly string[]): boolean {
  for (let i = 0; i < word.length; i++) {
    const cell = grid[(c.row + c.dr * i) * size + c.col + c.dc * i];
    if (cell !== '' && cell !== word[i]) return false;
  }
  return true;
}

function candidatesFor(word: string, size: number, vectors: readonly Vector[], grid: readonly string[], rng: Rng): Candidate[] {
  const out: Candidate[] = [];
  const last = word.length - 1;
  for (const [dr, dc] of vectors) {
    for (let row = 0; row < size; row++) {
      const endRow = row + dr * last;
      if (endRow < 0 || endRow >= size) continue;
      for (let col = 0; col < size; col++) {
        const endCol = col + dc * last;
        if (endCol < 0 || endCol >= size) continue;
        const c = { row, col, dr, dc };
        if (fits(word, c, size, grid)) out.push(c);
      }
    }
  }
  return rng.shuffle(out);
}

/**
 * Retroceso simple (spec §5.2): palabras de mayor a menor longitud; candidatos barajados con la semilla;
 * solapamiento solo con letra coincidente. Cuenta intentos (no tiempo) y devuelve la mejor colocación parcial.
 */
export function placeWords(entries: readonly WordEntry[], size: number, vectors: readonly Vector[], rng: Rng, maxSteps: number): PlacementOutcome {
  const words = [...entries].sort((a, b) => b.normalized.length - a.normalized.length || a.line - b.line);
  if (words.length === 0) return { placements: [], complete: true, steps: 0 };
  if (vectors.length === 0) return { placements: [], complete: false, steps: 0 };

  const grid: string[] = new Array<string>(size * size).fill('');
  const stack: Frame[] = [{ candidates: candidatesFor((words[0] as WordEntry).normalized, size, vectors, grid, rng), next: 0, written: [], placement: null }];
  let best: Placement[] = [];
  let steps = 0;

  while (stack.length > 0 && steps < maxSteps) {
    const depth = stack.length - 1;
    const frame = stack[depth] as Frame;
    for (const index of frame.written) grid[index] = '';
    frame.written = [];
    frame.placement = null;

    const candidate = frame.candidates[frame.next];
    if (!candidate) {
      stack.pop();
      continue;
    }
    frame.next += 1;
    steps += 1;

    const entry = words[depth] as WordEntry;
    const word = entry.normalized;
    for (let i = 0; i < word.length; i++) {
      const index = (candidate.row + candidate.dr * i) * size + candidate.col + candidate.dc * i;
      if (grid[index] === '') {
        grid[index] = word[i] as string;
        frame.written.push(index);
      }
    }
    frame.placement = { entry, ...candidate };

    const placed = stack.map((f) => f.placement).filter((p): p is Placement => p !== null);
    if (placed.length > best.length) best = placed;
    if (depth + 1 === words.length) return { placements: placed, complete: true, steps };

    const nextWord = (words[depth + 1] as WordEntry).normalized;
    stack.push({ candidates: candidatesFor(nextWord, size, vectors, grid, rng), next: 0, written: [], placement: null });
  }

  return { placements: best, complete: false, steps };
}
```

- [ ] **Step 3: Implementar `generate.ts` e `index.ts`**

`src/generators/wordsearch/generate.ts`:

```ts
import type { Lang } from '@/core/lang';
import { createRng } from '@/core/random';
import { fillAlphabet, type WordEntry } from '@/core/text';
import { activeVectors } from './directions';
import type { ValidWordSearch } from './params';
import { placeWords, type Placement, type PlacementOutcome } from './place';

export const WORDSEARCH_ALGORITHM_VERSION = 1;
export const PLACEMENT_MAX_STEPS = 3000;
export const PLACEMENT_ATTEMPTS = 3;

export interface WordSearchResult {
  size: number;
  /** Letras fila a fila (size × size). */
  cells: string[];
  placements: Placement[];
  unplaced: WordEntry[];
  seedCode: string;
}

export function generateWordSearch(value: ValidWordSearch, seedCode: string, lang: Lang): WordSearchResult {
  const vectors = activeVectors(value.directions);
  const root = createRng(seedCode);

  let best: PlacementOutcome | null = null;
  for (let attempt = 0; attempt < PLACEMENT_ATTEMPTS; attempt++) {
    const outcome = placeWords(value.entries, value.size, vectors, root.fork(`attempt-${attempt}`), PLACEMENT_MAX_STEPS);
    if (!best || outcome.placements.length > best.placements.length) best = outcome;
    if (outcome.complete) break;
  }
  const placements = best?.placements ?? [];

  const cells = new Array<string>(value.size * value.size).fill('');
  for (const p of placements) {
    for (let i = 0; i < p.entry.normalized.length; i++) {
      cells[(p.row + p.dr * i) * value.size + p.col + p.dc * i] = p.entry.normalized[i] as string;
    }
  }

  const alphabet = fillAlphabet(lang, value.entries.map((e) => e.normalized));
  const fill = root.fork('fill');
  const placedLines = new Set(placements.map((p) => p.entry.line));

  return {
    size: value.size,
    cells: cells.map((cell) => (cell === '' ? fill.pick(alphabet) : cell)),
    placements,
    unplaced: value.entries.filter((e) => !placedLines.has(e.line)),
    seedCode,
  };
}
```

`src/generators/wordsearch/index.ts`:

```ts
export { activeVectors, type DirectionOptions, type Vector } from './directions';
export {
  suggestGridSize,
  validateWordSearch,
  WORDSEARCH_LIMITS,
  type RejectedLine,
  type ValidWordSearch,
  type WordSearchError,
  type WordSearchInput,
  type WordSearchValidation,
  type WordSearchWarning,
} from './params';
export { suggestAdjustments, type Suggestion } from './suggest';
export { placeWords, type Placement, type PlacementOutcome } from './place';
export { generateWordSearch, PLACEMENT_ATTEMPTS, PLACEMENT_MAX_STEPS, WORDSEARCH_ALGORITHM_VERSION, type WordSearchResult } from './generate';
```

- [ ] **Step 4: Verificar**

Run: `pnpm test src/generators && pnpm lint && pnpm typecheck`
Expected: PASS. Anota en el informe la duración de `generate.test.ts` que muestra Vitest; si supera 10 s, reduce las 200 semillas a 100 y explícalo.

- [ ] **Step 5: Commit**

```bash
git add src/generators/wordsearch
git commit -m "feat(sopa-de-letras): colocación con retroceso y generación reproducible por semilla"
```

---

### Task 6: Maquetación de la sopa de letras (`layout/wordsearch`)

**Files:**
- Create: `src/layout/wordsearch/layoutWordSearch.ts`, `src/layout/wordsearch/index.ts`, `src/layout/wordsearch/layoutWordSearch.test.ts`

**Interfaces:**
- Consumes: `buildFrame`, `SheetHeader`, `FrameLabels` (`@/layout/common/frame`); `measureTextMm`, `capHeightMm` (`@/core/measure`); `WordSearchResult` (`@/generators/wordsearch`); `PaperSize`, `SheetDocument`, `SheetPage`, `Primitive`, `Lang`.
- Produces: `WORDSEARCH_LAYOUT = { maxCellMm: 12, minCellMm: 6, gapMm: 6, listSizeMm: 4, listLineMm: 6.5, listColumnGapMm: 6, letterRatio: 0.62, capsuleRatio: 0.78 }`; `type WordSearchLayout = { ok: true; doc: SheetDocument } | { ok: false; error: { code: 'cells-too-small'; maxSize: number } }`; `layoutWordSearch(input: { result: WordSearchResult; header: SheetHeader; labels: FrameLabels; paper: PaperSize; lang: Lang; includeSolutions: boolean }): WordSearchLayout`. Páginas: primera de alumno (cuadrícula + inicio de la lista), continuaciones de alumno solo con lista si no cabe, y una de soluciones (cuadrícula + cápsulas) si `includeSolutions`.

- [ ] **Step 1: Escribir la prueba**

`src/layout/wordsearch/layoutWordSearch.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { measureTextMm } from '@/core/measure';
import { PAPER, SHEET_MARGIN_MM, type PaperSize } from '@/core/paper';
import type { Primitive, SheetPage } from '@/core/sheet';
import { generateWordSearch, validateWordSearch, type WordSearchResult } from '@/generators/wordsearch';
import { layoutWordSearch, WORDSEARCH_LAYOUT } from './layoutWordSearch';

const labels = { name: 'Nombre', date: 'Fecha', solutions: 'Soluciones' };
const header = { title: 'Animales', school: 'Escuela Nº 5' };
const ALL = { horizontal: true, vertical: true, diagonal: true, reversed: true };

function result(words: string[], size: number, seed = 'v1-LAYOUT'): WordSearchResult {
  const v = validateWordSearch({ wordsText: words.join('\n'), size, directions: ALL }, 'es');
  if (!v.ok) throw new Error('entrada inválida');
  return generateWordSearch(v.value, seed, 'es');
}

const gridLetters = (page: SheetPage) => page.primitives.filter((p): p is Extract<Primitive, { t: 'text' }> => p.t === 'text' && Array.from(p.text).length === 1);

function bounds(p: Primitive): Array<[number, number]> {
  switch (p.t) {
    case 'text': {
      const w = measureTextMm(p.text, p.font, p.size);
      const left = p.align === 'middle' ? p.x - w / 2 : p.align === 'end' ? p.x - w : p.x;
      return [[left, p.y], [left + w, p.y]];
    }
    case 'rect': return [[p.x, p.y], [p.x + p.w, p.y + p.h]];
    case 'line': return [[p.x1, p.y1], [p.x2, p.y2]];
    case 'capsule': return [[p.cx, p.cy]];
    case 'image': return [[p.x, p.y], [p.x + p.w, p.y + p.h]];
  }
}

const ANIMALS = ['gato', 'perro', 'conejo', 'caballo', 'oveja', 'vaca', 'gallina', 'pato', 'ñandú', 'pingüino'];

describe.each(['a4', 'letter'] as PaperSize[])('layoutWordSearch en %s', (paper) => {
  it('produce alumno + soluciones con la cuadrícula completa en cada una', () => {
    const r = result(ANIMALS, 12);
    const out = layoutWordSearch({ result: r, header, labels, paper, lang: 'es', includeSolutions: true });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.doc.pages.map((p) => p.role)).toEqual(['student', 'solution']);
    expect(gridLetters(out.doc.pages[0]!)).toHaveLength(144);
    expect(gridLetters(out.doc.pages[1]!)).toHaveLength(144);
    expect(gridLetters(out.doc.pages[0]!).map((p) => p.text)).toEqual(r.cells);
  });

  it('sin soluciones solo hay páginas de alumno', () => {
    const out = layoutWordSearch({ result: result(ANIMALS, 12), header, labels, paper, lang: 'es', includeSolutions: false });
    expect(out.ok && out.doc.pages.every((p) => p.role === 'student')).toBe(true);
  });

  it('todo queda dentro de los márgenes de impresión', () => {
    const out = layoutWordSearch({ result: result(ANIMALS, 25), header, labels, paper, lang: 'es', includeSolutions: true });
    if (!out.ok) throw new Error('layout');
    const { widthMm, heightMm } = PAPER[paper];
    for (const page of out.doc.pages) {
      for (const p of page.primitives) {
        for (const [x, y] of bounds(p)) {
          expect(x).toBeGreaterThanOrEqual(SHEET_MARGIN_MM - 1e-6);
          expect(x).toBeLessThanOrEqual(widthMm - SHEET_MARGIN_MM + 1e-6);
          expect(y).toBeGreaterThanOrEqual(SHEET_MARGIN_MM - 1e-6);
          expect(y).toBeLessThanOrEqual(heightMm - SHEET_MARGIN_MM + 1e-6);
        }
      }
    }
  });

  it('las casillas miden al menos 6 mm con 25×25', () => {
    const out = layoutWordSearch({ result: result(ANIMALS, 25), header, labels, paper, lang: 'es', includeSolutions: false });
    if (!out.ok) throw new Error('layout');
    const border = out.doc.pages[0]!.primitives.find((p): p is Extract<Primitive, { t: 'rect' }> => p.t === 'rect');
    expect(border!.w / 25).toBeGreaterThanOrEqual(WORDSEARCH_LAYOUT.minCellMm);
  });
});

describe('lista de palabras y soluciones', () => {
  it('lista las palabras colocadas con su forma original y en orden alfabético', () => {
    const r = result(ANIMALS, 12);
    const out = layoutWordSearch({ result: r, header, labels, paper: 'a4', lang: 'es', includeSolutions: false });
    if (!out.ok) throw new Error('layout');
    const listed = out.doc.pages[0]!.primitives.filter((p): p is Extract<Primitive, { t: 'text' }> => p.t === 'text' && r.placements.some((pl) => pl.entry.original === p.text)).map((p) => p.text);
    expect(listed).toEqual(r.placements.map((p) => p.entry.original).sort((a, b) => a.localeCompare(b, 'es')));
    expect(listed).toContain('ñandú');
  });

  it('dibuja una cápsula por palabra centrada dentro de la cuadrícula', () => {
    const r = result(ANIMALS, 12);
    const out = layoutWordSearch({ result: r, header, labels, paper: 'a4', lang: 'es', includeSolutions: true });
    if (!out.ok) throw new Error('layout');
    const solution = out.doc.pages.at(-1)!;
    const border = solution.primitives.find((p): p is Extract<Primitive, { t: 'rect' }> => p.t === 'rect')!;
    const capsules = solution.primitives.filter((p): p is Extract<Primitive, { t: 'capsule' }> => p.t === 'capsule');
    expect(capsules).toHaveLength(r.placements.length);
    for (const c of capsules) {
      expect(c.cx).toBeGreaterThan(border.x);
      expect(c.cx).toBeLessThan(border.x + border.w);
      expect(c.cy).toBeGreaterThan(border.y);
      expect(c.cy).toBeLessThan(border.y + border.h);
    }
  });

  it('una lista larga continúa en otra página sin partir la cuadrícula', () => {
    const words = Array.from({ length: 50 }, (_, i) => `electrodomestico${'abcdefghijklmnopqrstuvwxy'[i % 25]}${'ab'[Math.floor(i / 25)]}`);
    const fake: WordSearchResult = {
      size: 25,
      cells: new Array(625).fill('A'),
      placements: words.map((w, i) => ({ entry: { line: i + 1, original: w, normalized: w.toUpperCase() }, row: 0, col: 0, dr: 0, dc: 1 })),
      unplaced: [],
      seedCode: 'v1-LISTA2',
    };
    const out = layoutWordSearch({ result: fake, header, labels, paper: 'letter', lang: 'es', includeSolutions: false });
    if (!out.ok) throw new Error('layout');
    expect(out.doc.pages.length).toBeGreaterThanOrEqual(2);
    const grids = out.doc.pages.map((p) => gridLetters(p).length);
    expect(grids[0]).toBe(625);
    expect(grids.slice(1).every((n) => n === 0)).toBe(true);
    const listedTexts = out.doc.pages.flatMap((p) => p.primitives.filter((x): x is Extract<Primitive, { t: 'text' }> => x.t === 'text' && words.includes(x.text)));
    expect(listedTexts).toHaveLength(50);
  });

  it('informa si la cuadrícula no cabe con casillas legibles', () => {
    const fake: WordSearchResult = { size: 40, cells: new Array(1600).fill('A'), placements: [], unplaced: [], seedCode: 'v1-ENORME' };
    expect(layoutWordSearch({ result: fake, header, labels, paper: 'a4', lang: 'es', includeSolutions: false })).toEqual({
      ok: false,
      error: { code: 'cells-too-small', maxSize: 31 },
    });
  });
});
```

Run: `pnpm test src/layout/wordsearch`
Expected: FAIL — no se resuelve `./layoutWordSearch`.

- [ ] **Step 2: Implementar `src/layout/wordsearch/layoutWordSearch.ts`**

```ts
import type { Lang } from '@/core/lang';
import { capHeightMm, measureTextMm } from '@/core/measure';
import type { PaperSize } from '@/core/paper';
import type { Primitive, SheetDocument, SheetPage } from '@/core/sheet';
import type { WordSearchResult } from '@/generators/wordsearch';
import { buildFrame, type ContentBox, type FrameLabels, type SheetHeader } from '@/layout/common/frame';

export const WORDSEARCH_LAYOUT = {
  maxCellMm: 12,
  minCellMm: 6,
  gapMm: 6,
  listSizeMm: 4,
  listLineMm: 6.5,
  listColumnGapMm: 6,
  letterRatio: 0.62,
  capsuleRatio: 0.78,
} as const;

export type WordSearchLayout = { ok: true; doc: SheetDocument } | { ok: false; error: { code: 'cells-too-small'; maxSize: number } };

interface LayoutInput {
  result: WordSearchResult;
  header: SheetHeader;
  labels: FrameLabels;
  paper: PaperSize;
  lang: Lang;
  includeSolutions: boolean;
}

interface GridGeometry {
  x: number;
  y: number;
  cell: number;
  side: number;
}

function gridPrimitives(result: WordSearchResult, g: GridGeometry): Primitive[] {
  const L = WORDSEARCH_LAYOUT;
  const letterSize = g.cell * L.letterRatio;
  const baselineOffset = capHeightMm('sheet', letterSize) / 2;
  const out: Primitive[] = [{ t: 'rect', x: g.x, y: g.y, w: g.side, h: g.side, stroke: 'ink', strokeWidth: 0.4 }];
  result.cells.forEach((letter, i) => {
    const row = Math.floor(i / result.size);
    const col = i % result.size;
    out.push({
      t: 'text',
      x: g.x + (col + 0.5) * g.cell,
      y: g.y + (row + 0.5) * g.cell + baselineOffset,
      text: letter,
      size: letterSize,
      font: 'sheet',
      align: 'middle',
      tone: 'ink',
    });
  });
  return out;
}

function capsules(result: WordSearchResult, g: GridGeometry): Primitive[] {
  return result.placements.map((p) => {
    const last = p.entry.normalized.length - 1;
    const r1 = p.row + p.dr * last;
    const c1 = p.col + p.dc * last;
    return {
      t: 'capsule',
      cx: g.x + ((p.col + c1) / 2 + 0.5) * g.cell,
      cy: g.y + ((p.row + r1) / 2 + 0.5) * g.cell,
      length: Math.hypot(c1 - p.col, r1 - p.row) * g.cell + g.cell * 0.8,
      width: g.cell * WORDSEARCH_LAYOUT.capsuleRatio,
      angleDeg: (Math.atan2(r1 - p.row, c1 - p.col) * 180) / Math.PI,
      stroke: 'muted',
      strokeWidth: 0.35,
    };
  });
}

function listPrimitives(words: readonly string[], box: ContentBox, top: number, columns: number, colWidth: number): Primitive[] {
  const L = WORDSEARCH_LAYOUT;
  return words.map((text, k) => ({
    t: 'text',
    x: box.x + (k % columns) * colWidth,
    y: top + Math.floor(k / columns) * L.listLineMm + L.listSizeMm,
    text,
    size: L.listSizeMm,
    font: 'sheet',
    align: 'start',
    tone: 'ink',
  }));
}

export function layoutWordSearch(input: LayoutInput): WordSearchLayout {
  const L = WORDSEARCH_LAYOUT;
  const { result, header, labels, paper, lang } = input;
  const first = buildFrame({ paper, header, labels, role: 'student' });
  const box = first.content;

  const words = result.placements.map((p) => p.entry.original).sort((a, b) => a.localeCompare(b, lang));
  const widest = words.reduce((max, w) => Math.max(max, measureTextMm(w, 'sheet', L.listSizeMm)), 0);
  const colWidth = widest + L.listColumnGapMm;
  const columns = Math.max(1, Math.floor((box.w + L.listColumnGapMm) / colWidth));
  const listHeight = Math.ceil(words.length / columns) * L.listLineMm;

  const byWidth = box.w / result.size;
  const withList = Math.min(L.maxCellMm, byWidth, (box.h - L.gapMm - listHeight) / result.size);
  const cell = withList >= L.minCellMm ? withList : Math.min(L.maxCellMm, byWidth, box.h / result.size);
  if (cell < L.minCellMm) {
    return { ok: false, error: { code: 'cells-too-small', maxSize: Math.floor(Math.min(box.w, box.h) / L.minCellMm) } };
  }

  const side = cell * result.size;
  const grid: GridGeometry = { x: box.x + (box.w - side) / 2, y: box.y, cell, side };
  const listTop = grid.y + side + L.gapMm;
  const firstLines = Math.max(0, Math.floor((box.y + box.h - listTop) / L.listLineMm));
  const firstCount = Math.min(words.length, firstLines * columns);

  const pages: SheetPage[] = [
    {
      role: 'student',
      primitives: [...first.primitives, ...gridPrimitives(result, grid), ...listPrimitives(words.slice(0, firstCount), box, listTop, columns, colWidth)],
    },
  ];

  const perPage = Math.max(1, Math.floor(box.h / L.listLineMm)) * columns;
  for (let start = firstCount; start < words.length; start += perPage) {
    const frame = buildFrame({ paper, header, labels, role: 'student' });
    pages.push({ role: 'student', primitives: [...frame.primitives, ...listPrimitives(words.slice(start, start + perPage), frame.content, frame.content.y, columns, colWidth)] });
  }

  if (input.includeSolutions) {
    const frame = buildFrame({ paper, header, labels, role: 'solution' });
    pages.push({ role: 'solution', primitives: [...frame.primitives, ...gridPrimitives(result, grid), ...capsules(result, grid)] });
  }

  return { ok: true, doc: { paper, lang, pages } };
}
```

`src/layout/wordsearch/index.ts`:

```ts
export { layoutWordSearch, WORDSEARCH_LAYOUT, type WordSearchLayout } from './layoutWordSearch';
```

- [ ] **Step 3: Verificar**

Run: `pnpm test src/layout && pnpm lint && pnpm typecheck`
Expected: PASS. Si la prueba de márgenes falla por la última línea de la lista en Carta, ajusta el cálculo de `firstLines` para que la línea base `top + (filas-1)·listLineMm + listSizeMm` quede ≤ `box.y + box.h` y documenta el cambio.

- [ ] **Step 4: Commit**

```bash
git add src/layout/wordsearch
git commit -m "feat(sopa-de-letras): maquetación de cuadrícula, lista paginada y hoja de soluciones con cápsulas"
```

---

### Task 7: Worker de generación y almacén cliente

**Files:**
- Create: `src/workers/wordsearch.ts`, `src/workers/wordsearch.worker.ts`, `src/workers/wordsearch.test.ts`, `src/tools/wordsearch/wordSearchClient.ts`, `src/tools/wordsearch/wordSearchClient.test.ts`

**Interfaces:**
- Consumes: `generateWordSearch`, `ValidWordSearch`, `WordSearchResult` (`@/generators/wordsearch`); `Lang`.
- Produces:
  - `@/workers/wordsearch`: `interface WordSearchRequest { requestId: number; value: ValidWordSearch; seedCode: string; lang: Lang }`; `type WordSearchResponse = { requestId: number; ok: true; result: WordSearchResult } | { requestId: number; ok: false }`; `handleWordSearchRequest(request: WordSearchRequest): WordSearchResponse`.
  - `src/workers/wordsearch.worker.ts`: entrada del Worker (sin exportaciones).
  - `tools/wordsearch/wordSearchClient.ts`: `GENERATION_TIMEOUT_MS = 1500`; `type GenerationStatus = 'idle' | 'pending' | 'done' | 'failed'`; `interface GenerationSnapshot { status: GenerationStatus; key: string | null; response: WordSearchResponse | null }`; `interface WorkerLike { postMessage(message: unknown): void; terminate(): void; onmessage: ((event: { data: WordSearchResponse }) => void) | null; onerror: ((event: unknown) => void) | null }`; `createGenerationClient(createWorker: () => WorkerLike): GenerationClient` con `subscribe(listener): () => void`, `getSnapshot(): GenerationSnapshot`, `request(key: string, message: Omit<WordSearchRequest, 'requestId'>): void`, `dispose(): void`.

- [ ] **Step 1: Escribir las pruebas**

`src/workers/wordsearch.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { validateWordSearch } from '@/generators/wordsearch';
import { handleWordSearchRequest } from './wordsearch';

const ALL = { horizontal: true, vertical: true, diagonal: true, reversed: false };

describe('handleWordSearchRequest', () => {
  it('devuelve el resultado con el mismo requestId', () => {
    const v = validateWordSearch({ wordsText: 'gato\nperro', size: 10, directions: ALL }, 'es');
    if (!v.ok) throw new Error('entrada');
    const response = handleWordSearchRequest({ requestId: 7, value: v.value, seedCode: 'v1-WORKER', lang: 'es' });
    expect(response.requestId).toBe(7);
    expect(response.ok).toBe(true);
  });

  it('convierte cualquier excepción en una respuesta genérica sin datos del usuario', () => {
    const broken = { entries: null, size: 10, directions: ALL } as unknown as Parameters<typeof handleWordSearchRequest>[0]['value'];
    expect(handleWordSearchRequest({ requestId: 3, value: broken, seedCode: 'v1-WORKER', lang: 'es' })).toEqual({ requestId: 3, ok: false });
  });
});
```

`src/tools/wordsearch/wordSearchClient.test.ts`:

```ts
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
```

Run: `pnpm test src/workers src/tools/wordsearch`
Expected: FAIL — módulos inexistentes.

- [ ] **Step 2: Implementar el Worker**

`src/workers/wordsearch.ts`:

```ts
import type { Lang } from '@/core/lang';
import { generateWordSearch, type ValidWordSearch, type WordSearchResult } from '@/generators/wordsearch';

export interface WordSearchRequest {
  requestId: number;
  value: ValidWordSearch;
  seedCode: string;
  lang: Lang;
}

export type WordSearchResponse = { requestId: number; ok: true; result: WordSearchResult } | { requestId: number; ok: false };

export function handleWordSearchRequest(request: WordSearchRequest): WordSearchResponse {
  try {
    return { requestId: request.requestId, ok: true, result: generateWordSearch(request.value, request.seedCode, request.lang) };
  } catch {
    // Nunca se reenvía el error: podría contener palabras del docente.
    return { requestId: request.requestId, ok: false };
  }
}
```

`src/workers/wordsearch.worker.ts`:

```ts
import { handleWordSearchRequest, type WordSearchRequest } from '@/workers/wordsearch';

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<WordSearchRequest>) => void) | null;
  postMessage: (message: unknown) => void;
};

scope.onmessage = (event) => {
  scope.postMessage(handleWordSearchRequest(event.data));
};
```

- [ ] **Step 3: Implementar el almacén cliente**

`src/tools/wordsearch/wordSearchClient.ts`:

```ts
import type { WordSearchRequest, WordSearchResponse } from '@/workers/wordsearch';

export const GENERATION_TIMEOUT_MS = 1500;

export type GenerationStatus = 'idle' | 'pending' | 'done' | 'failed';

export interface GenerationSnapshot {
  status: GenerationStatus;
  key: string | null;
  /** Última respuesta recibida; durante `pending` se conserva la anterior para no vaciar la vista previa. */
  response: WordSearchResponse | null;
}

export interface WorkerLike {
  postMessage(message: unknown): void;
  terminate(): void;
  onmessage: ((event: { data: WordSearchResponse }) => void) | null;
  onerror: ((event: unknown) => void) | null;
}

/** Almacén externo (useSyncExternalStore): posee el Worker, invalida peticiones viejas y aplica el tiempo máximo. */
export function createGenerationClient(createWorker: () => WorkerLike) {
  let worker: WorkerLike | null = null;
  let busy = false;
  let nextId = 0;
  let currentId = -1;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let snapshot: GenerationSnapshot = { status: 'idle', key: null, response: null };
  const listeners = new Set<() => void>();

  const emit = (next: GenerationSnapshot) => {
    snapshot = next;
    for (const listener of listeners) listener();
  };
  const clearTimer = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  const dropWorker = () => {
    worker?.terminate();
    worker = null;
    busy = false;
  };
  const ensureWorker = () => {
    if (worker) return worker;
    const created = createWorker();
    created.onmessage = (event) => {
      if (event.data.requestId !== currentId) return;
      busy = false;
      clearTimer();
      emit({ status: event.data.ok ? 'done' : 'failed', key: snapshot.key, response: event.data });
    };
    created.onerror = () => {
      if (!busy) return;
      clearTimer();
      dropWorker();
      emit({ status: 'failed', key: snapshot.key, response: null });
    };
    worker = created;
    return created;
  };

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,
    request(key: string, message: Omit<WordSearchRequest, 'requestId'>) {
      if (key === snapshot.key && snapshot.status !== 'failed') return;
      clearTimer();
      if (busy) dropWorker();
      currentId = nextId++;
      busy = true;
      emit({ status: 'pending', key, response: snapshot.response });
      ensureWorker().postMessage({ ...message, requestId: currentId });
      timer = setTimeout(() => {
        if (!busy) return;
        dropWorker();
        emit({ status: 'failed', key, response: null });
      }, GENERATION_TIMEOUT_MS);
    },
    dispose() {
      clearTimer();
      dropWorker();
      listeners.clear();
    },
  };
}

export type GenerationClient = ReturnType<typeof createGenerationClient>;
```

- [ ] **Step 4: Verificar**

Run: `pnpm test src/workers src/tools/wordsearch && pnpm lint && pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/workers src/tools/wordsearch/wordSearchClient.ts src/tools/wordsearch/wordSearchClient.test.ts
git commit -m "feat(sopa-de-letras): Worker de generación y almacén cliente con invalidación y tiempo máximo"
```

---

### Task 8: Renderizador PDF (`render/pdf`), frontera de importación y presupuesto

**Files:**
- Create: `src/render/pdf/renderPdf.ts`, `src/render/pdf/assets.ts`, `src/render/pdf/index.ts`, `src/render/pdf/renderPdf.test.ts`
- Modify: `eslint.config.mjs`, `scripts/lib/html-assets.mjs`, `scripts/lib/html-assets.test.mjs`, `scripts/budget.mjs`

**Interfaces:**
- Consumes: `SheetDocument`, `Primitive`, `Tone`, `TONE_HEX` (`@/core/sheet`); `PAPER`; `measureTextMm`; `withBasePath`.
- Produces:
  - `@/render/pdf`: `interface PdfAssets { sheetRegular: Uint8Array; sheetBold: Uint8Array; brandMarkPng: Uint8Array }`; `renderPdf(doc: SheetDocument, assets: PdfAssets): Promise<Uint8Array>`; `loadPdfAssets(fetcher?: typeof fetch): Promise<PdfAssets>`; `PDF_ASSET_URLS`.
  - ESLint: `tools/**` no puede importar estáticamente `@/render/pdf`.
  - `firstViewAssets` cuenta también `<link rel="preload" as="script">`; `FORBIDDEN_INITIAL = ['FontFile2', 'CIDFontType2']`.

- [ ] **Step 1: Escribir la prueba del PDF**

`src/render/pdf/renderPdf.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { describe, expect, it } from 'vitest';
import { measureTextMm } from '@/core/measure';
import type { SheetDocument } from '@/core/sheet';
import { renderPdf, type PdfAssets } from './renderPdf';

const require = createRequire(import.meta.url);
const assets: PdfAssets = {
  sheetRegular: new Uint8Array(readFileSync(require.resolve('@fontsource/andika/files/andika-latin-400-normal.woff'))),
  sheetBold: new Uint8Array(readFileSync(require.resolve('@fontsource/andika/files/andika-latin-700-normal.woff'))),
  brandMarkPng: new Uint8Array(readFileSync('public/brand/mark-gray.png')),
};
const MM_TO_PT = 72 / 25.4;

const doc: SheetDocument = {
  paper: 'a4',
  lang: 'es',
  pages: [
    {
      role: 'student',
      primitives: [
        { t: 'text', x: 105, y: 30, text: 'ÑANDÚ pingüino ¿Qué? Nº 5 — «años»', size: 7, font: 'sheetBold', align: 'middle', tone: 'ink' },
        { t: 'text', x: 20, y: 50, text: 'Centro', size: 3.5, font: 'sheet', align: 'start', tone: 'muted' },
        { t: 'rect', x: 20, y: 60, w: 100, h: 100, stroke: 'ink', strokeWidth: 0.4 },
        { t: 'line', x1: 20, y1: 170, x2: 190, y2: 170, stroke: 'faint', strokeWidth: 0.3, dash: [1, 0.5] },
        { t: 'image', id: 'brandMark', x: 12, y: 280, w: 5.6, h: 5 },
      ],
    },
    {
      role: 'solution',
      primitives: [{ t: 'capsule', cx: 70, cy: 110, length: 60, width: 8, angleDeg: 45, stroke: 'muted', strokeWidth: 0.35 }],
    },
  ],
};

async function open(bytes: Uint8Array) {
  return getDocument({ data: new Uint8Array(bytes), verbosity: 0 }).promise;
}

describe('renderPdf', () => {
  it('genera una página por página del documento con tamaño físico', async () => {
    const pdf = await open(await renderPdf(doc, assets));
    expect(pdf.numPages).toBe(2);
    const [, , w, h] = (await pdf.getPage(1)).view;
    expect(w).toBeCloseTo(210 * MM_TO_PT, 1);
    expect(h).toBeCloseTo(297 * MM_TO_PT, 1);
  });

  it('extrae tildes, eñes y signos sin sustituciones', async () => {
    const pdf = await open(await renderPdf(doc, assets));
    const text = (await (await pdf.getPage(1)).getTextContent()).items.map((i) => ('str' in i ? i.str : '')).join('|');
    expect(text).toContain('ÑANDÚ pingüino ¿Qué? Nº 5 — «años»');
    expect(text).toContain('Centro');
  });

  it('incrusta la tipografía como TrueType con subconjunto', async () => {
    const raw = Buffer.from(await renderPdf(doc, assets)).toString('latin1');
    expect(raw).toContain('/FontFile2');
    expect(raw.match(/\/FontFile2/g)!.length).toBe(2);
  });

  it('centra el texto con las mismas métricas que la maquetación', async () => {
    const pdf = await open(await renderPdf(doc, assets));
    const item = (await (await pdf.getPage(1)).getTextContent()).items.find((i) => 'str' in i && i.str.startsWith('ÑANDÚ'));
    const expectedLeftMm = 105 - measureTextMm('ÑANDÚ pingüino ¿Qué? Nº 5 — «años»', 'sheetBold', 7) / 2;
    expect(item && 'transform' in item ? item.transform[4] : NaN).toBeCloseTo(expectedLeftMm * MM_TO_PT, 0);
  });
});
```

Run: `pnpm test src/render/pdf`
Expected: FAIL — no se resuelve `./renderPdf`. Si `pnpm typecheck` no encuentra tipos de `pdfjs-dist/legacy/build/pdf.mjs`, crea `src/types/pdfjs-legacy.d.ts` con `declare module 'pdfjs-dist/legacy/build/pdf.mjs' { export * from 'pdfjs-dist'; }`.

- [ ] **Step 2: Implementar `src/render/pdf/renderPdf.ts`**

```ts
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib';
import { measureTextMm } from '@/core/measure';
import { PAPER } from '@/core/paper';
import { TONE_HEX, type Primitive, type SheetDocument, type Tone } from '@/core/sheet';

export interface PdfAssets {
  sheetRegular: Uint8Array;
  sheetBold: Uint8Array;
  brandMarkPng: Uint8Array;
}

const MM_TO_PT = 72 / 25.4;
const pt = (mm: number) => mm * MM_TO_PT;
const ARC_SEGMENTS = 12;

function color(tone: Tone) {
  const n = Number.parseInt(TONE_HEX[tone].slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

/** Contorno de una cápsula girada en puntos, con el eje y hacia abajo (convención de drawSvgPath). */
function capsulePath(cx: number, cy: number, length: number, width: number, angleDeg: number): string {
  const r = width / 2;
  const half = Math.max(0, length / 2 - r);
  const a = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const points: Array<[number, number]> = [];
  for (let i = 0; i <= ARC_SEGMENTS; i++) {
    const t = -Math.PI / 2 + (Math.PI * i) / ARC_SEGMENTS;
    points.push([half + r * Math.cos(t), r * Math.sin(t)]);
  }
  for (let i = 0; i <= ARC_SEGMENTS; i++) {
    const t = Math.PI / 2 + (Math.PI * i) / ARC_SEGMENTS;
    points.push([-half + r * Math.cos(t), r * Math.sin(t)]);
  }
  return `${points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${pt(cx + x * cos - y * sin).toFixed(3)} ${pt(cy + x * sin + y * cos).toFixed(3)}`)
    .join(' ')} Z`;
}

function drawPrimitive(page: PDFPage, p: Primitive, pageHeightPt: number, fonts: { regular: PDFFont; bold: PDFFont }, brandMark: PDFImage) {
  switch (p.t) {
    case 'text': {
      const width = measureTextMm(p.text, p.font, p.size);
      const left = p.align === 'middle' ? p.x - width / 2 : p.align === 'end' ? p.x - width : p.x;
      page.drawText(p.text, { x: pt(left), y: pageHeightPt - pt(p.y), size: pt(p.size), font: p.font === 'sheetBold' ? fonts.bold : fonts.regular, color: color(p.tone) });
      return;
    }
    case 'rect':
      page.drawRectangle({
        x: pt(p.x),
        y: pageHeightPt - pt(p.y + p.h),
        width: pt(p.w),
        height: pt(p.h),
        borderColor: p.stroke ? color(p.stroke) : undefined,
        borderWidth: p.stroke ? pt(p.strokeWidth ?? 0.2) : 0,
        color: p.fill ? color(p.fill) : undefined,
      });
      return;
    case 'line':
      page.drawLine({
        start: { x: pt(p.x1), y: pageHeightPt - pt(p.y1) },
        end: { x: pt(p.x2), y: pageHeightPt - pt(p.y2) },
        thickness: pt(p.strokeWidth),
        color: color(p.stroke),
        dashArray: p.dash?.map(pt),
      });
      return;
    case 'capsule':
      page.drawSvgPath(capsulePath(p.cx, p.cy, p.length, p.width, p.angleDeg), { x: 0, y: pageHeightPt, borderColor: color(p.stroke), borderWidth: pt(p.strokeWidth) });
      return;
    case 'image': {
      const ratio = brandMark.width / brandMark.height;
      const w = Math.min(p.w, p.h * ratio);
      const h = w / ratio;
      page.drawImage(brandMark, { x: pt(p.x + (p.w - w) / 2), y: pageHeightPt - pt(p.y + (p.h + h) / 2), width: pt(w), height: pt(h) });
      return;
    }
  }
}

export async function renderPdf(doc: SheetDocument, assets: PdfAssets): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  // WOFF con subconjunto: verificado en Fase 2 (WOFF2 con subconjunto rompe @pdf-lib/fontkit).
  const fonts = {
    regular: await pdf.embedFont(assets.sheetRegular, { subset: true }),
    bold: await pdf.embedFont(assets.sheetBold, { subset: true }),
  };
  const brandMark = await pdf.embedPng(assets.brandMarkPng);
  const { widthMm, heightMm } = PAPER[doc.paper];
  const heightPt = pt(heightMm);

  for (const sheetPage of doc.pages) {
    const page = pdf.addPage([pt(widthMm), heightPt]);
    for (const primitive of sheetPage.primitives) drawPrimitive(page, primitive, heightPt, fonts, brandMark);
  }
  // Sin flujos de objetos: el PDF sigue siendo inspeccionable y comprobable (FontFile2, /Count).
  return pdf.save({ useObjectStreams: false });
}
```

- [ ] **Step 3: Cargador de recursos e índice**

`src/render/pdf/assets.ts`:

```ts
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
```

`src/render/pdf/index.ts`:

```ts
export { renderPdf, type PdfAssets } from './renderPdf';
export { loadPdfAssets, PDF_ASSET_URLS } from './assets';
```

Run: `pnpm test src/render/pdf && pnpm lint && pnpm typecheck`
Expected: PASS.

- [ ] **Step 4: Prohibir la importación estática de `render/pdf` en herramientas**

En `eslint.config.mjs`, define junto a `REACT_OR_NEXT`:

```js
const NO_STATIC_PDF = { regex: '^@/render/pdf(/|$)', message: 'render/pdf solo se carga con import() dinámico al descargar el PDF.' };
```

y añade `NO_STATIC_PDF` como segundo patrón en el bloque `boundary(['src/tools/shared/**'], [...])` y en cada bloque `boundary([`src/tools/${g}/**`], [...])`.

Comprobación: crea temporalmente `src/tools/shared/tmp-pdf.ts` con `import { renderPdf } from '@/render/pdf'; export const x = renderPdf;`, ejecuta `pnpm lint` y confirma el mensaje; crea después `src/tools/shared/tmp-pdf.ts` con `export const load = () => import('@/render/pdf');`, ejecuta `pnpm lint` y confirma que pasa. Borra el fichero.

- [ ] **Step 5: Presupuesto: scripts precargados y marcadores del PDF**

En `scripts/lib/html-assets.test.mjs`, añade:

```js
describe('firstViewAssets con precarga de scripts', () => {
  it('cuenta scripts que solo aparecen como <link rel="preload" as="script">', () => {
    const html = '<link rel="preload" as="script" href="/_next/static/chunks/solo-precarga.js"/><script src="/_next/static/chunks/main.js"></script>';
    expect(firstViewAssets(html).scripts).toEqual(['/_next/static/chunks/main.js', '/_next/static/chunks/solo-precarga.js']);
  });
});
```

Run: `pnpm test scripts/lib/html-assets.test.mjs`
Expected: FAIL (el script precargado no se cuenta).

En `scripts/lib/html-assets.mjs`, dentro de `firstViewAssets`, sustituye el cálculo de `scripts` por:

```js
  const links = tags(html, 'link');
  const scripts = [
    ...tags(html, 'script').filter((attrs) => !/\bnomodule\b/i.test(attrs)).map((attrs) => attr(attrs, 'src')),
    ...links.filter((a) => /\brel=["']?preload\b/i.test(a) && /\bas=["']?script\b/i.test(a)).map((a) => attr(a, 'href')),
  ].filter(Boolean);
```

y elimina la declaración posterior duplicada de `links`.

En `scripts/budget.mjs`, sustituye `FORBIDDEN_INITIAL` por:

```js
// Literales de pdf-lib que sobreviven a la minificación; no pueden aparecer en ningún chunk inicial.
const FORBIDDEN_INITIAL = ['FontFile2', 'CIDFontType2'];
```

Run: `pnpm test scripts && pnpm build && pnpm budget && grep -l FontFile2 out/_next/static/chunks/*.js | head -3`
Expected: pruebas en verde, presupuesto en verde. El `grep` no encuentra nada todavía (ninguna ruta importa `render/pdf` hasta la Tarea 11); tras la Tarea 11 debe listar solo chunks diferidos.

- [ ] **Step 6: Commit**

```bash
git add src/render/pdf eslint.config.mjs scripts/lib/html-assets.mjs scripts/lib/html-assets.test.mjs scripts/budget.mjs src/types
git commit -m "feat(pdf): renderizador PDF con Andika incrustada, carga diferida obligada y presupuesto con precargas"
```

---

### Task 9: Textos de la herramienta y mensajes (`i18n`, `tools/wordsearch/messages`)

**Files:**
- Create: `src/i18n/format.ts`, `src/i18n/format.test.ts`, `src/tools/wordsearch/messages.ts`, `src/tools/wordsearch/messages.test.ts`
- Modify: `src/i18n/dictionary.ts`, `src/i18n/dictionaries/es.ts`, `src/i18n/dictionaries/en.ts`

**Interfaces:**
- Produces:
  - `formatMessage(template: string, vars: Record<string, string | number>): string` en `@/i18n/format` (sustituye `{nombre}`; deja intactas las claves sin valor).
  - `Dictionary` amplía `tool` con `optionsSummary`, `headerUnsupportedChars`, `headerTitleShortened`, y añade las secciones `wordsearch` y `proof` (claves exactas en el Step 3).
  - En `tools/wordsearch/messages.ts`: `describeError(error: WordSearchError, t: Dictionary['wordsearch']): string`, `describeRejected(line: RejectedLine, t): string`, `describeWarning(warning: WordSearchWarning, t): string`, `describeSuggestion(s: Suggestion, t): string`.

- [ ] **Step 1: Pruebas**

`src/i18n/format.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { formatMessage } from './format';

describe('formatMessage', () => {
  it('sustituye marcadores y conserva los desconocidos', () => {
    expect(formatMessage('Hay {count} palabras; el máximo es {max}.', { count: 51, max: 50 })).toBe('Hay 51 palabras; el máximo es 50.');
    expect(formatMessage('«{word}» y {otra}', { word: 'ñandú' })).toBe('«ñandú» y {otra}');
  });
});
```

`src/tools/wordsearch/messages.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { getDictionary } from '@/i18n/dictionary';
import { describeError, describeRejected, describeSuggestion, describeWarning } from './messages';

const es = getDictionary('es').wordsearch;
const en = getDictionary('en').wordsearch;

describe('mensajes de la sopa de letras', () => {
  it('errores bloqueantes con datos concretos', () => {
    expect(describeError({ code: 'too-many-words', count: 51, max: 50 }, es)).toBe('Hay 51 palabras; el máximo es 50.');
    expect(describeError({ code: 'word-too-long', line: 1, word: 'Mariposas', length: 9 }, es)).toBe('«Mariposas» tiene 9 letras: la cuadrícula debe medir al menos 9.');
    expect(describeError({ code: 'word-too-long', line: 1, word: 'Electroencefalografista', length: 27 }, es)).toBe('«Electroencefalografista» tiene 27 letras y no cabe en la cuadrícula máxima de 25.');
    expect(describeError({ code: 'no-direction' }, en)).toBe('At least one direction is needed: horizontal, vertical or diagonal.');
  });

  it('líneas rechazadas y avisos', () => {
    expect(describeRejected({ code: 'unsupported-glyph', line: 3, chars: ['ő'] }, es)).toBe('Línea 3: la tipografía de la ficha no incluye «ő».');
    expect(describeWarning({ code: 'duplicate', line: 4, duplicateOf: 1 }, es)).toBe('Línea 4: palabra repetida (igual que la línea 1); se ignora.');
    expect(describeWarning({ code: 'large-list', suggestedSize: 19 }, en)).toBe('For this list a grid of 19 or more is recommended.');
  });

  it('sugerencias', () => {
    expect(describeSuggestion({ code: 'increase-size', size: 14 }, es)).toBe('Aumentar la cuadrícula a 14.');
    expect(describeSuggestion({ code: 'remove-words', words: ['rinoceronte', 'hipopótamo'] }, es)).toBe('Retirar las más largas: rinoceronte, hipopótamo.');
  });

  it('ningún texto en español usa tuteo ni usted', () => {
    const all = JSON.stringify(getDictionary('es'));
    expect(all).not.toMatch(/\b(tu|tus|usted|activa|elige|escribe|descarga tu)\b/i);
  });
});
```

Run: `pnpm test src/i18n src/tools/wordsearch/messages.test.ts`
Expected: FAIL.

- [ ] **Step 2: `src/i18n/format.ts`**

```ts
export function formatMessage(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}
```

- [ ] **Step 3: Ampliar `Dictionary` y diccionarios**

En `src/i18n/dictionary.ts`, amplía `tool` y añade dos secciones:

```ts
  tool: {
    headerLegend: string;
    titleLabel: string;
    schoolLabel: string;
    paperLabel: string;
    paperA4: string;
    paperLetter: string;
    print: string;
    preview: string;
    optionsSummary: string;
    headerUnsupportedChars: string;
    headerTitleShortened: string;
  };
  wordsearch: {
    sampleWords: string;
    wordsLabel: string;
    wordsHelp: string;
    wordsCount: string;
    gridLegend: string;
    sizeLabel: string;
    directionsLegend: string;
    horizontal: string;
    vertical: string;
    diagonal: string;
    reversed: string;
    seedLabel: string;
    seedHelp: string;
    seedInvalid: string;
    newSheet: string;
    includeSolutions: string;
    generating: string;
    retry: string;
    quote: string;
    errors: {
      noWords: string;
      tooManyWords: string;
      wordTooLong: string;
      wordTooLongMax: string;
      sizeOutOfRange: string;
      noDirection: string;
      invalidChars: string;
      tooShort: string;
      unsupportedGlyph: string;
      cellsTooSmall: string;
      workerFailed: string;
    };
    warnings: { duplicate: string; contained: string; largeList: string };
    unplaced: { title: string; intro: string; increaseSize: string; enableDiagonal: string; enableReversed: string; removeWords: string; generateWithout: string };
  };
  proof: {
    zoomLegend: string;
    zoomFit: string;
    zoomActual: string;
    enlarge: string;
    close: string;
    toneLegend: string;
    jobPaper: string;
    jobPages: string;
    jobSeed: string;
    downloadPdf: string;
    preparingPdf: string;
    pdfOffline: string;
    pdfFailed: string;
  };
```

En `src/i18n/dictionaries/es.ts`, añade a `tool`:

```ts
    optionsSummary: 'Opciones de la ficha',
    headerUnsupportedChars: 'La tipografía de la ficha no incluye {chars}; esos caracteres no aparecerán en la hoja.',
    headerTitleShortened: 'El título no cabe completo en la hoja y se acortará.',
```

y las secciones:

```ts
  wordsearch: {
    sampleWords: 'gato\nperro\nconejo\ncaballo\noveja\nvaca\ngallina\npato\nñandú\npingüino',
    wordsLabel: 'Palabras',
    wordsHelp: 'Una palabra por línea, hasta {max}.',
    wordsCount: '{count} de {max} palabras',
    gridLegend: 'Cuadrícula',
    sizeLabel: 'Tamaño de la cuadrícula',
    directionsLegend: 'Direcciones',
    horizontal: 'Horizontal',
    vertical: 'Vertical',
    diagonal: 'Diagonal',
    reversed: 'Invertidas',
    seedLabel: 'Código de ficha',
    seedHelp: 'Con el mismo código y las mismas opciones se obtiene la misma ficha.',
    seedInvalid: 'Código no válido. Formato: v1-ABC234.',
    newSheet: 'Nueva sopa',
    includeSolutions: 'Incluir soluciones',
    generating: 'Generando…',
    retry: 'Reintentar',
    quote: '«{text}»',
    errors: {
      noWords: 'Falta al menos una palabra válida.',
      tooManyWords: 'Hay {count} palabras; el máximo es {max}.',
      wordTooLong: '«{word}» tiene {length} letras: la cuadrícula debe medir al menos {length}.',
      wordTooLongMax: '«{word}» tiene {length} letras y no cabe en la cuadrícula máxima de {max}.',
      sizeOutOfRange: 'El tamaño debe estar entre {min} y {max}.',
      noDirection: 'Se necesita al menos una dirección: horizontal, vertical o diagonal.',
      invalidChars: 'Línea {line}: solo se admiten letras, espacios, guiones y apóstrofos.',
      tooShort: 'Línea {line}: la palabra necesita al menos 2 letras.',
      unsupportedGlyph: 'Línea {line}: la tipografía de la ficha no incluye {chars}.',
      cellsTooSmall: 'La cuadrícula no cabe con casillas legibles; el máximo en este papel es {size}.',
      workerFailed: 'No se pudo generar la ficha.',
    },
    warnings: {
      duplicate: 'Línea {line}: palabra repetida (igual que la línea {other}); se ignora.',
      contained: 'Línea {line}: la palabra aparece dentro de la línea {other}; la solución puede ser ambigua.',
      largeList: 'Con esta lista se recomienda una cuadrícula de {size} o más.',
    },
    unplaced: {
      title: 'Palabras sin colocar',
      intro: 'Tras agotar los intentos no hubo espacio para {count}:',
      increaseSize: 'Aumentar la cuadrícula a {size}.',
      enableDiagonal: 'Activar la dirección diagonal.',
      enableReversed: 'Activar las palabras invertidas.',
      removeWords: 'Retirar las más largas: {words}.',
      generateWithout: 'Generar sin estas palabras',
    },
  },
  proof: {
    zoomLegend: 'Escala de la vista previa',
    zoomFit: 'Ajustar',
    zoomActual: '100 %',
    enlarge: 'Ampliar',
    close: 'Cerrar',
    toneLegend: 'Tonos de impresión',
    jobPaper: 'Papel',
    jobPages: 'Páginas',
    jobSeed: 'Código',
    downloadPdf: 'Descargar PDF',
    preparingPdf: 'Preparando PDF…',
    pdfOffline: 'La descarga del PDF necesita haberse abierto una vez con conexión. La impresión directa sigue disponible.',
    pdfFailed: 'No se pudo preparar el PDF. La impresión directa sigue disponible.',
  },
```

En `src/i18n/dictionaries/en.ts`, añade a `tool`:

```ts
    optionsSummary: 'Worksheet options',
    headerUnsupportedChars: 'The worksheet typeface has no {chars}; those characters will not appear on the sheet.',
    headerTitleShortened: 'The title does not fit on the sheet and will be shortened.',
```

y las secciones:

```ts
  wordsearch: {
    sampleWords: 'cat\ndog\nrabbit\nhorse\nsheep\ncow\nhen\nduck\ngoat\npenguin',
    wordsLabel: 'Words',
    wordsHelp: 'One word per line, up to {max}.',
    wordsCount: '{count} of {max} words',
    gridLegend: 'Grid',
    sizeLabel: 'Grid size',
    directionsLegend: 'Directions',
    horizontal: 'Horizontal',
    vertical: 'Vertical',
    diagonal: 'Diagonal',
    reversed: 'Backwards',
    seedLabel: 'Worksheet code',
    seedHelp: 'The same code with the same options produces the same worksheet.',
    seedInvalid: 'Invalid code. Format: v1-ABC234.',
    newSheet: 'New puzzle',
    includeSolutions: 'Include answer key',
    generating: 'Generating…',
    retry: 'Retry',
    quote: '“{text}”',
    errors: {
      noWords: 'At least one valid word is needed.',
      tooManyWords: 'There are {count} words; the maximum is {max}.',
      wordTooLong: '“{word}” has {length} letters: the grid must be at least {length}.',
      wordTooLongMax: '“{word}” has {length} letters and does not fit the largest grid of {max}.',
      sizeOutOfRange: 'Size must be between {min} and {max}.',
      noDirection: 'At least one direction is needed: horizontal, vertical or diagonal.',
      invalidChars: 'Line {line}: only letters, spaces, hyphens and apostrophes are allowed.',
      tooShort: 'Line {line}: the word needs at least 2 letters.',
      unsupportedGlyph: 'Line {line}: the worksheet typeface has no {chars}.',
      cellsTooSmall: 'The grid does not fit with readable cells; the largest size on this paper is {size}.',
      workerFailed: 'The worksheet could not be generated.',
    },
    warnings: {
      duplicate: 'Line {line}: repeated word (same as line {other}); ignored.',
      contained: 'Line {line}: the word appears inside line {other}; the answer may be ambiguous.',
      largeList: 'For this list a grid of {size} or more is recommended.',
    },
    unplaced: {
      title: 'Words not placed',
      intro: 'After all attempts there was no room for {count}:',
      increaseSize: 'Increase the grid to {size}.',
      enableDiagonal: 'Turn on the diagonal direction.',
      enableReversed: 'Turn on backwards words.',
      removeWords: 'Remove the longest: {words}.',
      generateWithout: 'Generate without these words',
    },
  },
  proof: {
    zoomLegend: 'Preview scale',
    zoomFit: 'Fit',
    zoomActual: '100%',
    enlarge: 'Enlarge',
    close: 'Close',
    toneLegend: 'Print tones',
    jobPaper: 'Paper',
    jobPages: 'Pages',
    jobSeed: 'Code',
    downloadPdf: 'Download PDF',
    preparingPdf: 'Preparing PDF…',
    pdfOffline: 'The PDF download needs to have been opened once with a connection. Direct printing is still available.',
    pdfFailed: 'The PDF could not be prepared. Direct printing is still available.',
  },
```

- [ ] **Step 4: `src/tools/wordsearch/messages.ts`**

```ts
import type { RejectedLine, Suggestion, WordSearchError, WordSearchWarning } from '@/generators/wordsearch';
import { WORDSEARCH_LIMITS } from '@/generators/wordsearch';
import type { Dictionary } from '@/i18n/dictionary';
import { formatMessage } from '@/i18n/format';

type Strings = Dictionary['wordsearch'];

const quoteChars = (chars: readonly string[], t: Strings) => chars.map((c) => formatMessage(t.quote, { text: c })).join(' ');

export function describeError(error: WordSearchError, t: Strings): string {
  switch (error.code) {
    case 'no-words':
      return t.errors.noWords;
    case 'too-many-words':
      return formatMessage(t.errors.tooManyWords, { count: error.count, max: error.max });
    case 'word-too-long':
      return error.length > WORDSEARCH_LIMITS.maxSize
        ? formatMessage(t.errors.wordTooLongMax, { word: error.word, length: error.length, max: WORDSEARCH_LIMITS.maxSize })
        : formatMessage(t.errors.wordTooLong, { word: error.word, length: error.length });
    case 'size-out-of-range':
      return formatMessage(t.errors.sizeOutOfRange, { min: error.min, max: error.max });
    case 'no-direction':
      return t.errors.noDirection;
  }
}

export function describeRejected(line: RejectedLine, t: Strings): string {
  switch (line.code) {
    case 'invalid-chars':
      return formatMessage(t.errors.invalidChars, { line: line.line });
    case 'too-short':
      return formatMessage(t.errors.tooShort, { line: line.line });
    case 'unsupported-glyph':
      return formatMessage(t.errors.unsupportedGlyph, { line: line.line, chars: quoteChars(line.chars, t) });
  }
}

export function describeWarning(warning: WordSearchWarning, t: Strings): string {
  switch (warning.code) {
    case 'duplicate':
      return formatMessage(t.warnings.duplicate, { line: warning.line, other: warning.duplicateOf });
    case 'contained':
      return formatMessage(t.warnings.contained, { line: warning.line, other: warning.containerLine });
    case 'large-list':
      return formatMessage(t.warnings.largeList, { size: warning.suggestedSize });
  }
}

export function describeSuggestion(s: Suggestion, t: Strings): string {
  switch (s.code) {
    case 'increase-size':
      return formatMessage(t.unplaced.increaseSize, { size: s.size });
    case 'enable-diagonal':
      return t.unplaced.enableDiagonal;
    case 'enable-reversed':
      return t.unplaced.enableReversed;
    case 'remove-words':
      return formatMessage(t.unplaced.removeWords, { words: s.words.join(', ') });
  }
}
```

- [ ] **Step 5: Verificar**

Run: `pnpm test && pnpm lint && pnpm typecheck`
Expected: PASS, incluida la paridad de claves de `src/i18n/i18n.test.ts`.

- [ ] **Step 6: Commit**

```bash
git add src/i18n src/tools/wordsearch/messages.ts src/tools/wordsearch/messages.test.ts
git commit -m "feat(i18n): textos de la sopa de letras y de la prueba de imprenta con mensajes concretos"
```

---

### Task 10: Herramienta de sopa de letras — formulario, generación, vista previa e impresión

> Antes de editar UI: `craft-floor.md`, `DESIGN.md` y el contrato de dirección. Las clases pueden ajustarse a `DESIGN.md` sin cambiar estructura, roles, nombres accesibles, textos ni atributos `data-*`.

**Files:**
- Create: `src/tools/wordsearch/WordListField.tsx`, `src/tools/wordsearch/GridOptions.tsx`, `src/tools/wordsearch/UnplacedPanel.tsx`, `src/tools/shared/SeedField.tsx`, `src/tools/shared/IncludeSolutionsField.tsx`, `tests/e2e/wordsearch.spec.ts`
- Modify: `src/tools/wordsearch/WordSearchTool.tsx` (sustitución completa), `src/tools/wordsearch/index.ts`, `src/tools/shared/SheetHeaderFields.tsx`, `src/app/[lang]/[section]/page.tsx`, `tests/e2e/print.spec.ts`

**Interfaces:**
- Consumes: Tareas 1–9.
- Produces:
  - `WordSearchTool({ lang, labels }: { lang: Lang; labels: WordSearchLabels })` con `interface WordSearchLabels { sheet: Dictionary['sheet']; tool: Dictionary['tool']; wordsearch: Dictionary['wordsearch']; proof: Dictionary['proof'] }`; raíz con `data-generation="idle|pending|done|failed"`.
  - `SheetHeaderFields` acepta `notices: string[]`.
  - Botones de acción nuevos con `data-action="generate"` («Nueva sopa», «Generar sin estas palabras», «Reintentar»).

- [ ] **Step 1: Escribir las pruebas end-to-end**

`tests/e2e/wordsearch.spec.ts`:

```ts
import { expect, test, type Page } from '@playwright/test';

const sheet = (page: Page) => page.locator('[data-tool-canvas] svg[role="img"]').first();
const settle = (page: Page) => expect(page.locator('[data-generation]')).toHaveAttribute('data-generation', 'done', { timeout: 10_000 });
const gridLetters = (page: Page) =>
  sheet(page).evaluate((svg) => Array.from(svg.querySelectorAll('text')).filter((t) => Array.from(t.textContent ?? '').length === 1).map((t) => t.textContent));

test.describe('sopa de letras', () => {
  test('genera la cuadrícula de ejemplo con la lista en su forma original', async ({ page }) => {
    await page.goto('es/sopa-de-letras/');
    await settle(page);
    expect(await gridLetters(page)).toHaveLength(144);
    await expect(sheet(page)).toContainText('ñandú');
    await expect(sheet(page)).toContainText('pingüino');
  });

  test('el mismo código reproduce la misma ficha', async ({ page }) => {
    await page.goto('es/sopa-de-letras/');
    await page.getByLabel('Código de ficha').fill('v1-abc234');
    await settle(page);
    const first = await sheet(page).innerHTML();
    await page.getByLabel('Tamaño de la cuadrícula').selectOption('13');
    await settle(page);
    expect(await gridLetters(page)).toHaveLength(169);
    await page.getByLabel('Tamaño de la cuadrícula').selectOption('12');
    await settle(page);
    expect(await sheet(page).innerHTML()).toBe(first);

    await page.reload();
    await page.getByLabel('Código de ficha').fill(' v1-ABC234 ');
    await settle(page);
    expect(await sheet(page).innerHTML()).toBe(first);
  });

  test('«Nueva sopa» cambia el código y la cuadrícula', async ({ page }) => {
    await page.goto('es/sopa-de-letras/');
    await settle(page);
    const before = (await gridLetters(page)).join('');
    await page.getByRole('button', { name: 'Nueva sopa' }).click();
    await settle(page);
    expect((await gridLetters(page)).join('')).not.toBe(before);
  });

  test('un código mal escrito se indica y no genera', async ({ page }) => {
    await page.goto('es/sopa-de-letras/');
    await page.getByLabel('Código de ficha').fill('hola');
    await expect(page.getByText('Código no válido. Formato: v1-ABC234.')).toBeVisible();
  });

  test('las líneas inválidas se rechazan sin bloquear', async ({ page }) => {
    await page.goto('es/sopa-de-letras/');
    await page.getByLabel('Palabras').fill('gato\naño 2\nperro');
    await settle(page);
    await expect(page.getByText('Línea 2: solo se admiten letras, espacios, guiones y apóstrofos.')).toBeVisible();
    expect(await gridLetters(page)).toHaveLength(144);
  });

  test('una palabra más larga que la cuadrícula bloquea con mensaje concreto', async ({ page }) => {
    await page.goto('es/sopa-de-letras/');
    await page.getByLabel('Tamaño de la cuadrícula').selectOption('8');
    await page.getByLabel('Palabras').fill('mariposas');
    await expect(page.getByRole('alert')).toContainText('«mariposas» tiene 9 letras: la cuadrícula debe medir al menos 9.');
  });

  test('informa de las palabras sin colocar y genera sin ellas', async ({ page }) => {
    await page.goto('es/sopa-de-letras/');
    await page.getByLabel('Tamaño de la cuadrícula').selectOption('8');
    await page.getByLabel('Vertical').uncheck();
    await page.getByLabel('Diagonal').uncheck();
    await page.getByLabel('Palabras').fill(['aaaaaaaa', 'bbbbbbbb', 'cccccccc', 'dddddddd', 'eeeeeeee', 'ffffffff', 'gggggggg', 'hhhhhhhh', 'iiiiiiii'].join('\n'));
    await settle(page);
    await expect(page.getByRole('heading', { name: 'Palabras sin colocar' })).toBeVisible();
    await expect(page.getByText('Activar la dirección diagonal.')).toBeVisible();
    await page.getByRole('button', { name: 'Generar sin estas palabras' }).click();
    await settle(page);
    await expect(page.getByRole('heading', { name: 'Palabras sin colocar' })).toHaveCount(0);
    expect((await page.getByLabel('Palabras').inputValue()).split('\n')).toHaveLength(8);
  });

  test('«Incluir soluciones» controla las páginas impresas', async ({ page }) => {
    await page.goto('es/sopa-de-letras/');
    await settle(page);
    await expect(page.locator('#print-root .print-page')).toHaveCount(2);
    await page.getByLabel('Incluir soluciones').uncheck();
    await expect(page.locator('#print-root .print-page')).toHaveCount(1);
  });

  test('en inglés no aparece la Ñ de relleno', async ({ page }) => {
    await page.goto('en/word-search/');
    await settle(page);
    const letters = await gridLetters(page);
    expect(letters).toHaveLength(144);
    expect(letters).not.toContain('Ñ');
  });
});
```

En `tests/e2e/print.spec.ts`, en el primer test: tras `await page.goto('es/sopa-de-letras/');` añade `await expect(page.locator('[data-generation]')).toHaveAttribute('data-generation', 'done', { timeout: 10_000 });`; sustituye `await expect(page.locator('#print-root svg')).toHaveCount(1);` por `toHaveCount(2)` y `expect(count).toBe(1);` por `expect(count).toBe(2);`. Añade al final del `describe`:

```ts
  test('sin soluciones se imprime una sola página', async ({ page }) => {
    await page.goto('es/sopa-de-letras/');
    await expect(page.locator('[data-generation]')).toHaveAttribute('data-generation', 'done', { timeout: 10_000 });
    await page.getByLabel('Incluir soluciones').uncheck();
    await page.emulateMedia({ media: 'print' });
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
    expect(Number(/\/Count (\d+)/.exec(pdf.toString('latin1'))?.[1])).toBe(1);
  });
```

Run (secuencia e2e): `pnpm build:e2e`, servidor manual, `pnpm exec playwright test tests/e2e/wordsearch.spec.ts --reporter=line`
Expected: FAIL — no existen «Palabras» ni `data-generation`.

- [ ] **Step 2: Campos compartidos**

`src/tools/shared/SeedField.tsx`:

```tsx
'use client';

import { useId } from 'react';

export function SeedField({ value, onChange, onNewSeed, error, labels }: {
  value: string;
  onChange: (next: string) => void;
  onNewSeed: () => void;
  error: string | null;
  labels: { label: string; help: string; newSeed: string };
}) {
  const helpId = useId();
  const errorId = useId();
  return (
    <div className="grid gap-2 border-t border-line pt-4">
      <label className="grid gap-1 text-sm">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">{labels.label}</span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="v1-ABC234"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${helpId} ${errorId}` : helpId}
          className="border border-line bg-surface px-3 py-2 text-base tabular-nums text-ink"
        />
      </label>
      <p id={helpId} className="text-xs text-muted">{labels.help}</p>
      {error && (
        <p id={errorId} className="text-xs font-semibold text-ink">
          {error}
        </p>
      )}
      <button type="button" data-action="generate" onClick={onNewSeed} className="justify-self-start border border-brand px-4 py-2 font-semibold text-brand hover:bg-brand hover:text-surface">
        {labels.newSeed}
      </button>
    </div>
  );
}
```

`src/tools/shared/IncludeSolutionsField.tsx`:

```tsx
'use client';

export function IncludeSolutionsField({ checked, onChange, label }: { checked: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 border-t border-line pt-4 text-sm text-ink">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4" />
      {label}
    </label>
  );
}
```

En `src/tools/shared/SheetHeaderFields.tsx`, añade la prop `notices: string[]` a la firma y, antes de cerrar `</fieldset>`:

```tsx
      {notices.length > 0 && (
        <ul aria-live="polite" className="grid gap-1 text-xs text-ink">
          {notices.map((notice) => (
            <li key={notice}>{notice}</li>
          ))}
        </ul>
      )}
```

- [ ] **Step 3: Componentes de la sopa**

`src/tools/wordsearch/WordListField.tsx`:

```tsx
'use client';

import { useId } from 'react';

export function WordListField({ value, onChange, messages, countLabel, labels }: {
  value: string;
  onChange: (next: string) => void;
  messages: string[];
  countLabel: string;
  labels: { label: string; help: string };
}) {
  const helpId = useId();
  const messagesId = useId();
  return (
    <div className="grid gap-2 border-t border-line pt-4">
      <label className="grid gap-1 text-sm">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">{labels.label}</span>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={8}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="none"
          aria-describedby={`${helpId} ${messagesId}`}
          className="resize-y border border-line bg-surface px-3 py-2 font-sheet text-base text-ink"
        />
      </label>
      <p id={helpId} className="flex flex-wrap justify-between gap-2 text-xs text-muted">
        <span>{labels.help}</span>
        <span className="tabular-nums">{countLabel}</span>
      </p>
      <ul id={messagesId} aria-live="polite" className="grid gap-1 text-xs text-ink">
        {messages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </div>
  );
}
```

`src/tools/wordsearch/GridOptions.tsx`:

```tsx
'use client';

import { WORDSEARCH_LIMITS, type DirectionOptions } from '@/generators/wordsearch';

const SIZES = Array.from({ length: WORDSEARCH_LIMITS.maxSize - WORDSEARCH_LIMITS.minSize + 1 }, (_, i) => WORDSEARCH_LIMITS.minSize + i);
const DIRECTION_KEYS = ['horizontal', 'vertical', 'diagonal', 'reversed'] as const;

export function GridOptions({ size, onSizeChange, directions, onDirectionsChange, labels }: {
  size: number;
  onSizeChange: (next: number) => void;
  directions: DirectionOptions;
  onDirectionsChange: (next: DirectionOptions) => void;
  labels: { legend: string; size: string; directions: string } & Record<(typeof DIRECTION_KEYS)[number], string>;
}) {
  return (
    <div className="border-t border-line pt-4">
      <fieldset className="grid gap-3">
        <legend className="mb-3 text-base font-semibold text-ink">{labels.legend}</legend>
        <label className="grid gap-1 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">{labels.size}</span>
          <select value={size} onChange={(e) => onSizeChange(Number(e.target.value))} className="border border-line bg-surface px-3 py-2 text-base tabular-nums text-ink">
            {SIZES.map((n) => (
              <option key={n} value={n}>{`${n} × ${n}`}</option>
            ))}
          </select>
        </label>
        <fieldset className="grid grid-cols-2 gap-2">
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{labels.directions}</legend>
          {DIRECTION_KEYS.map((key) => (
            <label key={key} className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={directions[key]} onChange={(e) => onDirectionsChange({ ...directions, [key]: e.target.checked })} className="h-4 w-4" />
              {labels[key]}
            </label>
          ))}
        </fieldset>
      </fieldset>
    </div>
  );
}
```

`src/tools/wordsearch/UnplacedPanel.tsx`:

```tsx
'use client';

import { useId } from 'react';

export function UnplacedPanel({ words, suggestions, onRemove, labels }: {
  words: string[];
  suggestions: string[];
  onRemove: () => void;
  labels: { title: string; intro: string; action: string };
}) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="grid gap-3 border border-line bg-surface p-4 text-sm text-ink">
      <h3 id={titleId} className="text-base font-semibold">{labels.title}</h3>
      <p>
        {labels.intro} <span className="font-sheet font-semibold">{words.join(', ')}</span>
      </p>
      <ul className="grid list-disc gap-1 pl-5">
        {suggestions.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
      <button type="button" data-action="generate" onClick={onRemove} className="justify-self-start bg-brand px-4 py-2 font-semibold text-surface hover:bg-brand-strong">
        {labels.action}
      </button>
    </section>
  );
}
```

- [ ] **Step 4: Sustituir `src/tools/wordsearch/WordSearchTool.tsx`**

```tsx
'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { Lang } from '@/core/lang';
import { unsupportedSheetChars } from '@/core/measure';
import { defaultPaperFor, type PaperSize } from '@/core/paper';
import { canonicalSeedCode, newSeedCode } from '@/core/random';
import type { SheetDocument } from '@/core/sheet';
import { suggestAdjustments, validateWordSearch, WORDSEARCH_ALGORITHM_VERSION, WORDSEARCH_LIMITS, type DirectionOptions } from '@/generators/wordsearch';
import type { Dictionary } from '@/i18n/dictionary';
import { formatMessage } from '@/i18n/format';
import { buildFrame, fitHeader, type SheetHeader } from '@/layout/common/frame';
import { layoutWordSearch } from '@/layout/wordsearch';
import { IncludeSolutionsField } from '@/tools/shared/IncludeSolutionsField';
import { PaperSelect } from '@/tools/shared/PaperSelect';
import { PrintButton } from '@/tools/shared/PrintButton';
import { PrintRoot } from '@/tools/shared/PrintRoot';
import { SeedField } from '@/tools/shared/SeedField';
import { SheetHeaderFields } from '@/tools/shared/SheetHeaderFields';
import { SheetPreview } from '@/tools/shared/SheetPreview';
import { GridOptions } from './GridOptions';
import { describeError, describeRejected, describeSuggestion, describeWarning } from './messages';
import { UnplacedPanel } from './UnplacedPanel';
import { createGenerationClient, type WorkerLike } from './wordSearchClient';
import { WordListField } from './WordListField';

export interface WordSearchLabels {
  sheet: Dictionary['sheet'];
  tool: Dictionary['tool'];
  wordsearch: Dictionary['wordsearch'];
  proof: Dictionary['proof'];
}

const noopSubscribe = () => () => {};
const browserPaper = () => defaultPaperFor(navigator.languages ?? [navigator.language]);
const serverPaper = (): PaperSize => 'a4';
// Semilla inicial creada una sola vez en el cliente; el HTML estático no lleva semilla (sin desajuste de hidratación).
let initialSeed: string | null = null;
const browserSeed = () => (initialSeed ??= newSeedCode(WORDSEARCH_ALGORITHM_VERSION));
const serverSeed = () => '';
const createWorker = (): WorkerLike => new Worker(new URL('../../workers/wordsearch.worker.ts', import.meta.url)) as unknown as WorkerLike;

const DEFAULT_SIZE = 12;
const DEFAULT_DIRECTIONS: DirectionOptions = { horizontal: true, vertical: true, diagonal: true, reversed: false };
const DEBOUNCE_MS = 250;

export function WordSearchTool({ lang, labels }: { lang: Lang; labels: WordSearchLabels }) {
  const t = labels.wordsearch;
  const [header, setHeader] = useState<SheetHeader>({ title: labels.sheet.defaultTitle, school: '' });
  const detectedPaper = useSyncExternalStore(noopSubscribe, browserPaper, serverPaper);
  const [chosenPaper, setPaper] = useState<PaperSize | null>(null);
  const paper = chosenPaper ?? detectedPaper;
  const [wordsText, setWordsText] = useState(t.sampleWords);
  const [size, setSize] = useState(DEFAULT_SIZE);
  const [directions, setDirections] = useState<DirectionOptions>(DEFAULT_DIRECTIONS);
  const [includeSolutions, setIncludeSolutions] = useState(true);
  const [seedInput, setSeedInput] = useState('');
  const [regeneratedSeed, setRegeneratedSeed] = useState<string | null>(null);
  const initialSeedCode = useSyncExternalStore(noopSubscribe, browserSeed, serverSeed);

  const [client] = useState(() => createGenerationClient(createWorker));
  const generation = useSyncExternalStore(client.subscribe, client.getSnapshot, client.getSnapshot);
  useEffect(() => () => client.dispose(), [client]);

  const validation = useMemo(() => validateWordSearch({ wordsText, size, directions }, lang), [wordsText, size, directions, lang]);
  const typedSeed = seedInput.trim() === '' ? null : canonicalSeedCode(seedInput);
  const seedInvalid = seedInput.trim() !== '' && typedSeed === null;
  const seedCode = typedSeed ?? regeneratedSeed ?? initialSeedCode;
  const requestKey =
    validation.ok && seedCode !== '' && !seedInvalid
      ? JSON.stringify({ words: validation.value.entries.map((e) => e.normalized), size, directions, seedCode, lang })
      : null;

  useEffect(() => {
    if (!requestKey || !validation.ok) return;
    const value = validation.value;
    const timer = setTimeout(() => client.request(requestKey, { value, seedCode, lang }), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [client, requestKey, validation, seedCode, lang]);

  const current = requestKey !== null && generation.key === requestKey;
  const result = requestKey && generation.response?.ok ? generation.response.result : null;
  const frameLabels = useMemo(() => ({ name: labels.sheet.name, date: labels.sheet.date, solutions: labels.sheet.solutions }), [labels.sheet]);
  const layout = useMemo(
    () => (result ? layoutWordSearch({ result, header, labels: frameLabels, paper, lang, includeSolutions }) : null),
    [result, header, frameLabels, paper, lang, includeSolutions],
  );
  const doc = useMemo<SheetDocument>(() => {
    if (layout?.ok) return layout.doc;
    return { paper, lang, pages: [{ role: 'student', primitives: buildFrame({ paper, header, labels: frameLabels, role: 'student' }).primitives }] };
  }, [layout, paper, lang, header, frameLabels]);

  const quote = (chars: string[]) => chars.map((c) => formatMessage(t.quote, { text: c })).join(' ');
  const headerChars = unsupportedSheetChars(`${header.title}${header.school}`);
  const headerFit = fitHeader({ paper, header, labels: frameLabels, role: includeSolutions ? 'solution' : 'student' });
  const headerNotices = [
    ...(headerChars.length > 0 ? [formatMessage(labels.tool.headerUnsupportedChars, { chars: quote(headerChars) })] : []),
    ...(headerFit.title.truncated ? [labels.tool.headerTitleShortened] : []),
  ];

  const lineMessages = [...validation.rejected.map((r) => describeRejected(r, t)), ...validation.warnings.map((w) => describeWarning(w, t))];
  const lineCount = wordsText.split(/\r?\n/).filter((line) => line.trim() !== '').length;
  const failed = current && generation.status === 'failed';
  const blocking = [
    ...(validation.ok ? [] : validation.errors.map((e) => describeError(e, t))),
    ...(layout && !layout.ok ? [formatMessage(t.errors.cellsTooSmall, { size: layout.error.maxSize })] : []),
    ...(failed ? [t.errors.workerFailed] : []),
  ];

  const unplaced = current && generation.status === 'done' && result ? result.unplaced : [];
  const suggestions = unplaced.length > 0 && validation.ok ? suggestAdjustments(validation.value, unplaced).map((s) => describeSuggestion(s, t)) : [];
  const removeUnplaced = () => {
    const drop = new Set(unplaced.map((e) => e.line));
    setWordsText(wordsText.split(/\r?\n/).filter((_, i) => !drop.has(i + 1)).join('\n'));
  };
  const retry = () => {
    if (requestKey && validation.ok) client.request(requestKey, { value: validation.value, seedCode, lang });
  };

  return (
    <div data-generation={current ? generation.status : 'pending'} className="grid gap-6 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <form className="grid content-start gap-5 self-start border border-line bg-surface p-5" onSubmit={(e) => e.preventDefault()}>
        <SheetHeaderFields
          value={header}
          onChange={setHeader}
          notices={headerNotices}
          labels={{ legend: labels.tool.headerLegend, title: labels.tool.titleLabel, school: labels.tool.schoolLabel }}
        />
        <WordListField
          value={wordsText}
          onChange={setWordsText}
          messages={lineMessages}
          countLabel={formatMessage(t.wordsCount, { count: lineCount, max: WORDSEARCH_LIMITS.maxWords })}
          labels={{ label: t.wordsLabel, help: formatMessage(t.wordsHelp, { max: WORDSEARCH_LIMITS.maxWords }) }}
        />
        <GridOptions
          size={size}
          onSizeChange={setSize}
          directions={directions}
          onDirectionsChange={setDirections}
          labels={{ legend: t.gridLegend, size: t.sizeLabel, directions: t.directionsLegend, horizontal: t.horizontal, vertical: t.vertical, diagonal: t.diagonal, reversed: t.reversed }}
        />
        <PaperSelect value={paper} onChange={setPaper} labels={{ paper: labels.tool.paperLabel, a4: labels.tool.paperA4, letter: labels.tool.paperLetter }} />
        <SeedField
          value={seedInput}
          onChange={setSeedInput}
          error={seedInvalid ? t.seedInvalid : null}
          onNewSeed={() => {
            setSeedInput('');
            setRegeneratedSeed(newSeedCode(WORDSEARCH_ALGORITHM_VERSION));
          }}
          labels={{ label: t.seedLabel, help: t.seedHelp, newSeed: t.newSheet }}
        />
        <IncludeSolutionsField checked={includeSolutions} onChange={setIncludeSolutions} label={t.includeSolutions} />
      </form>

      <div className="grid content-start gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold text-ink">{labels.tool.preview}</h2>
          <PrintButton label={labels.tool.print} />
          <p className="text-sm tabular-nums text-muted">{seedCode}</p>
        </div>

        {blocking.length > 0 && (
          <div role="alert" className="grid gap-2 border border-line bg-surface p-4 text-sm text-ink">
            <ul className="grid gap-1">
              {blocking.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
            {failed && (
              <button type="button" data-action="generate" onClick={retry} className="justify-self-start border border-line px-3 py-1 font-semibold text-ink">
                {t.retry}
              </button>
            )}
          </div>
        )}

        {unplaced.length > 0 && (
          <UnplacedPanel
            words={unplaced.map((e) => e.original)}
            suggestions={suggestions}
            onRemove={removeUnplaced}
            labels={{ title: t.unplaced.title, intro: formatMessage(t.unplaced.intro, { count: unplaced.length }), action: t.unplaced.generateWithout }}
          />
        )}

        <SheetPreview doc={doc} label={labels.sheet.previewLabel} />
      </div>

      <PrintRoot doc={doc} label={labels.sheet.previewLabel} />
    </div>
  );
}
```

`src/tools/wordsearch/index.ts`:

```ts
export { WordSearchTool, type WordSearchLabels } from './WordSearchTool';
```

En `src/app/[lang]/[section]/page.tsx` cambia la prop `labels` de la herramienta a `labels={{ sheet: dict.sheet, tool: dict.tool, wordsearch: dict.wordsearch, proof: dict.proof }}`.

- [ ] **Step 5: Verificar**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`, después la secuencia e2e completa (`pnpm build:e2e`, servidor manual, `pnpm exec playwright test --reporter=line --global-timeout=400000`).
Expected: todo en verde, incluidos `wordsearch.spec`, `print.spec` actualizado, `ads.spec` (los botones nuevos con `data-action` quedan ≥ 150 px de los anuncios), `offline.spec` y `network.spec`.

- [ ] **Step 6: Commit**

```bash
git add src/tools src/app tests/e2e/wordsearch.spec.ts tests/e2e/print.spec.ts
git commit -m "feat(sopa-de-letras): herramienta completa con validación, generación en Worker, avisos y soluciones"
```

---

### Task 11: Prueba de imprenta — línea de trabajo, PDF, marcas, zoom, ampliación, cuña y parte plegable

> Antes de editar UI: `craft-floor.md`, `DESIGN.md` y el contrato de dirección (sección «Aplazado a Fase 2»: todo lo listado se construye aquí).

**Files:**
- Create: `src/tools/shared/JobLine.tsx`, `src/tools/shared/DownloadPdfButton.tsx`, `src/tools/shared/ProofSheet.tsx`, `src/tools/shared/ToneWedge.tsx`, `src/tools/shared/Docket.tsx`, `tests/e2e/pdf.spec.ts`
- Modify: `src/tools/wordsearch/WordSearchTool.tsx` (bloque de retorno y imports), `src/app/globals.css`, `tests/e2e/wordsearch.spec.ts`, `tests/e2e/offline.spec.ts`
- Delete: `src/tools/shared/SheetPreview.tsx`

**Interfaces:**
- Produces:
  - `JobLine({ actions: ReactNode; items: { label: string; value: string }[] })` con raíz `data-job-line`.
  - `DownloadPdfButton({ doc: SheetDocument; filename: string; disabled: boolean; labels: { download; preparing; offline; failed } })` con `data-action="pdf"`; carga `@/render/pdf` con `import()`.
  - `ProofSheet({ doc: SheetDocument; docKey: string; label: string; labels: { zoomLegend; zoomFit; zoomActual; enlarge; close } })` con raíz `data-proof-sheet`.
  - `ToneWedge({ label: string })`, `Docket({ summary: string; children: ReactNode })`.

- [ ] **Step 1: Escribir las pruebas**

`tests/e2e/pdf.spec.ts`:

```ts
import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const settle = (page: Page) => expect(page.locator('[data-generation]')).toHaveAttribute('data-generation', 'done', { timeout: 10_000 });

async function downloadPdf(page: Page) {
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Descargar PDF' }).click()]);
  const bytes = await readFile((await download.path()) as string);
  const pdf = await getDocument({ data: new Uint8Array(bytes), verbosity: 0 }).promise;
  const text = async (n: number) => (await (await pdf.getPage(n)).getTextContent()).items.map((i) => ('str' in i ? i.str : '')).join(' ');
  return { download, pdf, text };
}

test.describe('descarga en PDF', () => {
  test('alumno y soluciones con tildes y eñes, y nombre derivado del título', async ({ page }) => {
    await page.goto('es/sopa-de-letras/');
    await page.getByLabel('Título').fill('Animales de la granja: ñandú');
    await settle(page);
    const { download, pdf, text } = await downloadPdf(page);
    expect(download.suggestedFilename()).toBe('animales-de-la-granja-nandu.pdf');
    expect(pdf.numPages).toBe(2);
    expect(await text(1)).toContain('Animales de la granja: ñandú');
    expect(await text(1)).toContain('pingüino');
    expect(await text(2)).toContain('Soluciones');
  });

  test('sin soluciones el PDF tiene una página', async ({ page }) => {
    await page.goto('es/sopa-de-letras/');
    await settle(page);
    await page.getByLabel('Incluir soluciones').uncheck();
    const { pdf } = await downloadPdf(page);
    expect(pdf.numPages).toBe(1);
  });

  test('el PDF se genera sin conexión tras la primera carga', async ({ page, context }) => {
    await page.goto('es/sopa-de-letras/');
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
    await context.setOffline(true);
    await page.reload();
    await settle(page);
    const { pdf } = await downloadPdf(page);
    expect(pdf.numPages).toBe(2);
    await context.setOffline(false);
  });
});
```

Añade a `tests/e2e/wordsearch.spec.ts`:

```ts
test.describe('prueba de imprenta', () => {
  test('la línea de trabajo muestra papel, páginas y código con las acciones al inicio', async ({ page }) => {
    await page.goto('es/sopa-de-letras/');
    await page.getByLabel('Código de ficha').fill('v1-ABC234');
    await expect(page.locator('[data-generation]')).toHaveAttribute('data-generation', 'done', { timeout: 10_000 });
    const line = page.locator('[data-job-line]');
    await expect(line).toContainText('v1-ABC234');
    await expect(line).toContainText('2');
    const order = await line.locator('button').evaluateAll((buttons) => buttons.map((b) => b.getAttribute('data-action')));
    expect(order.slice(0, 2)).toEqual(['print', 'pdf']);
  });

  test('100 % muestra la hoja a tamaño físico en escritorio', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('es/sopa-de-letras/');
    await page.getByRole('button', { name: '100 %' }).click();
    await expect(page.getByRole('button', { name: '100 %' })).toHaveAttribute('aria-pressed', 'true');
    const width = (await page.locator('[data-proof-sheet] svg[role="img"]').first().boundingBox())!.width;
    expect(width).toBeGreaterThan(790);
  });

  test('a 360 px «Ampliar» abre la hoja a tamaño real sin desbordar la página', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('es/sopa-de-letras/');
    await expect(page.locator('[data-generation]')).toHaveAttribute('data-generation', 'done', { timeout: 10_000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
    await page.getByRole('button', { name: 'Ampliar' }).click();
    const enlarged = page.locator('dialog[open] svg[role="img"]').first();
    await expect(enlarged).toBeVisible();
    expect((await enlarged.boundingBox())!.width).toBeGreaterThan(790);
    await page.getByRole('button', { name: 'Cerrar' }).click();
    await expect(page.locator('dialog[open]')).toHaveCount(0);
  });
});
```

En `tests/e2e/offline.spec.ts` sustituye el selector `'[data-tool-canvas] svg'` por `'[data-tool-canvas] svg[role="img"]'`.

Run (secuencia e2e): `pnpm exec playwright test tests/e2e/pdf.spec.ts tests/e2e/wordsearch.spec.ts --reporter=line`
Expected: FAIL — no existen el botón «Descargar PDF» ni `data-job-line`.

- [ ] **Step 2: Componentes de la prueba de imprenta**

`src/tools/shared/JobLine.tsx`:

```tsx
export function JobLine({ actions, items }: { actions: React.ReactNode; items: { label: string; value: string }[] }) {
  return (
    <div data-job-line className="flex flex-wrap items-center gap-x-6 gap-y-3 border-y border-line py-3">
      <div className="flex flex-wrap items-center gap-2">{actions}</div>
      <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm tabular-nums">
        {items.map((item) => (
          <div key={item.label} className="flex items-baseline gap-2">
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{item.label}</dt>
            <dd className="font-semibold text-ink">{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
```

`src/tools/shared/DownloadPdfButton.tsx`:

```tsx
'use client';

import { useState } from 'react';
import type { SheetDocument } from '@/core/sheet';

type State = 'idle' | 'working' | 'offline' | 'failed';

export function DownloadPdfButton({ doc, filename, disabled, labels }: {
  doc: SheetDocument;
  filename: string;
  disabled: boolean;
  labels: { download: string; preparing: string; offline: string; failed: string };
}) {
  const [state, setState] = useState<State>('idle');

  const download = async () => {
    setState('working');
    try {
      // Carga diferida obligatoria: pdf-lib y fontkit nunca entran en la primera vista.
      const { loadPdfAssets, renderPdf } = await import('@/render/pdf');
      const bytes = await renderPdf(doc, await loadPdfAssets());
      const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      const url = URL.createObjectURL(new Blob([buffer], { type: 'application/pdf' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setState('idle');
    } catch {
      setState(navigator.onLine ? 'failed' : 'offline');
    }
  };

  return (
    <>
      <button
        type="button"
        data-action="pdf"
        onClick={download}
        disabled={disabled || state === 'working'}
        aria-busy={state === 'working'}
        className="border border-brand px-4 py-2 font-semibold text-brand hover:bg-brand hover:text-surface disabled:border-line disabled:text-muted disabled:hover:bg-transparent"
      >
        {state === 'working' ? labels.preparing : labels.download}
      </button>
      {(state === 'offline' || state === 'failed') && (
        <p role="alert" className="basis-full text-sm text-ink">
          {state === 'offline' ? labels.offline : labels.failed}
        </p>
      )}
    </>
  );
}
```

`src/tools/shared/ToneWedge.tsx`:

```tsx
import { TONE_HEX } from '@/core/sheet';

// Cinco pasos de la escala de grises de la ficha (tinta → papel), con un gris medio entre los tonos definidos.
const STEPS = [TONE_HEX.ink, TONE_HEX.muted, '#808080', TONE_HEX.faint, TONE_HEX.paper] as const;

export function ToneWedge({ label }: { label: string }) {
  return (
    <figure className="flex items-center gap-2">
      <div aria-hidden="true" className="flex border border-line">
        {STEPS.map((tone) => (
          <span key={tone} className="block h-3 w-4" style={{ backgroundColor: tone }} />
        ))}
      </div>
      <figcaption className="text-xs text-muted">{label}</figcaption>
    </figure>
  );
}
```

`src/tools/shared/Docket.tsx`:

```tsx
export function Docket({ summary, children }: { summary: string; children: React.ReactNode }) {
  return (
    <details open className="border border-line bg-surface">
      <summary className="cursor-pointer px-5 py-3 font-semibold text-ink md:hidden">{summary}</summary>
      <div className="grid content-start gap-5 p-5">{children}</div>
    </details>
  );
}
```

`src/tools/shared/ProofSheet.tsx`:

```tsx
'use client';

import { useRef, useState } from 'react';
import type { SheetDocument } from '@/core/sheet';
import { SheetSvg } from '@/render/svg/SheetSvg';

type Zoom = 'fit' | 'actual';

const CORNERS = ['left-0 top-0', 'right-0 top-0 -scale-x-100', 'bottom-0 left-0 -scale-y-100', 'bottom-0 right-0 -scale-100'] as const;
const REGISTER = ['left-1/2 top-0.5 -translate-x-1/2', 'bottom-0.5 left-1/2 -translate-x-1/2'] as const;

/** Marcas de corte en L y cruces de registro alrededor de la hoja; decorativas y fuera de la ficha impresa. */
function ProofMarks() {
  return (
    <div aria-hidden="true" className="proof-marks pointer-events-none absolute inset-0 text-brand">
      {CORNERS.map((position) => (
        <svg key={position} viewBox="0 0 20 20" className={`absolute h-5 w-5 ${position}`}>
          <path d="M0 20 H12 M20 0 V12" fill="none" stroke="currentColor" strokeWidth="1" />
        </svg>
      ))}
      {REGISTER.map((position) => (
        <svg key={position} viewBox="0 0 16 16" className={`absolute h-4 w-4 ${position}`}>
          <circle cx="8" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth="1" />
          <path d="M8 0 V16 M0 8 H16" stroke="currentColor" strokeWidth="1" />
        </svg>
      ))}
    </div>
  );
}

export function ProofSheet({ doc, docKey, label, labels }: {
  doc: SheetDocument;
  docKey: string;
  label: string;
  labels: { zoomLegend: string; zoomFit: string; zoomActual: string; enlarge: string; close: string };
}) {
  const [zoom, setZoom] = useState<Zoom>('fit');
  const dialogRef = useRef<HTMLDialogElement>(null);

  const zoomButton = (value: Zoom, text: string) => (
    <button
      type="button"
      aria-pressed={zoom === value}
      onClick={() => setZoom(value)}
      className="border border-line px-3 py-1 text-sm font-semibold text-ink aria-pressed:bg-ink aria-pressed:text-surface"
    >
      {text}
    </button>
  );

  return (
    <div data-proof-sheet className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label={labels.zoomLegend} className="hidden gap-1 md:flex">
          {zoomButton('fit', labels.zoomFit)}
          {zoomButton('actual', labels.zoomActual)}
        </div>
        <button type="button" onClick={() => dialogRef.current?.showModal()} className="border border-line px-3 py-1 text-sm font-semibold text-ink md:hidden">
          {labels.enlarge}
        </button>
      </div>

      <div className={zoom === 'actual' ? 'max-h-[80dvh] overflow-auto' : undefined}>
        <div className="grid gap-6">
          {doc.pages.map((page, i) => (
            <div key={i} className={`relative p-5 ${zoom === 'actual' ? 'w-max' : ''}`}>
              {/* La clave reinicia el paso seco de las marcas en cada ficha nueva. */}
              <ProofMarks key={docKey} />
              <div className="border border-line bg-surface">
                <SheetSvg paper={doc.paper} page={page} sizing={zoom === 'actual' ? 'physical' : 'fluid'} label={`${label} ${i + 1}/${doc.pages.length}`} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <dialog ref={dialogRef} aria-label={label} className="m-0 h-dvh max-h-none w-screen max-w-none bg-canvas p-0 backdrop:bg-ink/60">
        <div className="sticky left-0 top-0 z-10 flex justify-end border-b border-line bg-canvas p-3">
          <button type="button" onClick={() => dialogRef.current?.close()} className="border border-line bg-surface px-4 py-2 font-semibold text-ink">
            {labels.close}
          </button>
        </div>
        <div className="grid gap-6 p-4">
          {doc.pages.map((page, i) => (
            <div key={i} className="w-max border border-line bg-surface">
              <SheetSvg paper={doc.paper} page={page} sizing="physical" label={`${label} ${i + 1}/${doc.pages.length}`} />
            </div>
          ))}
        </div>
      </dialog>
    </div>
  );
}
```

Añade al final de `src/app/globals.css`, antes del bloque `@media print`:

```css
/* Paso seco de las marcas de registro al cambiar la ficha (sin easing decorativo). */
@keyframes proof-register {
  from {
    opacity: 0.25;
  }
  to {
    opacity: 1;
  }
}

.proof-marks {
  animation: proof-register 90ms steps(2, end);
}

@media (prefers-reduced-motion: reduce) {
  .proof-marks {
    animation: none;
  }
}
```

Borra `src/tools/shared/SheetPreview.tsx`.

- [ ] **Step 3: Integrar en `WordSearchTool.tsx`**

Sustituye el import de `SheetPreview` por:

```tsx
import { worksheetFilename } from '@/core/filename';
import { Docket } from '@/tools/shared/Docket';
import { DownloadPdfButton } from '@/tools/shared/DownloadPdfButton';
import { JobLine } from '@/tools/shared/JobLine';
import { ProofSheet } from '@/tools/shared/ProofSheet';
import { ToneWedge } from '@/tools/shared/ToneWedge';
```

Añade antes del `return`:

```tsx
  const filename = worksheetFilename(header.title, lang === 'es' ? 'ficha' : 'worksheet');
  const proof = labels.proof;
```

Sustituye todo el bloque `return (...)` por:

```tsx
  return (
    <div data-generation={current ? generation.status : 'pending'} className="grid gap-6 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <form className="md:self-start" onSubmit={(e) => e.preventDefault()}>
        <Docket summary={labels.tool.optionsSummary}>
          <SheetHeaderFields
            value={header}
            onChange={setHeader}
            notices={headerNotices}
            labels={{ legend: labels.tool.headerLegend, title: labels.tool.titleLabel, school: labels.tool.schoolLabel }}
          />
          <WordListField
            value={wordsText}
            onChange={setWordsText}
            messages={lineMessages}
            countLabel={formatMessage(t.wordsCount, { count: lineCount, max: WORDSEARCH_LIMITS.maxWords })}
            labels={{ label: t.wordsLabel, help: formatMessage(t.wordsHelp, { max: WORDSEARCH_LIMITS.maxWords }) }}
          />
          <GridOptions
            size={size}
            onSizeChange={setSize}
            directions={directions}
            onDirectionsChange={setDirections}
            labels={{ legend: t.gridLegend, size: t.sizeLabel, directions: t.directionsLegend, horizontal: t.horizontal, vertical: t.vertical, diagonal: t.diagonal, reversed: t.reversed }}
          />
          <PaperSelect value={paper} onChange={setPaper} labels={{ paper: labels.tool.paperLabel, a4: labels.tool.paperA4, letter: labels.tool.paperLetter }} />
          <SeedField
            value={seedInput}
            onChange={setSeedInput}
            error={seedInvalid ? t.seedInvalid : null}
            onNewSeed={() => {
              setSeedInput('');
              setRegeneratedSeed(newSeedCode(WORDSEARCH_ALGORITHM_VERSION));
            }}
            labels={{ label: t.seedLabel, help: t.seedHelp, newSeed: t.newSheet }}
          />
          <IncludeSolutionsField checked={includeSolutions} onChange={setIncludeSolutions} label={t.includeSolutions} />
        </Docket>
      </form>

      <div className="grid content-start gap-4">
        <h2 className="text-lg font-semibold text-ink">{labels.tool.preview}</h2>
        <JobLine
          actions={
            <>
              <PrintButton label={labels.tool.print} />
              <DownloadPdfButton
                doc={doc}
                filename={filename}
                disabled={!layout?.ok}
                labels={{ download: proof.downloadPdf, preparing: proof.preparingPdf, offline: proof.pdfOffline, failed: proof.pdfFailed }}
              />
            </>
          }
          items={[
            { label: proof.jobPaper, value: paper === 'a4' ? labels.tool.paperA4 : labels.tool.paperLetter },
            { label: proof.jobPages, value: String(doc.pages.length) },
            { label: proof.jobSeed, value: seedCode || '—' },
          ]}
        />
        <ToneWedge label={proof.toneLegend} />

        {blocking.length > 0 && (
          <div role="alert" className="grid gap-2 border border-line bg-surface p-4 text-sm text-ink">
            <ul className="grid gap-1">
              {blocking.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
            {failed && (
              <button type="button" data-action="generate" onClick={retry} className="justify-self-start border border-line px-3 py-1 font-semibold text-ink">
                {t.retry}
              </button>
            )}
          </div>
        )}

        {unplaced.length > 0 && (
          <UnplacedPanel
            words={unplaced.map((e) => e.original)}
            suggestions={suggestions}
            onRemove={removeUnplaced}
            labels={{ title: t.unplaced.title, intro: formatMessage(t.unplaced.intro, { count: unplaced.length }), action: t.unplaced.generateWithout }}
          />
        )}

        <ProofSheet
          doc={doc}
          docKey={requestKey ?? 'frame'}
          label={labels.sheet.previewLabel}
          labels={{ zoomLegend: proof.zoomLegend, zoomFit: proof.zoomFit, zoomActual: proof.zoomActual, enlarge: proof.enlarge, close: proof.close }}
        />
      </div>

      <PrintRoot doc={doc} label={labels.sheet.previewLabel} />
    </div>
  );
```

- [ ] **Step 4: Verificar**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm budget`
Expected: todo en verde; `grep -l FontFile2 out/_next/static/chunks/*.js` lista al menos un chunk y el presupuesto no informa de marcadores prohibidos (el chunk es diferido).

Secuencia e2e completa (`pnpm build:e2e`, servidor manual, `pnpm exec playwright test --reporter=line --global-timeout=400000`, `pkill -f "scripts/serve-out.mjs"`).
Expected: todos los specs en verde (`i18n`, `serve-out`, `ads`, `print`, `offline`, `network`, `wordsearch`, `pdf`).

- [ ] **Step 5: Commit**

```bash
git add src/tools src/app/globals.css tests/e2e
git commit -m "feat(prueba-de-imprenta): línea de trabajo, descarga en PDF, marcas, zoom, ampliación, cuña y parte plegable"
```

---

### Task 12: Refuerzo de pruebas — privacidad con service worker y humo sin basePath

**Files:**
- Modify: `tests/e2e/network.spec.ts` (segundo test, sustitución completa), `package.json`
- Create: `playwright.root.config.ts`, `tests/e2e-root/smoke.spec.ts`

**Interfaces:**
- Produces: script `pnpm test:e2e:root` (build sin basePath en el puerto 4174 y pruebas de humo).

- [ ] **Step 1: Prueba de privacidad reforzada**

En `tests/e2e/network.spec.ts`, sustituye el test «ninguna entrada del usuario aparece en consola ni en peticiones» por:

```ts
test('ninguna entrada del usuario aparece en consola, peticiones, URL, almacenamiento ni cachés', async ({ page }) => {
  // El centinela del encabezado es largo; la palabra centinela cabe en la cuadrícula para que la generación termine.
  const HEADER_SENTINEL = 'ZQXCENTINELAÑ';
  const WORD_SENTINEL = 'qzxñwkj';
  const needles = [HEADER_SENTINEL, WORD_SENTINEL, WORD_SENTINEL.toUpperCase(), 'QZXNWKJ'];
  const leaks: string[] = [];
  const hasNeedle = (text: string) => needles.some((n) => text.includes(n) || decodeURIComponent(text).includes(n));
  page.on('console', (msg) => {
    if (hasNeedle(msg.text())) leaks.push(`console: ${msg.text()}`);
  });
  page.on('request', (request) => {
    if (hasNeedle(request.url()) || hasNeedle(request.postData() ?? '')) leaks.push(`request: ${request.url()}`);
  });

  await page.goto('es/sopa-de-letras/');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.getByLabel('Título').fill(HEADER_SENTINEL);
  await page.getByLabel('Centro o docente').fill(HEADER_SENTINEL);
  await page.getByLabel('Palabras').fill(`gato\n${WORD_SENTINEL}\nperro`);
  await expect(page.locator('[data-generation]')).toHaveAttribute('data-generation', 'done', { timeout: 10_000 });
  await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Descargar PDF' }).click()]);
  await page.waitForLoadState('networkidle');

  expect(needles.some((n) => page.url().includes(n))).toBe(false);
  const stored = await page.evaluate(async (list) => {
    const has = (text: string) => list.some((n) => text.includes(n));
    const databases = (await indexedDB.databases()).map((db) => db.name ?? '');
    let inCache = false;
    for (const key of await caches.keys()) {
      const cache = await caches.open(key);
      for (const request of await cache.keys()) if (has(decodeURIComponent(request.url))) inCache = true;
    }
    return {
      inLocal: has(JSON.stringify({ ...localStorage })),
      inSession: has(JSON.stringify({ ...sessionStorage })),
      databases,
      inCache,
    };
  }, needles);
  expect(stored).toEqual({ inLocal: false, inSession: false, databases: [], inCache: false });
  expect(leaks).toEqual([]);
});
```

- [ ] **Step 2: Conteo de páginas de impresión con pdfjs (Anexo C)**

En `tests/e2e/print.spec.ts`, añade `import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';` y la función:

```ts
const pageCount = async (pdf: Buffer) => (await getDocument({ data: new Uint8Array(pdf), verbosity: 0 }).promise).numPages;
```

Sustituye cada `Number(/\/Count (\d+)/.exec(pdf.toString('latin1'))?.[1])` (y la variable `count` derivada) por `await pageCount(pdf)`, manteniendo los valores esperados (2 con soluciones, 1 sin ellas).

- [ ] **Step 3: Proyecto de humo con basePath vacío**

`playwright.root.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

const PORT = 4174;

// Producción usa subdominio (basePath vacío); este proyecto evita que solo se pruebe con /fichas.
export default defineConfig({
  testDir: 'tests/e2e-root',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: `http://localhost:${PORT}/`, trace: 'retain-on-failure' },
  projects: [{ name: 'chromium-root', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `NEXT_PUBLIC_BASE_PATH= NEXT_PUBLIC_ADS_PLACEHOLDER=true node scripts/build.mjs && NEXT_PUBLIC_BASE_PATH= PORT=${PORT} node scripts/serve-out.mjs`,
    url: `http://localhost:${PORT}/es/`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});
```

`tests/e2e-root/smoke.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('la raíz redirige, la herramienta genera y el service worker cubre todo el sitio', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'es-EC' });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page).toHaveURL(/\/es\/$/);

  const logo = page.locator('header img').first();
  expect(await logo.getAttribute('src')).toMatch(/^\/brand\//);
  expect(await logo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);

  await page.goto('/es/sopa-de-letras/');
  await expect(page.locator('[data-generation]')).toHaveAttribute('data-generation', 'done', { timeout: 10_000 });
  const letters = await page
    .locator('[data-tool-canvas] svg[role="img"]')
    .first()
    .evaluate((svg) => Array.from(svg.querySelectorAll('text')).filter((t) => Array.from(t.textContent ?? '').length === 1).length);
  expect(letters).toBe(144);

  const scope = await page.evaluate(() => navigator.serviceWorker.ready.then((r) => new URL(r.scope).pathname));
  expect(scope).toBe('/');
  await context.close();
});
```

Añade a `scripts` de `package.json`: `"test:e2e:root": "playwright test --config playwright.root.config.ts"`.

- [ ] **Step 4: Verificar**

Run: `pnpm lint && pnpm typecheck`, secuencia e2e completa con `/fichas` (todos los specs en verde), después, sin servidor en 4174 y con `out/` sobrescrito: `pnpm test:e2e:root`.
Expected: todo en verde. Tras `test:e2e:root`, `out/` queda sin basePath: vuelve a ejecutar `pnpm build:e2e` antes de cualquier otra ejecución con `/fichas`.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/network.spec.ts tests/e2e/print.spec.ts tests/e2e-root playwright.root.config.ts package.json
git commit -m "test(fase-2): privacidad con precarga del service worker y humo con basePath vacío"
```

---

### Task 13: Cierre de la Fase 2

**Files:**
- Modify: `CLAUDE.md`, `DESIGN.md` y `.impeccable/design.json` (mediante el documentador de impeccable), `.impeccable/surfaces/src-app-lang-section-page-tsx.md` (sección de aplazamientos)
- Create: `docs/superpowers/reports/2026-09-13-fase-2-cierre.md`

- [ ] **Step 1: Verificación desde cero**

```bash
rm -rf .next out node_modules/.cache
pnpm install --frozen-lockfile
pnpm lint && pnpm typecheck && pnpm test
pnpm build && pnpm budget
pnpm build:e2e && pnpm budget
(NEXT_PUBLIC_BASE_PATH=/fichas PORT=4173 nohup node scripts/serve-out.mjs > /tmp/serve-out-4173.log 2>&1 &)
pnpm exec playwright test --reporter=line --global-timeout=600000
pkill -f "scripts/serve-out.mjs"
pnpm test:e2e:root
grep -l FontFile2 out/_next/static/chunks/*.js
```

Expected: todo en verde; guarda ambas tablas de presupuesto y la lista de chunks con `FontFile2` (deben ser diferidos: ninguno aparece en el HTML inicial, lo garantiza `pnpm budget`).

- [ ] **Step 2: codegraph — dependencias reales**

```bash
codegraph sync
codegraph callers generateWordSearch
codegraph callers layoutWordSearch
codegraph callers renderPdf
codegraph callers createGenerationClient
codegraph callers measureTextMm
codegraph impact fitTextToWidth
grep -rn "from '@/render/pdf'" src/tools || echo "sin importaciones estáticas de render/pdf en tools"
for d in core generators/wordsearch layout/common layout/wordsearch render/svg render/pdf workers tools/shared tools/wordsearch i18n; do printf "%-22s " "$d"; grep -rhoE "from '@/[a-z0-9]+(/[a-z0-9]+)?" "src/$d" | sed "s#from '@/##" | sort -u | tr '\n' ' '; echo; done
```

Expected (anotar en el informe): `generateWordSearch` solo desde `workers/wordsearch` (y pruebas); `layoutWordSearch` solo desde `tools/wordsearch`; `renderPdf` solo vía `import()` en `tools/shared/DownloadPdfButton` (codegraph puede no seguir el `import()`: confirmarlo con `grep -rn "import('@/render/pdf')" src`); `createGenerationClient` solo desde `tools/wordsearch`; matriz conforme a la spec §4.3. Cualquier desviación se corrige antes de seguir.

- [ ] **Step 3: impeccable — revisión final**

1. Captura con fuentes cargadas y generación terminada (`data-generation="done"`), desde el inicio del documento, en `.impeccable/review/`: `desktop.png` (`/es/sopa-de-letras/` 1440×900), `mobile.png` (390×844), `user-360.png` (360×740), `desktop-actual.png` (1440×900 con «100 %» activo), `mobile-enlarged.png` (360×740 con «Ampliar» abierto), `home-desktop.png`. Abre cada fichero una vez para validarlo.
2. Genera un PDF real de la ficha por defecto con título «Animales de la granja: ñandú» (locale `es-ES`, A4) y renderiza su página 1 a PNG en el scratchpad.
3. Lanza el agente `impeccable-finish-reviewer` con: petición original resumida, decisiones del operador, rutas de artefactos (`src/tools/**`, `src/layout/**`, `src/render/**`, `src/app/globals.css`), capturas, PDF y su PNG, contrato de dirección (incluida la sección de aplazamientos, ahora construidos), `craft-floor.md`, hallazgos del hook y ausencia de comp (code-led).
4. Aplica en un solo lote las correcciones materiales mediante un implementador, recaptura los mismos ficheros y pide el veredicto de las correcciones al mismo revisor. Máximo dos rondas.
5. Actualiza la sección «Aplazado a Fase 2» del contrato con `impeccable surface-brief write`: marca lo construido y deja solo lo que siga pendiente con su motivo.
6. Lanza `impeccable-documenter` con límite de escritura `DESIGN.md` y `.impeccable/design.json` para incorporar los componentes nuevos (línea de trabajo, prueba de imprenta, cuña, parte, campos de la sopa).

- [ ] **Step 4: Verificación de restricciones (`superpowers:verification-before-completion`)**

| Criterio | Evidencia |
|---|---|
| Build estático sin advertencias | salida de `pnpm build` |
| PDF abre y muestra tildes y eñes sin sustituciones | `renderPdf.test.ts` + `pdf.spec` + PNG del PDF real |
| Impresión limpia sin interfaz, anuncios ni cortes en la cuadrícula | `print.spec` (2 páginas con soluciones, 1 sin ellas) + `layoutWordSearch.test.ts` (cuadrícula nunca partida) |
| Sin red tras la primera carga, incluida la descarga del PDF | `offline.spec` + `pdf.spec` (offline) |
| Sin terceros salvo AdSense | `network.spec` |
| Palabras del usuario fuera de consola, peticiones, URL, almacenamiento y cachés | `network.spec` (centinelas en encabezado y lista, con SW activo y PDF generado) |
| Cuadrícula legible y usable a 360 px | `wordsearch.spec` (Ampliar a tamaño físico, sin desbordamiento) |
| Casos límite de la spec §5.5 | `params.test.ts`, `generate.test.ts`, `layoutWordSearch.test.ts`, `wordsearch.spec` |
| Anuncios fuera de zonas prohibidas | `ads.spec` con los botones nuevos |
| Presupuesto < 300 KB y pdf-lib fuera de la primera vista | `pnpm budget` en ambos builds |
| basePath vacío y `/fichas` | `pnpm test:e2e:root` + suite principal |
| codegraph e impeccable ejecutados | Steps 2 y 3 |

- [ ] **Step 5: Documentación y cierre**

1. Actualiza `CLAUDE.md`: comandos `pnpm metrics:fonts` y `pnpm test:e2e:root`; arquitectura de la sopa (Worker + almacén externo, métricas en `core`, `render/pdf` solo con `import()`, WOFF con subconjunto).
2. Escribe `docs/superpowers/reports/2026-09-13-fase-2-cierre.md` con: resultado, tablas de verificación y presupuesto, codegraph, impeccable, decisiones no triviales, comprobaciones manuales pendientes del operador (diálogo de impresión en Chrome, Firefox y Safari; abrir el PDF en Acrobat/Vista Previa y comprobar tildes, eñes, cápsulas y pie), y anexos con todas las decisiones (`Ruling:`) y menores aplazados del registro de ejecución.
3. Commit:

```bash
git add CLAUDE.md DESIGN.md .impeccable docs/superpowers/reports
git commit -m "docs(fase-2): informe de cierre, contrato actualizado y guía del repositorio"
```

- [ ] **Step 6: Detenerse**

Presenta el resumen al operador y espera su revisión antes de fusionar y planificar la Fase 3.
