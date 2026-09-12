# Fase 1 — Andamiaje, identidad, layout, AdSlot e impresión: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar una aplicación Next.js estática, bilingüe, con identidad visual derivada del logotipo, núcleo puro (PRNG, normalización, papel, documento de hoja), renderizador SVG, shell de página de herramienta con `AdSlot`, ruta de impresión funcional, service worker y controles automáticos de build, presupuesto, red y zonas publicitarias.

**Architecture:** Exportación estática de Next.js 16 (App Router, webpack) con dos layouts raíz: `(root)` para la redirección de idioma y `[lang]` para la aplicación. Una única ruta dinámica `[lang]/[section]` resuelve las secciones con slugs traducidos. La lógica pura vive en `src/core`, `src/layout` y `src/render`, aislada por reglas ESLint de fronteras.

**Tech Stack:** Next.js 16.3.5, React 19.2.8, TypeScript 5.9.3 estricto, Tailwind CSS 4.3.3, ESLint 9 + eslint-config-next 16.3.5, Vitest 5.0.0, Playwright 1.63.0, pnpm 11, Node 24, @fontsource.

**Spec:** [docs/superpowers/specs/2026-09-12-generador-fichas-design.md](../specs/2026-09-12-generador-fichas-design.md)

## Global Constraints

- Procesamiento 100 % en navegador. Sin base de datos, rutas de API, autenticación ni analítica de terceros.
- `output: 'export'`; el resultado es `out/`, servible por Nginx.
- Build y dev con **webpack** (`next build --webpack`, `next dev --webpack`). Verificado en Fase 0: Turbopack copia `new Worker(new URL('x.ts', import.meta.url))` como `.ts` sin compilar.
- TypeScript `strict` + `noUncheckedIndexedAccess`. Tailwind CSS 4.
- `basePath` y `assetPrefix` desde `NEXT_PUBLIC_BASE_PATH`. Ninguna ruta absoluta escrita a mano: `next/link` para navegación y `withBasePath()` para cualquier otro recurso.
- Presupuesto de primera vista < 300 KB comprimidos (HTML + JS sin `noModule` + CSS + tipografías referenciadas por el CSS inicial), AdSense excluido. Base medida en Fase 0: ~133 KB.
- Sin dependencias remotas en tiempo de ejecución salvo AdSense y su CMP. Tipografías con @fontsource.
- Nada de estado de usuario en URL ni almacenamiento. Única excepción: preferencia de idioma `santic-lang` en `localStorage`.
- `no-console` es error en `src/`.
- Todas las importaciones fuera del directorio actual usan el alias `@/`; `../` está prohibido.
- Fichas en escala de grises. Pie de hoja: isotipo gris + `santiceducation.com`.
- Idiomas: `es` (por defecto) y `en`.
- Commits: Conventional Commits en español, terminados con la línea `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`.
- Antes de cualquier edición de UI (Tareas 8–11): leer `.claude/skills/impeccable/reference/craft-floor.md`.

## Estructura de ficheros de la fase

```
package.json  pnpm-lock.yaml  next.config.ts  tsconfig.json  postcss.config.mjs
eslint.config.mjs  vitest.config.ts  playwright.config.ts  .env.example
PRODUCT.md  DESIGN.md                                  (Tarea 8, impeccable)
scripts/
  build.mjs            Orquesta next build + pasos post-build; falla ante advertencias
  lib/html-assets.mjs  Extrae recursos de primera vista de un HTML (probado)
  lib/walk.mjs         Recorrido recursivo de out/
  budget.mjs           Presupuesto de carga
  build-sw.mjs         Genera out/sw.js
  sw-template.js       Plantilla del service worker
  compress.mjs         Precompresión .br/.gz
  serve-out.mjs        Servidor estático local para Playwright
public/brand/          mark-gray.svg, logo.svg (o png), favicon (Tarea 8)
src/
  core/      lang.ts paths.ts random.ts text.ts paper.ts sheet.ts brand.ts (+ *.test.ts)
  layout/common/frame.ts (+ test)
  render/svg/SheetSvg.tsx (+ test)
  i18n/      config.ts routes.ts dictionary.ts dictionaries/es.ts dictionaries/en.ts LanguageSwitch.tsx (+ tests)
  ads/       config.ts env.ts AdSlot.tsx AdsenseScript.tsx (+ test)
  tools/shared/  SheetHeaderFields.tsx PaperSelect.tsx SheetPreview.tsx PrintRoot.tsx PrintButton.tsx
  tools/wordsearch/  WordSearchTool.tsx index.ts
  components/shell/  SiteHeader.tsx SiteFooter.tsx ToolPageLayout.tsx RegisterServiceWorker.tsx
  app/
    globals.css  fonts.css
    (root)/layout.tsx  (root)/page.tsx
    [lang]/layout.tsx  [lang]/page.tsx  [lang]/[section]/page.tsx
tests/e2e/   i18n.spec.ts  print.spec.ts  ads.spec.ts  network.spec.ts  offline.spec.ts
```

---

### Task 1: Andamiaje, configuración y rutas con basePath

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `eslint.config.mjs`, `vitest.config.ts`, `scripts/build.mjs`, `src/core/paths.ts`, `src/core/paths.test.ts`, `src/app/globals.css`, `src/app/(root)/layout.tsx`, `src/app/(root)/page.tsx`

**Interfaces:**
- Produces: `normalizeBasePath(raw: string | undefined): string`, `withBasePath(path: string, basePath?: string): string`, `BASE_PATH: string` en `@/core/paths`. Scripts `pnpm build | lint | typecheck | test`. `scripts/build.mjs` con array `POST_BUILD_STEPS` que las tareas 12 y 13 amplían.

- [ ] **Step 1: Crear `package.json`**

```json
{
  "name": "santic-fichas",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@11.1.1",
  "engines": { "node": ">=24" },
  "scripts": {
    "dev": "next dev --webpack",
    "build": "node scripts/build.mjs",
    "build:e2e": "NEXT_PUBLIC_BASE_PATH=/fichas NEXT_PUBLIC_ADS_PLACEHOLDER=true NEXT_PUBLIC_ADS_ANCHOR=true node scripts/build.mjs",
    "serve:out": "node scripts/serve-out.mjs",
    "lint": "eslint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:e2e": "playwright test",
    "budget": "node scripts/budget.mjs"
  }
}
```

- [ ] **Step 2: Instalar dependencias con versiones fijadas**

```bash
pnpm add next@16.3.5 react@19.2.8 react-dom@19.2.8
pnpm add -D typescript@5.9.3 @types/node@22 @types/react@19 @types/react-dom@19 tailwindcss@4.3.3 @tailwindcss/postcss@4.3.3 eslint@9 eslint-config-next@16.3.5 vitest@5.0.0
```

Expected: `pnpm-lock.yaml` creado, sin errores.

- [ ] **Step 3: Escribir la prueba de `paths`**

`src/core/paths.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { normalizeBasePath, withBasePath } from './paths';

describe('normalizeBasePath', () => {
  it('devuelve cadena vacía sin valor', () => {
    expect(normalizeBasePath(undefined)).toBe('');
    expect(normalizeBasePath('')).toBe('');
    expect(normalizeBasePath('/')).toBe('');
  });
  it('quita barras finales y añade la inicial', () => {
    expect(normalizeBasePath('/fichas/')).toBe('/fichas');
    expect(normalizeBasePath('fichas')).toBe('/fichas');
    expect(normalizeBasePath('  /a/b// ')).toBe('/a/b');
  });
  it('rechaza caracteres no válidos', () => {
    expect(() => normalizeBasePath('/fi chas')).toThrow(/NEXT_PUBLIC_BASE_PATH/);
    expect(() => normalizeBasePath('https://x.test')).toThrow(/NEXT_PUBLIC_BASE_PATH/);
  });
});

describe('withBasePath', () => {
  it('antepone el basePath a rutas absolutas internas', () => {
    expect(withBasePath('/sw.js', '/fichas')).toBe('/fichas/sw.js');
    expect(withBasePath('/sw.js', '')).toBe('/sw.js');
    expect(withBasePath('/', '/fichas')).toBe('/fichas/');
  });
  it('exige que la ruta empiece por /', () => {
    expect(() => withBasePath('sw.js', '')).toThrow(/debe empezar por \//);
  });
});
```

- [ ] **Step 4: Crear `vitest.config.ts` y ejecutar la prueba para verla fallar**

```ts
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.mjs'],
  },
});
```

Run: `pnpm test`
Expected: FAIL — `Failed to resolve import "./paths"`.

- [ ] **Step 5: Implementar `src/core/paths.ts`**

```ts
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
```

- [ ] **Step 6: Ejecutar pruebas**

Run: `pnpm test`
Expected: PASS (5 pruebas).

- [ ] **Step 7: Configuración de Next.js, TypeScript, PostCSS y CSS base**

`next.config.ts`:

```ts
import type { NextConfig } from 'next';
import { normalizeBasePath } from './src/core/paths';

const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath,
  assetPrefix: basePath === '' ? undefined : basePath,
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
  // Reinyecta el valor normalizado para que el cliente reciba siempre la forma canónica.
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts", ".next/dev/types/**/*.ts"],
  "exclude": ["node_modules", "out", ".next"]
}
```

`postcss.config.mjs`:

```js
export default { plugins: { '@tailwindcss/postcss': {} } };
```

`src/app/globals.css` (los tokens definitivos llegan en la Tarea 8):

```css
@import 'tailwindcss';
```

- [ ] **Step 8: Layout y página raíz mínimos (la Tarea 7 los sustituye)**

`src/app/(root)/layout.tsx`:

```tsx
import '@/app/globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
```

`src/app/(root)/page.tsx`:

```tsx
export default function RootPage() {
  return <main>Santic Education</main>;
}
```

- [ ] **Step 9: ESLint con fronteras de módulos**

`eslint.config.mjs`:

```js
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

// Regla base: nada de rutas relativas hacia directorios padre; fuera del directorio actual se usa @/.
const NO_PARENT = { regex: '^\\.\\./', message: 'Usa el alias @/ para importar fuera del directorio actual.' };
const REACT_OR_NEXT = { regex: '^(react|react-dom|next)(/|$)', message: 'Este módulo es lógica pura: no puede depender de React ni de Next.js.' };

/** Solo permite importar los prefijos @/ indicados (además de paquetes npm y ./). */
const onlyAlias = (allowed, message) => ({
  regex: `^@/(?!(${allowed.join('|')})(/|$))`,
  message,
});

// En flat config la última definición de una regla gana: cada bloque repite NO_PARENT.
const boundary = (files, patterns) => ({
  files,
  rules: { 'no-restricted-imports': ['error', { patterns: [NO_PARENT, ...patterns] }] },
});

const GENERATORS = ['wordsearch', 'crossword', 'arithmetic'];

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(['.next/**', 'out/**', 'next-env.d.ts', 'coverage/**', 'playwright-report/**', 'test-results/**']),
  { files: ['src/**/*.{ts,tsx}'], rules: { 'no-console': 'error' } },

  boundary(['src/**/*.{ts,tsx}'], []),
  boundary(['src/core/**'], [onlyAlias(['core'], 'core no depende de ningún otro módulo.'), REACT_OR_NEXT]),
  ...GENERATORS.map((g) =>
    boundary([`src/generators/${g}/**`], [
      onlyAlias(['core', `generators/${g}`], `generators/${g} solo puede importar core y su propio módulo.`),
      REACT_OR_NEXT,
    ]),
  ),
  boundary(['src/layout/common/**'], [onlyAlias(['core', 'layout/common'], 'layout/common solo depende de core.'), REACT_OR_NEXT]),
  ...GENERATORS.map((g) =>
    boundary([`src/layout/${g}/**`], [
      onlyAlias(['core', 'layout/common', `layout/${g}`, `generators/${g}`], `layout/${g} solo conoce su generador.`),
      REACT_OR_NEXT,
    ]),
  ),
  boundary(['src/render/svg/**'], [onlyAlias(['core', 'render/svg'], 'render/svg no conoce generadores ni maquetación.')]),
  boundary(['src/render/pdf/**'], [onlyAlias(['core', 'render/pdf'], 'render/pdf no conoce generadores ni maquetación.'), REACT_OR_NEXT]),
  boundary(['src/workers/**'], [onlyAlias(['core', 'generators', 'workers'], 'workers solo ejecuta generadores.'), REACT_OR_NEXT]),
  boundary(['src/tools/shared/**'], [
    onlyAlias(['core', 'layout/common', 'render', 'i18n', 'tools/shared'], 'tools/shared no puede importar ads, content, shell ni herramientas concretas.'),
  ]),
  ...GENERATORS.map((g) =>
    boundary([`src/tools/${g}/**`], [
      onlyAlias(
        ['core', `generators/${g}`, 'layout/common', `layout/${g}`, 'render', 'workers', 'i18n', 'tools/shared', `tools/${g}`],
        `tools/${g} no puede importar otras herramientas, ads, content ni el shell.`,
      ),
    ]),
  ),
  boundary(['src/i18n/**'], [onlyAlias(['core', 'i18n'], 'i18n solo depende de core.')]),
  boundary(['src/ads/**'], [onlyAlias(['core', 'i18n', 'ads'], 'ads no conoce herramientas ni renderizadores.')]),
  boundary(['src/content/**'], [
    { regex: '^@/(generators|layout|render|workers)(/|$)', message: 'content solo usa la API pública tools/X/index.' },
    { regex: '^@/tools/[^/]+/.+', message: 'content solo puede importar tools/X (su index), no sus internos.' },
  ]),
]);
```

Nota: `render/pdf` se importa en `tools` solo con `import()` dinámico; la comprobación de que no entra en chunks iniciales la hace `scripts/budget.mjs` (Tarea 13).

- [ ] **Step 10: Script de build que falla ante advertencias**

`scripts/build.mjs`:

```js
import { spawn } from 'node:child_process';

// Líneas de salida de next build que se aceptan aunque contengan "warn". Añadir solo con justificación.
const ALLOWED_WARNINGS = [];
// Pasos post-build en orden. Tareas posteriores añaden entradas: { name, cmd, args }.
const POST_BUILD_STEPS = [];

function run(cmd, args, { capture = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: capture ? ['inherit', 'pipe', 'pipe'] : 'inherit', env: process.env });
    let output = '';
    if (capture) {
      child.stdout.on('data', (d) => { output += d; process.stdout.write(d); });
      child.stderr.on('data', (d) => { output += d; process.stderr.write(d); });
    }
    child.on('close', (code) => (code === 0 ? resolve(output) : reject(new Error(`${cmd} ${args.join(' ')} terminó con código ${code}`))));
  });
}

const output = await run('pnpm', ['exec', 'next', 'build', '--webpack'], { capture: true });

const warnings = output
  .split('\n')
  .filter((line) => /⚠|\bwarn(ing)?\b|dynamic server usage/i.test(line))
  .filter((line) => !ALLOWED_WARNINGS.some((allowed) => line.includes(allowed)));

if (warnings.length > 0) {
  process.stderr.write(`\nEl build ha emitido ${warnings.length} advertencia(s); se considera fallido:\n${warnings.join('\n')}\n`);
  process.exit(1);
}

for (const step of POST_BUILD_STEPS) {
  process.stdout.write(`\n▸ ${step.name}\n`);
  await run(step.cmd, step.args);
}
```

- [ ] **Step 11: Verificar lint, tipos y build**

Run: `pnpm lint && pnpm typecheck && pnpm build && ls out/index.html`
Expected: sin errores; `out/index.html` existe.

Run: `NEXT_PUBLIC_BASE_PATH=/fichas pnpm build && grep -c '/fichas/_next/' out/index.html`
Expected: número ≥ 1.

- [ ] **Step 12: Comprobar que la frontera de ESLint se activa**

Crear temporalmente `src/core/tmp-boundary.ts` con `import '@/ads/x';` y ejecutar `pnpm lint`.
Expected: error `core no depende de ningún otro módulo.` Borrar el fichero y volver a ejecutar `pnpm lint` (PASS).

- [ ] **Step 13: Commit**

```bash
git add package.json pnpm-lock.yaml next.config.ts tsconfig.json postcss.config.mjs eslint.config.mjs vitest.config.ts scripts/build.mjs src
git commit -m "chore(andamiaje): Next.js estático con basePath configurable y fronteras de módulos"
```

---

### Task 2: PRNG con semilla y códigos de semilla (`core/random`, `core/lang`)

**Files:**
- Create: `src/core/lang.ts`, `src/core/random.ts`, `src/core/random.test.ts`

**Interfaces:**
- Produces:
  - `LANGS: readonly ['es', 'en']`, `type Lang = 'es' | 'en'`, `isLang(value: string): value is Lang`
  - `interface Rng { next(): number; int(maxExclusive: number): number; pick<T>(items: readonly T[]): T; shuffle<T>(items: readonly T[]): T[]; fork(label: string): Rng }`
  - `createRng(seed: string): Rng`
  - `SEED_ALPHABET: string`, `randomSeedBody(length?: number): string`, `formatSeedCode(version: number, body: string): string`, `parseSeedCode(code: string): { version: number; body: string } | null`

- [ ] **Step 1: Escribir la prueba**

`src/core/random.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createRng, formatSeedCode, parseSeedCode, randomSeedBody, SEED_ALPHABET } from './random';

describe('createRng', () => {
  it('produce la secuencia de referencia (detecta cambios de algoritmo)', () => {
    const rng = createRng('v1-K7Q2M9');
    expect(rng.next()).toBeCloseTo(0.8593022204004228, 15);
    expect(rng.next()).toBeCloseTo(0.03764587943442166, 15);
    expect(rng.next()).toBeCloseTo(0.7274851009715348, 15);
  });

  it('es determinista para la misma semilla y distinta para otra', () => {
    const a = createRng('abc');
    const b = createRng('abc');
    const c = createRng('abd');
    const seqA = Array.from({ length: 20 }, () => a.next());
    expect(Array.from({ length: 20 }, () => b.next())).toEqual(seqA);
    expect(Array.from({ length: 20 }, () => c.next())).not.toEqual(seqA);
  });

  it('int devuelve enteros en [0, max)', () => {
    const rng = createRng('v1-K7Q2M9');
    expect(Array.from({ length: 5 }, () => rng.int(100))).toEqual([85, 3, 72, 11, 78]);
    const other = createRng('rango');
    for (let i = 0; i < 1000; i++) {
      const v = other.int(7);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(7);
    }
    expect(() => other.int(0)).toThrow();
  });

  it('shuffle devuelve una permutación sin mutar la entrada', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = createRng('s').shuffle(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect([...out].sort((x, y) => x - y)).toEqual(input);
  });

  it('pick falla con lista vacía', () => {
    expect(() => createRng('p').pick([])).toThrow();
  });

  it('fork es determinista e independiente del consumo posterior del padre', () => {
    const p1 = createRng('padre');
    const f1 = p1.fork('intento-1');
    const p2 = createRng('padre');
    const f2 = p2.fork('intento-1');
    p2.next();
    expect(f1.next()).toBe(f2.next());
    expect(createRng('padre').fork('intento-2').next()).not.toBe(createRng('padre').fork('intento-1').next());
  });
});

describe('códigos de semilla', () => {
  it('formatea y analiza', () => {
    expect(formatSeedCode(1, 'K7Q2M9')).toBe('v1-K7Q2M9');
    expect(parseSeedCode('v1-K7Q2M9')).toEqual({ version: 1, body: 'K7Q2M9' });
    expect(parseSeedCode(' v12-abcd23 ')).toEqual({ version: 12, body: 'ABCD23' });
  });
  it('rechaza códigos mal formados', () => {
    expect(parseSeedCode('K7Q2M9')).toBeNull();
    expect(parseSeedCode('v1-')).toBeNull();
    expect(parseSeedCode('v0-ABC')).toBeNull();
    expect(parseSeedCode('v1-AB C')).toBeNull();
  });
  it('randomSeedBody usa solo el alfabeto sin caracteres ambiguos', () => {
    const body = randomSeedBody();
    expect(body).toHaveLength(6);
    for (const ch of body) expect(SEED_ALPHABET).toContain(ch);
    expect(SEED_ALPHABET).not.toMatch(/[01OIL]/);
  });
});
```

- [ ] **Step 2: Ejecutar para verla fallar**

Run: `pnpm test src/core/random.test.ts`
Expected: FAIL — no se resuelve `./random`.

- [ ] **Step 3: Implementar `src/core/lang.ts`**

```ts
export const LANGS = ['es', 'en'] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = 'es';

export function isLang(value: string): value is Lang {
  return (LANGS as readonly string[]).includes(value);
}
```

- [ ] **Step 4: Implementar `src/core/random.ts`**

```ts
/** Hash de cadena a generador de semillas de 32 bits (xmur3). */
function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

/** Generador sfc32: rápido, periodo amplio, reproducible en cualquier motor JS. */
function sfc32(a: number, b: number, c: number, d: number): () => number {
  return () => {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

export interface Rng {
  /** Real en [0, 1). */
  next(): number;
  /** Entero en [0, maxExclusive). */
  int(maxExclusive: number): number;
  pick<T>(items: readonly T[]): T;
  /** Copia barajada (Fisher–Yates); no muta la entrada. */
  shuffle<T>(items: readonly T[]): T[];
  /** Subgenerador determinista derivado de la semilla original y una etiqueta. */
  fork(label: string): Rng;
}

export function createRng(seed: string): Rng {
  const hash = xmur3(seed);
  const next = sfc32(hash(), hash(), hash(), hash());
  for (let i = 0; i < 15; i++) next(); // descarta los primeros valores, poco mezclados

  const rng: Rng = {
    next,
    int(maxExclusive) {
      if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) throw new RangeError('maxExclusive debe ser un entero positivo');
      return Math.floor(next() * maxExclusive);
    },
    pick(items) {
      if (items.length === 0) throw new RangeError('No se puede elegir de una lista vacía');
      return items[rng.int(items.length)] as (typeof items)[number];
    },
    shuffle(items) {
      const out = [...items];
      for (let i = out.length - 1; i > 0; i--) {
        const j = rng.int(i + 1);
        [out[i], out[j]] = [out[j] as (typeof out)[number], out[i] as (typeof out)[number]];
      }
      return out;
    },
    fork(label) {
      return createRng(`${seed}::${label}`);
    },
  };
  return rng;
}

/** Sin 0/O, 1/I/L para que el docente pueda copiar el código sin ambigüedad. */
export const SEED_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export function randomSeedBody(length = 6): string {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => SEED_ALPHABET[b % SEED_ALPHABET.length]).join('');
}

export function formatSeedCode(version: number, body: string): string {
  return `v${version}-${body}`;
}

export function parseSeedCode(code: string): { version: number; body: string } | null {
  const match = /^v([1-9]\d*)-([A-Za-z0-9]+)$/.exec(code.trim());
  if (!match) return null;
  return { version: Number(match[1]), body: (match[2] as string).toUpperCase() };
}
```

- [ ] **Step 5: Ejecutar pruebas**

Run: `pnpm test src/core/random.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/core/lang.ts src/core/random.ts src/core/random.test.ts
git commit -m "feat(core): PRNG con semilla reproducible y códigos de semilla versionados"
```

---

### Task 3: Normalización de palabras (`core/text`)

**Files:**
- Create: `src/core/text.ts`, `src/core/text.test.ts`

**Interfaces:**
- Consumes: `Lang` de `@/core/lang`.
- Produces:
  - `type NormalizeError = 'empty' | 'invalid-chars' | 'too-short'`
  - `normalizeWord(raw: string, lang: Lang): { ok: true; value: string } | { ok: false; code: NormalizeError }`
  - `interface WordEntry { line: number; original: string; normalized: string }` (`line` empieza en 1)
  - `type WordListError = { line: number; code: 'invalid-chars' | 'too-short' }`
  - `type WordListWarning = { code: 'duplicate'; line: number; duplicateOf: number } | { code: 'contained'; line: number; containerLine: number }`
  - `parseWordList(text: string, lang: Lang): { entries: WordEntry[]; errors: WordListError[]; warnings: WordListWarning[] }`
  - `fillAlphabet(lang: Lang): readonly string[]`
  - `MIN_WORD_LENGTH = 2`

- [ ] **Step 1: Escribir la prueba**

`src/core/text.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { fillAlphabet, normalizeWord, parseWordList } from './text';

describe('normalizeWord', () => {
  it.each([
    ['Pingüino', 'PINGUINO'],
    ['ñandú', 'ÑANDU'],
    ['Ñu', 'ÑU'],
    ['oso polar', 'OSOPOLAR'],
    ["don't", 'DONT'],
    ['don’t', 'DONT'],
    ['  Árbol-grande ', 'ARBOLGRANDE'],
    ['Açaí', 'ACAI'],
    ['straße', 'STRASSE'],
  ])('%s → %s', (raw, expected) => {
    expect(normalizeWord(raw, 'es')).toEqual({ ok: true, value: expected });
  });

  it('conserva la Ñ también en inglés', () => {
    expect(normalizeWord('jalapeño', 'en')).toEqual({ ok: true, value: 'JALAPEÑO' });
  });

  it('rechaza dígitos y símbolos', () => {
    expect(normalizeWord('año 2', 'es')).toEqual({ ok: false, code: 'invalid-chars' });
    expect(normalizeWord('sol!', 'es')).toEqual({ ok: false, code: 'invalid-chars' });
  });

  it('rechaza vacías y demasiado cortas', () => {
    expect(normalizeWord('   ', 'es')).toEqual({ ok: false, code: 'empty' });
    expect(normalizeWord('a', 'es')).toEqual({ ok: false, code: 'too-short' });
    expect(normalizeWord('- -', 'es')).toEqual({ ok: false, code: 'empty' });
  });
});

describe('parseWordList', () => {
  it('ignora líneas vacías y numera desde 1', () => {
    const r = parseWordList('gato\n\n  perro  \n', 'es');
    expect(r.entries).toEqual([
      { line: 1, original: 'gato', normalized: 'GATO' },
      { line: 3, original: 'perro', normalized: 'PERRO' },
    ]);
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
  });

  it('acepta CRLF', () => {
    expect(parseWordList('uno\r\ndos', 'es').entries.map((e) => e.normalized)).toEqual(['UNO', 'DOS']);
  });

  it('informa errores por línea sin incluirlos en entries', () => {
    const r = parseWordList('sol\nluna3\nx', 'es');
    expect(r.entries.map((e) => e.normalized)).toEqual(['SOL']);
    expect(r.errors).toEqual([
      { line: 2, code: 'invalid-chars' },
      { line: 3, code: 'too-short' },
    ]);
  });

  it('elimina duplicados tras normalizar con aviso', () => {
    const r = parseWordList('Árbol\narbol', 'es');
    expect(r.entries).toHaveLength(1);
    expect(r.warnings).toEqual([{ code: 'duplicate', line: 2, duplicateOf: 1 }]);
  });

  it('avisa de palabras contenidas en otras', () => {
    const r = parseWordList('girasol\nsol', 'es');
    expect(r.entries).toHaveLength(2);
    expect(r.warnings).toEqual([{ code: 'contained', line: 2, containerLine: 1 }]);
  });
});

describe('fillAlphabet', () => {
  it('incluye Ñ solo en español', () => {
    expect(fillAlphabet('es')).toHaveLength(27);
    expect(fillAlphabet('es')).toContain('Ñ');
    expect(fillAlphabet('en')).toHaveLength(26);
    expect(fillAlphabet('en')).not.toContain('Ñ');
  });
});
```

- [ ] **Step 2: Ejecutar para verla fallar**

Run: `pnpm test src/core/text.test.ts`
Expected: FAIL — no se resuelve `./text`.

- [ ] **Step 3: Implementar `src/core/text.ts`**

```ts
import type { Lang } from '@/core/lang';

export const MIN_WORD_LENGTH = 2;

export type NormalizeError = 'empty' | 'invalid-chars' | 'too-short';

// Carácter de control temporal que protege la Ñ durante la descomposición NFD.
const ENYE_MARK = '\u0001';
const JOINERS = /[\s\-‐‑–'’]/g;
const VALID = /^[A-ZÑ]+$/;

/**
 * Normaliza una palabra para la cuadrícula: mayúsculas, sin tildes ni diéresis, Ñ conservada,
 * espacios/guiones/apóstrofos eliminados. Ver spec §5.1.
 */
export function normalizeWord(raw: string, lang: Lang): { ok: true; value: string } | { ok: false; code: NormalizeError } {
  const value = raw
    .normalize('NFC')
    .trim()
    .toLocaleUpperCase(lang)
    .replace(/Ñ/g, ENYE_MARK)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replaceAll(ENYE_MARK, 'Ñ')
    .replace(JOINERS, '');

  if (value === '') return { ok: false, code: 'empty' };
  if (!VALID.test(value)) return { ok: false, code: 'invalid-chars' };
  if (value.length < MIN_WORD_LENGTH) return { ok: false, code: 'too-short' };
  return { ok: true, value };
}

export interface WordEntry {
  line: number;
  original: string;
  normalized: string;
}

export type WordListError = { line: number; code: 'invalid-chars' | 'too-short' };

export type WordListWarning =
  | { code: 'duplicate'; line: number; duplicateOf: number }
  | { code: 'contained'; line: number; containerLine: number };

export function parseWordList(text: string, lang: Lang): { entries: WordEntry[]; errors: WordListError[]; warnings: WordListWarning[] } {
  const entries: WordEntry[] = [];
  const errors: WordListError[] = [];
  const warnings: WordListWarning[] = [];
  const firstLineByWord = new Map<string, number>();

  text.split(/\r?\n/).forEach((rawLine, index) => {
    const line = index + 1;
    const original = rawLine.trim();
    const result = normalizeWord(original, lang);
    if (!result.ok) {
      if (result.code !== 'empty') errors.push({ line, code: result.code });
      return;
    }
    const seen = firstLineByWord.get(result.value);
    if (seen !== undefined) {
      warnings.push({ code: 'duplicate', line, duplicateOf: seen });
      return;
    }
    firstLineByWord.set(result.value, line);
    entries.push({ line, original, normalized: result.value });
  });

  for (const inner of entries) {
    const container = entries.find((outer) => outer !== inner && outer.normalized.includes(inner.normalized));
    if (container) warnings.push({ code: 'contained', line: inner.line, containerLine: container.line });
  }

  return { entries, errors, warnings };
}

const BASE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const ES_ALPHABET = [...BASE_ALPHABET.slice(0, 14), 'Ñ', ...BASE_ALPHABET.slice(14)];

export function fillAlphabet(lang: Lang): readonly string[] {
  return lang === 'es' ? ES_ALPHABET : BASE_ALPHABET;
}
```

- [ ] **Step 4: Ejecutar pruebas**

Run: `pnpm test src/core/text.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/text.ts src/core/text.test.ts
git commit -m "feat(core): normalización de palabras con Ñ conservada y validación por línea"
```

---

### Task 4: Tamaño de papel (`core/paper`)

**Files:**
- Create: `src/core/paper.ts`, `src/core/paper.test.ts`

**Interfaces:**
- Produces:
  - `type PaperSize = 'a4' | 'letter'`
  - `interface PaperSpec { widthMm: number; heightMm: number; cssPageSize: 'A4' | 'letter' }`
  - `PAPER: Record<PaperSize, PaperSpec>`, `SHEET_MARGIN_MM = 12`, `LETTER_REGIONS: ReadonlySet<string>`
  - `defaultPaperFor(locales: readonly string[]): PaperSize`

- [ ] **Step 1: Escribir la prueba**

`src/core/paper.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { defaultPaperFor, PAPER } from './paper';

describe('PAPER', () => {
  it('tiene las dimensiones físicas correctas', () => {
    expect(PAPER.a4).toEqual({ widthMm: 210, heightMm: 297, cssPageSize: 'A4' });
    expect(PAPER.letter).toEqual({ widthMm: 215.9, heightMm: 279.4, cssPageSize: 'letter' });
  });
});

describe('defaultPaperFor', () => {
  it.each([
    [['es-MX'], 'letter'],
    [['en-US'], 'letter'],
    [['es-CO', 'es'], 'letter'],
    [['es-ES'], 'a4'],
    [['es-419'], 'a4'],
    [['en'], 'a4'],
    [['es', 'en-US'], 'letter'],
    [[], 'a4'],
    [['no es un locale!!'], 'a4'],
  ] as const)('%j → %s', (locales, expected) => {
    expect(defaultPaperFor(locales)).toBe(expected);
  });
});
```

- [ ] **Step 2: Ejecutar para verla fallar**

Run: `pnpm test src/core/paper.test.ts`
Expected: FAIL — no se resuelve `./paper`.

- [ ] **Step 3: Implementar `src/core/paper.ts`**

```ts
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
```

- [ ] **Step 4: Ejecutar pruebas**

Run: `pnpm test src/core/paper.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/paper.ts src/core/paper.test.ts
git commit -m "feat(core): tamaños A4 y Carta con valor por defecto según región"
```

---

### Task 5: Documento de hoja y marco común (`core/sheet`, `core/brand`, `layout/common/frame`)

**Files:**
- Create: `src/core/sheet.ts`, `src/core/brand.ts`, `src/layout/common/frame.ts`, `src/layout/common/frame.test.ts`

**Interfaces:**
- Consumes: `Lang` (`@/core/lang`), `PaperSize`, `PAPER`, `SHEET_MARGIN_MM` (`@/core/paper`).
- Produces:
  - `@/core/sheet`: `FontId`, `Tone`, `TONE_HEX: Record<Tone, string>`, `TextAlign`, `Primitive`, `SheetPage`, `SheetDocument`, `PT_TO_MM`
  - `@/core/brand`: `BRAND_DOMAIN = 'santiceducation.com'`, `BRAND_MARK_ASPECT: number` (ancho/alto del isotipo; la Tarea 8 lo ajusta al SVG definitivo)
  - `@/layout/common/frame`: `SheetHeader { title: string; school: string }`, `FrameLabels { name: string; date: string; solutions: string }`, `ContentBox { x; y; w; h }`, `Frame { primitives: Primitive[]; content: ContentBox }`, `HEADER_LIMITS = { title: 80, school: 80 }`, `buildFrame(input: { paper: PaperSize; header: SheetHeader; labels: FrameLabels; role: 'student' | 'solution' }): Frame`

- [ ] **Step 1: Crear los tipos de `src/core/sheet.ts` y `src/core/brand.ts`**

`src/core/sheet.ts`:

```ts
import type { Lang } from '@/core/lang';
import type { PaperSize } from '@/core/paper';

export type FontId = 'sheet' | 'sheetBold';
export type Tone = 'ink' | 'muted' | 'faint' | 'paper';
export type TextAlign = 'start' | 'middle' | 'end';

/** Escala de grises compartida por los renderizadores SVG y PDF. */
export const TONE_HEX: Record<Tone, string> = {
  ink: '#000000',
  muted: '#4d4d4d',
  faint: '#b3b3b3',
  paper: '#ffffff',
};

export const PT_TO_MM = 25.4 / 72;

/**
 * Primitivas en milímetros, origen arriba a la izquierda.
 * En `text`, `y` es la línea base y `size` el cuerpo tipográfico en mm.
 */
export type Primitive =
  | { t: 'text'; x: number; y: number; text: string; size: number; font: FontId; align: TextAlign; tone: Tone }
  | { t: 'rect'; x: number; y: number; w: number; h: number; stroke?: Tone; fill?: Tone; strokeWidth?: number; radius?: number }
  | { t: 'line'; x1: number; y1: number; x2: number; y2: number; stroke: Tone; strokeWidth: number; dash?: number[] }
  | { t: 'capsule'; cx: number; cy: number; length: number; width: number; angleDeg: number; stroke: Tone; strokeWidth: number }
  | { t: 'image'; id: 'brandMark'; x: number; y: number; w: number; h: number };

export interface SheetPage {
  role: 'student' | 'solution';
  primitives: Primitive[];
}

export interface SheetDocument {
  paper: PaperSize;
  lang: Lang;
  pages: SheetPage[];
}
```

`src/core/brand.ts`:

```ts
export const BRAND_DOMAIN = 'santiceducation.com';
/** Relación ancho/alto del isotipo usado en el pie de hoja. Ajustar al viewBox de public/brand/mark-gray.svg. */
export const BRAND_MARK_ASPECT = 0.97;
```

- [ ] **Step 2: Escribir la prueba del marco**

`src/layout/common/frame.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { BRAND_DOMAIN } from '@/core/brand';
import { PAPER, type PaperSize } from '@/core/paper';
import type { Primitive } from '@/core/sheet';
import { buildFrame, HEADER_LIMITS } from './frame';

const labels = { name: 'Nombre', date: 'Fecha', solutions: 'Soluciones' };
const header = { title: 'Los animales', school: 'Escuela Santa Ana' };

const texts = (ps: Primitive[]) => ps.flatMap((p) => (p.t === 'text' ? [p.text] : []));

function pointsOf(p: Primitive): Array<[number, number]> {
  switch (p.t) {
    case 'text': return [[p.x, p.y]];
    case 'rect': return [[p.x, p.y], [p.x + p.w, p.y + p.h]];
    case 'line': return [[p.x1, p.y1], [p.x2, p.y2]];
    case 'capsule': return [[p.cx, p.cy]];
    case 'image': return [[p.x, p.y], [p.x + p.w, p.y + p.h]];
  }
}

describe.each(['a4', 'letter'] as PaperSize[])('buildFrame en %s', (paper) => {
  const { widthMm, heightMm } = PAPER[paper];

  it('mantiene todas las primitivas dentro de los márgenes de impresión', () => {
    for (const role of ['student', 'solution'] as const) {
      const { primitives } = buildFrame({ paper, header, labels, role });
      for (const p of primitives) {
        for (const [x, y] of pointsOf(p)) {
          expect(x).toBeGreaterThanOrEqual(12);
          expect(x).toBeLessThanOrEqual(widthMm - 12);
          expect(y).toBeGreaterThanOrEqual(12);
          expect(y).toBeLessThanOrEqual(heightMm - 12);
        }
      }
    }
  });

  it('reserva una caja de contenido útil entre encabezado y pie', () => {
    const { content } = buildFrame({ paper, header, labels, role: 'student' });
    expect(content.x).toBe(12);
    expect(content.w).toBeCloseTo(widthMm - 24, 5);
    expect(content.y).toBeGreaterThan(30);
    expect(content.y + content.h).toBeLessThan(heightMm - 12 - 8);
    expect(content.h).toBeGreaterThan(200);
  });
});

describe('buildFrame contenido', () => {
  it('la hoja del alumno incluye título, centro, nombre, fecha y pie de marca', () => {
    const { primitives } = buildFrame({ paper: 'a4', header, labels, role: 'student' });
    expect(texts(primitives)).toEqual(expect.arrayContaining(['Los animales', 'Escuela Santa Ana', 'Nombre:', 'Fecha:', BRAND_DOMAIN]));
    expect(primitives.some((p) => p.t === 'image' && p.id === 'brandMark')).toBe(true);
  });

  it('la hoja de soluciones marca el título y no pide nombre ni fecha', () => {
    const { primitives } = buildFrame({ paper: 'a4', header, labels, role: 'solution' });
    const t = texts(primitives);
    expect(t).toContain('Los animales — Soluciones');
    expect(t).not.toContain('Nombre:');
    expect(t).not.toContain('Fecha:');
    expect(t).toContain(BRAND_DOMAIN);
  });

  it('omite título y centro vacíos sin mover la caja de contenido', () => {
    const full = buildFrame({ paper: 'a4', header, labels, role: 'student' });
    const empty = buildFrame({ paper: 'a4', header: { title: '  ', school: '' }, labels, role: 'student' });
    expect(texts(empty.primitives)).not.toContain('');
    expect(empty.content).toEqual(full.content);
  });

  it('recorta título y centro a su longitud máxima', () => {
    const long = 'x'.repeat(200);
    const { primitives } = buildFrame({ paper: 'a4', header: { title: long, school: long }, labels, role: 'student' });
    for (const t of texts(primitives)) expect(t.length).toBeLessThanOrEqual(Math.max(HEADER_LIMITS.title, HEADER_LIMITS.school));
  });
});
```

- [ ] **Step 3: Ejecutar para verla fallar**

Run: `pnpm test src/layout/common/frame.test.ts`
Expected: FAIL — no se resuelve `./frame`.

- [ ] **Step 4: Implementar `src/layout/common/frame.ts`**

```ts
import { BRAND_DOMAIN, BRAND_MARK_ASPECT } from '@/core/brand';
import { PAPER, SHEET_MARGIN_MM, type PaperSize } from '@/core/paper';
import type { Primitive } from '@/core/sheet';

export interface SheetHeader { title: string; school: string }
export interface FrameLabels { name: string; date: string; solutions: string }
export interface ContentBox { x: number; y: number; w: number; h: number }
export interface Frame { primitives: Primitive[]; content: ContentBox }

export const HEADER_LIMITS = { title: 80, school: 80 } as const;

// Geometría del marco en mm, relativa al margen superior o inferior.
const TITLE_BASELINE = 7;
const TITLE_SIZE = 7;
const SCHOOL_BASELINE = 13;
const SCHOOL_SIZE = 3.5;
const STUDENT_BASELINE = 23;
const LABEL_SIZE = 3.5;
const HEADER_RULE = 28;
const CONTENT_TOP = 32;
const FOOTER_RULE = 8;
const FOOTER_GAP = 2;
const MARK_HEIGHT = 5;
const FOOTER_TEXT_SIZE = 2.5; // ≈ 7 pt

export function buildFrame(input: {
  paper: PaperSize;
  header: SheetHeader;
  labels: FrameLabels;
  role: 'student' | 'solution';
}): Frame {
  const { widthMm: W, heightMm: H } = PAPER[input.paper];
  const m = SHEET_MARGIN_MM;
  const title = input.header.title.trim().slice(0, HEADER_LIMITS.title);
  const school = input.header.school.trim().slice(0, HEADER_LIMITS.school);
  const primitives: Primitive[] = [];

  const shownTitle = input.role === 'solution' ? [title, input.labels.solutions].filter(Boolean).join(' — ') : title;
  if (shownTitle) {
    primitives.push({ t: 'text', x: W / 2, y: m + TITLE_BASELINE, text: shownTitle, size: TITLE_SIZE, font: 'sheetBold', align: 'middle', tone: 'ink' });
  }
  if (school) {
    primitives.push({ t: 'text', x: W / 2, y: m + SCHOOL_BASELINE, text: school, size: SCHOOL_SIZE, font: 'sheet', align: 'middle', tone: 'muted' });
  }

  if (input.role === 'student') {
    const y = m + STUDENT_BASELINE;
    primitives.push(
      { t: 'text', x: m, y, text: `${input.labels.name}:`, size: LABEL_SIZE, font: 'sheet', align: 'start', tone: 'ink' },
      { t: 'line', x1: m + 22, y1: y + 0.8, x2: W - m - 60, y2: y + 0.8, stroke: 'ink', strokeWidth: 0.2 },
      { t: 'text', x: W - m - 55, y, text: `${input.labels.date}:`, size: LABEL_SIZE, font: 'sheet', align: 'start', tone: 'ink' },
      { t: 'line', x1: W - m - 40, y1: y + 0.8, x2: W - m, y2: y + 0.8, stroke: 'ink', strokeWidth: 0.2 },
    );
  }

  primitives.push({ t: 'line', x1: m, y1: m + HEADER_RULE, x2: W - m, y2: m + HEADER_RULE, stroke: 'faint', strokeWidth: 0.3 });

  const footerRuleY = H - m - FOOTER_RULE;
  const markW = MARK_HEIGHT * BRAND_MARK_ASPECT;
  primitives.push(
    { t: 'line', x1: m, y1: footerRuleY, x2: W - m, y2: footerRuleY, stroke: 'faint', strokeWidth: 0.2 },
    { t: 'image', id: 'brandMark', x: m, y: H - m - MARK_HEIGHT - 0.5, w: markW, h: MARK_HEIGHT },
    { t: 'text', x: m + markW + FOOTER_GAP, y: H - m - 1.8, text: BRAND_DOMAIN, size: FOOTER_TEXT_SIZE, font: 'sheet', align: 'start', tone: 'muted' },
  );

  const contentTop = m + CONTENT_TOP;
  const contentBottom = footerRuleY - FOOTER_GAP;
  return {
    primitives,
    content: { x: m, y: contentTop, w: W - 2 * m, h: contentBottom - contentTop },
  };
}
```

- [ ] **Step 5: Ejecutar pruebas y lint**

Run: `pnpm test src/layout/common/frame.test.ts && pnpm lint`
Expected: PASS; lint sin errores (layout/common solo importa core).

- [ ] **Step 6: Commit**

```bash
git add src/core/sheet.ts src/core/brand.ts src/layout/common
git commit -m "feat(layout): documento de hoja en milímetros y marco común con encabezado y pie de marca"
```

---

### Task 6: Renderizador SVG (`render/svg`)

**Files:**
- Create: `src/render/svg/SheetSvg.tsx`, `src/render/svg/SheetSvg.test.tsx`

**Interfaces:**
- Consumes: `SheetPage`, `Primitive`, `TONE_HEX` (`@/core/sheet`); `PAPER`, `PaperSize` (`@/core/paper`); `withBasePath` (`@/core/paths`).
- Produces: `BRAND_MARK_SRC = '/brand/mark-gray.svg'`; `SheetSvg(props: { paper: PaperSize; page: SheetPage; sizing: 'fluid' | 'physical'; label: string; className?: string }): JSX.Element`. El texto usa `style.fontFamily = 'var(--font-sheet)'`, definido en la Tarea 8.

- [ ] **Step 1: Escribir la prueba**

`src/render/svg/SheetSvg.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { SheetPage } from '@/core/sheet';
import { SheetSvg } from './SheetSvg';

const page: SheetPage = {
  role: 'student',
  primitives: [
    { t: 'text', x: 105, y: 20, text: 'Ñandú & <b>', size: 7, font: 'sheetBold', align: 'middle', tone: 'ink' },
    { t: 'rect', x: 10, y: 10, w: 20, h: 5, stroke: 'muted', strokeWidth: 0.3, radius: 1 },
    { t: 'line', x1: 0, y1: 1, x2: 5, y2: 1, stroke: 'faint', strokeWidth: 0.2, dash: [1, 0.5] },
    { t: 'capsule', cx: 50, cy: 60, length: 40, width: 6, angleDeg: 45, stroke: 'ink', strokeWidth: 0.4 },
    { t: 'image', id: 'brandMark', x: 12, y: 280, w: 5, h: 5 },
  ],
};

const render = (sizing: 'fluid' | 'physical', paper: 'a4' | 'letter' = 'a4') =>
  renderToStaticMarkup(<SheetSvg paper={paper} page={page} sizing={sizing} label="Ficha" />);

describe('SheetSvg', () => {
  it('usa el tamaño físico del papel en milímetros', () => {
    const html = render('physical');
    expect(html).toContain('viewBox="0 0 210 297"');
    expect(html).toContain('width="210mm"');
    expect(html).toContain('height="297mm"');
    expect(render('physical', 'letter')).toContain('viewBox="0 0 215.9 279.4"');
  });

  it('en modo fluido ocupa el ancho disponible', () => {
    const html = render('fluid');
    expect(html).toContain('width="100%"');
    expect(html).not.toContain('297mm');
  });

  it('escapa el texto y conserva tildes y eñes', () => {
    const html = render('fluid');
    expect(html).toContain('Ñandú &amp; &lt;b&gt;');
    expect(html).toContain('text-anchor="middle"');
    expect(html).toContain('font-weight="700"');
    expect(html).toContain('font-family:var(--font-sheet)');
  });

  it('dibuja cápsulas giradas, líneas discontinuas e isotipo', () => {
    const html = render('fluid');
    expect(html).toContain('transform="rotate(45 50 60)"');
    expect(html).toContain('stroke-dasharray="1 0.5"');
    expect(html).toContain('href="/brand/mark-gray.svg"');
  });

  it('expone una etiqueta accesible', () => {
    expect(render('fluid')).toMatch(/role="img"[^>]*aria-label="Ficha"|aria-label="Ficha"[^>]*role="img"/);
  });
});
```

- [ ] **Step 2: Ejecutar para verla fallar**

Run: `pnpm test src/render/svg/SheetSvg.test.tsx`
Expected: FAIL — no se resuelve `./SheetSvg`.

- [ ] **Step 3: Implementar `src/render/svg/SheetSvg.tsx`**

```tsx
import { PAPER, type PaperSize } from '@/core/paper';
import { withBasePath } from '@/core/paths';
import { TONE_HEX, type Primitive, type SheetPage } from '@/core/sheet';

export const BRAND_MARK_SRC = '/brand/mark-gray.svg';

const FONT_STYLE = { fontFamily: 'var(--font-sheet)' } as const;

function PrimitiveNode({ p }: { p: Primitive }) {
  switch (p.t) {
    case 'text':
      return (
        <text x={p.x} y={p.y} fontSize={p.size} fontWeight={p.font === 'sheetBold' ? 700 : 400} textAnchor={p.align} fill={TONE_HEX[p.tone]} style={FONT_STYLE}>
          {p.text}
        </text>
      );
    case 'rect':
      return (
        <rect x={p.x} y={p.y} width={p.w} height={p.h} rx={p.radius} fill={p.fill ? TONE_HEX[p.fill] : 'none'} stroke={p.stroke ? TONE_HEX[p.stroke] : 'none'} strokeWidth={p.strokeWidth} />
      );
    case 'line':
      return <line x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} stroke={TONE_HEX[p.stroke]} strokeWidth={p.strokeWidth} strokeDasharray={p.dash?.join(' ')} />;
    case 'capsule':
      return (
        <rect
          x={p.cx - p.length / 2}
          y={p.cy - p.width / 2}
          width={p.length}
          height={p.width}
          rx={p.width / 2}
          transform={`rotate(${p.angleDeg} ${p.cx} ${p.cy})`}
          fill="none"
          stroke={TONE_HEX[p.stroke]}
          strokeWidth={p.strokeWidth}
        />
      );
    case 'image':
      return <image href={withBasePath(BRAND_MARK_SRC)} x={p.x} y={p.y} width={p.w} height={p.h} preserveAspectRatio="xMidYMid meet" />;
  }
}

export function SheetSvg({ paper, page, sizing, label, className }: {
  paper: PaperSize;
  page: SheetPage;
  sizing: 'fluid' | 'physical';
  label: string;
  className?: string;
}) {
  const { widthMm, heightMm } = PAPER[paper];
  const physical = sizing === 'physical';
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${widthMm} ${heightMm}`}
      width={physical ? `${widthMm}mm` : '100%'}
      height={physical ? `${heightMm}mm` : undefined}
      role="img"
      aria-label={label}
      className={className}
    >
      <rect x={0} y={0} width={widthMm} height={heightMm} fill={TONE_HEX.paper} />
      {page.primitives.map((p, i) => (
        <PrimitiveNode key={i} p={p} />
      ))}
    </svg>
  );
}
```

- [ ] **Step 4: Ejecutar pruebas y lint**

Run: `pnpm test src/render/svg && pnpm lint && pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/render/svg
git commit -m "feat(render): renderizador SVG del documento de hoja para vista previa e impresión"
```

---

### Task 7: Idiomas, rutas traducidas y redirección de la raíz (`i18n`)

**Files:**
- Create: `src/i18n/config.ts`, `src/i18n/routes.ts`, `src/i18n/dictionary.ts`, `src/i18n/dictionaries/es.ts`, `src/i18n/dictionaries/en.ts`, `src/i18n/i18n.test.ts`
- Modify: `src/app/(root)/page.tsx` (sustitución completa), `src/app/(root)/layout.tsx` (sustitución completa)

**Interfaces:**
- Consumes: `LANGS`, `Lang`, `DEFAULT_LANG`, `isLang` (`@/core/lang`); `BASE_PATH`, `withBasePath` (`@/core/paths`).
- Produces:
  - `@/i18n/config`: `LANG_STORAGE_KEY = 'santic-lang'`, `pickLang(languages: readonly string[]): Lang`
  - `@/i18n/routes`: `type SectionKey = 'wordsearch'`, `SECTION_SLUGS: Record<SectionKey, Record<Lang, string>>`, `homePath(lang: Lang): string`, `sectionPath(lang: Lang, key: SectionKey): string`, `sectionFromSlug(lang: Lang, slug: string): SectionKey | null`, `sectionParams(lang: Lang): { section: string }[]`, `equivalentPath(pathname: string, target: Lang): string`
  - `@/i18n/dictionary`: `interface Dictionary`, `getDictionary(lang: Lang): Dictionary`

- [ ] **Step 1: Escribir la prueba**

`src/i18n/i18n.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { LANGS } from '@/core/lang';
import { pickLang } from './config';
import { getDictionary } from './dictionary';
import { equivalentPath, homePath, sectionFromSlug, sectionParams, sectionPath } from './routes';

describe('pickLang', () => {
  it.each([
    [['en-GB', 'es'], 'en'],
    [['fr-FR', 'es-EC'], 'es'],
    [['EN'], 'en'],
    [['de'], 'es'],
    [[], 'es'],
  ] as const)('%j → %s', (langs, expected) => {
    expect(pickLang(langs)).toBe(expected);
  });
});

describe('rutas', () => {
  it('construye rutas con barra final', () => {
    expect(homePath('en')).toBe('/en/');
    expect(sectionPath('es', 'wordsearch')).toBe('/es/sopa-de-letras/');
    expect(sectionPath('en', 'wordsearch')).toBe('/en/word-search/');
  });

  it('resuelve slugs solo en su idioma', () => {
    expect(sectionFromSlug('es', 'sopa-de-letras')).toBe('wordsearch');
    expect(sectionFromSlug('en', 'sopa-de-letras')).toBeNull();
  });

  it('genera parámetros estáticos únicos por idioma', () => {
    expect(sectionParams('es')).toEqual([{ section: 'sopa-de-letras' }]);
    expect(sectionParams('en')).toEqual([{ section: 'word-search' }]);
  });

  it('traduce la ruta actual al otro idioma', () => {
    expect(equivalentPath('/es/sopa-de-letras/', 'en')).toBe('/en/word-search/');
    expect(equivalentPath('/en/word-search', 'es')).toBe('/es/sopa-de-letras/');
    expect(equivalentPath('/es/', 'en')).toBe('/en/');
    expect(equivalentPath('/es/desconocida/', 'en')).toBe('/en/');
    expect(equivalentPath('/', 'en')).toBe('/en/');
  });
});

describe('diccionarios', () => {
  const flatten = (obj: unknown, prefix = ''): Record<string, unknown> =>
    typeof obj === 'object' && obj !== null
      ? Object.entries(obj).reduce((acc, [k, v]) => ({ ...acc, ...flatten(v, `${prefix}${k}.`) }), {})
      : { [prefix.slice(0, -1)]: obj };

  it('tienen las mismas claves y ningún texto vacío', () => {
    const [es, en] = LANGS.map((l) => flatten(getDictionary(l)));
    expect(Object.keys(en!).sort()).toEqual(Object.keys(es!).sort());
    for (const dict of [es!, en!]) {
      for (const [key, value] of Object.entries(dict)) {
        expect(typeof value, key).toBe('string');
        expect((value as string).trim(), key).not.toBe('');
      }
    }
  });
});
```

- [ ] **Step 2: Ejecutar para verla fallar**

Run: `pnpm test src/i18n`
Expected: FAIL — no se resuelve `./config`.

- [ ] **Step 3: Implementar `src/i18n/config.ts` y `src/i18n/routes.ts`**

`src/i18n/config.ts`:

```ts
import { DEFAULT_LANG, isLang, type Lang } from '@/core/lang';

export const LANG_STORAGE_KEY = 'santic-lang';

export function pickLang(languages: readonly string[]): Lang {
  for (const tag of languages) {
    const base = tag.toLowerCase().split('-')[0] ?? '';
    if (isLang(base)) return base;
  }
  return DEFAULT_LANG;
}
```

`src/i18n/routes.ts`:

```ts
import { isLang, type Lang } from '@/core/lang';

/** Secciones con slug traducido. Fases posteriores añaden crossword, arithmetic, author y legales. */
export type SectionKey = 'wordsearch';

export const SECTION_SLUGS: Record<SectionKey, Record<Lang, string>> = {
  wordsearch: { es: 'sopa-de-letras', en: 'word-search' },
};

const SECTION_KEYS = Object.keys(SECTION_SLUGS) as SectionKey[];

export function homePath(lang: Lang): string {
  return `/${lang}/`;
}

export function sectionPath(lang: Lang, key: SectionKey): string {
  return `/${lang}/${SECTION_SLUGS[key][lang]}/`;
}

export function sectionFromSlug(lang: Lang, slug: string): SectionKey | null {
  return SECTION_KEYS.find((key) => SECTION_SLUGS[key][lang] === slug) ?? null;
}

export function sectionParams(lang: Lang): { section: string }[] {
  return SECTION_KEYS.map((key) => ({ section: SECTION_SLUGS[key][lang] }));
}

/** `pathname` sin basePath (como lo devuelve usePathname de Next.js). */
export function equivalentPath(pathname: string, target: Lang): string {
  const [first, second] = pathname.split('/').filter(Boolean);
  if (!first || !isLang(first) || !second) return homePath(target);
  const key = sectionFromSlug(first, second);
  return key ? sectionPath(target, key) : homePath(target);
}
```

- [ ] **Step 4: Implementar diccionarios**

`src/i18n/dictionary.ts`:

```ts
import type { Lang } from '@/core/lang';
import type { SectionKey } from '@/i18n/routes';
import { en } from './dictionaries/en';
import { es } from './dictionaries/es';

export interface Dictionary {
  meta: { siteName: string; homeTitle: string; homeDescription: string };
  nav: { languageSwitch: string; languageName: Record<Lang, string>; skipToContent: string; home: string };
  home: { heading: string; intro: string; open: string };
  sections: Record<SectionKey, { title: string; description: string }>;
  sheet: { name: string; date: string; solutions: string; defaultTitle: string; previewLabel: string };
  tool: {
    headerLegend: string;
    titleLabel: string;
    schoolLabel: string;
    paperLabel: string;
    paperA4: string;
    paperLetter: string;
    print: string;
    preview: string;
  };
  ads: { label: string };
  footer: { tagline: string };
}

const DICTIONARIES: Record<Lang, Dictionary> = { es, en };

export function getDictionary(lang: Lang): Dictionary {
  return DICTIONARIES[lang];
}
```

`src/i18n/dictionaries/es.ts`:

```ts
import type { Dictionary } from '@/i18n/dictionary';

export const es: Dictionary = {
  meta: {
    siteName: 'Santic Education',
    homeTitle: 'Fichas imprimibles para el aula',
    homeDescription: 'Crea sopas de letras, crucigramas y cuadernillos de operaciones listos para imprimir. Todo se genera en tu navegador.',
  },
  nav: { languageSwitch: 'Idioma', languageName: { es: 'Español', en: 'English' }, skipToContent: 'Saltar al contenido', home: 'Inicio' },
  home: { heading: 'Fichas imprimibles para el aula', intro: 'Elige un generador, ajusta la ficha e imprímela o descárgala en PDF. Lo que escribes no sale de tu navegador.', open: 'Abrir' },
  sections: {
    wordsearch: { title: 'Sopa de letras', description: 'Con tu propio vocabulario, cuadrícula a medida y hoja de soluciones.' },
  },
  sheet: { name: 'Nombre', date: 'Fecha', solutions: 'Soluciones', defaultTitle: 'Sopa de letras', previewLabel: 'Vista previa de la ficha' },
  tool: {
    headerLegend: 'Encabezado de la ficha',
    titleLabel: 'Título',
    schoolLabel: 'Centro o docente',
    paperLabel: 'Papel',
    paperA4: 'A4',
    paperLetter: 'Carta',
    print: 'Imprimir',
    preview: 'Vista previa',
  },
  ads: { label: 'Publicidad' },
  footer: { tagline: 'Material educativo gratuito para docentes.' },
};
```

`src/i18n/dictionaries/en.ts`:

```ts
import type { Dictionary } from '@/i18n/dictionary';

export const en: Dictionary = {
  meta: {
    siteName: 'Santic Education',
    homeTitle: 'Printable classroom worksheets',
    homeDescription: 'Create word searches, crosswords and math worksheets ready to print. Everything is generated in your browser.',
  },
  nav: { languageSwitch: 'Language', languageName: { es: 'Español', en: 'English' }, skipToContent: 'Skip to content', home: 'Home' },
  home: { heading: 'Printable classroom worksheets', intro: 'Pick a generator, adjust the worksheet, then print it or download a PDF. What you type never leaves your browser.', open: 'Open' },
  sections: {
    wordsearch: { title: 'Word search', description: 'With your own vocabulary, a custom grid size and an answer key.' },
  },
  sheet: { name: 'Name', date: 'Date', solutions: 'Answer key', defaultTitle: 'Word search', previewLabel: 'Worksheet preview' },
  tool: {
    headerLegend: 'Worksheet header',
    titleLabel: 'Title',
    schoolLabel: 'School or teacher',
    paperLabel: 'Paper',
    paperA4: 'A4',
    paperLetter: 'Letter',
    print: 'Print',
    preview: 'Preview',
  },
  ads: { label: 'Advertisement' },
  footer: { tagline: 'Free classroom materials for teachers.' },
};
```

- [ ] **Step 5: Ejecutar pruebas**

Run: `pnpm test src/i18n`
Expected: PASS.

- [ ] **Step 6: Redirección de idioma en la raíz**

`src/app/(root)/layout.tsx`:

```tsx
import type { Metadata } from 'next';
import '@/app/globals.css';

export const metadata: Metadata = { title: 'Santic Education' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
```

`src/app/(root)/page.tsx`:

```tsx
import { DEFAULT_LANG, LANGS } from '@/core/lang';
import { BASE_PATH, withBasePath } from '@/core/paths';
import { LANG_STORAGE_KEY } from '@/i18n/config';

// Se ejecuta antes de pintar: preferencia guardada → idiomas del navegador → español.
// Nginx ya redirige por Accept-Language en producción; esto cubre otros servidores.
const REDIRECT_SCRIPT = `(function(){
  var langs=${JSON.stringify(LANGS)}, pick=null, stored=null;
  try{stored=localStorage.getItem(${JSON.stringify(LANG_STORAGE_KEY)});}catch(e){}
  if(stored&&langs.indexOf(stored)>-1)pick=stored;
  var nav=navigator.languages||[navigator.language||''];
  for(var i=0;!pick&&i<nav.length;i++){var b=String(nav[i]).toLowerCase().split('-')[0];if(langs.indexOf(b)>-1)pick=b;}
  location.replace(${JSON.stringify(BASE_PATH)}+'/'+(pick||${JSON.stringify(DEFAULT_LANG)})+'/');
})();`;

export default function RootPage() {
  return (
    <main>
      <script dangerouslySetInnerHTML={{ __html: REDIRECT_SCRIPT }} />
      <noscript>
        <p>
          <a href={withBasePath('/es/')}>Español</a> · <a href={withBasePath('/en/')}>English</a>
        </p>
      </noscript>
    </main>
  );
}
```

- [ ] **Step 7: Lint, tipos y build**

Run: `pnpm lint && pnpm typecheck && pnpm build`
Expected: PASS. (La redirección se prueba end-to-end en la Tarea 9, cuando existan las rutas `[lang]`.)

- [ ] **Step 8: Commit**

```bash
git add src/i18n "src/app/(root)"
git commit -m "feat(i18n): diccionarios es/en, rutas traducidas y detección de idioma en la raíz"
```

---

### Task 8: Identidad visual desde el logotipo (impeccable)

> Esta tarea es de diseño y requiere al operador: `init` de impeccable hace preguntas de producto. No la delegues en un subagente sin supervisión.

**Files:**
- Create: `PRODUCT.md`, `DESIGN.md` (los escribe impeccable), `public/brand/logo.svg` (o `logo.png` si solo hay raster), `public/brand/mark-gray.svg`, `public/brand/mark-gray.png`, `public/brand/favicon.svg`, `src/app/fonts.css`
- Modify: `src/app/globals.css` (sustitución completa), `src/core/brand.ts` (`BRAND_MARK_ASPECT`)

**Interfaces:**
- Produces (contrato que usan las Tareas 9–11 y las fases siguientes):
  - Utilidades Tailwind derivadas de `@theme`: colores `brand`, `brand-strong`, `ink`, `muted`, `line`, `surface`, `canvas`, `focus`; familias `font-ui`, `font-sheet`.
  - Variable CSS `--font-sheet` (la usa `SheetSvg`).
  - Ficheros `public/brand/logo.svg|png`, `public/brand/mark-gray.svg`, `public/brand/mark-gray.png` (≥ 600 px de alto, para pdf-lib en Fase 2), `public/brand/favicon.svg`.

- [ ] **Step 1: Precondición — material de marca**

Run: `ls -la img/`
Expected: al menos un fichero de logotipo. Si `img/` está vacía, **detente** y pide al operador los ficheros; no continúes con una paleta inventada.

- [ ] **Step 2: Cargar contexto de impeccable**

Run: `.claude/skills/impeccable/scripts/impeccable context`
Sigue sus directivas. Si falla, envía el mensaje previsto en `SKILL.md` («Context loading did not run…») y continúa leyendo `PRODUCT.md`/`DESIGN.md` si existen.

- [ ] **Step 3: `init` → `PRODUCT.md`**

Lee `.claude/skills/impeccable/reference/init.md` y síguelo. Hechos de producto que deben quedar recogidos (tomados de la spec; no inventes otros):
- Público: docentes de cualquier país, en español e inglés.
- Superficies: páginas de generador (modo *Operate*), páginas de contenido (modo *Read*), portada.
- Restricciones: fichas en escala de grises para fotocopia; tipografías locales (sin fuentes remotas); ninguna interfaz ni anuncio en la impresión; legible y usable a 360 px; publicidad lejos de los controles de acción; los datos del docente no salen del navegador.

- [ ] **Step 4: Dirección visual → `DESIGN.md`**

Lee `.claude/skills/impeccable/reference/new-work.md` y síguelo con esta instrucción de brief: la paleta **se extrae del logotipo**, no se inventa; el logotipo es la autoridad visual. Elige en ese proceso:
- Tipografía de interfaz y tipografía de ficha (esta última legible para lectores iniciales, con cobertura latin + latin-ext, disponible en @fontsource, con pesos 400 y 700).

- [ ] **Step 5: Extraer la paleta**

Para SVG:

```bash
grep -oiE '#[0-9a-f]{6}\b|#[0-9a-f]{3}\b|rgb\([^)]*\)' img/*.svg | sort | uniq -c | sort -rn
```

Para PNG/JPG (Python con Pillow, disponible en la máquina del operador):

```bash
python3 - <<'PY'
from PIL import Image
from collections import Counter
import glob
for path in glob.glob('img/*.png') + glob.glob('img/*.jp*g'):
    im = Image.open(path).convert('RGBA')
    c = Counter((r, g, b) for r, g, b, a in im.getdata() if a > 240 and not (r > 235 and g > 235 and b > 235))
    print(path, ['#%02x%02x%02x (%d)' % (k + (v,)) for k, v in c.most_common(6)])
PY
```

Anota en `DESIGN.md` el color exacto del isotipo (`brand`) y del wordmark (`brand-strong`). Referencia provisional medida en Fase 0 sobre `brand-logo.png`: isotipo ≈ `#385070`, wordmark ≈ `#484860`.

- [ ] **Step 6: Tipografías locales**

Instala los paquetes elegidos en el Step 4 (ejemplo con los nombres reales que se hayan elegido; `<ui>` y `<sheet>` son los nombres de paquete @fontsource):

```bash
pnpm add @fontsource/<ui> @fontsource/<sheet>
```

`src/app/fonts.css` — solo subconjuntos latin y latin-ext y los pesos usados:

```css
@import '@fontsource/<ui>/latin-400.css';
@import '@fontsource/<ui>/latin-ext-400.css';
@import '@fontsource/<ui>/latin-700.css';
@import '@fontsource/<ui>/latin-ext-700.css';
@import '@fontsource/<sheet>/latin-400.css';
@import '@fontsource/<sheet>/latin-ext-400.css';
@import '@fontsource/<sheet>/latin-700.css';
@import '@fontsource/<sheet>/latin-ext-700.css';
```

Verifica que existen: `ls node_modules/@fontsource/<sheet>/latin-ext-700.css`.

- [ ] **Step 7: Tokens en `src/app/globals.css`**

Estructura obligatoria (los nombres son el contrato; los valores salen de los Steps 4–5 y de `DESIGN.md`):

```css
@import 'tailwindcss';

@theme {
  --color-brand: #385070;        /* isotipo, extraído del logo */
  --color-brand-strong: #484860; /* wordmark, extraído del logo */
  --color-ink: /* texto principal, contraste ≥ 7:1 sobre canvas */;
  --color-muted: /* texto secundario, contraste ≥ 4.5:1 sobre canvas */;
  --color-line: /* bordes y separadores */;
  --color-surface: /* tarjetas y paneles */;
  --color-canvas: /* fondo de página */;
  --color-focus: /* anillo de foco, contraste ≥ 3:1 */;
  --font-ui: '<Nombre UI>', system-ui, sans-serif;
  --font-sheet: '<Nombre ficha>', system-ui, sans-serif;
}

:root {
  color-scheme: light;
}

:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 2px;
}
```

Comprueba los contrastes con este script (sustituye los valores):

```bash
node -e '
const hex=h=>h.match(/\w\w/g).map(x=>parseInt(x,16)/255).map(c=>c<=0.03928?c/12.92:((c+0.055)/1.055)**2.4);
const L=h=>{const[r,g,b]=hex(h.replace("#",""));return 0.2126*r+0.7152*g+0.0722*b};
const ratio=(a,b)=>{const[x,y]=[L(a),L(b)].sort((p,q)=>q-p);return ((x+0.05)/(y+0.05)).toFixed(2)};
const canvas="#ffffff";
for (const [n,c] of Object.entries({ink:"#1f2533",muted:"#566074",brand:"#385070",focus:"#385070"})) console.log(n, ratio(c,canvas));
'
```

Expected: `ink` ≥ 7, `muted` ≥ 4.5, `focus` ≥ 3.

- [ ] **Step 8: Recursos de marca**

- Copia el logotipo principal a `public/brand/logo.svg` (o `logo.png`). Si solo hay raster, que tenga al menos 2× el tamaño de visualización.
- Crea `public/brand/mark-gray.svg`: solo el isotipo, relleno único `#4d4d4d`, `viewBox` recortado al isotipo. Si solo hay raster, usa el agente `impeccable-asset-producer` para obtener un recorte limpio.
- Genera `public/brand/mark-gray.png` (≥ 600 px de alto, fondo transparente). Con Pillow:

```bash
python3 - <<'PY'
from PIL import Image, ImageOps
src = Image.open('public/brand/mark-source.png').convert('RGBA')  # recorte del isotipo
alpha = src.split()[3]
gray = Image.new('RGBA', src.size, (77, 77, 77, 255))
gray.putalpha(alpha)
scale = 600 / gray.height
gray.resize((round(gray.width * scale), 600), Image.LANCZOS).save('public/brand/mark-gray.png')
PY
```

- Crea `public/brand/favicon.svg` con el isotipo en color `brand`.
- Borra de `img/` y de `public/brand/` lo que no se use (el operador lo autorizó).
- Actualiza `BRAND_MARK_ASPECT` en `src/core/brand.ts` con `ancho/alto` del `viewBox` de `mark-gray.svg`, redondeado a 3 decimales.

- [ ] **Step 9: Verificar**

Run: `pnpm test && pnpm lint && pnpm typecheck && pnpm build`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add PRODUCT.md DESIGN.md public/brand src/app/fonts.css src/app/globals.css src/core/brand.ts package.json pnpm-lock.yaml img
git commit -m "feat(identidad): paleta extraída del logotipo, tipografías locales y recursos de marca"
```

---

### Task 9: Shell de la aplicación, rutas `[lang]` y pruebas end-to-end de idioma

> Antes de editar UI: lee `.claude/skills/impeccable/reference/craft-floor.md` y `DESIGN.md`. Las clases Tailwind de este plan son un punto de partida: ajústalas a `DESIGN.md` sin cambiar estructura, `id`, roles, textos accesibles ni atributos `data-*`, porque las pruebas dependen de ellos.

**Files:**
- Create: `src/app/[lang]/layout.tsx`, `src/app/[lang]/page.tsx`, `src/app/[lang]/[section]/page.tsx`, `src/components/shell/SiteHeader.tsx`, `src/components/shell/SiteFooter.tsx`, `src/i18n/LanguageSwitch.tsx`, `playwright.config.ts`, `scripts/serve-out.mjs`, `tests/e2e/i18n.spec.ts`

**Interfaces:**
- Consumes: `getDictionary`, `Dictionary` (`@/i18n/dictionary`); `LANGS`, `isLang`, `Lang` (`@/core/lang`); `homePath`, `sectionPath`, `sectionFromSlug`, `sectionParams`, `equivalentPath`, `SECTION_SLUGS`, `SectionKey` (`@/i18n/routes`); `LANG_STORAGE_KEY` (`@/i18n/config`); `withBasePath` (`@/core/paths`).
- Produces: layout `[lang]` con `<main id="contenido">`; `LanguageSwitch({ current, label, names })`; `SiteHeader({ lang, dict })`; `SiteFooter({ dict })`; página de sección con `<h1>`; servidor `pnpm serve:out` (puerto `PORT`, por defecto 4173, montado en `NEXT_PUBLIC_BASE_PATH`); Playwright con `baseURL = http://localhost:4173/fichas/` (las pruebas navegan con rutas relativas sin `/` inicial).

- [ ] **Step 1: Instalar Playwright**

```bash
pnpm add -D @playwright/test@1.63.0
pnpm exec playwright install chromium
```

- [ ] **Step 2: Servidor estático de pruebas `scripts/serve-out.mjs`**

```js
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';

const OUT = path.resolve('out');
const PORT = Number(process.env.PORT ?? 4173);
const BASE = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').trim().replace(/\/+$/, '');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.json': 'application/json', '.xml': 'application/xml', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.webmanifest': 'application/manifest+json',
};

function send(res, status, file) {
  res.writeHead(status, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
  createReadStream(file).pipe(res);
}

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const notFound = () => send(res, 404, path.join(OUT, '404.html'));
  if (url.pathname !== BASE && !url.pathname.startsWith(`${BASE}/`)) return notFound();

  const relative = decodeURIComponent(url.pathname.slice(BASE.length)) || '/';
  const target = path.join(OUT, relative);
  if (!target.startsWith(OUT)) return notFound();

  if (relative.endsWith('/')) {
    const index = path.join(target, 'index.html');
    return existsSync(index) ? send(res, 200, index) : notFound();
  }
  if (existsSync(target) && statSync(target).isFile()) return send(res, 200, target);
  if (existsSync(path.join(target, 'index.html'))) {
    res.writeHead(308, { Location: `${url.pathname}/${url.search}` });
    return res.end();
  }
  return notFound();
}).listen(PORT, () => {
  process.stdout.write(`Sirviendo out/ en http://localhost:${PORT}${BASE}/\n`);
});
```

- [ ] **Step 3: `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const BASE = '/fichas';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: `http://localhost:${PORT}${BASE}/`, trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `pnpm build:e2e && NEXT_PUBLIC_BASE_PATH=${BASE} PORT=${PORT} pnpm serve:out`,
    url: `http://localhost:${PORT}${BASE}/es/`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});
```

- [ ] **Step 4: Escribir la prueba end-to-end**

`tests/e2e/i18n.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test.describe('idioma', () => {
  for (const [locale, expected] of [
    ['en-US', /\/fichas\/en\/$/],
    ['es-EC', /\/fichas\/es\/$/],
    ['de-DE', /\/fichas\/es\/$/],
  ] as const) {
    test(`la raíz redirige para ${locale}`, async ({ browser }) => {
      const context = await browser.newContext({ locale });
      const page = await context.newPage();
      await page.goto('./');
      await expect(page).toHaveURL(expected);
      await context.close();
    });
  }

  test('el selector lleva a la página equivalente y recuerda la elección', async ({ page }) => {
    await page.goto('es/sopa-de-letras/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sopa de letras');

    await page.getByRole('link', { name: 'English' }).click();
    await expect(page).toHaveURL(/\/fichas\/en\/word-search\/$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Word search');

    await page.goto('./');
    await expect(page).toHaveURL(/\/fichas\/en\/$/);
  });

  test('los recursos de marca respetan el basePath', async ({ page, request }) => {
    await page.goto('es/');
    const icon = await page.locator('link[rel="icon"]').first().getAttribute('href');
    expect(icon).toMatch(/^\/fichas\/brand\//);
    expect((await request.get(icon!)).status()).toBe(200);

    const logo = page.locator('header img').first();
    await expect(logo).toBeVisible();
    expect(await logo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  });

  test('una sección inexistente no se exporta', async ({ request }) => {
    expect((await request.get('en/sopa-de-letras/')).status()).toBe(404);
  });
});
```

- [ ] **Step 5: Ejecutar para verla fallar**

Run: `pnpm test:e2e tests/e2e/i18n.spec.ts`
Expected: FAIL — las rutas `/fichas/es/` no existen (el `webServer` no llega a responder o las pruebas dan 404).

- [ ] **Step 6: `LanguageSwitch`, cabecera y pie**

`src/i18n/LanguageSwitch.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LANGS, type Lang } from '@/core/lang';
import { LANG_STORAGE_KEY } from '@/i18n/config';
import { equivalentPath } from '@/i18n/routes';

export function LanguageSwitch({ current, label, names }: { current: Lang; label: string; names: Record<Lang, string> }) {
  const pathname = usePathname() ?? '/';
  return (
    <nav aria-label={label}>
      <ul className="flex items-center gap-1 text-sm">
        {LANGS.map((lang) => (
          <li key={lang}>
            {lang === current ? (
              <span aria-current="true" className="rounded-md bg-surface px-2 py-1 font-semibold text-ink">
                {names[lang]}
              </span>
            ) : (
              <Link
                href={equivalentPath(pathname, lang)}
                hrefLang={lang}
                lang={lang}
                className="rounded-md px-2 py-1 text-muted hover:text-ink"
                onClick={() => {
                  try {
                    localStorage.setItem(LANG_STORAGE_KEY, lang);
                  } catch {
                    // Almacenamiento bloqueado: el cambio de idioma funciona igualmente.
                  }
                }}
              >
                {names[lang]}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

`src/components/shell/SiteHeader.tsx`:

```tsx
import Link from 'next/link';
import type { Lang } from '@/core/lang';
import { withBasePath } from '@/core/paths';
import type { Dictionary } from '@/i18n/dictionary';
import { LanguageSwitch } from '@/i18n/LanguageSwitch';
import { homePath } from '@/i18n/routes';

export function SiteHeader({ lang, dict }: { lang: Lang; dict: Dictionary }) {
  return (
    <header className="no-print border-b border-line bg-canvas">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link href={homePath(lang)} aria-label={`${dict.meta.siteName} — ${dict.nav.home}`}>
          {/* next/image no aplica basePath a rutas de cadena en exportación estática. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={withBasePath('/brand/logo.svg')} alt={dict.meta.siteName} width={140} height={44} className="h-9 w-auto" />
        </Link>
        <LanguageSwitch current={lang} label={dict.nav.languageSwitch} names={dict.nav.languageName} />
      </div>
    </header>
  );
}
```

Si en la Tarea 8 el logotipo quedó como PNG, cambia `logo.svg` por `logo.png`.

`src/components/shell/SiteFooter.tsx`:

```tsx
import { BRAND_DOMAIN } from '@/core/brand';
import type { Dictionary } from '@/i18n/dictionary';

export function SiteFooter({ dict }: { dict: Dictionary }) {
  return (
    <footer className="no-print border-t border-line bg-canvas">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm text-muted">
        <p>{dict.footer.tagline}</p>
        <p>{BRAND_DOMAIN}</p>
      </div>
    </footer>
  );
}
```

- [ ] **Step 7: Layout `[lang]`, portada y página de sección**

`src/app/[lang]/layout.tsx`:

```tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SiteFooter } from '@/components/shell/SiteFooter';
import { SiteHeader } from '@/components/shell/SiteHeader';
import { isLang, LANGS } from '@/core/lang';
import { withBasePath } from '@/core/paths';
import { getDictionary } from '@/i18n/dictionary';
import '@/app/fonts.css';
import '@/app/globals.css';

export const dynamicParams = false;

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  const dict = getDictionary(lang);
  return {
    title: { default: dict.meta.homeTitle, template: `%s · ${dict.meta.siteName}` },
    description: dict.meta.homeDescription,
    icons: { icon: withBasePath('/brand/favicon.svg') },
  };
}

export default async function LangLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const dict = getDictionary(lang);
  return (
    <html lang={lang}>
      <body className="min-h-dvh bg-canvas font-ui text-ink antialiased">
        <a href="#contenido" className="no-print sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2">
          {dict.nav.skipToContent}
        </a>
        <SiteHeader lang={lang} dict={dict} />
        <main id="contenido">{children}</main>
        <SiteFooter dict={dict} />
      </body>
    </html>
  );
}
```

`src/app/[lang]/page.tsx`:

```tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isLang } from '@/core/lang';
import { getDictionary } from '@/i18n/dictionary';
import { SECTION_SLUGS, sectionPath, type SectionKey } from '@/i18n/routes';

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const dict = getDictionary(lang);
  const keys = Object.keys(SECTION_SLUGS) as SectionKey[];
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold text-brand-strong">{dict.home.heading}</h1>
      <p className="mt-3 max-w-2xl text-muted">{dict.home.intro}</p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {keys.map((key) => (
          <li key={key} className="rounded-lg border border-line bg-surface p-5">
            <h2 className="text-lg font-semibold">{dict.sections[key].title}</h2>
            <p className="mt-2 text-sm text-muted">{dict.sections[key].description}</p>
            <Link href={sectionPath(lang, key)} className="mt-4 inline-block font-semibold text-brand underline-offset-4 hover:underline">
              {dict.home.open}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

`src/app/[lang]/[section]/page.tsx` (la Tarea 10 lo envuelve en `ToolPageLayout` y la 11 añade la herramienta):

```tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLang } from '@/core/lang';
import { getDictionary } from '@/i18n/dictionary';
import { sectionFromSlug, sectionParams } from '@/i18n/routes';

export const dynamicParams = false;

export function generateStaticParams({ params }: { params: { lang: string } }) {
  return isLang(params.lang) ? sectionParams(params.lang) : [];
}

type Params = Promise<{ lang: string; section: string }>;

async function resolve(params: Params) {
  const { lang, section } = await params;
  if (!isLang(lang)) return null;
  const key = sectionFromSlug(lang, section);
  return key ? { lang, key, dict: getDictionary(lang) } : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const r = await resolve(params);
  return r ? { title: r.dict.sections[r.key].title, description: r.dict.sections[r.key].description } : {};
}

export default async function SectionPage({ params }: { params: Params }) {
  const r = await resolve(params);
  if (!r) notFound();
  const { dict, key } = r;
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="text-2xl font-bold text-brand-strong">{dict.sections[key].title}</h1>
      <p className="mt-2 text-muted">{dict.sections[key].description}</p>
    </div>
  );
}
```

- [ ] **Step 8: Ejecutar pruebas**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e tests/e2e/i18n.spec.ts`
Expected: PASS. Si `link[rel="icon"]` sale con el basePath duplicado (`/fichas/fichas/`), Next.js ya lo prefija: sustituye `withBasePath('/brand/favicon.svg')` por `'/brand/favicon.svg'` y vuelve a ejecutar.

- [ ] **Step 9: Commit**

```bash
git add src/app src/components src/i18n/LanguageSwitch.tsx playwright.config.ts scripts/serve-out.mjs tests/e2e/i18n.spec.ts package.json pnpm-lock.yaml
git commit -m "feat(shell): layout bilingüe con selector de idioma y pruebas end-to-end con basePath"
```

---

### Task 10: Publicidad — `AdSlot`, script de AdSense y layout de página de herramienta

> Antes de editar UI: `craft-floor.md` y `DESIGN.md` (misma nota que la Tarea 9).

**Files:**
- Create: `src/ads/config.ts`, `src/ads/config.test.ts`, `src/ads/env.ts`, `src/ads/AdSlot.tsx`, `src/ads/AdsenseScript.tsx`, `src/components/shell/ToolPageLayout.tsx`, `tests/e2e/ads.spec.ts`, `.env.example`
- Modify: `src/app/[lang]/layout.tsx` (añadir `<AdsenseScript />`), `src/app/[lang]/[section]/page.tsx` (usar `ToolPageLayout`)

**Interfaces:**
- Produces:
  - `@/ads/config`: `type AdFormat = 'sidebar' | 'in-article' | 'anchor'`; `interface AdsEnv` (claves `NEXT_PUBLIC_ADSENSE_CLIENT`, `NEXT_PUBLIC_ADS_PLACEHOLDER`, `NEXT_PUBLIC_ADS_SIDEBAR`, `NEXT_PUBLIC_ADS_IN_ARTICLE`, `NEXT_PUBLIC_ADS_ANCHOR`, `NEXT_PUBLIC_AD_SLOT_SIDEBAR`, `NEXT_PUBLIC_AD_SLOT_IN_ARTICLE`, `NEXT_PUBLIC_AD_SLOT_ANCHOR`, `NODE_ENV`, todas `string | undefined`); `interface AdsConfig { client: string | null; placeholder: boolean; enabled: Record<AdFormat, boolean>; slots: Record<AdFormat, string | null> }`; `AD_BOX: Record<AdFormat, { width: string; height: string; fixedHeight: boolean; media: string | null }>`; `readAdsConfig(env: AdsEnv): AdsConfig`; `isAdVisible(config: AdsConfig, format: AdFormat, slot: string | null): boolean`
  - `@/ads/env`: `adsConfig: AdsConfig`
  - `AdSlot({ slot, format, label, className? })` — raíz `<aside class="ad-slot" data-ad-format>`
  - `AdsenseScript()`
  - `ToolPageLayout({ title, intro, tool, article?, adLabel })` — lienzo `<section data-tool-canvas>`; barra de anclaje `<div data-ad-anchor>`

- [ ] **Step 1: Escribir la prueba de configuración**

`src/ads/config.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { isAdVisible, readAdsConfig } from './config';

const CLIENT = 'ca-pub-1234567890123456';

describe('readAdsConfig', () => {
  it('sin identificador de editor no hay cliente', () => {
    expect(readAdsConfig({ NODE_ENV: 'production' }).client).toBeNull();
  });

  it('rechaza identificadores con formato inválido', () => {
    expect(readAdsConfig({ NEXT_PUBLIC_ADSENSE_CLIENT: 'ca-pub-XXXX', NODE_ENV: 'production' }).client).toBeNull();
    expect(readAdsConfig({ NEXT_PUBLIC_ADSENSE_CLIENT: 'pub-1234567890', NODE_ENV: 'production' }).client).toBeNull();
    expect(readAdsConfig({ NEXT_PUBLIC_ADSENSE_CLIENT: CLIENT, NEXT_PUBLIC_AD_SLOT_SIDEBAR: 'abc', NODE_ENV: 'production' }).slots.sidebar).toBeNull();
  });

  it('acepta identificadores válidos', () => {
    const c = readAdsConfig({ NEXT_PUBLIC_ADSENSE_CLIENT: CLIENT, NEXT_PUBLIC_AD_SLOT_SIDEBAR: '1234567890', NODE_ENV: 'production' });
    expect(c.client).toBe(CLIENT);
    expect(c.slots.sidebar).toBe('1234567890');
  });

  it('marcador visible en desarrollo y en producción solo con la bandera', () => {
    expect(readAdsConfig({ NODE_ENV: 'development' }).placeholder).toBe(true);
    expect(readAdsConfig({ NODE_ENV: 'production' }).placeholder).toBe(false);
    expect(readAdsConfig({ NODE_ENV: 'production', NEXT_PUBLIC_ADS_PLACEHOLDER: 'true' }).placeholder).toBe(true);
  });

  it('anclaje desactivado por defecto; lateral e in-article activados', () => {
    const c = readAdsConfig({ NODE_ENV: 'production' });
    expect(c.enabled).toEqual({ sidebar: true, 'in-article': true, anchor: false });
    expect(readAdsConfig({ NODE_ENV: 'production', NEXT_PUBLIC_ADS_ANCHOR: 'true', NEXT_PUBLIC_ADS_SIDEBAR: 'false' }).enabled).toEqual({ sidebar: false, 'in-article': true, anchor: true });
  });
});

describe('isAdVisible', () => {
  it('requiere formato activado y (anuncio real o marcador)', () => {
    const prodEmpty = readAdsConfig({ NODE_ENV: 'production' });
    expect(isAdVisible(prodEmpty, 'sidebar', null)).toBe(false);

    const dev = readAdsConfig({ NODE_ENV: 'development' });
    expect(isAdVisible(dev, 'sidebar', null)).toBe(true);
    expect(isAdVisible(dev, 'anchor', null)).toBe(false);

    const live = readAdsConfig({ NODE_ENV: 'production', NEXT_PUBLIC_ADSENSE_CLIENT: CLIENT, NEXT_PUBLIC_AD_SLOT_SIDEBAR: '1234567890' });
    expect(isAdVisible(live, 'sidebar', live.slots.sidebar)).toBe(true);
    expect(isAdVisible(live, 'in-article', live.slots['in-article'])).toBe(false);
  });
});
```

- [ ] **Step 2: Ejecutar para verla fallar**

Run: `pnpm test src/ads`
Expected: FAIL — no se resuelve `./config`.

- [ ] **Step 3: Implementar `src/ads/config.ts` y `src/ads/env.ts`**

`src/ads/config.ts`:

```ts
export type AdFormat = 'sidebar' | 'in-article' | 'anchor';

export interface AdsEnv {
  NEXT_PUBLIC_ADSENSE_CLIENT?: string | undefined;
  NEXT_PUBLIC_ADS_PLACEHOLDER?: string | undefined;
  NEXT_PUBLIC_ADS_SIDEBAR?: string | undefined;
  NEXT_PUBLIC_ADS_IN_ARTICLE?: string | undefined;
  NEXT_PUBLIC_ADS_ANCHOR?: string | undefined;
  NEXT_PUBLIC_AD_SLOT_SIDEBAR?: string | undefined;
  NEXT_PUBLIC_AD_SLOT_IN_ARTICLE?: string | undefined;
  NEXT_PUBLIC_AD_SLOT_ANCHOR?: string | undefined;
  NODE_ENV?: string | undefined;
}

export interface AdsConfig {
  client: string | null;
  placeholder: boolean;
  enabled: Record<AdFormat, boolean>;
  slots: Record<AdFormat, string | null>;
}

/** Espacio reservado antes de que cargue el anuncio (evita CLS). */
export const AD_BOX: Record<AdFormat, { width: string; height: string; fixedHeight: boolean; media: string | null }> = {
  sidebar: { width: '300px', height: '600px', fixedHeight: true, media: '(min-width: 1024px)' },
  'in-article': { width: '100%', height: '280px', fixedHeight: false, media: null },
  anchor: { width: '320px', height: '50px', fixedHeight: true, media: '(max-width: 1023.98px)' },
};

const CLIENT_RE = /^ca-pub-\d{10,20}$/;
const SLOT_RE = /^\d{6,20}$/;

const flag = (value: string | undefined, fallback: boolean) => (value === undefined || value === '' ? fallback : value === 'true');
const valid = (value: string | undefined, re: RegExp) => (value && re.test(value.trim()) ? value.trim() : null);

export function readAdsConfig(env: AdsEnv): AdsConfig {
  return {
    client: valid(env.NEXT_PUBLIC_ADSENSE_CLIENT, CLIENT_RE),
    placeholder: env.NODE_ENV !== 'production' || env.NEXT_PUBLIC_ADS_PLACEHOLDER === 'true',
    enabled: {
      sidebar: flag(env.NEXT_PUBLIC_ADS_SIDEBAR, true),
      'in-article': flag(env.NEXT_PUBLIC_ADS_IN_ARTICLE, true),
      anchor: flag(env.NEXT_PUBLIC_ADS_ANCHOR, false),
    },
    slots: {
      sidebar: valid(env.NEXT_PUBLIC_AD_SLOT_SIDEBAR, SLOT_RE),
      'in-article': valid(env.NEXT_PUBLIC_AD_SLOT_IN_ARTICLE, SLOT_RE),
      anchor: valid(env.NEXT_PUBLIC_AD_SLOT_ANCHOR, SLOT_RE),
    },
  };
}

export function isAdVisible(config: AdsConfig, format: AdFormat, slot: string | null): boolean {
  if (!config.enabled[format]) return false;
  return (config.client !== null && slot !== null) || config.placeholder;
}
```

`src/ads/env.ts`:

```ts
import { readAdsConfig } from '@/ads/config';

// Acceso literal a cada variable: Next.js solo inyecta en el cliente las NEXT_PUBLIC_* referenciadas así.
export const adsConfig = readAdsConfig({
  NEXT_PUBLIC_ADSENSE_CLIENT: process.env.NEXT_PUBLIC_ADSENSE_CLIENT,
  NEXT_PUBLIC_ADS_PLACEHOLDER: process.env.NEXT_PUBLIC_ADS_PLACEHOLDER,
  NEXT_PUBLIC_ADS_SIDEBAR: process.env.NEXT_PUBLIC_ADS_SIDEBAR,
  NEXT_PUBLIC_ADS_IN_ARTICLE: process.env.NEXT_PUBLIC_ADS_IN_ARTICLE,
  NEXT_PUBLIC_ADS_ANCHOR: process.env.NEXT_PUBLIC_ADS_ANCHOR,
  NEXT_PUBLIC_AD_SLOT_SIDEBAR: process.env.NEXT_PUBLIC_AD_SLOT_SIDEBAR,
  NEXT_PUBLIC_AD_SLOT_IN_ARTICLE: process.env.NEXT_PUBLIC_AD_SLOT_IN_ARTICLE,
  NEXT_PUBLIC_AD_SLOT_ANCHOR: process.env.NEXT_PUBLIC_AD_SLOT_ANCHOR,
  NODE_ENV: process.env.NODE_ENV,
});
```

- [ ] **Step 4: Ejecutar pruebas**

Run: `pnpm test src/ads`
Expected: PASS.

- [ ] **Step 5: Componentes `AdSlot` y `AdsenseScript`**

`src/ads/AdSlot.tsx`:

```tsx
'use client';

import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { AD_BOX, isAdVisible, type AdFormat } from '@/ads/config';
import { adsConfig } from '@/ads/env';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

// useSyncExternalStore evita setState dentro de efectos (regla react-hooks/set-state-in-effect).
function useMediaQuery(query: string | null): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (query === null) return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => query === null || window.matchMedia(query).matches,
    () => query === null,
  );
}

export function AdSlot({ slot, format, label, className = '' }: { slot: string | null; format: AdFormat; label: string; className?: string }) {
  const box = AD_BOX[format];
  const matches = useMediaQuery(box.media);
  const pushed = useRef(false);
  const live = adsConfig.client !== null && slot !== null;

  useEffect(() => {
    // Solo se solicita el anuncio cuando su contenedor es visible en este viewport (AdSense falla con ancho 0).
    if (!live || !matches || pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle ?? []).push({});
    } catch {
      // Script bloqueado o sin consentimiento: el hueco reservado permanece vacío.
    }
  }, [live, matches]);

  if (!isAdVisible(adsConfig, format, slot)) return null;

  const style = box.fixedHeight ? { width: box.width, maxWidth: '100%', height: box.height } : { width: box.width, minHeight: box.height };

  return (
    <aside aria-label={label} data-ad-format={format} className={`ad-slot ${className}`} style={style}>
      {live ? (
        matches && (
          <ins
            className="adsbygoogle"
            style={{ display: 'block', ...style }}
            data-ad-client={adsConfig.client ?? undefined}
            data-ad-slot={slot ?? undefined}
            {...(format === 'in-article' ? { 'data-ad-layout': 'in-article', 'data-ad-format': 'fluid' } : {})}
          />
        )
      ) : (
        <div aria-hidden="true" className="flex h-full min-h-[inherit] w-full items-center justify-center rounded-md border border-dashed border-line text-xs text-muted">
          {`${label} · ${box.width} × ${box.height}`}
        </div>
      )}
    </aside>
  );
}
```

`src/ads/AdsenseScript.tsx`:

```tsx
import Script from 'next/script';
import { adsConfig } from '@/ads/env';

export function AdsenseScript() {
  if (!adsConfig.client) return null;
  return (
    <Script
      id="adsense"
      strategy="afterInteractive"
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsConfig.client}`}
    />
  );
}
```

- [ ] **Step 6: `ToolPageLayout`**

`src/components/shell/ToolPageLayout.tsx`:

```tsx
import { AdSlot } from '@/ads/AdSlot';
import { isAdVisible } from '@/ads/config';
import { adsConfig } from '@/ads/env';

/**
 * Ubicaciones permitidas (spec §8.2): lateral derecho fuera del lienzo (escritorio), in-article dentro
 * del contenido explicativo (solo si hay contenido) y anclaje inferior (móvil). Nunca dentro de `tool`.
 */
export function ToolPageLayout({ title, intro, tool, article, adLabel }: {
  title: string;
  intro: string;
  tool: React.ReactNode;
  article?: { lead: React.ReactNode; rest: React.ReactNode };
  adLabel: string;
}) {
  const showAnchor = isAdVisible(adsConfig, 'anchor', adsConfig.slots.anchor);
  return (
    <>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section data-tool-canvas aria-labelledby="tool-title" className="min-w-0">
          <h1 id="tool-title" className="text-2xl font-bold text-brand-strong">{title}</h1>
          <p className="mt-2 text-muted">{intro}</p>
          <div className="mt-6">{tool}</div>
        </section>
        <div className="no-print hidden lg:block">
          <AdSlot format="sidebar" slot={adsConfig.slots.sidebar} label={adLabel} />
        </div>
      </div>

      {article && (
        <article className="mx-auto max-w-3xl px-4 pb-16">
          {article.lead}
          <AdSlot format="in-article" slot={adsConfig.slots['in-article']} label={adLabel} className="no-print my-8" />
          {article.rest}
        </article>
      )}

      {showAnchor && (
        <>
          <div aria-hidden="true" className="no-print h-[74px] lg:hidden" />
          <div data-ad-anchor className="no-print fixed inset-x-0 bottom-0 z-40 flex justify-center border-t border-line bg-canvas py-3 lg:hidden">
            <AdSlot format="anchor" slot={adsConfig.slots.anchor} label={adLabel} />
          </div>
        </>
      )}
    </>
  );
}
```

- [ ] **Step 7: Integrar en layout y página de sección**

En `src/app/[lang]/layout.tsx`, importa `import { AdsenseScript } from '@/ads/AdsenseScript';` y añade `<AdsenseScript />` como último hijo de `<body>`, después de `<SiteFooter dict={dict} />`.

Sustituye el `return` de `SectionPage` en `src/app/[lang]/[section]/page.tsx`, e importa `ToolPageLayout`:

```tsx
import { ToolPageLayout } from '@/components/shell/ToolPageLayout';
```

```tsx
  return (
    <ToolPageLayout
      title={dict.sections[key].title}
      intro={dict.sections[key].description}
      adLabel={dict.ads.label}
      tool={null}
    />
  );
```

- [ ] **Step 8: Documentar variables en `.env.example`**

```bash
# ── Rutas ─────────────────────────────────────────────────────────────
# Prefijo de despliegue. Vacío en subdominio; "/fichas" en subdirectorio.
# Se inyecta en el build: cambiarlo exige reconstruir la imagen.
NEXT_PUBLIC_BASE_PATH=

# ── AdSense ───────────────────────────────────────────────────────────
# Identificador de editor (formato ca-pub-XXXXXXXXXXXXXXXX). Vacío = sin script ni anuncios.
# No uses valores de ejemplo: cualquier valor con formato inválido se ignora.
NEXT_PUBLIC_ADSENSE_CLIENT=
# Identificadores numéricos de bloque, creados en el panel de AdSense.
NEXT_PUBLIC_AD_SLOT_SIDEBAR=
NEXT_PUBLIC_AD_SLOT_IN_ARTICLE=
NEXT_PUBLIC_AD_SLOT_ANCHOR=
# Interruptores por formato ("true"/"false"). El anclaje queda apagado hasta revisar la política vigente.
NEXT_PUBLIC_ADS_SIDEBAR=true
NEXT_PUBLIC_ADS_IN_ARTICLE=true
NEXT_PUBLIC_ADS_ANCHOR=false
# "true" muestra marcadores inertes del tamaño exacto en un build de producción (solo pruebas).
NEXT_PUBLIC_ADS_PLACEHOLDER=false
```

- [ ] **Step 9: Escribir la prueba de zonas publicitarias**

`tests/e2e/ads.spec.ts`:

```ts
import { expect, test, type Locator, type Page } from '@playwright/test';

type Box = { x: number; y: number; width: number; height: number };

function rectDistance(a: Box, b: Box): number {
  const dx = Math.max(0, a.x - (b.x + b.width), b.x - (a.x + a.width));
  const dy = Math.max(0, a.y - (b.y + b.height), b.y - (a.y + a.height));
  return Math.hypot(dx, dy);
}

async function box(locator: Locator): Promise<Box> {
  const b = await locator.boundingBox();
  if (!b) throw new Error('Elemento sin caja visible');
  return b;
}

async function expectAdsFarFromActions(page: Page) {
  const actions = page.locator('[data-action]');
  const ads = page.locator('.ad-slot:visible');
  for (let i = 0; i < (await actions.count()); i++) {
    const action = actions.nth(i);
    await action.scrollIntoViewIfNeeded();
    await action.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    const actionBox = await box(action);
    for (let j = 0; j < (await ads.count()); j++) {
      expect(rectDistance(actionBox, await box(ads.nth(j)))).toBeGreaterThanOrEqual(150);
    }
  }
}

test.describe('zonas publicitarias', () => {
  test('escritorio: lateral de 300×600 fuera del lienzo y lejos de las acciones', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('es/sopa-de-letras/');
    const sidebar = page.locator('.ad-slot[data-ad-format="sidebar"]');
    await expect(sidebar).toBeVisible();
    const s = await box(sidebar);
    expect(Math.round(s.width)).toBe(300);
    expect(Math.round(s.height)).toBe(600);
    expect(s.y).toBeLessThan(900);

    const canvas = await box(page.locator('[data-tool-canvas]'));
    expect(rectDistance(s, canvas)).toBeGreaterThan(0);
    await expect(page.locator('[data-tool-canvas] .ad-slot')).toHaveCount(0);
    await expect(page.locator('[data-ad-anchor]')).toBeHidden();
    await expectAdsFarFromActions(page);
  });

  test('móvil 360: sin lateral, anclaje inferior fijo y lejos de las acciones', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('es/sopa-de-letras/');
    await expect(page.locator('.ad-slot[data-ad-format="sidebar"]')).toBeHidden();
    const anchor = page.locator('[data-ad-anchor]');
    await expect(anchor).toBeVisible();
    const a = await box(anchor);
    expect(Math.round(a.y + a.height)).toBe(740);
    await expect(page.locator('[data-tool-canvas] .ad-slot')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
    await expectAdsFarFromActions(page);
  });

  test('ninguna unidad supera tres por vista', async ({ page }) => {
    for (const size of [{ width: 1280, height: 900 }, { width: 360, height: 740 }]) {
      await page.setViewportSize(size);
      await page.goto('es/sopa-de-letras/');
      expect(await page.locator('.ad-slot:visible').count()).toBeLessThanOrEqual(3);
    }
  });
});
```

Nota: en esta fase no hay contenido explicativo, así que la unidad in-article no se renderiza; su prueba de zona se añade en la Fase 5. Las acciones (`[data-action]`) llegan en la Tarea 11; hasta entonces el bucle de acciones no itera.

- [ ] **Step 10: Ejecutar pruebas**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e tests/e2e/ads.spec.ts tests/e2e/i18n.spec.ts`
Expected: PASS.

Comprobación de frontera: crear temporalmente `src/tools/shared/tmp.ts` con `import '@/ads/AdSlot';`, ejecutar `pnpm lint` y ver el error `tools/shared no puede importar ads…`; borrar el fichero.

- [ ] **Step 11: Commit**

```bash
git add src/ads src/components/shell/ToolPageLayout.tsx "src/app/[lang]" tests/e2e/ads.spec.ts .env.example
git commit -m "feat(publicidad): AdSlot con espacio reservado, interruptores por formato y pruebas de zonas prohibidas"
```

---

### Task 11: Ruta de impresión y shell del generador de sopa de letras

> Antes de editar UI: `craft-floor.md` y `DESIGN.md`.

**Files:**
- Create: `src/tools/shared/SheetHeaderFields.tsx`, `src/tools/shared/PaperSelect.tsx`, `src/tools/shared/SheetPreview.tsx`, `src/tools/shared/PrintRoot.tsx`, `src/tools/shared/PrintButton.tsx`, `src/tools/wordsearch/WordSearchTool.tsx`, `src/tools/wordsearch/index.ts`, `tests/e2e/print.spec.ts`
- Modify: `src/app/globals.css` (añadir bloque de impresión al final), `src/app/[lang]/[section]/page.tsx` (pasar la herramienta)

**Interfaces:**
- Consumes: `buildFrame`, `SheetHeader`, `HEADER_LIMITS` (`@/layout/common/frame`); `SheetSvg` (`@/render/svg/SheetSvg`); `SheetDocument` (`@/core/sheet`); `PAPER`, `PaperSize`, `defaultPaperFor` (`@/core/paper`); `Lang`; `Dictionary`.
- Produces:
  - `SheetHeaderFields({ value: SheetHeader; onChange(next: SheetHeader): void; labels: { legend: string; title: string; school: string } })`
  - `PaperSelect({ value: PaperSize; onChange(next: PaperSize): void; labels: { paper: string; a4: string; letter: string } })`
  - `SheetPreview({ doc: SheetDocument; label: string })`
  - `PrintRoot({ doc: SheetDocument; label: string })` — crea `div#print-root` como hijo directo de `body`, marca `html[data-print-sheet="true"]`, mantiene `<style id="print-page-size">`
  - `PrintButton({ label })` — `<button data-action="print">`
  - `WordSearchTool({ lang, labels })` con `labels: { sheet: Dictionary['sheet']; tool: Dictionary['tool'] }`; exportado desde `@/tools/wordsearch`

- [ ] **Step 1: Escribir la prueba de impresión**

`tests/e2e/print.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test.describe('impresión directa', () => {
  test('solo imprime la hoja: sin interfaz, sin anuncios, una página', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('es/sopa-de-letras/');
    await page.getByLabel('Título').fill('Animales de la granja: ñandú');
    await page.getByLabel('Centro o docente').fill('Escuela Nº 5');
    await expect(page.locator('html')).toHaveAttribute('data-print-sheet', 'true');

    await page.emulateMedia({ media: 'print' });
    const visible = await page.evaluate(() =>
      Array.from(document.body.children)
        .filter((el) => getComputedStyle(el).display !== 'none')
        .map((el) => el.id),
    );
    expect(visible).toEqual(['print-root']);
    await expect(page.locator('#print-root svg')).toHaveCount(1);
    await expect(page.locator('#print-root')).toContainText('Animales de la granja: ñandú');
    await expect(page.locator('#print-root')).toContainText('santiceducation.com');
    for (const ad of await page.locator('.ad-slot').all()) await expect(ad).toBeHidden();

    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
    const count = Number(/\/Count (\d+)/.exec(pdf.toString('latin1'))?.[1]);
    expect(count).toBe(1);
  });

  test('el papel elegido fija el tamaño de página', async ({ page }) => {
    await page.goto('es/sopa-de-letras/');
    await page.getByLabel('Papel').selectOption('letter');
    await expect(page.locator('style#print-page-size')).toHaveText(/size:\s*letter/);
    await page.getByLabel('Papel').selectOption('a4');
    await expect(page.locator('style#print-page-size')).toHaveText(/size:\s*A4/);
  });

  test('en páginas sin hoja se imprime el contenido pero no los anuncios', async ({ page }) => {
    await page.goto('es/');
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('header')).toBeHidden();
  });

  test('al salir del generador se retira la marca de impresión', async ({ page }) => {
    await page.goto('es/sopa-de-letras/');
    await expect(page.locator('html')).toHaveAttribute('data-print-sheet', 'true');
    await page.getByRole('link', { name: /Santic Education/ }).first().click();
    await expect(page).toHaveURL(/\/fichas\/es\/$/);
    await expect(page.locator('html')).not.toHaveAttribute('data-print-sheet', 'true');
    await expect(page.locator('#print-root')).toHaveCount(0);
  });
});
```

- [ ] **Step 2: Ejecutar para verla fallar**

Run: `pnpm test:e2e tests/e2e/print.spec.ts`
Expected: FAIL — no existe el campo «Título».

- [ ] **Step 3: CSS de impresión (añadir al final de `src/app/globals.css`)**

```css
#print-root {
  display: none;
}

@media print {
  .no-print,
  .ad-slot,
  ins.adsbygoogle,
  [data-ad-anchor] {
    display: none !important;
  }

  /* Con una hoja montada, todo lo que no sea la hoja desaparece (incluido lo que inyecte AdSense en body). */
  html[data-print-sheet] body > :not(#print-root) {
    display: none !important;
  }

  html[data-print-sheet] body {
    margin: 0;
    background: #fff;
  }

  html[data-print-sheet] #print-root {
    display: block;
  }

  #print-root .print-page {
    overflow: hidden;
    break-after: page;
    page-break-after: always;
  }

  #print-root .print-page:last-child {
    break-after: auto;
    page-break-after: auto;
  }

  #print-root svg {
    display: block;
  }
}
```

- [ ] **Step 4: Componentes compartidos de herramienta**

`src/tools/shared/SheetHeaderFields.tsx`:

```tsx
'use client';

import { HEADER_LIMITS, type SheetHeader } from '@/layout/common/frame';

export function SheetHeaderFields({ value, onChange, labels }: {
  value: SheetHeader;
  onChange: (next: SheetHeader) => void;
  labels: { legend: string; title: string; school: string };
}) {
  return (
    <fieldset className="grid gap-3">
      <legend className="mb-1 text-sm font-semibold">{labels.legend}</legend>
      <label className="grid gap-1 text-sm">
        <span>{labels.title}</span>
        <input
          type="text"
          value={value.title}
          maxLength={HEADER_LIMITS.title}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
          className="rounded-md border border-line bg-surface px-3 py-2 text-base"
          autoComplete="off"
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span>{labels.school}</span>
        <input
          type="text"
          value={value.school}
          maxLength={HEADER_LIMITS.school}
          onChange={(e) => onChange({ ...value, school: e.target.value })}
          className="rounded-md border border-line bg-surface px-3 py-2 text-base"
          autoComplete="organization"
        />
      </label>
    </fieldset>
  );
}
```

`src/tools/shared/PaperSelect.tsx`:

```tsx
'use client';

import type { PaperSize } from '@/core/paper';

export function PaperSelect({ value, onChange, labels }: {
  value: PaperSize;
  onChange: (next: PaperSize) => void;
  labels: { paper: string; a4: string; letter: string };
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span>{labels.paper}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value === 'letter' ? 'letter' : 'a4')}
        className="rounded-md border border-line bg-surface px-3 py-2 text-base"
      >
        <option value="a4">{labels.a4}</option>
        <option value="letter">{labels.letter}</option>
      </select>
    </label>
  );
}
```

`src/tools/shared/SheetPreview.tsx`:

```tsx
import type { SheetDocument } from '@/core/sheet';
import { SheetSvg } from '@/render/svg/SheetSvg';

export function SheetPreview({ doc, label }: { doc: SheetDocument; label: string }) {
  return (
    <div className="grid gap-4">
      {doc.pages.map((page, i) => (
        <div key={i} className="overflow-hidden rounded-sm bg-white shadow-md ring-1 ring-line">
          <SheetSvg paper={doc.paper} page={page} sizing="fluid" label={`${label} ${i + 1}/${doc.pages.length}`} />
        </div>
      ))}
    </div>
  );
}
```

`src/tools/shared/PrintRoot.tsx`:

```tsx
'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { PAPER } from '@/core/paper';
import type { SheetDocument } from '@/core/sheet';
import { SheetSvg } from '@/render/svg/SheetSvg';

// Medio milímetro menos que la hoja física: evita que el redondeo del navegador genere una página en blanco.
const PAGE_SAFETY_MM = 0.5;

const noopSubscribe = () => () => {};

export function PrintRoot({ doc, label }: { doc: SheetDocument; label: string }) {
  // true solo en el cliente tras hidratar; sin setState dentro de efectos.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);

  useEffect(() => {
    document.documentElement.dataset.printSheet = 'true';
    const style = document.createElement('style');
    style.id = 'print-page-size';
    document.head.appendChild(style);
    return () => {
      style.remove();
      delete document.documentElement.dataset.printSheet;
    };
  }, []);

  useEffect(() => {
    const style = document.getElementById('print-page-size');
    if (style) style.textContent = `@page { size: ${PAPER[doc.paper].cssPageSize}; margin: 0; }`;
  }, [doc.paper]);

  if (!mounted) return null;
  const { widthMm, heightMm } = PAPER[doc.paper];
  // El portal inserta #print-root como hijo directo de body, requisito del CSS de impresión.
  return createPortal(
    <div id="print-root">
      {doc.pages.map((page, i) => (
        <div key={i} className="print-page" style={{ width: `${widthMm}mm`, height: `${heightMm - PAGE_SAFETY_MM}mm` }}>
          <SheetSvg paper={doc.paper} page={page} sizing="physical" label={`${label} ${i + 1}`} />
        </div>
      ))}
    </div>,
    document.body,
  );
}
```

`src/tools/shared/PrintButton.tsx`:

```tsx
'use client';

export function PrintButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      data-action="print"
      onClick={() => window.print()}
      className="rounded-md bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-strong"
    >
      {label}
    </button>
  );
}
```

- [ ] **Step 5: Shell del generador**

`src/tools/wordsearch/WordSearchTool.tsx`:

```tsx
'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import type { Lang } from '@/core/lang';
import { defaultPaperFor, type PaperSize } from '@/core/paper';
import type { SheetDocument } from '@/core/sheet';
import type { Dictionary } from '@/i18n/dictionary';
import { buildFrame, type SheetHeader } from '@/layout/common/frame';
import { PaperSelect } from '@/tools/shared/PaperSelect';
import { PrintButton } from '@/tools/shared/PrintButton';
import { PrintRoot } from '@/tools/shared/PrintRoot';
import { SheetHeaderFields } from '@/tools/shared/SheetHeaderFields';
import { SheetPreview } from '@/tools/shared/SheetPreview';

const noopSubscribe = () => () => {};
const browserPaper = () => defaultPaperFor(navigator.languages ?? [navigator.language]);
const serverPaper = (): PaperSize => 'a4';

export function WordSearchTool({ lang, labels }: { lang: Lang; labels: { sheet: Dictionary['sheet']; tool: Dictionary['tool'] } }) {
  const [header, setHeader] = useState<SheetHeader>({ title: labels.sheet.defaultTitle, school: '' });
  // Papel detectado del navegador (A4 en el HTML estático) salvo que el docente elija otro.
  const detectedPaper = useSyncExternalStore(noopSubscribe, browserPaper, serverPaper);
  const [chosenPaper, setPaper] = useState<PaperSize | null>(null);
  const paper = chosenPaper ?? detectedPaper;

  const doc = useMemo<SheetDocument>(() => {
    const frame = buildFrame({ paper, header, role: 'student', labels: { name: labels.sheet.name, date: labels.sheet.date, solutions: labels.sheet.solutions } });
    return { paper, lang, pages: [{ role: 'student', primitives: frame.primitives }] };
  }, [paper, header, lang, labels.sheet]);

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
      <form className="grid content-start gap-5" onSubmit={(e) => e.preventDefault()}>
        <SheetHeaderFields value={header} onChange={setHeader} labels={{ legend: labels.tool.headerLegend, title: labels.tool.titleLabel, school: labels.tool.schoolLabel }} />
        <PaperSelect value={paper} onChange={setPaper} labels={{ paper: labels.tool.paperLabel, a4: labels.tool.paperA4, letter: labels.tool.paperLetter }} />
      </form>
      <div className="grid content-start gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold">{labels.tool.preview}</h2>
          <PrintButton label={labels.tool.print} />
        </div>
        <SheetPreview doc={doc} label={labels.sheet.previewLabel} />
      </div>
      <PrintRoot doc={doc} label={labels.sheet.previewLabel} />
    </div>
  );
}
```

`src/tools/wordsearch/index.ts`:

```ts
export { WordSearchTool } from './WordSearchTool';
```

- [ ] **Step 6: Montar la herramienta en la página de sección**

En `src/app/[lang]/[section]/page.tsx` importa `import { WordSearchTool } from '@/tools/wordsearch';`, cambia la desestructuración a `const { dict, key, lang } = r;` y sustituye `tool={null}` por:

```tsx
      tool={key === 'wordsearch' ? <WordSearchTool lang={lang} labels={{ sheet: dict.sheet, tool: dict.tool }} /> : null}
```

- [ ] **Step 7: Ejecutar pruebas**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e`
Expected: PASS en `i18n`, `ads` (ahora el bucle de acciones comprueba el botón Imprimir) y `print`.
Si `print.spec` cuenta 2 páginas, aumenta `PAGE_SAFETY_MM` a `1` y repite; anota el valor final en el commit.

- [ ] **Step 8: Comprobación manual de impresión**

Run: `pnpm build:e2e && NEXT_PUBLIC_BASE_PATH=/fichas pnpm serve:out` y abre `http://localhost:4173/fichas/es/sopa-de-letras/` en Chrome, Firefox y Safari → Imprimir → vista previa del diálogo.
Expected: una sola hoja con encabezado, líneas de nombre y fecha y pie de marca; sin cabecera web, sin marcadores de anuncio y sin márgenes añadidos por el navegador (desactivar «encabezados y pies de página» si el navegador los añade). Anota diferencias entre navegadores en el informe de cierre.

- [ ] **Step 9: Commit**

```bash
git add src/tools src/app/globals.css "src/app/[lang]/[section]/page.tsx" tests/e2e/print.spec.ts
git commit -m "feat(impresion): ruta de impresión directa con hoja montada en #print-root y tamaño de página por papel"
```

---

### Task 12: Funcionamiento sin red (service worker)

**Files:**
- Create: `scripts/lib/walk.mjs`, `scripts/lib/precache.mjs`, `scripts/lib/precache.test.mjs`, `scripts/sw-template.js`, `scripts/build-sw.mjs`, `src/components/shell/RegisterServiceWorker.tsx`, `tests/e2e/offline.spec.ts`
- Modify: `scripts/build.mjs` (añadir paso), `src/app/[lang]/layout.tsx` (montar el registro)

**Interfaces:**
- Produces: `walk(dir: string): string[]` (rutas relativas POSIX); `precacheUrls(files: string[], basePath: string): string[]`; `out/sw.js` con alcance `<basePath>/`; `RegisterServiceWorker()`.

- [ ] **Step 1: Escribir la prueba de la lista de precarga**

`scripts/lib/precache.test.mjs`:

```js
import { describe, expect, it } from 'vitest';
import { precacheUrls } from './precache.mjs';

describe('precacheUrls', () => {
  const files = ['index.html', 'es/index.html', 'es/sopa-de-letras/index.html', 'es/index.txt', '_next/static/chunks/a.js', '404.html', 'sw.js', 'x.js.br', 'y.css.gz', '.DS_Store'];

  it('convierte index.html en rutas de directorio y aplica el basePath', () => {
    expect(precacheUrls(files, '/fichas')).toEqual([
      '/fichas/',
      '/fichas/es/',
      '/fichas/es/sopa-de-letras/',
      '/fichas/es/index.txt',
      '/fichas/_next/static/chunks/a.js',
      '/fichas/404.html',
    ]);
  });

  it('funciona sin basePath', () => {
    expect(precacheUrls(['index.html', 'a.css'], '')).toEqual(['/', '/a.css']);
  });
});
```

- [ ] **Step 2: Ejecutar para verla fallar**

Run: `pnpm test scripts/lib/precache.test.mjs`
Expected: FAIL — no se resuelve `./precache.mjs`.

- [ ] **Step 3: Implementar utilidades**

`scripts/lib/walk.mjs`:

```js
import { readdirSync } from 'node:fs';
import path from 'node:path';

/** Lista recursiva de ficheros de `dir`, con rutas relativas en formato POSIX. */
export function walk(dir, prefix = '') {
  return readdirSync(path.join(dir, prefix), { withFileTypes: true }).flatMap((entry) => {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    return entry.isDirectory() ? walk(dir, rel) : [rel];
  });
}
```

`scripts/lib/precache.mjs`:

```js
const EXCLUDED = [/^sw\.js$/, /\.(br|gz)$/, /(^|\/)\.DS_Store$/];

export function precacheUrls(files, basePath) {
  return files
    .filter((file) => !EXCLUDED.some((re) => re.test(file)))
    .map((file) => {
      if (file === 'index.html') return `${basePath}/`;
      if (file.endsWith('/index.html')) return `${basePath}/${file.slice(0, -'index.html'.length)}`;
      return `${basePath}/${file}`;
    });
}
```

Run: `pnpm test scripts/lib/precache.test.mjs`
Expected: PASS.

- [ ] **Step 4: Plantilla del service worker `scripts/sw-template.js`**

```js
/* Service worker generado en build. No editar out/sw.js: editar scripts/sw-template.js. */
const VERSION = '__VERSION__';
const BASE = '__BASE__';
const PRECACHE = __PRECACHE__;
const CACHE = `santic-${VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('santic-') && k !== CACHE).map((k) => caches.delete(k)))),
  );
});

function fromCache(request, pathname) {
  return caches
    .match(request, { ignoreSearch: true })
    .then((hit) => hit || caches.match(pathname.endsWith('/') ? pathname : `${pathname}/`, { ignoreSearch: true }))
    .then((hit) => hit || caches.match(`${BASE}/404.html`));
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Nunca intercepta otros orígenes (AdSense) ni rutas fuera de la aplicación.
  if (url.origin !== self.location.origin || !url.pathname.startsWith(`${BASE}/`)) return;

  // Recursos con huella: caché primero.
  if (url.pathname.startsWith(`${BASE}/_next/static/`)) {
    event.respondWith(caches.match(request, { ignoreSearch: true }).then((hit) => hit || fetch(request)));
    return;
  }

  // HTML, cargas RSC y demás: red primero, caché como respaldo sin conexión.
  event.respondWith(fetch(request).catch(() => fromCache(request, url.pathname)));
});
```

- [ ] **Step 5: Generador `scripts/build-sw.mjs`**

```js
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { precacheUrls } from './lib/precache.mjs';
import { walk } from './lib/walk.mjs';

const OUT = 'out';
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').trim().replace(/\/+$/, '');
const files = walk(OUT).sort();
const urls = precacheUrls(files, basePath);

const hash = createHash('sha256');
for (const file of files) hash.update(file).update(readFileSync(path.join(OUT, file)));
const version = hash.digest('hex').slice(0, 12);

const sw = readFileSync('scripts/sw-template.js', 'utf8')
  .replace('__VERSION__', version)
  .replace('__BASE__', basePath)
  .replace('__PRECACHE__', JSON.stringify(urls));

writeFileSync(path.join(OUT, 'sw.js'), sw);
process.stdout.write(`sw.js ${version}: ${urls.length} recursos en precarga\n`);
```

- [ ] **Step 6: Registrar el paso post-build**

En `scripts/build.mjs`, sustituye la declaración de `POST_BUILD_STEPS` por:

```js
const POST_BUILD_STEPS = [
  { name: 'Service worker', cmd: 'node', args: ['scripts/build-sw.mjs'] },
];
```

- [ ] **Step 7: Componente de registro**

`src/components/shell/RegisterServiceWorker.tsx`:

```tsx
'use client';

import { useEffect } from 'react';
import { withBasePath } from '@/core/paths';

export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register(withBasePath('/sw.js'), { scope: withBasePath('/') }).catch(() => {
        // Sin service worker la aplicación sigue funcionando con conexión.
      });
    };
    if (document.readyState === 'complete') {
      register();
      return;
    }
    window.addEventListener('load', register, { once: true });
    return () => window.removeEventListener('load', register);
  }, []);
  return null;
}
```

En `src/app/[lang]/layout.tsx`, importa `import { RegisterServiceWorker } from '@/components/shell/RegisterServiceWorker';` y añade `<RegisterServiceWorker />` justo antes de `<AdsenseScript />`.

- [ ] **Step 8: Escribir la prueba sin red**

`tests/e2e/offline.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('la aplicación funciona sin red tras la primera carga', async ({ page, context }) => {
  await page.goto('es/sopa-de-letras/');
  // `ready` resuelve cuando el SW está activo, es decir, cuando la precarga de install ha terminado.
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sopa de letras');
  await page.getByLabel('Título').fill('Sin conexión');
  await expect(page.locator('[data-tool-canvas] svg').first()).toContainText('Sin conexión');

  await page.getByRole('link', { name: 'English' }).click();
  await expect(page).toHaveURL(/\/fichas\/en\/word-search\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Word search');

  await page.goto('en/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await context.setOffline(false);
});
```

- [ ] **Step 9: Ejecutar pruebas**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e`
Expected: PASS, incluida `offline.spec.ts`. Comprueba además que `out/sw.js` contiene la lista y que no aparece `__PRECACHE__`: `grep -c __PRECACHE__ out/sw.js` → `0`.

- [ ] **Step 10: Commit**

```bash
git add scripts src/components/shell/RegisterServiceWorker.tsx "src/app/[lang]/layout.tsx" tests/e2e/offline.spec.ts
git commit -m "feat(offline): service worker propio con precarga generada en build y respaldo sin conexión"
```

---

### Task 13: Presupuesto de carga, precompresión y red sin terceros

**Files:**
- Create: `scripts/lib/html-assets.mjs`, `scripts/lib/html-assets.test.mjs`, `scripts/budget.mjs`, `scripts/compress.mjs`, `tests/e2e/network.spec.ts`
- Modify: `scripts/build.mjs` (añadir paso de compresión)

**Interfaces:**
- Produces: `firstViewAssets(html: string): { scripts: string[]; styles: string[]; fonts: string[] }`; `cssFontUrls(css: string): string[]`; `detectBasePath(html: string): string`; `resolveAssetPath(url: string, basePath: string, fromFile?: string): string | null`; `pnpm budget` (código de salida 1 si alguna ruta supera 300 KB, falta un recurso o aparece un marcador prohibido); ficheros `.br` y `.gz` junto a los originales en `out/`.

- [ ] **Step 1: Escribir la prueba de extracción de recursos**

`scripts/lib/html-assets.test.mjs`:

```js
import { describe, expect, it } from 'vitest';
import { cssFontUrls, detectBasePath, firstViewAssets, resolveAssetPath } from './html-assets.mjs';

const HTML = `<!DOCTYPE html><html><head>
<link rel="stylesheet" href="/fichas/_next/static/css/a.css" data-precedence="next"/>
<link rel="preload" as="font" href="/fichas/_next/static/media/f.woff2" crossorigin=""/>
<link rel="icon" href="/fichas/brand/favicon.svg"/>
<script src="/fichas/_next/static/chunks/polyfills.js" noModule=""></script>
<script src="/fichas/_next/static/chunks/main.js" async=""></script>
<script src="/fichas/_next/static/chunks/main.js" async=""></script>
<script>self.__next_f=[]</script>
<script src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>
</head></html>`;

describe('firstViewAssets', () => {
  it('excluye scripts noModule e inline y elimina duplicados', () => {
    expect(firstViewAssets(HTML)).toEqual({
      scripts: ['/fichas/_next/static/chunks/main.js', 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'],
      styles: ['/fichas/_next/static/css/a.css'],
      fonts: ['/fichas/_next/static/media/f.woff2'],
    });
  });
});

describe('detectBasePath', () => {
  it('lo deduce del prefijo de _next/static', () => {
    expect(detectBasePath(HTML)).toBe('/fichas');
    expect(detectBasePath('<script src="/_next/static/chunks/x.js"></script>')).toBe('');
  });
});

describe('cssFontUrls', () => {
  it('extrae woff2 con y sin comillas', () => {
    const css = `@font-face{src:url(/fichas/_next/static/media/a.woff2) format("woff2")}@font-face{src:url("../media/b.woff2")}`;
    expect(cssFontUrls(css)).toEqual(['/fichas/_next/static/media/a.woff2', '../media/b.woff2']);
  });
});

describe('resolveAssetPath', () => {
  it('traduce URLs internas a rutas dentro de out/ y descarta externas', () => {
    expect(resolveAssetPath('/fichas/_next/static/chunks/app/%5Blang%5D/page.js?v=1', '/fichas')).toBe('_next/static/chunks/app/[lang]/page.js');
    expect(resolveAssetPath('https://pagead2.googlesyndication.com/x.js', '/fichas')).toBeNull();
    expect(resolveAssetPath('../media/b.woff2', '/fichas', '_next/static/css/a.css')).toBe('_next/static/media/b.woff2');
  });
});
```

- [ ] **Step 2: Ejecutar para verla fallar**

Run: `pnpm test scripts/lib/html-assets.test.mjs`
Expected: FAIL — no se resuelve `./html-assets.mjs`.

- [ ] **Step 3: Implementar `scripts/lib/html-assets.mjs`**

```js
import path from 'node:path';

const unique = (items) => [...new Set(items)];

function attr(attrs, name) {
  const match = new RegExp(`\\b${name}=["']([^"']+)["']`, 'i').exec(attrs);
  return match ? match[1] : null;
}

const tags = (html, tag) => [...html.matchAll(new RegExp(`<${tag}\\b([^>]*)>`, 'gi'))].map((m) => m[1]);

export function firstViewAssets(html) {
  const scripts = tags(html, 'script')
    .filter((attrs) => !/\bnomodule\b/i.test(attrs))
    .map((attrs) => attr(attrs, 'src'))
    .filter(Boolean);
  const links = tags(html, 'link');
  const styles = links.filter((a) => /\brel=["']?stylesheet\b/i.test(a)).map((a) => attr(a, 'href')).filter(Boolean);
  const fonts = links.filter((a) => /\brel=["']?preload\b/i.test(a) && /\bas=["']?font\b/i.test(a)).map((a) => attr(a, 'href')).filter(Boolean);
  return { scripts: unique(scripts), styles: unique(styles), fonts: unique(fonts) };
}

export function detectBasePath(html) {
  const match = /(?:src|href)=["']([^"']*)\/_next\/static\//i.exec(html);
  return match ? match[1] : '';
}

export function cssFontUrls(css) {
  return unique([...css.matchAll(/url\((["']?)([^)"']+\.woff2)\1\)/gi)].map((m) => m[2]));
}

/** Ruta relativa dentro de out/ para una URL de recurso; null si es externa o no pertenece a la app. */
export function resolveAssetPath(url, basePath, fromFile) {
  const clean = url.split(/[?#]/)[0];
  if (/^[a-z]+:/i.test(clean) || clean.startsWith('//')) return null;
  if (clean.startsWith('/')) {
    if (basePath && !clean.startsWith(`${basePath}/`)) return null;
    return decodeURIComponent(clean.slice(basePath.length + 1));
  }
  if (!fromFile) return null;
  return path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), decodeURIComponent(clean)));
}
```

Run: `pnpm test scripts/lib/html-assets.test.mjs`
Expected: PASS.

- [ ] **Step 4: Script de presupuesto `scripts/budget.mjs`**

```js
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { cssFontUrls, detectBasePath, firstViewAssets, resolveAssetPath } from './lib/html-assets.mjs';
import { walk } from './lib/walk.mjs';

const OUT = 'out';
const LIMIT_BYTES = 300 * 1024;
// Marcadores de módulos de carga diferida que no pueden aparecer en JS inicial (Fase 2: pdf-lib).
const FORBIDDEN_INITIAL = ['PDFDocument', 'fontkit'];

const gz = (buf) => gzipSync(buf, { level: 9 }).length;
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
const read = (rel) => readFileSync(path.join(OUT, rel));

let failed = false;
const fail = (msg) => {
  failed = true;
  process.stderr.write(`✗ ${msg}\n`);
};

const pages = walk(OUT).filter((f) => f.endsWith('.html') && f !== '404.html' && !f.startsWith('404/') && !f.startsWith('_not-found/'));
const rows = [];

for (const page of pages) {
  const html = readFileSync(path.join(OUT, page), 'utf8');
  const basePath = detectBasePath(html);
  const { scripts, styles, fonts } = firstViewAssets(html);
  let total = gz(Buffer.from(html));
  let external = 0;

  const account = (url, { compress, fromFile } = { compress: true }) => {
    const rel = resolveAssetPath(url, basePath, fromFile);
    if (rel === null) {
      external += 1;
      return null;
    }
    if (!existsSync(path.join(OUT, rel))) {
      fail(`${page}: recurso inexistente ${url}`);
      return null;
    }
    const buf = read(rel);
    total += compress ? gz(buf) : buf.length;
    return { rel, buf };
  };

  for (const url of scripts) {
    const asset = account(url);
    if (asset) {
      const text = asset.buf.toString('utf8');
      for (const marker of FORBIDDEN_INITIAL) if (text.includes(marker)) fail(`${page}: "${marker}" aparece en el chunk inicial ${asset.rel}`);
    }
  }
  const fontFiles = new Set();
  for (const url of styles) {
    const asset = account(url);
    if (asset) for (const f of cssFontUrls(asset.buf.toString('utf8'))) {
      const rel = resolveAssetPath(f, basePath, asset.rel);
      if (rel) fontFiles.add(rel);
    }
  }
  for (const url of fonts) {
    const rel = resolveAssetPath(url, basePath);
    if (rel) fontFiles.add(rel);
  }
  // Las woff2 ya están comprimidas: cuentan con su tamaño real. Cota superior: todas las del CSS inicial.
  for (const rel of fontFiles) {
    if (existsSync(path.join(OUT, rel))) total += read(rel).length;
    else fail(`${page}: tipografía inexistente ${rel}`);
  }

  rows.push({ page, total, external });
  if (total > LIMIT_BYTES) fail(`${page}: ${kb(total)} supera el presupuesto de ${kb(LIMIT_BYTES)}`);
}

rows.sort((a, b) => b.total - a.total);
for (const r of rows) process.stdout.write(`${kb(r.total).padStart(10)}  ${r.page}${r.external ? `  (+${r.external} externo/s excluido/s)` : ''}\n`);
process.stdout.write(`\nLímite: ${kb(LIMIT_BYTES)} por primera vista (HTML + JS sin noModule + CSS gzip -9, tipografías sin comprimir).\n`);
process.exit(failed ? 1 : 0);
```

Run: `pnpm build && pnpm budget`
Expected: tabla con todas las rutas por debajo de 300 KB y código de salida 0.

- [ ] **Step 5: Comprobar que el presupuesto detecta un exceso**

Run: `node -e "require('fs').appendFileSync('out/_next/static/css/' + require('fs').readdirSync('out/_next/static/css')[0], require('crypto').randomBytes(400*1024).toString('base64'))" && pnpm budget; echo "exit=$?"`
Expected: líneas `✗ … supera el presupuesto` y `exit=1`. Después, `pnpm build` para regenerar `out/`.

- [ ] **Step 6: Precompresión `scripts/compress.mjs`**

```js
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';
import { walk } from './lib/walk.mjs';

const OUT = 'out';
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.txt', '.xml', '.json', '.svg', '.webmanifest', '.ttf', '.otf', '.map']);
const MIN_BYTES = 1024;

let written = 0;
for (const rel of walk(OUT)) {
  if (!COMPRESSIBLE.has(path.extname(rel))) continue;
  const file = path.join(OUT, rel);
  const buf = readFileSync(file);
  if (buf.length < MIN_BYTES) continue;
  const br = brotliCompressSync(buf, { params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_SIZE_HINT]: buf.length } });
  const gz = gzipSync(buf, { level: 9 });
  if (br.length < buf.length) { writeFileSync(`${file}.br`, br); written += 1; }
  if (gz.length < buf.length) { writeFileSync(`${file}.gz`, gz); written += 1; }
}
process.stdout.write(`Precomprimidos: ${written} ficheros .br/.gz\n`);
```

En `scripts/build.mjs`, añade el paso después del service worker:

```js
const POST_BUILD_STEPS = [
  { name: 'Service worker', cmd: 'node', args: ['scripts/build-sw.mjs'] },
  { name: 'Precompresión', cmd: 'node', args: ['scripts/compress.mjs'] },
];
```

Run: `pnpm build && ls out/es/index.html.br out/es/index.html.gz && pnpm budget`
Expected: existen ambos ficheros; el presupuesto sigue en verde (ignora `.br`/`.gz` porque solo recorre `.html`).

- [ ] **Step 7: Escribir la prueba de red**

`tests/e2e/network.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

const PATHS = ['./', 'es/', 'en/', 'es/sopa-de-letras/', 'en/word-search/'];

test('ninguna petición sale del origen propio (sin AdSense configurado)', async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const external = new Set<string>();
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.protocol.startsWith('http') && url.origin !== origin) external.add(url.origin);
  });

  for (const path of PATHS) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
  }
  await page.goto('es/sopa-de-letras/');
  await page.getByLabel('Título').fill('Prueba de red');
  await page.getByLabel('Papel').selectOption('letter');
  await page.waitForLoadState('networkidle');

  expect([...external]).toEqual([]);
});

test('ninguna entrada del usuario aparece en consola ni en peticiones', async ({ page }) => {
  const SENTINEL = 'ZQXCENTINELAÑ';
  const leaks: string[] = [];
  page.on('console', (msg) => { if (msg.text().includes(SENTINEL)) leaks.push(`console: ${msg.text()}`); });
  page.on('request', (request) => {
    if (request.url().includes(SENTINEL) || (request.postData() ?? '').includes(SENTINEL)) leaks.push(`request: ${request.url()}`);
  });

  await page.goto('es/sopa-de-letras/');
  await page.getByLabel('Título').fill(SENTINEL);
  await page.getByLabel('Centro o docente').fill(SENTINEL);
  await page.waitForLoadState('networkidle');

  expect(page.url()).not.toContain(SENTINEL);
  const stored = await page.evaluate(async (s) => {
    const inStorage = JSON.stringify({ ...localStorage }).includes(s);
    let inCache = false;
    for (const key of await caches.keys()) {
      const cache = await caches.open(key);
      for (const req of await cache.keys()) if (decodeURIComponent(req.url).includes(s)) inCache = true;
    }
    return { inStorage, inCache };
  }, SENTINEL);
  expect(stored).toEqual({ inStorage: false, inCache: false });
  expect(leaks).toEqual([]);
});
```

- [ ] **Step 8: Ejecutar todo**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm budget && pnpm test:e2e`
Expected: PASS en todo.

- [ ] **Step 9: Commit**

```bash
git add scripts tests/e2e/network.spec.ts
git commit -m "feat(rendimiento): presupuesto de primera vista, precompresión br/gz y pruebas de red y privacidad"
```

---

### Task 14: Cierre de la Fase 1

**Files:**
- Modify: `CLAUDE.md` (comandos y arquitectura reales)
- Create: `docs/superpowers/reports/2026-09-12-fase-1-cierre.md` (informe de verificación)

- [ ] **Step 1: Verificación completa desde cero**

```bash
rm -rf .next out node_modules/.cache
pnpm install --frozen-lockfile
pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm budget && pnpm test:e2e
NEXT_PUBLIC_BASE_PATH= pnpm build && pnpm budget
```

Expected: todo en verde con basePath `/fichas` (e2e) y vacío (subdominio). Guarda la tabla de `pnpm budget` para el informe.

- [ ] **Step 2: codegraph — dependencias reales frente a las previstas**

```bash
codegraph sync
codegraph callers AdSlot
codegraph callers buildFrame
codegraph callers SheetSvg
codegraph impact readAdsConfig
codegraph explore "dependencias entre core, layout/common, render/svg, tools, ads, i18n y components/shell"
grep -rnE "from '@/(ads|components/shell|content)" src/tools src/render src/layout src/core || echo "sin importaciones prohibidas"
```

Expected (anotar en el informe):
- `AdSlot` solo lo usan `components/shell/ToolPageLayout.tsx`.
- `buildFrame` solo lo usan `tools/wordsearch` y sus pruebas.
- `SheetSvg` solo lo usan `tools/shared` y sus pruebas.
- `readAdsConfig` solo afecta a `ads/env.ts` y sus consumidores (`AdSlot`, `AdsenseScript`, `ToolPageLayout`).
- El `grep` imprime «sin importaciones prohibidas».
Cualquier desviación se corrige antes de continuar.

- [ ] **Step 3: impeccable — una ronda de auditoría y pulido**

1. Lee `.claude/skills/impeccable/reference/audit.md` y ejecútalo sobre `src/app/[lang]` (portada y página de sopa de letras) en escritorio (1280 px) y móvil (360 px), en una única ronda de capturas.
2. Lee `.claude/skills/impeccable/reference/polish.md` y aplica **todas** las correcciones en un solo lote.
3. Una única ronda de confirmación. No iterar más.
4. Vuelve a ejecutar `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e`.

Commit de las correcciones:

```bash
git add -A src public
git commit -m "fix(ui): correcciones de auditoría impeccable de la Fase 1"
```

- [ ] **Step 4: Verificación de restricciones (superpowers `verification-before-completion`)**

Invoca la skill `superpowers:verification-before-completion` y comprueba con evidencias:

| Restricción | Evidencia |
|---|---|
| Procesamiento solo en cliente | Sin `app/api`, sin `fetch` a endpoints propios: `grep -rn "fetch(" src \|\| echo ninguno`; `network.spec` en verde |
| Build estático sin advertencias | Salida de `pnpm build` (el script falla ante advertencias) |
| Impresión limpia | `print.spec` en verde + comprobación manual de la Tarea 11 Step 8 |
| Sin red tras la primera carga | `offline.spec` en verde |
| Sin terceros | `network.spec` en verde |
| Sin datos del usuario en consola, URL, almacenamiento o caché | `network.spec` (centinela) en verde |
| Anuncios fuera de zonas prohibidas | `ads.spec` en verde |
| Presupuesto < 300 KB | Tabla de `pnpm budget` |
| 360 px sin desplazamiento horizontal | `ads.spec` (móvil) en verde |
| codegraph e impeccable ejecutados | Steps 2 y 3 |

- [ ] **Step 5: Actualizar `CLAUDE.md`**

Sustituye la sección «Current state» por los comandos reales (`pnpm dev|build|build:e2e|lint|typecheck|test|test:e2e|budget`, cómo ejecutar una sola prueba: `pnpm test src/core/text.test.ts`, `pnpm test:e2e tests/e2e/print.spec.ts`), y un resumen de arquitectura: webpack obligatorio, dos layouts raíz, ruta única `[lang]/[section]`, fronteras ESLint, `withBasePath` para recursos, `#print-root`, `AdSlot` solo en el shell, variables `NEXT_PUBLIC_*` fijadas en build.

- [ ] **Step 6: Informe y commit**

Escribe `docs/superpowers/reports/2026-09-12-fase-1-cierre.md` con: tabla de presupuesto, resultado de pruebas (número de pruebas unitarias y e2e), salidas relevantes de codegraph, hallazgos y correcciones de impeccable, diferencias de impresión entre navegadores y decisiones no triviales tomadas durante la fase.

```bash
git add CLAUDE.md docs/superpowers/reports
git commit -m "docs(fase-1): informe de cierre y guía actualizada del repositorio"
```

- [ ] **Step 7: Detenerse**

Presenta al operador el resumen del informe y espera su revisión antes de planificar la Fase 2.
