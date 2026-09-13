# Informe de cierre — Fase 1

- **Rama:** `feat/fase-1` (desde `main` 0a0b1ed)
- **Plan:** [docs/superpowers/plans/2026-09-12-fase-1-andamiaje.md](../plans/2026-09-12-fase-1-andamiaje.md)
- **Spec:** [docs/superpowers/specs/2026-09-12-generador-fichas-design.md](../specs/2026-09-12-generador-fichas-design.md)

## Resultado

Andamiaje estático con webpack y `basePath` configurable, núcleo puro (semilla, normalización con Ñ, papel, documento de hoja), marco común de ficha, renderizador SVG, i18n con rutas traducidas y redirección de la raíz, identidad visual «Prueba de imprenta» derivada del logotipo, shell bilingüe, `AdSlot` con zonas controladas, impresión directa, service worker propio, presupuesto de carga, precompresión y pruebas de red y privacidad.

El generador de sopa de letras (cuadrícula, lista, semilla, PDF) es la Fase 2; la página de la herramienta muestra hoy el encabezado y pie comunes de la ficha, los campos de encabezado, el papel, la vista previa y la impresión.

## Verificación (desde cero)

| Comprobación | Resultado |
|---|---|
| `pnpm lint` | 0 errores, 0 advertencias |
| `pnpm typecheck` | sin errores |
| `pnpm test` | 11 ficheros, 83 pruebas en verde |
| `pnpm build` | exportación estática sin advertencias (el script falla ante cualquiera) |
| `pnpm test:e2e` | 17 pruebas en verde: i18n (6), servidor estático (1), zonas publicitarias (3), impresión (4), sin red (1), red y privacidad (2) |

### Presupuesto de primera vista (HTML + JS sin `noModule` + CSS gzip -9 + tipografías del CSS inicial; límite 300 KB)

| Ruta | Sin basePath | `/fichas` |
|---|---|---|
| `es/sopa-de-letras/` | 212.6 KB | 212.9 KB |
| `en/word-search/` | 212.5 KB | 212.9 KB |
| `es/` | 208.1 KB | 208.2 KB |
| `en/` | 208.1 KB | 208.2 KB |
| `/` (redirección) | 135.0 KB | 135.1 KB |

Tras las correcciones de diseño del cierre la ruta más pesada queda en 212.7 KB. Unos 67 KB corresponden a tipografías (Archivo 400/600 y Andika 400/700, subconjunto latin).

### Criterios de validación de la spec aplicables a la Fase 1

| Criterio | Evidencia |
|---|---|
| Build estático sin errores ni advertencias de rutas dinámicas | `scripts/build.mjs` falla ante advertencias; build en verde |
| Impresión limpia, sin interfaz ni anuncios | `print.spec`: solo `#print-root` visible, anuncios ocultos, 1 página; PDF A4 real (locale es-ES): `/Count 1`, MediaBox 594.96 × 841.92 pt, título con «ñandú», pie de marca dentro del margen |
| Funciona sin red tras la primera carga | `offline.spec`: recarga y cambio de idioma sin red, sin peticiones fallidas de `.txt` ni `/_next/`, sin recarga completa |
| Sin llamadas a terceros salvo AdSense | `network.spec`: ningún origen externo (build sin AdSense) |
| Ninguna entrada del usuario en consola, URL, almacenamiento, caché o peticiones | `network.spec` con centinela `ZQXCENTINELAÑ` |
| Anuncios fuera de zonas prohibidas | `ads.spec`: lateral 300×600 fuera del lienzo, anclaje solo en móvil, ≥150 px del botón Imprimir, ≤3 unidades por vista |
| 360 px sin desplazamiento horizontal | `ads.spec` (móvil) |
| Presupuesto < 300 KB | tabla anterior |
| PDF con tildes y eñes | Fase 2 |
| Cuadrícula legible a 360 px | Fase 2 |

## codegraph — dependencias reales frente a la spec §4.3

- `AdSlot` → solo `components/shell/ToolPageLayout`.
- `buildFrame` → `tools/wordsearch/WordSearchTool` (y su prueba).
- `SheetSvg` → `tools/shared/PrintRoot` y `tools/shared/SheetPreview` (y su prueba).
- `PrintRoot` → `tools/wordsearch/WordSearchTool`; `WordSearchTool` → `app/[lang]/[section]/page.tsx` a través de `tools/wordsearch/index.ts`.
- `readAdsConfig` → `ads/env.ts` y pruebas.
- Matriz de importaciones: `core`→`core`; `layout/common`→`core`; `render/svg`→`core`; `i18n`→`core`, `i18n`; `ads`→`ads`; `tools/shared`→`core`, `layout/common`, `render/svg`; `tools/wordsearch`→`core`, `i18n`, `layout/common`, `tools/shared`; `components/shell`→`ads`, `core`, `i18n`; `app`→`ads`, `components/shell`, `core`, `i18n`, `tools/wordsearch`.
- Sin desviaciones. La portada (`app/[lang]/page.tsx`) añadió después `layout/common` y `render/svg` para las pruebas de hoja, permitido para `app`.

## impeccable

1. `init` → `PRODUCT.md` con respuestas del operador (terracota como variante puntual, voz impersonal, herramienta independiente).
2. `new-work` → tirada `concept-seed` a68aa808; el operador eligió «Prueba de imprenta» en la página de decisión; contrato de dirección en `.impeccable/surfaces/src-app-lang-section-page-tsx.md`.
3. Finish review (dos rondas, disposición final *fix* con un único punto documental ya resuelto):
   - Resueltas: portada como pruebas de hoja en lugar de tarjetas; parte de trabajo sin estirar (~22 rem); leyenda como encabezado de sección y «Papel» en grupo propio; escala del h1 y `font-semibold` (Archivo 700 no se carga); pie pegado al fondo; evidencia de impresión A4.
   - Según decisión: textos de portada e introducción que describen funciones de Fases 2–4 (condición: nada se despliega antes de la Fase 6).
   - Registradas como aplazamientos a Fase 2 en el contrato: marcas de corte y registro, línea de trabajo con semilla y páginas, zoom nombrado y «Ampliar», parpadeo de registro, cuña de grises, parte plegable en móvil, acción secundaria PDF.
4. Documentador → `DESIGN.md` y `.impeccable/design.json` derivados del código construido. Nombre del sistema y resumen marcados como provisionales hasta confirmación del operador.

## Decisiones no triviales de la fase

- Build con webpack: Turbopack no compila Workers declarados con `new URL()`.
- `pnpm-workspace.yaml` con `allowBuilds: { unrs-resolver: false }` para que los scripts de pnpm 11 funcionen.
- Tipografías solo con subconjunto `latin` (el `latin-ext` de Andika añadía 163 KB); letras fuera de Latin-1 usarán la tipografía de reserva tanto en pantalla como en impresión directa.
- Isotipo con proporción común 1.127 fijada por el PNG de 2481 px; SVG con viewBox ajustado.
- Columna lateral de anuncios solo cuando el anuncio lateral es visible (constante de build, sin CLS).
- Servidor estático de pruebas endurecido (contención por separador de ruta, 400 ante URL mal codificada).
- Precarga del service worker con `encodeURI`: las rutas `[lang]` llegan codificadas y los ficheros RSC con tokens `$` sin codificar.
- Prueba del tamaño de página con `expect.poll(textContent)`: `toHaveText` lee `innerText` vacío en `<style>`.

## Pendiente de comprobación manual del operador

- Diálogo de impresión real en Chrome, Firefox y Safari (una hoja, sin márgenes añadidos; desactivar encabezados y pies del navegador si aparecen).

## Observaciones abiertas para fases siguientes

- El arranque del `webServer` de Playwright se colgó una vez sin causa confirmada; no se reprodujo después.
- Menores aplazados en el registro de progreso: detección de scripts cargados solo por `preload` en el presupuesto (revisar al dividir pdf-lib), espera explícita a la precarga del SW en la prueba de privacidad, versalitas técnicas en etiquetas, conteo de páginas por regex sobre el PDF.

## Anexo A — Decisiones (rulings) de la ejecución

Toda decisión con `Ruling:` registrada en `.superpowers/sdd/2026-09-12-fase-1-andamiaje/progress.md` (ledger sin versionar), en el orden en que se tomaron, con qué se decidió, por qué y el coste si resultara errónea.

- **Pre-flight — rama de trabajo en vez de worktree.** Se trabaja en la rama `feat/fase-1` dentro del directorio de trabajo en lugar de un worktree, porque las skills de impeccable y su hook están sin versionar en `.claude/` y dependen de `CLAUDE_PROJECT_DIR`, que un worktree no tendría. Coste si es erróneo: ninguno funcional; menor aislamiento frente a cambios accidentales en `main`.
- **Pre-flight — Tarea 8 a cargo del controlador.** La Tarea 8 la ejecuta el controlador de la sesión y no un subagente, porque `init` de impeccable pregunta al operador y los subagentes no pueden hacerlo; el plan ya lo advertía. Coste si es erróneo: contexto del controlador más cargado; se mantiene la revisión por subagente de su diff.
- **Pre-flight — `.env.example` adelantado a la Tarea 10.** Se crea en la Tarea 10 aunque la spec lo sitúa en la Fase 6, porque las variables de publicidad existen desde esta fase y deben documentarse donde nacen; la Fase 6 lo amplía. Coste si es erróneo: nulo.
- **Tarea 1 — `pnpm-workspace.yaml` con `allowBuilds: { unrs-resolver: false }`.** Se versiona con esa decisión porque pnpm 11 aborta `pnpm test|build|lint` si queda pendiente; `unrs-resolver` usa binarios precompilados de dependencias opcionales y no necesita su postinstall. Coste si es erróneo: si el resolver de importaciones de ESLint no carga, `pnpm lint` fallará y habrá que cambiar a `true`.
- **Tarea 1 — dos menores entran en la ronda de corrección.** `globalIgnores` de carpetas de herramientas y el `default export` anónimo de `postcss.config.mjs` se corrigen de inmediato, porque el plan exige salida limpia de lint en cada tarea y 377 avisos ajenos ocultarían avisos reales. Coste si es erróneo: una edición trivial extra.
- **Tareas 5-6 — aserción de `rect` añadida en `SheetSvg.test.tsx`.** Se añade aunque el plan no la incluye, porque la spec exige que vista previa, impresión y PDF compartan geometría y el SVG debe probarse para todas las primitivas. Coste si es erróneo: una aserción extra.
- **Tarea 8 — `DESIGN.md` se escribe al cierre de fase, no en la Tarea 8.** En la Tarea 8 se registra el contrato de dirección en el surface brief, porque `new-work.md` de impeccable prohíbe escribir `DESIGN.md` antes de construir un mundo nuevo, y la instrucción del operador es seguir la definición real de cada skill. Coste si es erróneo: `DESIGN.md` llega en la Tarea 14 en lugar de en la Tarea 8.
- **Tarea 8 — ruta code-led para las imágenes.** Se decide porque el contexto de impeccable no informa de generación de imágenes (solo `cwebp`/`sips`). Coste si es erróneo: ninguno; no hay alternativa.
- **Tarea 8 — tipografías solo con subconjunto `latin` (contra la spec §7.1).** Español e inglés solo usan Latin-1 (Ñ, Á…Ú, Ü, ¿¡) y las comillas/guiones de U+2000–206F están incluidos en `latin`; `latin-ext` de Andika suma 163 KB y el presupuesto cuenta todas las woff2 del CSS inicial. Coste si es erróneo: un nombre o título con letras fuera de Latin-1 (p. ej. «Łódź») se verá con tipografía de reserva en pantalla; el PDF de Fase 2 debe decidir su propio subconjunto.
- **Tarea 8 — tipografía de interfaz Archivo 400/600, de ficha Andika 400/700.** Andika está diseñada para alfabetización (a y g de un piso); Archivo es grotesca técnica con cifras tabulares, coherente con la dirección y fuera de la lista de fuentes por defecto de impeccable. Coste si es erróneo: cambio de dos imports y dos tokens.
- **Tarea 8 — `PRODUCT.md` sin los modos Operate/Read.** `PRODUCT.md` enumera las superficies (portada, páginas de generador, páginas de contenido) sin los modos Operate/Read, contra el brief, porque `reference/init.md` de impeccable excluye el modo de visitante de `PRODUCT.md`; los modos ya están en el surface brief. Coste si es erróneo: trasladar una línea.
- **Tarea 8 — proporción del isotipo fijada por el PNG.** La proporción la fija el PNG (676×600 → 1.127, derivado del arte a 2481 px); el viewBox de `mark-gray.svg` y `favicon.svg` se amplía horizontalmente a `9.525 13.5 160.55 142.5` y `BRAND_MARK_ASPECT = 1.127`, porque el PNG es la fuente más fiel y el que usará pdf-lib. Coste si es erróneo: 1,5 unidades de margen lateral extra en el SVG.
- **Tarea 9 — endurecer `scripts/serve-out.mjs` más allá del plan.** Se añade comprobación de contención con separador de ruta y captura de `URIError` con respuesta 400, aunque el plan lo dicta literal, porque la spec exige pruebas fiables y una caída del servidor invalida toda la ejecución de Playwright. Coste si es erróneo: unas líneas extra en un script de pruebas.
- **Tarea 10 — columna lateral de anuncio condicional.** La columna de 300 px y su contenedor solo se renderizan cuando `isAdVisible(adsConfig, 'sidebar', adsConfig.slots.sidebar)` es cierto (sin anuncio el lienzo ocupa todo el ancho), en vez de reservarla siempre como preveía el plan, porque `isAdVisible` se resuelve en build y por tanto no hay CLS. Coste si es erróneo: el lienzo cambia de ancho entre builds con y sin AdSense.
- **Tarea 11 — prueba de tamaño de página con `expect.poll`.** Se usa `expect.poll(() => locator.textContent())` en lugar de `toHaveText`, porque `innerText` de `<style>` siempre es vacío y la aserción del plan nunca podía pasar. Coste si es erróneo: ninguno; sigue comprobando el contenido real.
- **Tarea 11 — aplazamiento de elementos del contrato de dirección a la Fase 2.** Marcas de corte, cruces de registro, línea de trabajo con semilla y páginas, zoom «Ajustar / 100 %» y «Ampliar» se aplazan porque dependen de semilla, paginación y generador que no existen en Fase 1; el encargo los excluyó expresamente y el finish review de impeccable los auditará cuando existan. Coste si es erróneo: la auditoría de impeccable del cierre de Fase 1 verá una superficie más sobria que el contrato.
- **Tarea 12 — codificación de rutas de precarga con `encodeURI`.** Se mantiene la desviación del plan (que era erróneo: `[lang]` llega codificado como `%5Blang%5D`) pero con `encodeURI` sobre la ruta relativa en lugar de `encodeURIComponent` por segmento, porque este último codifica `$` y los ficheros RSC `__next.$d$lang…txt` se piden sin codificar, lo que rompería la navegación en cliente sin red. Coste si es erróneo: algún carácter que `encodeURI` deje literal y Next codifique quedaría fuera de caché; lo detecta la prueba e2e reforzada.
- **Tarea 14 — correcciones 1–5 del finish review aplicadas en un lote.** Portada como prueba de hoja por generador, panel sin estirar y ~22 rem, jerarquía de la leyenda y grupo Papel, escala del h1 y `font-semibold`, pie pegado al fondo. El ledger no registra un porqué ni un coste explícitos para esta decisión puntual.
- **Tarea 14 — cuña de grises y parte plegable móvil aplazados a Fase 2.** La cuña es leyenda de tonos y en Fase 1 la hoja solo usa el marco; el parte plegable solo tiene sentido con la lista de palabras y las opciones del generador. Coste si es erróneo: la superficie de Fase 1 sigue más sobria que el contrato.
- **Tarea 14 — se mantienen los textos que describen funciones de Fase 2.** PDF, vocabulario y soluciones siguen descritos en portada e introducción porque nada se publica antes de la Fase 6 y para entonces serán ciertos. Coste si es erróneo: un despliegue anticipado mostraría promesas no cumplidas.
- **Tarea 14 — evidencia de impresión A4 generada por el controlador con locale `es-ES`.** La del implementador había salido en Carta por el locale `en-US` del Chromium sin cabeza. Coste: ninguno.
- **Tarea 14 — `CLAUDE.md` e informe de cierre redactados por el controlador.** No los redacta un implementador porque son documentación de cierre que depende del registro completo de la fase; los cubre la revisión final de la rama. Coste si es erróneo: menos independencia en esos dos ficheros.
- **Revisión final — corrección de #1–#4 antes de fusionar.** Se corrigen: #2 (este anexo versionado con rulings y menores triados en el informe), #3 (basePath normalizado una vez para todos los scripts), #1 con límite provisional (`HEADER_LIMITS.title = 40` hasta que la Fase 2 mida con métricas reales; test de frame ajustado) y #4 como enmienda de spec (`style-src 'self' 'unsafe-inline'`); también enmiendas de spec §10 (activación del SW), §7.1 (subconjuntos) y §7.2 (columna lateral), corrección de `DESIGN.md` (mayúsculas con tracking, no versalitas) y endurecimientos baratos (replacer como función en `build-sw`, `autoComplete="off"`, manejador de error del stream en `serve-out`, `stdin 'ignore'` en `build.mjs`). Todos son pequeños y evitan fallos silenciosos o pérdida de decisiones. Coste si es erróneo: un límite de título más estricto de lo necesario durante la Fase 1.
- **Revisión final — el resto de menores se traslada al plan de Fase 2.** Según el triage del revisor, listado en el Anexo B de este informe, porque no afectan a lo construido y dependen de piezas de Fase 2 (métricas, pdf-lib, generador). Coste si es erróneo: ninguno inmediato.

## Anexo B — Hallazgos menores aplazados y triaje

Todo hallazgo `minor (deferred)` o `concern` del ledger, con el veredicto de triaje del revisor final de la rama.

| Origen | Hallazgo | Triaje |
|---|---|---|
| T1 | `BASE_PATH` en `src/core/paths.ts` no normaliza si lo importa código fuera del build de Next (hoy sin consumidores de ese tipo). | Corregido en esta tanda (basePath normalizado en todos los scripts). |
| T2-4 | Comprobación de contención O(n²) en `src/core/text.ts` (irrelevante con ≤50 palabras). | Se traslada; revisar también la contención invertida cuando existan palabras invertidas. |
| T5-6 | `FOOTER_TEXT_SIZE = 2.5` escrito a mano en lugar de `7 * PT_TO_MM`; `PT_TO_MM` sin uso. | Se traslada; alinear con `7 * PT_TO_MM` en el renderizador de PDF. |
| T5-6 | Título de soluciones «título — Soluciones» puede superar 80 caracteres tras el sufijo (sin prueba). | Superado por el ajuste de título según ancho medido (Fase 2). |
| T7 | `noscript` de `(root)/page.tsx` usa `withBasePath('/es/')` en lugar de `homePath('es')` (mandatado por el plan). | Se traslada. |
| T8 | `mark-gray.svg` con `role="img"` y `<title>`; en el pie podría anunciarse dos veces (en `<image href>` no se expone al árbol de accesibilidad). | Se traslada (metadatos de Fase 5), junto con `tabular-nums` global y `apple-touch-icon`. |
| T8 | `font-variant-numeric: tabular-nums` global en `:root`. | Se traslada (metadatos de Fase 5). |
| T8 | `img/apple-touch-icon.png` sin referenciar (previsto para metadatos de Fase 5). | Se traslada (metadatos de Fase 5). |
| T9 | `alt` del logotipo redundante con el `aria-label` del enlace. | Se traslada, junto con el desajuste de `width`/`height`. |
| T9 | Atributos `width`/`height` del logo (140×44) difieren 0,5 % de la proporción real 418×132. | Se traslada. |
| T10 | Placeholder in-article no centra verticalmente (`h-full` contra padre con `min-height`); revisar en Fase 5. | Fase 5, junto con el borde discontinuo. |
| T10 | Rama `live && !matches` de `AdSlot` sin prueba unitaria aislada. | Fase 6. |
| T10 | Borde discontinuo del placeholder a revisar en el finish review de impeccable. | Fase 5. |
| T11 | `PrintRoot` vuelve a buscar `#print-page-size` en cada cambio de papel en lugar de guardarlo en una ref. | Se traslada. |
| T11 | Etiquetas en mayúsculas en lugar de versalitas técnicas. | Corregido en esta tanda: `DESIGN.md` describe lo que el código realmente hace (mayúsculas con tracking, no versalitas). |
| T11 | Conteo de páginas por regex `/Count` sobre bytes del PDF, frágil ante flujos de objetos comprimidos. | Cambiar a `pdfjs-dist` en Fase 2. |
| T11 | Concern: el cuelgue del `webServer` de Playwright no se reprodujo (`i18n.spec` completa en ~14,5 s); causa sin confirmar. | `stdin: 'ignore'` aplicado a los hijos de `scripts/build.mjs` en esta tanda; vigilar recurrencia. |
| T12 | La prueba e2e sin red no ejerce los ficheros RSC con tokens `$` (la navegación pide `index.txt`); el caso queda cubierto por prueba unitaria. | Se traslada (cubierto por prueba unitaria). |
| T12 | `encodeURI` deja literales `; , ? : @ & = + #`; ningún fichero exportado los usa hoy. | Se traslada: aserción en build que falle si aparece `?` o `#` en nombres de fichero de `out/`. |
| T13 | Presupuesto no detecta scripts cargados solo por `<link rel="preload" as="script">` (hoy no ocurre); revisar al dividir pdf-lib en Fase 2. | Tarea explícita de Fase 2 antes de dividir pdf-lib. |
| T13 | gzip duplicado en `budget.mjs` y `compress.mjs`; opción `compress` sin uso en `account()`. | Se traslada. |
| T13 | La prueba de privacidad no espera a que el SW termine la precarga antes de revisar Cache Storage (hoy el SW nunca escribe en caché en tiempo de ejecución). | Obligatorio en Fase 2: esperar `serviceWorker.ready` y comprobar también `sessionStorage` e `IndexedDB`. |

## Anexo C — Pendientes para el plan de la Fase 2

- Ajuste de título según ancho medido con métricas reales de la tipografía de ficha en `core` (reducir tamaño o partir en líneas, también en el PDF) y una prueba de frame sobre el ancho medido.
- Patrón ESLint `^@/render/pdf` en `tools` para prohibir imports estáticos (el `import()` dinámico sigue permitido).
- Detección en el presupuesto de scripts cargados solo por precarga (`preload`).
- Prueba de privacidad que espere a la precarga del service worker.
- Conteo de páginas del PDF con `pdfjs-dist`.
- Incluir la Ñ en el alfabeto de relleno en inglés cuando alguna entrada contenga Ñ.
- Semilla canónica a partir de la salida de `formatSeedCode`.
- Rechazar caracteres de control antes de normalizar (marcador U+0001).
- Proyecto de humo e2e con basePath vacío.
- Duplicación del DOM de `PrintRoot` con cuadrículas grandes.
- Los aplazamientos de Fase 2 ya registrados en el contrato de dirección: marcas de corte, línea de trabajo, zoom, cuña de grises, parte de trabajo plegable en móvil, acción secundaria de PDF.
- Decisión de subconjunto `latin-ext` de tipografías.

Para fases posteriores: página 404 localizada (Fase 5; también es el respaldo sin conexión del SW); puerta explícita antes de desplegar que compruebe que los textos de portada/introducción coinciden con las funciones ya construidas (Fase 6); pasada e2e con la CSP real (Fase 6).
