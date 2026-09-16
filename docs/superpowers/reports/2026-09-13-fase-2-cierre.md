# Informe de cierre — Fase 2

- **Rama:** `feat/fase-2` (desde `main` 9eab97c)
- **Plan:** [docs/superpowers/plans/2026-09-13-fase-2-sopa-de-letras.md](../plans/2026-09-13-fase-2-sopa-de-letras.md)
- **Spec:** [docs/superpowers/specs/2026-09-12-generador-fichas-design.md](../specs/2026-09-12-generador-fichas-design.md) (enmiendas en §18)

## Resultado

Generador de sopa de letras completo, 100 % en el navegador:

- **Entrada:** validación de la lista con rechazos por línea que no bloquean, caracteres de control rechazados y tabuladores convertidos en espacios.
- **Generación:** direcciones configurables y sugerencias concretas cuando algo no cabe. La colocación usa backtracking sembrado, cuenta pasos y completa la mejor rejilla parcial; el algoritmo v1 queda congelado con un fixture dorado. Todo corre en un Web Worker con un almacén externo que invalida peticiones obsoletas.
- **Hoja:** maquetación en mm con cuadrícula, lista paginada y página de soluciones con cápsulas, y un encabezado que se ajusta por ancho medido con métricas reales de Andika.
- **Salida:** impresión directa y PDF con pdf-lib cargado bajo demanda, con la tipografía incrustada como subconjunto WOFF.
- **Interfaz «Prueba de imprenta»:** línea de trabajo, marcas de corte y registro, zoom «Ajustar»/100 %, diálogo «Ampliar», cuña de tonos y parte de trabajo plegable en móvil.

## Verificación (desde cero, tras las correcciones finales)

| Comprobación | Resultado |
|---|---|
| `pnpm lint` | 0 errores, 0 advertencias |
| `pnpm typecheck` | sin errores |
| `pnpm test` | 27 ficheros, 196 pruebas en verde |
| `pnpm build` / `pnpm build:e2e` | exportación estática sin advertencias |
| `pnpm test:e2e` (`/fichas`) | 39 pruebas en verde |
| `pnpm test:e2e:root` (basePath vacío) | 1 prueba en verde (redirección, generación y service worker) |
| `pnpm budget` | ruta más pesada 226.1 KB (`es/sopa-de-letras/`, con `/fichas`); portadas 214.5 KB; redirección 136.3 KB; `FontFile2` solo en el fragmento diferido de pdf-lib |

### Criterios de validación de la spec aplicables a la Fase 2

| Criterio | Evidencia |
|---|---|
| PDF con tildes y eñes | `pdf.spec`: pdfjs extrae exactamente «ñandú», «pingüino» y «Ñ»; sin U+FFFD ni caracteres de control; recuento de páginas con pdfjs |
| Impresión limpia | `print.spec`: solo `#print-root`, páginas de alumno y soluciones según parámetros |
| Sin red tras la primera carga | `offline.spec`: generación y vista previa sin red; el fragmento de PDF y las tipografías están precacheados |
| Sin terceros; nada del usuario en consola, URL, almacenamiento, caché o peticiones | `network.spec` con centinela de palabra con Ñ, esperando `serviceWorker.ready`, y revisión de sessionStorage e IndexedDB |
| Cuadrícula usable a 360 px | `wordsearch.spec` (móvil), zoom 100 % y «Ampliar» con desplazamiento hasta el final |
| Anuncios lejos de las acciones | `ads.spec`: en móvil se abre el parte y se miden todos los `[data-action]` |
| Casos límite §5.5 (palabra más larga que la cuadrícula, 1 y 50 palabras, espacios, guiones, no alfabéticos, palabras que no caben con mensaje y sugerencia) | pruebas unitarias de `params`, `suggest`, `place` y `messages`, más `wordsearch.spec` |
| Rendimiento del Worker | prueba de estrés: peor caso 50×16 letras, alfabeto de 2, 25×25, todas las direcciones → ~124 ms (antes 368 ms); 50 palabras aleatorias de 12 → ~67 ms (antes 208 ms) |

## codegraph — dependencias reales frente a la spec §4.3

- `generateWordSearch` → solo `workers/wordsearch` (y pruebas).
- `layoutWordSearch` y `createGenerationClient` → solo `tools/wordsearch`.
- `renderPdf` → solo `import()` en `tools/shared/DownloadPdfButton`.
- `measureTextMm` → `core/measure`, `layout/wordsearch`, `render/pdf`.
- Matriz: `generators`→`core`; `layout/wordsearch`→`core`, `layout/common`, `generators/wordsearch` (tipos); `render/svg` y `render/pdf`→`core`; `workers`→`core`, `generators`; `tools/shared`→`core`, `layout/common`, `render/svg`; `tools/wordsearch`→`core`, `generators`, `i18n`, `layout`, `tools/shared`, `workers`.
- Sin desviaciones.

## impeccable

Finish review en dos rondas sobre el contrato de dirección:

- **Aplicadas** (fa4ff85):
  - Portada con una sopa real de semilla fija.
  - Lista de 5 mm alineada con la cuadrícula y celda máxima de 14 mm.
  - Parte de trabajo plegado en móvil con resumen.
  - Código activo como placeholder con contraste ≥ 4,5:1.
  - Ventana 100 % con borde y barra.
- **Mantenidas según decisión:** banda de cabecera en la página de soluciones, para que la cuadrícula coincida al superponer.
- **Abiertas:**
  - Indicio de desplazamiento en la ventana 100 % cuando el sistema usa barras superpuestas: **decisión del operador**.
  - Anclaje móvil cerca de las acciones: **puerta de Fase 6** antes de activarlo.

El documentador actualizó `DESIGN.md` y `.impeccable/design.json` (9b8e557). El contrato recoge «Estado tras la Fase 2».

## Revisión final de la rama

Revisor con el modelo más capaz sobre 9eab97c..4185a47: **con correcciones**. Seis hallazgos importantes:

1. La clave de generación ignoraba la grafía.
2. «Generar sin estas palabras» borraba por número de línea.
3. La colocación parcial era solo un prefijo.
4. Coste por paso de la colocación.
5. Impresión en Firefox y Safari sin evidencia.
6. Sin fixture dorado de v1.

Una onda de correcciones (f85cf80, 7fdeb65, b23a476, 78888a8, 3d9c845, 028ec34) y re-revisión acotada: **aprobada con menores**. Los menores residuales se corrigieron en dcb47b1 (estado «Generando…» sin desplazar la vista previa, `PrintRoot` memoizado, espacios colapsados al retirar palabras, Imprimir/PDF deshabilitados sin resultado vigente, prueba de estrés con límite amplio en CI). El punto 5 queda para el operador (abajo).

## Decisiones no triviales de la fase

- **Tipografía del PDF:** WOFF con `subset: true` en lugar de conversión a TTF; el subconjunto WOFF2 rompe fontkit.
- **Subconjunto `latin`:** se mantiene. Las palabras con letras sin glifo se rechazan y el encabezado elimina esos caracteres con aviso, así que pantalla, impresión y PDF miden igual.
- **Medida del texto:** métricas de glifos generadas desde el WOFF, con prueba de deriva; Andika no tiene kerning y el SVG lo desactiva.
- **Generación automática:** sin botón «Generar», con debounce de 250 ms. «Nueva sopa» cambia la semilla, e Imprimir y PDF se deshabilitan mientras no hay resultado vigente.
- **Algoritmo v1:** congelado antes de publicar. Los códigos de otra versión se rechazan con mensaje y no llegan al Worker.
- **Cápsulas:** longitud = distancia·celda + anchura; el estadio queda dentro de la casilla final en cualquier ángulo.
- **Un solo PDF:** contiene alumno y soluciones; el nombre es el slug del título sin sufijo.
- **Diálogo «Ampliar»:** «Cerrar» fijo dentro del propio diálogo, que cubre la página sin anuncios.

## Pendiente de comprobación manual del operador (antes de fusionar)

- **Impresión real** en Chrome, Firefox y Safari de una sopa con soluciones, en A4 y Carta. Hay que comprobar tres cosas:
  - cada página del documento es una hoja;
  - no aparecen márgenes añadidos ni encabezados o pies del navegador;
  - cuadrícula, lista y cápsulas no se cortan.
- **Abrir el PDF descargado** en Acrobat Reader y en Vista Previa: tildes, ñ y ü; cápsulas en gris; pie de marca.
- **Decidir** si la ventana 100 % necesita un indicio visible de desplazamiento cuando el sistema oculta las barras.

## Observaciones abiertas para fases siguientes

- Puertas de Fase 6:
  - anclaje móvil cerca de las acciones;
  - pasada e2e con la CSP real;
  - textos de portada que coinciden con lo construido;
  - CI que ejecute `test:e2e:root`.
- La prueba de estrés mide tiempo real (límite 400 ms en local, más amplio en CI).
- `::details-content` muestra el parte sin JS en escritorio. En navegadores sin soporte queda vacío hasta hidratar, que es el comportamiento previo.

## Anexo A — Decisiones (rulings) de la ejecución

Formato: decisión — motivo — coste si es errónea.

**Antes de la ejecución**
- Se sustituye la conversión a TTF de §6.3 por WOFF con `subset: true` — la sonda demostró que WOFF incrusta `FontFile2` y extrae tildes y eñes, y que WOFF2 con subconjunto rompe fontkit — añadir el script de conversión.
- Los caracteres del encabezado sin glifo en Andika latin se eliminan con aviso y la lista rechaza esas líneas — pantalla, impresión y PDF coinciden sin cargar `latin-ext` — los nombres con letras fuera de Latin-1 no aparecen en la ficha.
- «Regenerar» se rotula «Nueva sopa» / «New puzzle» — nombra la acción concreta — cambiar un texto.
- `pnpm dev` se detiene durante la ejecución — `next dev` y `next build` comparten `.next` — el operador no ve la app en vivo hasta el cierre.

**Tarea 6 (maquetación)**
- Longitud de la cápsula = distancia·celda + anchura — el extremo redondeado queda dentro de la casilla final en cualquier ángulo — cápsulas apenas más cortas.
- La prueba de márgenes usa la geometría real del estadio; se corrige un ruling anterior que usaba las esquinas del rectángulo y era erróneo — ninguno.
- La prueba de orden usa una lista fija con el orden español escrito a mano — las del plan no podían fallar — ninguno.

**Plan**
- Se cierra un bloque de código sin terminar al final de la Tarea 9 — la extracción de briefs arrastraba las tareas 10–13 — ninguno.

**Tarea 8 (PDF)**
- Los `rect` con `radius` > 0 se dibujan con esquinas redondeadas — la spec exige geometría idéntica a la vista previa — unas líneas más.
- La conversión de coordenadas va a funciones puras en `render/pdf/geometry.ts`, con pruebas numéricas — probar el PDF exigiría analizar flujos — un módulo pequeño más.

**Tarea 11 (superficie de prueba)**
- Parte de trabajo con `open` controlado: siempre abierto desde 768 px y estado propio en móvil — el `<details open>` estático podía quedar cerrado tras cruzar el punto de corte — unas líneas.
- «Cerrar» fijo dentro del diálogo modal — §7.2 protege frente a clics junto a anuncios y el diálogo cubre la página — cambiar una clase.
- El contenido del diálogo declara `overflow-auto` y la prueba desplaza hasta el final — el desplazamiento dependía del agente de usuario — ninguno.
- `docKey` de las marcas incluye encabezado, papel y soluciones — el contrato pide el paso seco con cualquier parámetro — ninguno.

**Tarea 12 (pruebas)**
- `hasNeedle` decodifica con try/catch y se añade la aguja `qzxnwkj` — un «%» suelto lanzaría URIError dentro del listener — ninguno.

**Tarea 13 (cierre)**
- Se aplican las correcciones #2–#6 del finish review en un lote — ninguno.
- #1, el anclaje móvil cerca de las acciones, no se cambia — el anclaje está desactivado hasta revisar la política de AdSense; se reevalúa en la Fase 6 — activarlo sin ocultarlo cerca de las acciones.
- #8, la banda vacía en la cabecera de soluciones, se mantiene — la cuadrícula coincide al superponer — unos 10 mm en blanco.
- #7, DESIGN.md, lo corrige el documentador — ninguno.
- Los cambios del algoritmo tras la revisión final se quedan en v1 — v1 no está publicada — un código v1 guardado localmente cambiaría de hoja.
- La impresión en Firefox y Safari se asigna al operador antes de fusionar — no hay diálogos reales automatizables — corregir antes de la Fase 3.
- `#808080` de la cuña se documenta como escalón de leyenda — la regla de cuatro grises es de la hoja — una línea en DESIGN.md.
- Las enmiendas de la spec (§18) las redacta el controlador — ninguno.

## Anexo B — Hallazgos menores aplazados y triaje

| Origen | Hallazgo | Triaje |
|---|---|---|
| T1-3 | `fitTextToWidth` puede devolver solo «…» si el ancho es menor que la elipsis | Se traslada (inalcanzable) |
| T1-3 | `clip()` recorta antes de eliminar glifos sin soporte | Se traslada; `clip` ya colapsa espacios |
| T4-5 | Peor caso de candidatos sin prueba de estrés | Corregido (coste por paso y prueba de estrés) |
| T4-5 | Código de otra versión usado con v1 | Corregido (rechazo con mensaje) |
| T6 | `columns ≥ 1` con palabra más ancha que la caja | Se traslada (los espacios colapsados cierran la vía alcanzable) |
| T6 | `buildFrame` recalculado por página | Se traslada |
| T7-9 | Temporizador vencido no puesto a null | Corregido |
| T7-9 | Ramas sin prueba en `messages.test` | Se traslada (barato) |
| T7-9 | Dos frases en inglés mejorables | Fase 5 (pasada de textos) |
| T8 | `strokeWidth` por defecto distinto en PDF y SVG | Corregido (constante compartida) |
| T8 | Precarga de scripts sin excluir `nomodule` | Se traslada |
| T8 | Notación exponencial en rutas | Corregido (3 decimales) |
| T10 | `data-generation` nunca muestra «idle» | Se traslada |
| T10 | Semilla inicial en variable de módulo | Se traslada |
| T10 | Cálculos del encabezado sin memoizar | Se traslada |
| T10 | Comentario perdido sobre el papel detectado | Se traslada |
| T11 | `#808080` fuera de `TONE_HEX` | Documentado en DESIGN.md |
| T11 | setState tras desmontar durante la descarga del PDF | Se traslada |
| T11 | Mensaje sin red elegido solo con `navigator.onLine` | Se traslada |
| T11 | Remontaje del parte al cruzar 768 px quita el foco | Se traslada |
| T11 | Remontaje extra tras hidratar en escritorio | Se traslada; el parte ya se ve sin JS |
| T12 | Contexto del humo sin cerrar en `finally`; 144 sin comentario | Se traslada |
| T13 | El paso seco de registro precede al resultado del Worker | Fase 3/4 |
| T13 | Acciones de la línea de trabajo en fila propia | Fase 3/4 |
| T13 | Techo de mundo (línea de datos en margen, cuña junto a hoja, rol de página) | Fase 3/4 |
| Final | Contención invertida sin aviso | Corregido |
| Final | Tabuladores rechazados; espacios repetidos distintos en SVG y PDF | Corregido |
| Final | Acciones activas durante la generación; sin estado anunciado | Corregido |
| Final | Hoja triplicada en el DOM; diálogo siempre montado | Corregido (diálogo diferido, páginas memoizadas) |
| Final | Parte vacío antes de hidratar en escritorio | Corregido (`::details-content`) |
| Final | Prueba de anuncios sin los botones del parte móvil | Corregido |
| Final | Prueba PDF sin comprobación de glifos | Corregido |
| Final | Plurales y textos del PDF sin conexión | Corregido |
| Final | Worker que lanza al crearse deja `pending` | Corregido |

**Arrastrados del Anexo B de la Fase 1**

| Hallazgo | Triaje |
|---|---|
| `FOOTER_TEXT_SIZE = 2.5` en lugar de `7 * PT_TO_MM` | Se traslada (el PDF ya existe; alinear al tocar el marco en la Fase 3) |
| Contención O(n²) e invertida | Contención invertida corregida; O(n²) irrelevante con ≤ 50 |
| `noscript` con `withBasePath('/es/')` en lugar de `homePath` | Se traslada |
| `mark-gray.svg`, `tabular-nums` global, `apple-touch-icon` | Fase 5 |
| `alt` y `width`/`height` del logotipo | Se traslada |
| Placeholder in-article y borde discontinuo | Fase 5 |
| Rama `live && !matches` de `AdSlot` sin prueba | Fase 6 |
| `PrintRoot` busca `#print-page-size` en cada cambio | Se traslada |
| Aserción de build ante `?`/`#` en nombres de `out/` | Se traslada |
| gzip duplicado en `budget.mjs` y `compress.mjs` | Se traslada |
| Precarga de scripts en el presupuesto; SW listo en la prueba de privacidad; páginas con pdfjs | Corregidos en la Fase 2 |

## Anexo C — Pendientes para el plan de la Fase 3

- Reutilizar `ProofSheet`, `JobLine`, `Docket`, `DownloadPdfButton` y el patrón Worker + almacén externo para el cuadernillo de operaciones. Generalizar el cliente de generación si hace falta, sin campo `kind` (un Worker por generador, §18).
- Los rect de las casillas de operaciones usan `DEFAULT_STROKE_WIDTH_MM` compartido.
- Alinear `FOOTER_TEXT_SIZE` con `7 * PT_TO_MM` al tocar el marco.
- Versión de algoritmo y fixture dorado propios del generador de operaciones.
- Casos límite §5.5: división exacta con rangos incompatibles y más operaciones de las que caben.
- Elementos de techo de mundo aplazados del contrato, si encajan en la nueva superficie.
