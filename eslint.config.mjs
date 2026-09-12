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
