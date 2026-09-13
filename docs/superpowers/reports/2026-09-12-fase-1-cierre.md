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
- Tipografías solo con subconjunto `latin` (el `latin-ext` de Andika añadía 163 KB); letras fuera de Latin-1 usarán la tipografía de reserva en pantalla.
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
