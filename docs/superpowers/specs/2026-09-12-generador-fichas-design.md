# Generador de fichas imprimibles — Especificación de diseño

- **Fecha:** 2026-09-12
- **Estado:** diseño aprobado por secciones en Fase 0; pendiente de revisión de este documento.
- **Proyecto:** primera micro-aplicación del ecosistema santiceducation.com.

## 1. Alcance

Aplicación web estática, bilingüe (español e inglés), que permite a docentes generar tres tipos de material imprimible con vista previa inmediata, hoja de soluciones, impresión directa desde el navegador y descarga en PDF:

1. Sopa de letras.
2. Crucigrama.
3. Cuadernillo de operaciones aritméticas.

**Fuera de alcance (explícito):** cualquier cuarto tipo de material; plantillas de caligrafía o numeración punteada (la tipografía punteada queda descartada); base de datos, backend, rutas de API, autenticación, analítica de terceros; persistencia del estado del generador en URL o almacenamiento; generación masiva de páginas de contenido.

## 2. Decisiones cerradas en Fase 0

| Tema | Decisión |
|---|---|
| Arquitectura | Modelo de hoja intermedio en milímetros consumido por dos renderizadores (SVG y PDF). Generación en Web Worker. |
| Idiomas | `es` y `en`, rutas con prefijo `/es` y `/en`, detección del idioma del navegador en la raíz, selector que conduce a la página equivalente. |
| Mercado | Global. Papel A4 o Carta seleccionable, valor por defecto según la región del navegador. |
| Tildes en cuadrícula | Se eliminan tildes y diéresis; la Ñ se conserva como letra propia. Listados y definiciones conservan la ortografía original. |
| Tipografía punteada | Descartada. |
| Consentimiento UE/EEE | CMP de Google («Privacidad y mensajes» de AdSense), configurada en el panel. Se acepta `fundingchoicesmessages.google.com` como parte de la excepción de AdSense. |
| Anclaje móvil | Implementado, desactivado por defecto (`NEXT_PUBLIC_ADS_ANCHOR=false`) hasta revisar la política vigente de AdSense tras la aprobación. |
| Páginas de ejemplo | 2 temas × 2 idiomas, enlazados por hreflang. |
| Páginas legales | Privacidad, Acerca de y Contacto: plantillas sin texto inventado; el build de producción falla si faltan los datos. |
| Autor | Datos reales aportados por el operador antes de la Fase 5; el build de producción falla si faltan. |
| Despliegue | Subdominio (basePath vacío, configurable). Imagen privada en GHCR; el VPS solo descarga y arranca. |
| VPS | 4 vCPU / 8 GB, compartido con Moodle en producción. |
| Crucigrama | Colocación propia como opción preferente (ver §5.3); evaluación de `crossword-layout-generator` con los mismos casos de prueba en la Fase 4 y justificación en el comentario del módulo. |
| Gestor de paquetes / runtime | pnpm, Node 24 (build). Next.js 16, Tailwind CSS 4, TypeScript estricto. |

## 3. Uso de las skills

| Skill | Naturaleza real | Aplicación en el flujo |
|---|---|---|
| superpowers | Conjunto de skills de proceso. | Fase 0: `brainstorming` → esta spec → `writing-plans`. Fases 1–6: TDD en toda la lógica pura; `verification-before-completion` al cierre de cada fase. |
| codegraph | Índice de código consultable (CLI `codegraph` y MCP), no una skill de diseño. | La estructura se diseña en esta spec (§4). Codegraph se usa al cierre de cada fase (`sync`, `explore`, `callers`, `impact`) para contrastar dependencias reales con las previstas. La prevención la aplica ESLint (§4.3). |
| impeccable | Skill de diseño de interfaz que exige contexto y dirección antes de editar la UI. | Fase 1: `init` (PRODUCT.md) y dirección visual (DESIGN.md) desde el logotipo, antes de construir UI; lectura de `craft-floor.md` antes de cada edición de UI. Cierre de cada fase: una ronda acotada de `audit` + `polish` (escritorio y 360 px), correcciones en un solo lote. Su hook de detección ya está activo en cada Edit/Write. |

## 4. Arquitectura

### 4.1 Principio

Cada generador produce **datos puros** (sin React, DOM ni PDF). Una capa de maquetación los convierte en un **documento de hoja** (`SheetDocument`): páginas con primitivas geométricas en milímetros y la paginación ya resuelta. Dos renderizadores lo consumen sin conocer el generador de origen:

- `render/svg` → vista previa e impresión directa (mismo SVG).
- `render/pdf` → PDF con pdf-lib y @pdf-lib/fontkit, cargado con `import()` solo al pulsar «Descargar PDF».

Consecuencia: vista previa, impresión y PDF comparten una única fuente de verdad geométrica y de corte de página.

### 4.2 Módulos

```
img/                     Material de marca original aportado por el operador
public/brand/            Derivados del logotipo (isotipo, favicon, versión gris para el pie)
public/fonts/pdf/        Tipografías TTF para PDF, con huella en el nombre (generadas en build)
src/
  core/                  PRNG con semilla, normalización por idioma, papel, tipos de SheetDocument
  generators/
    wordsearch/          Validación + colocación con retroceso
    crossword/           Validación + colocación con maximización de cruces
    arithmetic/          Validación + generación de operaciones
  layout/                Resultado de generador → SheetDocument (wordsearch/, crossword/, arithmetic/ + common/ con encabezado, pie y paginación)
  render/
    svg/                 SheetDocument → SVG
    pdf/                 SheetDocument → PDF (carga diferida)
  workers/               Entrada del Worker de generación
  tools/
    wordsearch/ crossword/ arithmetic/   UI React de cada generador (formulario, vista previa, acciones)
    shared/              Componentes de herramienta comunes (encabezado común, selector de papel, semilla, panel de error)
  i18n/                  Diccionarios es/en, rutas traducidas, detección de idioma, selector
  ads/                   AdSlot, script de AdSense
  content/               Carga de MDX, esquema de metadatos, datos de autor y legales
  components/            Shell de la aplicación (cabecera, pie web, contenedores)
  app/[lang]/            Rutas
content/es/  content/en/ Páginas MDX de intención
scripts/                 Post-build: precompresión, fuentes con huella, precarga del SW, presupuesto
tests/e2e/               Playwright
deploy/                  nginx.conf, docker-compose.yml
Dockerfile  .github/workflows/  .env.example
```

### 4.3 Reglas de dependencia (ESLint `no-restricted-imports`, verificadas con codegraph)

| Módulo | Puede importar | No puede importar |
|---|---|---|
| `core` | nada del proyecto | todo lo demás |
| `generators/X` | `core` | otros generadores, `layout`, `render`, `tools`, `ads`, `content`, React |
| `layout/X` | `core`, `layout/common`, tipos de resultado de `generators/X` | `layout/Y`, tipos de `generators/Y`, `render`, `tools`, `ads`, `content` |
| `render/svg`, `render/pdf` | `core` | `generators`, `layout`, `tools`, `ads`, `content` |
| `workers` | `core`, `generators` | `render`, `tools`, `ads` |
| `tools/X` | `core`, `generators/X`, `layout`, `render/svg`, `render/pdf` (solo mediante `import()`), `workers`, `i18n`, `tools/shared` | otros `tools/Y`, `ads`, `content` |
| `content` | `core` y la API pública `tools/X/index` (validador del preset, `ReadySheet` para la ficha preparada, herramienta embebible) | internos de `tools`/`generators`, `layout`, `render` |
| `ads` | `i18n` | `tools`, `render`, `generators` |
| `app` | todo lo anterior | — (`AdSlot` solo en layouts y plantilla de contenido, nunca dentro de `tools`) |

`render/pdf` y `pdf-lib` no pueden aparecer en ningún chunk inicial; lo comprueba el script de presupuesto.

### 4.4 Worker de generación

- Mensaje de entrada: `{ requestId, kind, params, seed }`. Salida: resultado completo, resultado parcial (lo no colocado y el motivo) o error genérico.
- Presupuesto temporal: 1,5 s por solicitud. Una nueva solicitud invalida la anterior (se ignoran respuestas con `requestId` obsoleto; si la anterior sigue ocupada, se termina y se recrea el Worker).
- El resultado en caso de agotar el presupuesto es determinista: el algoritmo cuenta intentos, no tiempo, y el tiempo solo actúa como red de seguridad.

## 5. Especificación funcional

### 5.0 Común a los tres generadores

- **Encabezado:** título de la ficha, nombre del centro o docente, líneas «Nombre» y «Fecha» para el alumno.
- **Pie:** isotipo en gris y `santiceducation.com` a 7 pt, en todas las páginas (alumno y soluciones), también en impresión directa y PDF.
- **Papel:** A4 (210 × 297 mm) o Carta (215,9 × 279,4 mm); márgenes de 12 mm. Por defecto Carta si la región de `navigator.language` pertenece a la lista de países que la usan (EE. UU., Canadá, México, Filipinas, Chile, Colombia, Venezuela, Costa Rica, Guatemala, Panamá, República Dominicana, Puerto Rico, El Salvador…; lista mantenida en `core`); A4 en el resto o sin región.
- **Semilla:** campo opcional. Vacío → semilla aleatoria (`crypto.getRandomValues`) que se muestra en pantalla. El código mostrado incluye la versión del algoritmo (p. ej. `v1-K7Q2M9`). Mismo código + mismos parámetros → misma ficha. Botón «Regenerar» → nueva semilla.
- **Soluciones:** páginas aparte. Casilla «Incluir soluciones» (marcada por defecto) afecta a impresión y PDF.
- **Fichas en escala de grises**, pensadas para fotocopia.
- **Idioma de la ficha** = idioma de la interfaz (textos del encabezado, alfabeto de relleno, rótulos «Horizontales/Verticales» o «Across/Down», formato de división).

### 5.1 Normalización de texto (`core`)

1. Unicode NFC, recorte de espacios, mayúsculas según idioma.
2. Eliminación de tildes y diéresis (Á→A, Ü→U); Ñ se conserva.
3. Espacios, guiones y apóstrofos se eliminan y la palabra se une («oso polar» → `OSOPOLAR`, «don't» → `DONT`).
4. Cualquier otro carácter no alfabético (dígitos, símbolos) → la línea se rechaza con error señalando la línea.
5. Longitud mínima normalizada: 2 letras.
6. Duplicados tras normalizar → se eliminan con aviso.
7. Palabra contenida en otra (SOL en GIRASOL) → aviso de solución ambigua (no bloquea).
8. Alfabeto de relleno: A–Z; en español, A–Z más Ñ.

### 5.2 Sopa de letras

- **Entrada:** una palabra por línea, 1–50 palabras.
- **Cuadrícula:** cuadrada, de 8 a 25 celdas por lado.
- **Direcciones:** casillas independientes — horizontal, vertical, diagonal, invertidas. «Invertidas» añade el sentido inverso de las direcciones activas. Al menos una de horizontal/vertical/diagonal debe estar activa.
- **Algoritmo propio con retroceso simple:** palabras ordenadas por longitud descendente; para cada palabra se barajan con la semilla las posiciones y direcciones candidatas; se admite solapamiento solo si la letra coincide; si una palabra no cabe, se retrocede a la anterior y se prueba su siguiente candidato. Límite de intentos por solicitud; al agotarse se reintenta con una subsemilla derivada un número fijo de veces y se conserva la mejor colocación parcial.
- **Relleno:** letras del alfabeto del idioma, con la misma semilla.
- **Salida de alumno:** cuadrícula + listado de palabras en su forma original, en columnas, ordenado alfabéticamente.
- **Soluciones:** misma cuadrícula con cada palabra rodeada por una cápsula de trazo (rectángulo redondeado girado), legible en gris.

### 5.3 Crucigrama

- **Entrada:** un par por línea con separador `:` o tabulador (`palabra: definición`), 1–50 pares. La palabra se normaliza según §5.1; la definición se conserva tal cual (máximo 200 caracteres).
- **Decisión de implementación: colocación propia.** `crossword-layout-generator` (v0.1.1, última publicación 2022, JavaScript sin tipos) usa una heurística voraz sin semilla, lo que impide reproducir una ficha concreta, y no conoce la normalización de Ñ ni permite puntuar alternativas. Esta justificación se recoge en el comentario de cabecera del módulo en la Fase 4, tras evaluar la librería con los mismos casos de prueba.
- **Algoritmo:** N intentos con orden de palabras barajado por semilla (priorizando las largas). En cada intento, la primera palabra se sitúa horizontal; cada siguiente se coloca en la posición válida que maximiza cruces, desempatando por menor área del rectángulo envolvente. Posición válida: coincidencia de letras en los cruces, sin letras adyacentes paralelas que formen palabras no deseadas, sin prolongar otra palabra. Puntuación del intento: palabras colocadas (peso dominante), después cruces, después compacidad. Se elige el mejor intento.
- **Numeración:** recorrido por filas; una casilla recibe número si inicia una palabra horizontal o vertical.
- **Salida de alumno:** cuadrícula con casillas numeradas en blanco + definiciones separadas en «Horizontales» y «Verticales» («Across», «Down»).
- **Soluciones:** cuadrícula con las letras + mismas listas con la palabra en su forma original.

### 5.4 Cuadernillo de operaciones

- **Operaciones:** suma, resta, multiplicación, división; se puede seleccionar una o varias (ficha mixta con reparto equilibrado).
- **Operandos:** rango mínimo–máximo por operando; el selector de «número de dígitos» (1–5; multiplicador y divisor 1–3) rellena el rango correspondiente.
- **Llevada:** «con llevada», «sin llevada» o «indiferente» para suma y multiplicación; «sin llevada» en resta significa sin préstamo en ninguna columna. La resta nunca da resultado negativo.
- **División:** «exacta» (resto 0) o «con resto» (resto > 0). Se construye como dividendo = divisor × cociente (+ resto) dentro de los rangos.
- **Cantidad:** 1–200 operaciones, sin repeticiones dentro de la ficha.
- **Disposición:** en columnas (formato vertical escolar) o en línea (`23 + 45 = ____`); columnas por página 2–5.
- **Formato de división según idioma:** `es` usa el esquema de «casita» con el divisor a la derecha; `en` usa la galera anglosajona (long division bracket).
- **Generación:** si el espacio de combinaciones válidas es pequeño se enumera y se baraja; si es grande se muestrea con rechazo. Cada regeneración usa una semilla nueva.
- **Soluciones:** las mismas operaciones con el resultado (y el resto cuando corresponda).

### 5.5 Casos límite

| Caso | Comportamiento |
|---|---|
| Palabra más larga que la cuadrícula | Error antes de generar indicando la palabra, su longitud y el tamaño mínimo necesario. |
| Una sola palabra | Válido en sopa y crucigrama (con aviso en crucigrama de que no habrá cruces). |
| Cincuenta palabras | Válido; a partir de 30 se sugiere un tamaño de cuadrícula mínimo estimado según el total de letras. |
| Espacios, guiones, caracteres no alfabéticos | Según §5.1: se unen o se rechaza la línea con indicación concreta. |
| No se pueden colocar todas tras agotar intentos | Nunca en silencio. Panel con las palabras no colocadas y sugerencias concretas (tamaño de cuadrícula sugerido, activar diagonales o invertidas, retirar las más largas) y botón explícito «Generar sin estas palabras». |
| Crucigrama con palabras sin cruce posible | Mismo panel; no se colocan palabras aisladas. |
| División exacta con rangos incompatibles | Error con el motivo y el ajuste mínimo sugerido (p. ej. ampliar el máximo del dividendo hasta el primer múltiplo válido). |
| Menos combinaciones distintas que operaciones pedidas | Aviso con el máximo disponible y opción de generar esa cantidad; nunca repeticiones silenciosas. |
| Más operaciones de las que caben en una hoja | Capacidad calculada según papel, disposición y columnas; paginación automática con aviso visible («Se generarán 3 hojas, máx. 30 por hoja»). Límite de 200. |
| Cuadrícula que no cabe en la página con celda ≥ 6 mm | Error con sugerencia (reducir cuadrícula o número de palabras). Las cuadrículas nunca se parten entre páginas; los listados sí pueden continuar. |
| Fallo o bloqueo del Worker | Mensaje genérico con «Reintentar», sin contenido del usuario. |
| Fallo al cargar módulo de PDF o fuentes sin red y sin caché | Mensaje concreto indicando que la descarga del PDF necesita haberse cargado una vez con conexión; la impresión directa sigue disponible. |

## 6. Documento de hoja, impresión y PDF

### 6.1 `SheetDocument`

```ts
type PaperSize = 'a4' | 'letter';
interface SheetDocument { paper: PaperSize; lang: 'es' | 'en'; pages: SheetPage[] }
interface SheetPage { role: 'student' | 'solution'; primitives: Primitive[] }
type Primitive =
  | { t: 'text'; x: number; y: number; text: string; size: number; font: FontId; align: 'start' | 'middle' | 'end'; tone: Tone }
  | { t: 'rect'; x: number; y: number; w: number; h: number; stroke?: Tone; fill?: Tone; strokeWidth?: number; radius?: number }
  | { t: 'line'; x1: number; y1: number; x2: number; y2: number; stroke: Tone; strokeWidth: number; dash?: number[] }
  | { t: 'capsule'; cx: number; cy: number; length: number; width: number; angleDeg: number; stroke: Tone; strokeWidth: number }
  | { t: 'image'; id: 'brandMark'; x: number; y: number; w: number; h: number };
type FontId = 'sheet' | 'sheetBold';
type Tone = 'ink' | 'muted' | 'faint' | 'paper'; // escala de grises
```

Unidades en milímetros; origen arriba a la izquierda. Los renderizadores traducen `FontId`, `Tone` e `image.id` a recursos concretos. El texto se mide con métricas de la tipografía de ficha incluidas en `core` para que la maquetación sea idéntica en SVG y PDF. (Esta forma es orientativa; el plan de implementación fija la definitiva.)

### 6.2 Impresión directa

- Al imprimir se monta el documento en `#print-root`, portal hijo directo de `body`.
- `@media print { body > :not(#print-root) { display: none !important } }` — oculta interfaz, anuncios propios e inyectados por AdSense.
- `@page { size: A4 | letter; margin: 0 }` según el papel elegido; cada página es un SVG del tamaño físico con `break-after: page`.
- La casilla «Incluir soluciones» controla si se montan las páginas de soluciones.

### 6.3 PDF

- `pdf-lib` + `@pdf-lib/fontkit`, importados dinámicamente al pulsar «Descargar PDF».
- Tipografía de ficha incrustada con subconjunto. Como @fontsource distribuye solo WOFF/WOFF2, **en la Fase 2 se hace una prueba inicial** de incrustación con WOFF; si falla o degrada el subconjunto, un script de build convierte los ficheros a TTF en `public/fonts/pdf/` con huella en el nombre.
- Nombre de fichero derivado del título (slug) + sufijo de soluciones cuando proceda.
- Descarga mediante Blob y URL de objeto; nada sale del navegador.

## 7. Interfaz, identidad e idiomas

### 7.1 Identidad visual

- Fuente: material de marca en `img/` (pendiente de aporte del operador). Referencia provisional: `brand-logo.png` del repositorio SanTIC-Education, isotipo azul acero ≈ `#385070` y wordmark pizarra ≈ `#484860`. La paleta definitiva se extrae de los ficheros de `img/`, no se inventa.
- `PRODUCT.md` y `DESIGN.md` se escriben en la Fase 1 mediante impeccable.
- Páginas de generador en modo *Operate*; páginas de contenido en modo *Read*.
- Tipografías servidas localmente con @fontsource: una de interfaz y una de ficha legible para lectores iniciales, elegidas en la Fase 1. **En la Fase 1 solo se sirve el subconjunto `latin`**; las letras fuera de Latin-1 usan la tipografía de reserva del sistema, tanto en pantalla como en impresión directa. La Fase 2 decide `latin-ext` mediante `@font-face` escrito a mano con `unicode-range` (coste cero en la primera vista mientras no se use) junto con el subconjunto del PDF, y enseña al script de presupuesto a saltarse los rangos no latinos.

### 7.2 Disposición

- **Escritorio (≥ 1024 px):** cabecera (logo, selector de idioma) → lienzo de herramienta (parámetros + vista previa) con columna derecha de 300 px (anuncio 1) → contenido explicativo con anuncio in-article (anuncio 2) → pie web. La columna lateral de escritorio **solo existe** cuando el anuncio lateral es visible (`isAdVisible(adsConfig, 'sidebar', ...)`, una constante resuelta en build); sin anuncio el lienzo ocupa todo el ancho. Al resolverse en build y no en cliente, no hay salto de layout (CLS).
- **Móvil (360 px):** parámetros → Generar → vista previa (con acciones Imprimir y Descargar PDF en su cabecera) → contenido. Botón «Ampliar» abre la hoja a tamaño real con zoom táctil. Anclaje inferior (anuncio 3) si está activado.
- Los botones de acción nunca son fijos (`position: fixed/sticky`).

### 7.3 Idiomas

- `app/[lang]` con `generateStaticParams` para `es` y `en`; diccionarios TypeScript tipados, sin librería de i18n.
- Rutas traducidas: `/es/sopa-de-letras` ↔ `/en/word-search`, `/es/crucigrama` ↔ `/en/crossword`, `/es/operaciones` ↔ `/en/math-worksheets`, `/es/autor` ↔ `/en/author`, y equivalentes para legales.
- Raíz `/`: Nginx redirige (302) según `Accept-Language`. Respaldo en `index.html` estático: script en línea que lee la preferencia guardada y después `navigator.languages`, con enlaces en `<noscript>`.
- El selector de idioma navega a la página equivalente (mapa de rutas o `translationKey` en contenido) y guarda la preferencia en `localStorage` (preferencia del visitante, no contenido introducido).
- `<html lang>` correcto por ruta.

## 8. Publicidad

### 8.1 Componente `AdSlot`

- Props: `slot: string`, `format: 'sidebar' | 'in-article' | 'anchor'`.
- Espacio reservado con dimensiones explícitas antes de cargar: sidebar 300 × 600; in-article 100 % de ancho × 280 px mínimo; anchor 320 × 50 fijo inferior con relleno inferior equivalente en `body`.
- Sin `NEXT_PUBLIC_ADSENSE_CLIENT`: en desarrollo (o con `NEXT_PUBLIC_ADS_PLACEHOLDER=true`) renderiza un marcador inerte del tamaño exacto; en producción no renderiza nada.
- Interruptores por formato: `NEXT_PUBLIC_ADS_SIDEBAR`, `NEXT_PUBLIC_ADS_IN_ARTICLE`, `NEXT_PUBLIC_ADS_ANCHOR` (este último `false` por defecto).
- Script de AdSense cargado una única vez en `app/[lang]/layout.tsx` con `next/script` y `strategy="afterInteractive"`, solo si existe el identificador de editor.
- No se inventan identificadores: los `slot` provienen de variables de entorno documentadas en `.env.example`.

### 8.2 Ubicaciones y prohibiciones

- Máximo tres unidades por vista: sidebar (solo escritorio), in-article (bajo el generador), anchor (solo móvil). Resultado efectivo: 2 en escritorio, 2 en móvil.
- Prohibido: entre Generar y el resultado; adyacente a Descargar/Imprimir; dentro de la vista previa; en impresión (§6.2).
- Garantías técnicas: regla ESLint que impide importar `ads` desde `tools` y `render`; prueba Playwright que, con marcadores activos, verifica en escritorio y 360 px que ninguna caja de anuncio está a menos de 150 px de los botones Generar, Imprimir o Descargar ni intersecta el lienzo de la herramienta.

## 9. Contenido y SEO

- **Páginas de intención:** `/[lang]/<generador>/<slug>`, ficheros MDX en `content/<lang>/`, renderizados con `@next/mdx` y `generateStaticParams` (`dynamicParams = false`).
- **Metadatos por página** (`export const meta`, tipado): título, descripción, `translationKey`, generador, preset de parámetros, semilla fija, nivel educativo, objetivo de aprendizaje, fecha, autor.
- **Validación en build:** el preset se valida con el validador que expone `tools/X/index`; un preset inválido rompe el build.
- **Material ya preparado:** el componente de servidor `ReadySheet` de `tools/X/index` genera, maqueta y renderiza a SVG la ficha del preset durante el build (generadores puros), visible e indexable sin JavaScript; debajo, explicación didáctica y el generador embebido con los parámetros precargados. El contenido nunca accede directamente a generadores, maquetación ni renderizadores.
- **Página de autor** enlazada desde cada artículo; datos en `src/content/author.ts`.
- **Metadatos:** `generateMetadata` con canonical, alternates hreflang (`es`, `en`, `x-default` → `/`), Open Graph con imagen estática por generador, JSON-LD (`WebApplication` en generadores; `Article` + `Person` en contenido).
- **`sitemap.xml` y `robots.txt`:** `app/sitemap.ts` y `app/robots.ts` estáticos, con URL absoluta desde `NEXT_PUBLIC_SITE_URL` + basePath y alternates de idioma.
- `trailingSlash: true`.
- **Ejemplos:** 2 temas × 2 idiomas, con texto original redactado para cada página; ninguna página generada en masa ni texto de relleno.
- **Legales:** Privacidad (incluye cookies de AdSense y CMP), Acerca de, Contacto; datos del operador obligatorios en build de producción.

## 10. Funcionamiento sin red

- Service worker propio (`sw.js`, sin dependencias) generado tras el build con la lista de precarga, con alcance `basePath/`.
- Se registra tras el evento `load`; en `install` precarga en segundo plano todo el HTML, JS, CSS y tipografías de `out/` (incluidos módulo de PDF y fuentes TTF). No cuenta para el presupuesto de primera vista.
- Estrategias: recursos con huella → caché primero; navegaciones → red primero con respaldo en caché.
- Nunca cachea peticiones de otros orígenes (AdSense).
- Actualización: nueva versión del SW por despliegue; activación en la siguiente navegación. El nuevo service worker **no** llama a `skipWaiting`; se activa solo cuando ninguna pestaña sigue usando la versión anterior — llamar a `skipWaiting` borraría cachés que las páginas antiguas todavía podrían necesitar para sus fragmentos (chunks) diferidos.

## 11. Privacidad

- Todo el procesamiento ocurre en el navegador; no hay endpoints propios.
- El estado del generador no se escribe en la URL (Nginx registra URLs y AdSense envía la URL de la página) ni en almacenamiento.
- `no-console` como error en `src/`; los mensajes de error no interpolan contenido del usuario salvo en la UI local.
- Log de acceso de Nginx con `$uri` en lugar de `$request`.
- CSP aplicada (§12.2).

## 12. Despliegue

### 12.1 Dockerfile multietapa

1. **deps:** `node:24-alpine`, `corepack` + `pnpm install --frozen-lockfile`.
2. **build:** `pnpm build` (Next.js → `out/`) + scripts post-build: fuentes TTF con huella, lista de precarga del SW, precompresión `.br` y `.gz` (zlib de Node), comprobación de presupuesto.
3. **runtime:** `alpine` + `apk add nginx nginx-mod-http-brotli`; usuario sin privilegios; `HEALTHCHECK`; solo `out/` y la configuración.

Las variables `NEXT_PUBLIC_*` son argumentos de build; cambiarlas implica reconstruir la imagen.

### 12.2 Nginx

- `brotli_static on; gzip_static on;` con compresión dinámica de nivel bajo como respaldo.
- `Cache-Control: public, max-age=31536000, immutable` en `<basePath>/_next/static/` y `<basePath>/fonts/` (ficheros con huella). `no-cache` en HTML y `sw.js`.
- `set_real_ip_from <CIDR de la red de NPM>; real_ip_header X-Forwarded-For;` y `limit_req_zone $binary_remote_addr zone=static:10m rate=20r/s;` con `burst=60 nodelay` y estado 429.
- Redirección de `/` por `Accept-Language`.
- Cabeceras: CSP aplicada con `'self'` más la lista de dominios de AdSense y CMP mantenida en un único fichero (`deploy/nginx/csp.conf`) y contrastada con la documentación vigente de Google en la Fase 6; `'unsafe-inline'` en `script-src` es necesario para los scripts en línea de la exportación estática de Next.js. `X-Content-Type-Options`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` restrictiva. `style-src 'self' 'unsafe-inline'` también es necesario (atributos `style` en línea de SVG y `AdSlot`, el estilo en línea de la página 404 por defecto de Next.js, y el `<style id="print-page-size">` dinámico); la Fase 6 debe ejecutar una pasada e2e completa con la cabecera CSP real activada.
- Log de acceso con formato propio basado en `$uri`.

### 12.3 docker-compose.yml

- `image: ghcr.io/<owner>/<repo>:${IMAGE_TAG}`; sin `ports`; red externa de Nginx Proxy Manager (nombre por variable).
- `deploy.resources.limits: cpus: '0.5', memory: 128M`; `memswap_limit: 128M`; `cpu_shares: 256`; `oom_score_adj: 900`; `pids_limit: 100`; `blkio_config.weight: 100` (efectivo solo con cgroup v2).
- `read_only: true` con `tmpfs` acotados para caché, PID y temporales de Nginx.
- `logging: json-file` con `max-size: 10m`, `max-file: 3`.
- `restart: unless-stopped`, `healthcheck`.

### 12.4 GitHub Actions

- Disparo: push a `main` (y manual).
- Job `verify`: lint, typecheck, pruebas unitarias, build, presupuesto, Playwright.
- Job `image`: buildx con caché `gha`, publicación en GHCR con etiquetas `sha-<commit>` y `latest`.
- Job `deploy` (entorno `production`): SSH al VPS → `docker compose pull && docker compose up -d` → limpieza de imágenes antiguas. El VPS no construye. Retroceso: fijar `IMAGE_TAG` a un sha anterior.
- La imagen es privada; el VPS usa un token de solo lectura (`read:packages`) configurado una vez.
- Secretos y variables documentados en `.env.example` y en la cabecera del workflow.

## 13. Calidad

### 13.1 Pruebas

- **Vitest (TDD en lógica pura):** determinismo del PRNG; normalización (Ñ, Ü, espacios, guiones, rechazos); invariantes por generador con cientos de semillas (cada palabra legible en dirección permitida y ninguna fuera de las permitidas; cruces coherentes y numeración correcta; restricciones de llevada, préstamo, resto y unicidad); capacidad y paginación sin partir cuadrículas; PDF generado en Node y leído con `pdfjs-dist` (texto «ÑANDÚ» y «pingüino» presente, tipografías incrustadas, sin glifo `.notdef`).
- **Playwright:** recorrido de cada generador; red (intercepción: falla ante cualquier origen externo); privacidad (palabra centinela ausente de consola, URLs, cuerpos de petición y caché del SW); sin red (carga, SW activo, `setOffline`, recarga, generar, descargar PDF); impresión (`emulateMedia('print')`: solo `#print-root` visible, sin anuncios; `page.pdf()` con el número de páginas esperado); 360 px (sin desplazamiento horizontal, tamaño mínimo de celda tras «Ampliar»); zonas publicitarias (§8.2).
- **Presupuesto:** script que suma HTML + JS + CSS + tipografías precargadas comprimidos de la primera vista de cada ruta; límite 300 KB (AdSense excluido y medido aparte); falla si `pdf-lib` aparece en un chunk inicial.
- **Build:** falla ante advertencias de rutas dinámicas o rutas no exportables.
- **Estático:** `tsc --noEmit` estricto; ESLint con reglas de fronteras y `no-console`.

### 13.2 Criterios de validación por fase

Cada criterio se aplica desde la fase en que existe el componente afectado:

| Criterio | Desde |
|---|---|
| Build estático sin errores ni advertencias de rutas dinámicas | Fase 1 |
| PDF con tildes y eñes sin sustituciones | Fase 2 |
| Impresión limpia, sin interfaz ni anuncios, sin cortes a mitad de cuadrícula | Fase 1 (ruta), Fase 2 (hoja real) |
| Funciona sin red tras la primera carga | Fase 1 (shell), Fase 2 (generador + PDF) |
| Sin llamadas a terceros salvo AdSense | Fase 1 |
| Cuadrícula legible en 360 px | Fase 2 |
| Ninguna palabra del usuario en logs, consola o peticiones | Fase 2 |
| Presupuesto < 300 KB | Fase 1 |
| Anuncios fuera de zonas prohibidas | Fase 1 |

### 13.3 Cierre de cada fase (1–6)

1. `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm budget` + Playwright aplicable.
2. codegraph: `sync` + consultas sobre fronteras; informe de dependencias reales frente a §4.3.
3. impeccable: una ronda de `audit` + `polish` (escritorio y 360 px), correcciones en un solo lote.
4. superpowers `verification-before-completion`: resumen con evidencias de lo ejecutado.
5. Parada para revisión del operador.

Commits: formato de commits convencionales en español, uno por unidad de trabajo coherente.

## 14. Fases

| Fase | Contenido |
|---|---|
| 0 | Esta especificación y el plan de implementación. |
| 1 | Andamiaje (Next.js, TS estricto, Tailwind, ESLint con fronteras, Vitest, Playwright), `basePath`/`assetPrefix` por entorno, i18n y rutas, identidad visual (impeccable), layout, `AdSlot`, ruta de impresión, `core` (PRNG, normalización, papel, `SheetDocument`), `render/svg`, SW, script de presupuesto. |
| 2 | Sopa de letras de extremo a extremo: generador, maquetación, herramienta, Worker, impresión, `render/pdf` y tipografías. Referencia de calidad. |
| 3 | Cuadernillo de operaciones. |
| 4 | Crucigrama (evaluación documentada de `crossword-layout-generator`). |
| 5 | Contenido MDX, autor, legales, metadatos, OG, JSON-LD, sitemap, robots, 2 temas × 2 idiomas. |
| 6 | Dockerfile, Nginx, docker-compose, GitHub Actions, `.env.example`. |

## 15. Riesgos

| Riesgo | Mitigación |
|---|---|
| @pdf-lib/fontkit sin mantenimiento desde 2022; subconjunto de WOFF2 poco fiable | Prueba inicial en Fase 2; conversión a TTF en build como alternativa; prueba automática de extracción de texto. |
| Diferencias de métricas de texto entre SVG y PDF | Métricas de la tipografía de ficha en `core`; texto posicionado por la maquetación, no por el navegador. |
| Política de AdSense sobre anclaje manual | Anclaje desactivado por defecto; revisión de la política vigente antes de activarlo. |
| Clics accidentales por proximidad a acciones | Reglas ESLint + prueba de distancias + botones no fijos. |
| CSP demasiado restrictiva para AdSense tras la aprobación | Lista en un único fichero; ajuste documentado en Fase 6. |
| `limit_req` agrupando a todos los visitantes tras NPM | `set_real_ip_from` con el CIDR de la red de NPM. |
| Saturación del VPS afectando a Moodle | Límites de CPU/memoria, prioridad baja, `oom_score_adj`, logs rotados, sin build en el VPS, estáticos precomprimidos. |
| Presupuesto de 300 KB superado por el runtime de Next.js | Medición automática desde la Fase 1; carga diferida de PDF y Worker; sin librerías de componentes. |
| Impresión inconsistente entre navegadores (`@page size`) | SVG a tamaño físico; pruebas en Chromium; comprobación manual en Firefox y Safari en el cierre de Fase 2. |
| Reproducibilidad rota al cambiar un algoritmo | Versión de algoritmo incluida en el código de semilla. |
| Contenido insuficiente para la revisión de AdSense | Páginas de intención con material preparado y explicación didáctica, autor y legales con datos reales. |
| Worker y `basePath` en exportación estática | Validación en Fase 2 con `basePath` no vacío en una prueba de build dedicada. |

## 16. Pendientes del operador

| Pendiente | Necesario para |
|---|---|
| Ficheros de marca en `img/` (la carpeta está vacía) | Fase 1 (paleta e identidad) |
| Nombre del subdominio (`NEXT_PUBLIC_SITE_URL`) | Fase 5 (canonical, sitemap) |
| Datos reales de autor (nombre, cargo, institución, trayectoria, enlaces) | Fase 5 |
| Datos para Privacidad, Acerca de y Contacto | Fase 5 |
| Repositorio de GitHub (propietario/nombre) | Fase 6 |
| Nombre y CIDR de la red de Nginx Proxy Manager; ruta de despliegue en el VPS; usuario SSH | Fase 6 |
| Identificador de editor de AdSense y de bloques (cuando la cuenta se apruebe) | Tras aprobación; no bloquea ninguna fase |

## 17. Enmiendas tras la Fase 1

- **§12.2 CSP:** se añade `style-src 'self' 'unsafe-inline'` — es necesario para los atributos `style` en línea de SVG y `AdSlot`, el estilo en línea de la página 404 por defecto de Next.js y el `<style id="print-page-size">` dinámico; la Fase 6 debe correr una pasada e2e con la cabecera CSP real.
- **§10 (activación del service worker):** se aclara que el nuevo SW no llama a `skipWaiting` — se activa solo cuando ninguna pestaña usa ya la versión anterior, porque `skipWaiting` borraría cachés que páginas antiguas aún podrían necesitar para fragmentos diferidos.
- **§7.1 (subconjuntos de tipografía):** se aclara que la Fase 1 sirve únicamente el subconjunto `latin` — las letras fuera de Latin-1 caen a la tipografía de reserva del sistema en pantalla y en impresión directa; la Fase 2 decide `latin-ext` con `@font-face` manual y `unicode-range` junto con el subconjunto del PDF, y enseña al presupuesto a ignorar los rangos no latinos.
- **§7.2 / §8 (columna lateral de escritorio):** se aclara que la columna solo existe cuando el anuncio lateral es visible (constante de build, sin salto de layout).

## 18. Enmiendas tras la Fase 2

- **§6.3 / §4.2 (tipografía del PDF):** la prueba inicial resolvió la alternativa: se incrusta **WOFF con `subset: true`** referenciado con `new URL('@fontsource/…woff', import.meta.url)` (webpack le pone huella y el SW lo precachea). No existe `public/fonts/pdf/` ni conversión a TTF. WOFF2 queda descartado porque el subconjunto de @pdf-lib/fontkit falla con él.
- **§7.1 (subconjuntos):** se mantiene solo `latin`, también en la Fase 2. No se añade `latin-ext`: las palabras con letras sin glifo en Andika latin se rechazan en la validación con un mensaje concreto, y en título y centro esos caracteres se eliminan de la hoja con aviso. Así pantalla, impresión y PDF miden igual con las métricas generadas.
- **§5.0 / §7.2 (flujo de generación):** no hay botón «Generar»; la hoja se regenera sola (debounce de 250 ms) al cambiar parámetros, y la acción explícita es «Nueva sopa» (nueva semilla) en lugar de «Regenerar». En §8.2, «Generar» designa los controles marcados con `data-action` (incluidos «Nueva sopa» y «Generar sin estas palabras»). Imprimir y Descargar PDF se deshabilitan mientras no haya un resultado vigente.
- **§7.2 (diálogo «Ampliar»):** el diálogo lleva la barra con «Cerrar» fija (`sticky`) dentro de su propio desplazamiento. No contradice la prohibición de acciones fijas, que se refiere a Imprimir/Descargar en la página.
- **§4.4 (contrato del Worker):** un Worker por generador, así que no hay campo `kind`. Entrada `{ requestId, value, seedCode, lang }`, donde `value` son los parámetros ya validados. Salida `{ requestId, ok: true, result }` o `{ requestId, ok: false }`. El resultado parcial va dentro de `result` (colocadas y no colocadas), sin un campo de motivo, porque la causa se deriva de los datos para las sugerencias. Los errores nunca reenvían texto. Los códigos de semilla de otra versión del algoritmo se rechazan antes de enviar nada al Worker.
- **§5.2 (algoritmo v1 congelado):** cuando el backtracking agota los pasos, la mejor rejilla parcial se completa intentando una vez cada palabra restante, en orden y con el mismo PRNG. No se aceptan colocaciones que no escriban ninguna celda nueva. Un fixture dorado fija v1: cualquier cambio de salida exige subir `WORDSEARCH_ALGORITHM_VERSION`.
- **§6.3 (nombre de fichero):** un único PDF contiene la ficha y, si se piden, las soluciones al final, así que el nombre es el slug del título sin sufijo.
