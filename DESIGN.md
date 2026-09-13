---
name: Santic Education — Generador de fichas
description: Mesa de pruebas de la hoja imprimible; lo que se aprueba en pantalla es lo que sale de la copiadora.
colors:
  brand: "#385777"
  brand-strong: "#4a4c63"
  ink: "#23252f"
  muted: "#565a6b"
  line: "#7c8390"
  surface: "#ffffff"
  canvas: "#e6e9ec"
  focus: "#385777"
  sheet-ink: "#000000"
  sheet-muted: "#4d4d4d"
  sheet-faint: "#b3b3b3"
  sheet-paper: "#ffffff"
typography:
  display:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.2
  title:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.556
  legend:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.5
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "tnum"
  body-sm:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
    fontFeature: "tnum"
  label:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.333
    letterSpacing: "0.025em"
  sheet-title:
    fontFamily: "Andika, system-ui, sans-serif"
    fontSize: "7mm"
    fontWeight: 700
  sheet-body:
    fontFamily: "Andika, system-ui, sans-serif"
    fontSize: "3.5mm"
    fontWeight: 400
  sheet-footer:
    fontFamily: "Andika, system-ui, sans-serif"
    fontSize: "2.5mm"
    fontWeight: 400
rounded:
  none: "0px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "8": "32px"
  "10": "40px"
  sheet-margin: "12mm"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.surface}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.brand-strong}"
    textColor: "{colors.surface}"
  input-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "8px 12px"
  field-label:
    textColor: "{colors.muted}"
    typography: "{typography.label}"
  docket:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.none}"
    padding: "20px"
    width: "22rem"
  sheet-proof:
    backgroundColor: "{colors.sheet-paper}"
    rounded: "{rounded.none}"
  lang-switch-current:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.none}"
    padding: "4px 8px"
  lang-switch-link:
    textColor: "{colors.muted}"
    typography: "{typography.body-sm}"
    padding: "4px 8px"
  lang-switch-link-hover:
    textColor: "{colors.ink}"
  ad-placeholder:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.muted}"
    width: "300px"
    height: "600px"
---

# Design System: Santic Education — Generador de fichas

## Overview

**Creative North Star: "La mesa de pruebas"**

La interfaz es una mesa gris fría sobre la que descansa una hoja blanca a escala: la prueba de imprenta que el docente aprueba antes de fotocopiar. Todo lo que no es la hoja se comporta como un parte de trabajo técnico: filetes de 1 px, esquinas rectas, etiquetas en mayúsculas con tracking, cifras tabulares. La densidad es media y ordenada; nada decora, todo encuadra la hoja.

Hay dos mundos cromáticos separados por construcción. La interfaz usa los colores del logotipo (azul acero y pizarra) sobre neutros fríos derivados del wordmark. La hoja usa únicamente cuatro grises definidos en código y compartidos por el renderizado SVG y el PDF, porque se imprime y se fotocopia. La profundidad no existe como sombra: la jerarquía es tonal (mesa frente a papel) y lineal (filetes).

El movimiento es seco: los cambios de estado (hover, idioma actual) se producen sin transiciones ni easing. La construcción rechaza el panel SaaS de tarjetas redondeadas con sombra y la estética infantil de lápices de colores.

**Key Characteristics:**
- Mesa `canvas` gris fría bajo papel `surface` blanco; ninguna sombra.
- Filetes de 1 px en `line` como único recurso de separación y contención.
- Esquinas rectas en toda la interfaz.
- Archivo (400/600) para la interfaz, Andika (400/700) solo dentro de la hoja.
- Cifras tabulares globales.
- Hoja en escala de grises con geometría en milímetros.
- Cambios de estado secos, sin transiciones.

## Colors

Paleta de identidad restringida: un azul acero para la acción, un pizarra para los titulares y neutros fríos; la hoja vive aparte en grises puros.

### Primary
- **Azul acero del isotipo** (`brand`): relleno de la acción primaria (Imprimir), anillo de foco de 3 px, fondo de la selección de texto, `accent-color` y `caret-color` nativos. Es el único color saturado de la interfaz.
- **Pizarra del wordmark** (`brand-strong`): titulares de página (h1) y estado hover de la acción primaria.

### Neutral
- **Tinta pizarra** (`ink`): texto principal, títulos de sección y valores de campos (contraste 12.5:1 sobre la mesa).
- **Pizarra atenuado** (`muted`): introducciones, descripciones, etiquetas de campo, pie del sitio, idioma no seleccionado (5.6:1).
- **Filete frío** (`line`): bordes de campos, del parte de trabajo, de la hoja, cabecera y pie; separador entre grupos. Solo trazos, nunca texto (3.1:1).
- **Papel** (`surface`): fondo de campos, del parte de trabajo y del idioma actual.
- **Mesa gris fría** (`canvas`): fondo de página, cabecera, pie y anclaje de anuncios; también la pista de la barra de desplazamiento.
- **Foco** (`focus`): alias del azul acero, reservado al contorno `:focus-visible`.

### Sheet grays
- **Negro de hoja** (`sheet-ink`): título, rótulos Nombre/Fecha y sus líneas de respuesta.
- **Gris medio de hoja** (`sheet-muted`): centro o docente, dominio del pie e isotipo gris (`public/brand/mark-gray.svg`).
- **Gris claro de hoja** (`sheet-faint`): filetes bajo el encabezado y sobre el pie.
- **Blanco de hoja** (`sheet-paper`): fondo de la página.

### Named Rules
**The Steel Is for Action Rule.** El azul acero rellena solo la acción primaria, el foco y la selección. Los titulares van en pizarra, no en azul.

**The Grayscale Sheet Rule.** Dentro de la hoja solo existen los cuatro grises de `TONE_HEX`. Ningún token de interfaz entra en la hoja y ningún gris de hoja se usa en la interfaz.

## Typography

**Display Font:** Archivo (con system-ui, sans-serif)
**Body Font:** Archivo (con system-ui, sans-serif)
**Sheet Font:** Andika (con system-ui, sans-serif)

**Character:** Archivo aporta un grotesco técnico y compacto para el parte de trabajo; Andika, diseñada para lectores iniciales, da a la hoja formas de letra inequívocas. Solo se sirve el subconjunto latin, localmente.

### Hierarchy
- **Display** (600, 1.875rem, 1.2): h1 de portada y de cada generador, en pizarra.
- **Title** (600, 1.125rem, 1.556): h2 «Vista previa» y nombre de cada generador en la portada.
- **Legend** (600, 1rem, 1.5): leyenda de grupo del parte de trabajo («Encabezado de la ficha»), actúa como encabezado de sección.
- **Body** (400, 1rem, 1.5): introducciones (máx. 42rem en portada), valores de campos, texto del botón en 600.
- **Body small** (400, 0.875rem): descripciones de tarjeta, pie, selector de idioma (600 en el idioma actual).
- **Label** (600, 0.75rem, 0.025em, mayúsculas): etiqueta visible de cada campo de formulario, siempre asociada a su control.
- **Sheet title / body / footer** (Andika 700 a 7 mm; 400 a 3.5 mm; 400 a 2.5 mm ≈ 7 pt): geometría en mm dentro de la hoja.

### Named Rules
**The 600 Ceiling Rule.** Archivo solo se carga en 400 y 600; ningún texto de interfaz usa 700. La negrita 700 es exclusiva de Andika en la hoja.

**The Two Faces Rule.** Archivo nunca aparece en la hoja; Andika nunca aparece en la interfaz.

**The Tabular Figures Rule.** `font-variant-numeric: tabular-nums` está activo en la raíz; toda cantidad se alinea en columnas.

## Layout

Contenedor centrado de 80rem (cabecera, pie, página de generador) y de 64rem en portada, con 16px de margen lateral. Ritmo vertical en pasos de 4px: 12px dentro de grupos de campos, 20px entre grupos del parte, 24px entre parte y hoja, 32px entre columnas y tarjetas, 40px de respiración superior en portada.

Página de generador: a partir de 768px, rejilla de dos columnas con el parte de trabajo a 22rem como máximo, anclado arriba (sin estirarse), y la hoja ocupando el resto; por debajo, parte arriba y hoja a todo el ancho. Encima de la hoja, una fila con el título «Vista previa» y la acción Imprimir. A partir de 1024px, si hay anuncio lateral, se añade una columna fija de 300px a la derecha, fuera del lienzo de la herramienta.

Portada: rejilla de pruebas de hoja (1 columna, 2 a 640px, 3 a 1024px), cada prueba limitada a 16rem de ancho. Pie siempre al fondo del viewport (cuerpo en columna de altura mínima `100dvh`).

La hoja es geometría en mm: A4 210×297 o Carta 215.9×279.4, margen de 12 mm, filete de encabezado a 28 mm, contenido desde 32 mm, filete de pie a 8 mm del margen inferior, isotipo de 5 mm de alto. En pantalla se escala al ancho disponible; en impresión se monta a tamaño físico con `@page` sin márgenes y todo lo demás desaparece.

### Named Rules
**The Off-Canvas Ads Rule.** Los anuncios solo ocupan la columna lateral de 300px, el anclaje inferior móvil o el cuerpo del artículo; nunca el lienzo de la herramienta, nunca junto a acciones y nunca en impresión.

## Elevation & Depth

Sistema plano sin ninguna sombra. La profundidad se expresa por contraste tonal (papel blanco sobre mesa gris fría) y por filetes de 1 px en `line`. El foco es el único trazo que crece: contorno sólido de 3 px en azul acero con 2 px de separación.

### Named Rules
**The Filete Rule.** Contener es trazar: un borde de 1 px en `line` delimita campos, parte de trabajo, hoja, cabecera y pie. No se usan sombras ni fondos tintados para separar.

## Shapes

Esquinas rectas (0px) en toda la interfaz: campos, botón, parte de trabajo, marco de la hoja, selector de idioma, hueco publicitario. Los rectángulos se leen como formularios impresos. El hueco publicitario sin rellenar es el único borde discontinuo de la interfaz, para distinguir espacio reservado de contenido.

Dentro de la hoja la geometría la dictan los primitivos: líneas finas de 0.2–0.3 mm y, para las soluciones de la sopa de letras, cápsulas de extremos redondos. Ese redondeo pertenece al lenguaje de la hoja y no contradice la esquina recta de la interfaz.

## Components

### Buttons
Sólidos, rectos y sin adorno.
- **Shape:** esquina recta (0px).
- **Primary:** relleno azul acero, texto blanco en Archivo 600, 8px × 16px.
- **Hover / Focus:** hover cambia en seco a pizarra; foco con el contorno global de 3 px.
- **Secondary:** pendiente (ver Pendiente de Fase 2).

### Inputs / Fields
Campos de parte de trabajo.
- **Style:** fondo papel, filete de 1 px en `line`, esquina recta, 8px × 12px, texto 1rem en tinta; `select` nativo con el mismo trazo.
- **Label:** etiqueta encima en mayúsculas con tracking (0.75rem, 600, 0.025em, `muted`), 4px de separación.
- **Focus:** contorno global de 3 px en azul acero; caret azul acero.
- **Error / Disabled:** aún no existen.

### Parte de trabajo (docket)
Formulario en papel con filete de 1 px y 20px de relleno, máximo 22rem, anclado arriba. Los grupos se separan con un filete superior y 16px de relleno (el grupo Papel va en su propio grupo bajo el encabezado).

### Prueba de hoja (sheet proof)
SVG de la hoja en su marco de 1 px sobre fondo blanco. En el generador ocupa la columna derecha; en portada es la tarjeta de cada generador (8px de passe-partout, máx. 16rem) con título y descripción debajo, y el título se subraya al pasar el cursor.

### Navigation
Cabecera y pie sobre la mesa, separados por un filete. Logotipo horizontal a 36px de alto a la izquierda; selector de idioma a la derecha: el idioma actual es un recuadro de papel con filete y texto en 600, los demás son texto atenuado que gana filete y tinta al pasar el cursor. Mismo tratamiento en móvil.

### Ad placeholder
Hueco reservado con dimensiones fijas (300×600 lateral, 320×50 anclaje, 280px mínimo in-article), borde discontinuo de 1 px sobre la mesa y rótulo `muted` de 0.75rem con el formato; se oculta en impresión.

### Pendiente de Fase 2
Elementos del contrato de dirección que aún no existen en la construcción y no deben tratarse como componentes disponibles: marcas de corte en L y cruces de registro en azul acero; línea de trabajo con papel, páginas y semilla con Imprimir/PDF al inicio; zoom en escalas enteras nombradas (Ajustar, 100 %) y «Ampliar» en móvil; parpadeo seco (≤ 90 ms) de las marcas al cambiar un parámetro; cuña de 5 grises como leyenda de tono; parte de trabajo plegable en móvil; acción secundaria con filete (PDF).

## Do's and Don'ts

### Do:
- **Do** poner la hoja blanca con filete de 1 px sobre la mesa `canvas` como centro de cada superficie de herramienta.
- **Do** delimitar con bordes de 1 px en `line` y esquinas rectas (0px).
- **Do** reservar el azul acero para la acción primaria, el foco y la selección; titulares en pizarra `brand-strong`.
- **Do** usar Archivo solo en 400 y 600, y Andika solo dentro de la hoja.
- **Do** dibujar la hoja exclusivamente con los grises de `TONE_HEX` y medidas en mm.
- **Do** etiquetar cada campo con su etiqueta visible en mayúsculas con tracking de 0.75rem.
- **Do** cambiar estados en seco, sin transiciones.

### Don't:
- **Don't** añadir sombras ni esquinas redondeadas a la interfaz.
- **Don't** usar `font-bold` (700) con Archivo: no está cargado y el navegador lo sintetiza.
- **Don't** introducir colores de interfaz, ni la variante terracota #D57044, en la hoja o en la paleta de la herramienta.
- **Don't** usar `line` como color de texto: no alcanza contraste de texto.
- **Don't** colocar anuncios dentro del lienzo de la herramienta, junto a acciones o en impresión.
