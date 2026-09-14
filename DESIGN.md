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
  caption:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.333
    fontFeature: "tnum"
  sheet-content-ui:
    fontFamily: "Andika, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  sheet-title:
    fontFamily: "Andika, system-ui, sans-serif"
    fontSize: "7mm"
    fontWeight: 700
  sheet-body:
    fontFamily: "Andika, system-ui, sans-serif"
    fontSize: "3.5mm"
    fontWeight: 400
  sheet-list:
    fontFamily: "Andika, system-ui, sans-serif"
    fontSize: "5mm"
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
  sheet-cell-min: "6mm"
  sheet-cell-max: "14mm"
  sheet-gap: "6mm"
  sheet-list-line: "7.5mm"
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
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.brand}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "8px 16px"
  button-secondary-hover:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.surface}"
  button-secondary-disabled:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
  button-tool:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.none}"
    padding: "4px 12px"
  button-tool-pressed:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
  button-close:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "8px 16px"
  input-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "8px 12px"
  word-list-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.sheet-content-ui}"
    rounded: "{rounded.none}"
    padding: "8px 12px"
  field-label:
    textColor: "{colors.muted}"
    typography: "{typography.label}"
  field-help:
    textColor: "{colors.muted}"
    typography: "{typography.caption}"
  docket:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.none}"
    padding: "20px"
    width: "22rem"
  docket-summary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    padding: "12px 20px"
  job-line:
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    padding: "12px 0"
  tone-wedge:
    textColor: "{colors.muted}"
    typography: "{typography.caption}"
    width: "80px"
    height: "12px"
  notice-panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.none}"
    padding: "16px"
  sheet-proof:
    backgroundColor: "{colors.sheet-paper}"
    rounded: "{rounded.none}"
    padding: "20px"
  proof-window:
    backgroundColor: "{colors.canvas}"
    rounded: "{rounded.none}"
    height: "80dvh"
  enlarge-dialog:
    backgroundColor: "{colors.canvas}"
    width: "100vw"
    height: "100dvh"
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

La interfaz es una mesa gris fría sobre la que descansa una hoja blanca a escala: la prueba de imprenta que el docente aprueba antes de fotocopiar. La hoja lleva alrededor sus marcas de corte en L y cruces de registro en azul acero, y encima una línea de trabajo que declara papel, páginas y código en cifras tabulares. Todo lo que no es la hoja se comporta como un parte de trabajo técnico: filetes de 1 px, esquinas rectas, etiquetas en mayúsculas con tracking. La densidad es media y ordenada; nada decora, todo encuadra la hoja.

Hay dos mundos cromáticos separados por construcción. La interfaz usa los colores del logotipo (azul acero y pizarra) sobre neutros fríos derivados del wordmark. La hoja usa únicamente cuatro grises definidos en código y compartidos por el renderizado SVG y el PDF, porque se imprime y se fotocopia; la cuña de tonos es la única muestra de esos grises fuera de la hoja, como leyenda. La profundidad no existe como sombra: la jerarquía es tonal (mesa frente a papel) y lineal (filetes).

El movimiento es seco: hover, pulsado e idioma actual cambian sin transiciones. El único movimiento es el paso de registro: al cambiar la ficha, las marcas pasan de 25 % a opaco en dos pasos durante 90 ms, y con reduced-motion no se animan. La construcción rechaza el panel SaaS de tarjetas redondeadas con sombra y la estética infantil de lápices de colores.

**Key Characteristics:**
- Mesa `canvas` gris fría bajo papel `surface` blanco; ninguna sombra.
- Filetes de 1 px en `line` como único recurso de separación y contención.
- Esquinas rectas en toda la interfaz.
- Marcas de corte y registro en azul acero alrededor de cada página de prueba.
- Archivo (400/600) para la interfaz; Andika (400/700) para la hoja y para el texto que acabará impreso.
- Cifras tabulares globales; papel, páginas y código siempre visibles en la línea de trabajo.
- Hoja en escala de grises con geometría en milímetros.
- Cambios de estado secos; un único paso de registro de 90 ms.

## Colors

Paleta de identidad restringida: un azul acero para la acción y el registro, un pizarra para los titulares y neutros fríos; la hoja vive aparte en grises puros.

### Primary
- **Azul acero del isotipo** (`brand`): relleno de la acción primaria (Imprimir), trazo y texto de la acción secundaria (Descargar PDF, Nueva sopa) que se rellena al pasar el cursor, marcas de corte y cruces de registro de la prueba, anillo de foco de 3 px, fondo de la selección de texto, `accent-color` y `caret-color` nativos. Es el único color saturado de la interfaz.
- **Pizarra del wordmark** (`brand-strong`): titulares de página (h1) y hover de la acción primaria.

### Neutral
- **Tinta pizarra** (`ink`): texto principal, valores de la línea de trabajo, avisos y errores, y relleno del botón de escala pulsado (contraste 12.5:1 sobre la mesa). Al 60 % es el velo tras el diálogo «Ampliar».
- **Pizarra atenuado** (`muted`): introducciones, etiquetas de campo y de la línea de trabajo, ayudas, resumen del parte plegado, placeholder del código, texto de la acción secundaria deshabilitada (5.6:1).
- **Filete frío** (`line`): bordes de campos, parte de trabajo, línea de trabajo (arriba y abajo), hoja, ventana 100 %, paneles de aviso, botones de herramienta, cabecera y pie; pulgar de las barras de desplazamiento. Solo trazos, nunca texto (3.1:1).
- **Papel** (`surface`): fondo de campos, parte de trabajo, paneles de aviso, botón Cerrar e idioma actual.
- **Mesa gris fría** (`canvas`): fondo de página, cabecera, pie, ventana 100 %, diálogo «Ampliar» y anclaje de anuncios; pista de las barras de desplazamiento.
- **Foco** (`focus`): alias del azul acero, reservado al contorno `:focus-visible`.

### Sheet grays
- **Negro de hoja** (`sheet-ink`): título, rótulos Nombre/Fecha y sus líneas, marco y letras de la cuadrícula, lista de palabras.
- **Gris medio de hoja** (`sheet-muted`): centro o docente, dominio del pie, cápsulas de solución e isotipo gris (`public/brand/mark-gray.svg`).
- **Gris claro de hoja** (`sheet-faint`): filetes bajo el encabezado y sobre el pie.
- **Blanco de hoja** (`sheet-paper`): fondo de la página.

### Named Rules
**The Steel Is for Action Rule.** El azul acero rellena o traza solo acciones (primaria rellena, secundaria con filete), las marcas de registro de la prueba, el foco y la selección. Los titulares van en pizarra, no en azul; el estado pulsado de un conmutador va en tinta, no en azul.

**The Grayscale Sheet Rule.** Dentro de la hoja solo existen los cuatro grises de `TONE_HEX`. Ningún token de interfaz entra en la hoja. Fuera de la hoja, los grises de hoja solo aparecen en la cuña de tonos, que es su leyenda.

**The Ink Notice Rule.** Avisos, errores y validaciones se escriben en tinta (600 cuando bloquean) dentro de paneles o líneas con filete; no existe color de alarma.

## Typography

**Display Font:** Archivo (con system-ui, sans-serif)
**Body Font:** Archivo (con system-ui, sans-serif)
**Sheet Font:** Andika (con system-ui, sans-serif)

**Character:** Archivo aporta un grotesco técnico y compacto para el parte de trabajo; Andika, diseñada para lectores iniciales, da a la hoja formas de letra inequívocas. Solo se sirve el subconjunto latin, localmente.

### Hierarchy
- **Display** (600, 1.875rem, 1.2): h1 de portada y de cada generador, en pizarra.
- **Title** (600, 1.125rem, 1.556): h2 «Vista previa» y nombre de cada generador en la portada.
- **Legend** (600, 1rem, 1.5): leyendas de grupo del parte («Encabezado de la ficha», «Cuadrícula»), título del resumen plegado y h3 del panel de palabras sin colocar.
- **Body** (400, 1rem, 1.5): introducciones (máx. 42rem en portada), valores de campos; texto de botones de acción en 600.
- **Body small** (400, 0.875rem): valores de la línea de trabajo (600), botones de escala y «Ampliar» (600), casillas, paneles de aviso, selector de idioma.
- **Label** (600, 0.75rem, 0.025em, mayúsculas): etiqueta visible de cada campo, subleyenda «Direcciones» y rótulos de la línea de trabajo (Papel, Páginas, Código).
- **Caption** (400, 0.75rem): ayudas de campo, contador de palabras, detalle del resumen plegado, leyenda de la cuña, mensajes por línea.
- **Sheet content in UI** (Andika 400, 1rem): texto que se imprimirá tal cual (la lista de palabras del campo; las palabras sin colocar en 600).
- **Sheet title / body / list / footer** (Andika 700 a 7 mm, ajustable hasta 4.5 mm y luego con elipsis; 400 a 3.5 mm; 400 a 5 mm; 400 a 2.5 mm ≈ 7 pt). Letras de cuadrícula en Andika 400 a 0.62 × celda. Sin kerning ni ligaduras: la maquetación mide con la suma de avances, igual que el PDF.

### Named Rules
**The 600 Ceiling Rule.** Archivo solo se carga en 400 y 600; ningún texto de interfaz usa 700. La negrita 700 es exclusiva de Andika en la hoja.

**The Two Faces Rule.** Archivo nunca aparece en la hoja. Andika aparece en la interfaz solo para mostrar texto que irá impreso en la hoja (palabras), nunca para etiquetas, títulos o controles.

**The Tabular Figures Rule.** `font-variant-numeric: tabular-nums` está activo en la raíz; toda cantidad (tamaños, contadores, código) se alinea en columnas.

## Layout

Contenedor centrado de 80rem (cabecera, pie, página de generador) y de 64rem en portada, con 16px de margen lateral. Ritmo vertical en pasos de 4px: 4px entre etiqueta y control, 8px entre campo y ayuda, 12px dentro de grupos, 16px de relleno tras el filete que abre cada grupo del parte, 20px entre grupos, 16px entre piezas de la columna de vista previa, 24px entre parte y vista previa y entre páginas de prueba, 32px entre columnas y tarjetas, 40px de respiración superior en portada.

Página de generador: a partir de 768px, rejilla de dos columnas con el parte de trabajo a 22rem como máximo, anclado arriba, y la vista previa ocupando el resto. La columna de vista previa apila en este orden: h2 «Vista previa»; línea de trabajo con Imprimir y Descargar PDF al inicio y después Papel, Páginas y Código; cuña de tonos; avisos bloqueantes y panel de palabras sin colocar cuando existen; conmutador de escala; páginas de prueba. A partir de 1024px, si hay anuncio lateral, se añade una columna fija de 300px a la derecha, fuera del lienzo de la herramienta.

Móvil (por debajo de 768px): el parte de trabajo empieza plegado arriba mostrando un resumen (palabras · tamaño · código) para que la hoja entre en el primer viewport; debajo, la misma columna de vista previa a todo el ancho, con «Ampliar» en lugar del conmutador de escala.

Escala de la prueba: «Ajustar» escala la hoja al ancho disponible; «100 %» la monta a tamaño físico en mm dentro de una ventana con filete sobre la mesa, de 80dvh de alto como máximo, con canal de barra estable y barra fina en filete sobre mesa. «Ampliar» abre un diálogo a pantalla completa sobre la mesa con las páginas a tamaño físico y una barra de cierre fija arriba.

Portada: rejilla de pruebas de hoja (1 columna, 2 a 640px, 3 a 1024px), cada prueba limitada a 16rem; la sopa de letras muestra una ficha real generada con el vocabulario de ejemplo y código fijo, los generadores aún sin construir muestran solo el marco. Pie siempre al fondo del viewport (cuerpo en columna de altura mínima `100dvh`).

### La hoja
Geometría en mm: A4 210×297 o Carta 215.9×279.4, margen de 12 mm. Título centrado con línea base a 7 mm; centro o docente a 13 mm; Nombre y Fecha a 23 mm con líneas de 0.2 mm; filete de encabezado de 0.3 mm a 28 mm; contenido desde 32 mm; filete de pie de 0.2 mm a 8 mm del margen inferior, isotipo de 5 mm de alto y dominio a 2 mm de él. En impresión se monta a tamaño físico con `@page` sin márgenes y todo lo demás desaparece.

Sopa de letras (`WORDSEARCH_LAYOUT`): la celda mide entre 6 y 14 mm, la mayor que quepa reservando alto para la lista; la cuadrícula se centra en horizontal arriba del área de contenido, con marco de 0.4 mm en negro y letras centradas por altura de mayúscula. A 6 mm por debajo, la lista de palabras en orden alfabético del idioma, a 5 mm con interlínea de 7.5 mm, en columnas del ancho de la palabra más larga más 6 mm, alineada al borde izquierdo de la cuadrícula y sin rebasar su ancho. Si la lista no cabe, continúa en páginas de alumno adicionales con el mismo marco. La página de soluciones lleva «Título — Soluciones», omite Nombre/Fecha y conserva la cuadrícula exactamente en la misma posición que la página del alumno; las soluciones son cápsulas de 0.78 × celda en gris medio de 0.35 mm. Si la celda no llega a 6 mm, no se maqueta: se informa del tamaño máximo admisible.

### Named Rules
**The Off-Canvas Ads Rule.** Los anuncios solo ocupan la columna lateral de 300px, el anclaje inferior móvil o el cuerpo del artículo; nunca el lienzo de la herramienta, nunca junto a acciones y nunca en impresión.

**The Same Position Rule.** Todas las páginas de una ficha comparten marco; la cuadrícula de soluciones ocupa la misma posición que la del alumno para poder superponerlas.

**The Named Scales Rule.** La prueba solo se muestra en escalas con nombre: Ajustar o 100 % físico. No hay zoom continuo.

## Elevation & Depth

Sistema plano sin ninguna sombra. La profundidad se expresa por contraste tonal (papel blanco sobre mesa gris fría) y por filetes de 1 px en `line`. El foco es el único trazo que crece: contorno sólido de 3 px en azul acero con 2 px de separación. La única capa superpuesta es el diálogo «Ampliar», que ocupa toda la pantalla sobre un velo de tinta al 60 %; no flota ni lleva sombra.

### Named Rules
**The Filete Rule.** Contener es trazar: un borde de 1 px en `line` delimita campos, parte de trabajo, línea de trabajo, hoja, ventana 100 %, paneles de aviso, cabecera y pie. No se usan sombras ni fondos tintados para separar.

## Shapes

Esquinas rectas (0px) en toda la interfaz: campos, botones, parte de trabajo, marco de la hoja, ventana 100 %, paneles, selector de idioma, hueco publicitario. Los rectángulos se leen como formularios impresos. El hueco publicitario sin rellenar es el único borde discontinuo de la interfaz, para distinguir espacio reservado de contenido.

Las marcas de prueba son trazos de 1px en azul acero: esquinas en L con brazos de 12 de 20 unidades en las cuatro esquinas del passe-partout de 20px, y cruces de registro (círculo más cruz, 16px) centradas arriba y abajo. Son decorativas, `aria-hidden` y nunca se imprimen.

Dentro de la hoja la geometría la dictan los primitivos: líneas finas de 0.2–0.4 mm y, para las soluciones de la sopa de letras, cápsulas de extremos redondos. Ese redondeo pertenece al lenguaje de la hoja y no contradice la esquina recta de la interfaz.

## Components

### Buttons
Sólidos o trazados, rectos y sin adorno.
- **Shape:** esquina recta (0px).
- **Primary:** relleno azul acero, texto blanco en Archivo 600, 8px × 16px. Imprimir, siempre primera en la línea de trabajo; también la acción que resuelve el panel de palabras sin colocar.
- **Hover / Focus:** hover cambia en seco a pizarra; foco con el contorno global de 3 px.
- **Secondary:** filete de 1 px y texto en azul acero, fondo transparente, mismo relleno; al pasar el cursor se rellena en azul acero con texto blanco. Descargar PDF y Nueva sopa.
- **Secondary disabled / working:** filete y texto pasan a `line` y `muted` y el hover no rellena. Descargar PDF se deshabilita cuando la ficha no se puede maquetar y mientras prepara el archivo, con la etiqueta «Preparando PDF…» y `aria-busy`. Si falla, una línea en tinta a todo el ancho explica si faltaba conexión o si falló la preparación, recordando que la impresión directa sigue disponible.
- **Tool:** filete de 1 px en `line`, texto tinta 0.875rem 600, 4px × 12px. Conmutador de escala (Ajustar / 100 %, con `aria-pressed`; pulsado en tinta con texto blanco), «Ampliar» y Reintentar.
- **Close:** fondo papel, filete, tinta 600, 8px × 16px, en la barra fija del diálogo.

### Inputs / Fields
Campos de parte de trabajo.
- **Style:** fondo papel, filete de 1 px en `line`, esquina recta, 8px × 12px, texto 1rem en tinta; `select` nativo con el mismo trazo. Casillas nativas de 16px con `accent-color` azul acero.
- **Label:** etiqueta encima en mayúsculas con tracking (label, `muted`), 4px de separación.
- **Help:** caption `muted` debajo, a 8px; cuando hay contador, ayuda a la izquierda y cifra tabular a la derecha.
- **Focus:** contorno global de 3 px en azul acero; caret azul acero.
- **Error:** `aria-invalid` y mensaje caption 600 en tinta bajo la ayuda (ver The Ink Notice Rule). No hay borde de error coloreado.

### Parte de trabajo (docket)
Formulario en papel con filete de 1 px y 20px de relleno, máximo 22rem, anclado arriba. Cada grupo tras el primero abre con un filete superior y 16px de relleno: encabezado de la ficha, palabras, cuadrícula, papel, código, incluir soluciones. En móvil es un `details` plegado cuyo `summary` (12px × 20px) muestra «Opciones de la ficha» en 600 y debajo el detalle en caption tabular (palabras · tamaño · código); a partir de 768px siempre está abierto y el resumen se oculta.

### Campo de palabras
Área de texto de 8 filas redimensionable en vertical, en Andika para ver las palabras como se imprimirán, sin corrector. Debajo, ayuda y contador «n de 50 palabras»; después, mensajes por línea en caption tinta con `aria-live`.

### Opciones de cuadrícula
Grupo con leyenda «Cuadrícula»: selector de tamaño en cifras tabulares («12 × 12») y subgrupo «Direcciones» con cuatro casillas en dos columnas (Horizontal, Vertical, Diagonal, Invertidas).

### Campo de código
Entrada de texto tabular cuyo placeholder muestra en `muted` el código activo, para que dejarlo vacío conserve la ficha visible; ayuda en caption, error en tinta y acción secundaria «Nueva sopa» debajo, alineada al inicio.

### Línea de trabajo (job line)
Franja entre dos filetes horizontales de 1 px, 12px de relleno vertical, sin fondo. Empieza con las acciones (8px entre ellas) y sigue con pares rótulo–valor: rótulo en label `muted`, valor en body-sm 600 tinta tabular, 20px entre pares. Hace envoltura en móvil manteniendo las acciones primero.

### Cuña de tonos (tone wedge)
Tira de cinco celdas de 16×12px, de negro a blanco, dentro de un filete de 1 px, con la leyenda «Tonos de impresión» en caption `muted` a 8px. Es la leyenda de tono de la hoja, fuera de ella.

### Prueba de hoja (proof sheet)
Cada página es un passe-partout de 20px sobre la mesa con las marcas de corte y registro, y dentro la hoja SVG en papel con filete de 1 px; las páginas se separan 24px. Al cambiar la ficha (palabras, código, encabezado, papel o soluciones) las marcas repiten el paso de registro. En escala 100 %, la pila entra en la ventana con filete descrita en Layout. En portada, la prueba es la tarjeta de cada generador (8px de passe-partout, máx. 16rem, sin marcas) con título y descripción debajo; el título se subraya al pasar el cursor.

### Diálogo «Ampliar»
Diálogo modal nativo a pantalla completa sobre la mesa, desplazable en ambos ejes, con barra superior fija (mesa, filete inferior, Cerrar a la derecha) y las páginas a tamaño físico con filete, separadas 24px. Solo se ofrece por debajo de 768px.

### Paneles de aviso
Papel con filete de 1 px, 16px de relleno, texto body-sm en tinta. El aviso bloqueante (`role="alert"`) lista los problemas y, si falló el generador, añade Reintentar. El panel de palabras sin colocar lleva h3 legend, la lista de palabras en Andika 600, sugerencias en lista con viñeta y la acción primaria «Generar sin estas palabras».

### Navigation
Cabecera y pie sobre la mesa, separados por un filete. Logotipo horizontal a 36px de alto a la izquierda; selector de idioma a la derecha: el idioma actual es un recuadro de papel con filete y texto en 600, los demás son texto atenuado que gana filete y tinta al pasar el cursor. Mismo tratamiento en móvil.

### Ad placeholder
Hueco reservado con dimensiones fijas (300×600 lateral, 320×50 anclaje, 280px mínimo in-article), borde discontinuo de 1 px sobre la mesa y rótulo caption `muted` con el formato; se oculta en impresión. El anclaje móvil es una franja fija inferior sobre la mesa con filete superior.

### Pendiente
Elementos del contrato de dirección que aún no existen o no están resueltos y no deben tratarse como componentes disponibles:
- Indicio visible de desplazamiento en la ventana 100 % cuando el sistema oculta las barras (decisión del operador pendiente).
- Anclaje publicitario móvil: debe ocultarse cerca de las acciones o pasar al flujo antes de activarse en la Fase 6; hoy está desactivado en producción.
- Techo del mundo sin usar: línea de datos en el margen de la prueba (página n/N · papel · código), cuña pegada a la hoja como barra de color y marca de rol de página (alumno / soluciones); se valorarán con crucigrama y cuadernillo.

## Do's and Don'ts

### Do:
- **Do** poner cada página de prueba en papel con filete de 1 px sobre la mesa `canvas`, rodeada de sus marcas de corte y registro en azul acero.
- **Do** abrir la vista previa con la línea de trabajo: acciones primero (Imprimir relleno, PDF con filete), después papel, páginas y código en cifras tabulares.
- **Do** delimitar con bordes de 1 px en `line` y esquinas rectas (0px).
- **Do** reservar el azul acero para acciones, marcas de registro, foco y selección; titulares en pizarra `brand-strong`.
- **Do** usar Archivo solo en 400 y 600, y Andika en la hoja o para mostrar texto que irá impreso.
- **Do** dibujar la hoja exclusivamente con los grises de `TONE_HEX` y medidas en mm, compartidas por SVG y PDF.
- **Do** etiquetar cada campo con su etiqueta visible en mayúsculas con tracking de 0.75rem.
- **Do** escribir avisos y errores en tinta dentro de paneles con filete.
- **Do** cambiar estados en seco; el único movimiento es el paso de registro de 90 ms en dos pasos, anulado con reduced-motion.

### Don't:
- **Don't** añadir sombras ni esquinas redondeadas a la interfaz.
- **Don't** usar `font-bold` (700) con Archivo: no está cargado y el navegador lo sintetiza.
- **Don't** introducir colores de interfaz, ni la variante terracota #D57044, en la hoja o en la paleta de la herramienta.
- **Don't** usar `line` como color de texto: no alcanza contraste de texto.
- **Don't** ofrecer zoom continuo: solo Ajustar, 100 % y Ampliar.
- **Don't** colocar anuncios dentro del lienzo de la herramienta, junto a acciones o en impresión.
