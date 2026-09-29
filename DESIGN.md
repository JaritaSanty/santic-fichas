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
  sheet-digit:
    fontFamily: "Andika, system-ui, sans-serif"
    fontSize: "5mm"
    fontWeight: 400
  sheet-inline:
    fontFamily: "Andika, system-ui, sans-serif"
    fontSize: "4.5mm"
    fontWeight: 400
  sheet-index:
    fontFamily: "Andika, system-ui, sans-serif"
    fontSize: "2.5mm"
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
  sheet-line-gap: "2.2mm"
  sheet-answer-gap: "7mm"
  sheet-block-gap: "6mm"
  sheet-inline-line: "11mm"
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
  radio-option:
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    size: "16px"
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
  sheet-state:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.none}"
    padding: "8px 16px"
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

La interfaz es una mesa gris fría sobre la que descansa una hoja blanca a escala: la prueba de imprenta que el docente aprueba antes de fotocopiar. La hoja lleva alrededor sus marcas de corte en L y cruces de registro en azul acero, y encima una línea de trabajo que declara papel, hojas, páginas y código en cifras tabulares. Todo lo que no es la hoja se comporta como un parte de trabajo técnico: filetes de 1 px, esquinas rectas, etiquetas en mayúsculas con tracking. La densidad es media y ordenada; nada decora, todo encuadra la hoja.

Dos generadores comparten hoy esa misma superficie —sopa de letras y cuadernillo de operaciones— y no se distinguen por estilo: cambian los campos del parte y lo que se dibuja dentro de la hoja; el marco, la línea de trabajo, la cuña, el zoom y el diálogo «Ampliar» son los mismos. La hoja, además, se autodescribe: cada página lleva en su margen una línea de datos (`Página n/N · papel · código`) y una pestaña con su rol (alumno / soluciones), pensadas para una pila de fotocopias.

Hay dos mundos cromáticos separados por construcción. La interfaz usa los colores del logotipo (azul acero y pizarra) sobre neutros fríos derivados del wordmark. La hoja usa únicamente cuatro grises definidos en código y compartidos por el renderizado SVG y el PDF, porque se imprime y se fotocopia; la cuña de tonos es la única muestra de esos grises fuera de la hoja, como leyenda. La profundidad no existe como sombra: la jerarquía es tonal (mesa frente a papel) y lineal (filetes).

El movimiento es seco: hover, pulsado e idioma actual cambian sin transiciones. El único movimiento es el paso de registro: al cambiar la ficha, las marcas pasan de 25 % a opaco en dos pasos durante 90 ms, y con reduced-motion no se animan. La construcción rechaza el panel SaaS de tarjetas redondeadas con sombra y la estética infantil de lápices de colores.

**Key Characteristics:**
- Mesa `canvas` gris fría bajo papel `surface` blanco; ninguna sombra.
- Filetes de 1 px en `line` como único recurso de separación y contención.
- Esquinas rectas en toda la interfaz.
- Marcas de corte y registro en azul acero alrededor de cada página de prueba.
- Archivo (400/600) para la interfaz; Andika (400/700) para la hoja y para el texto que acabará impreso.
- Cifras tabulares globales; papel, hojas, páginas y código siempre visibles en la línea de trabajo.
- Hoja en escala de grises con geometría en milímetros y marca de página en el margen.
- Cambios de estado secos; un único paso de registro de 90 ms.

## Colors

Paleta de identidad restringida: un azul acero para la acción y el registro, un pizarra para los titulares y neutros fríos; la hoja vive aparte en grises puros.

### Primary
- **Azul acero del isotipo** (`brand`): relleno de la acción primaria (Imprimir), trazo y texto de la acción secundaria (Descargar PDF, Nueva sopa, Nuevo cuadernillo) que se rellena al pasar el cursor, marcas de corte y cruces de registro de la prueba, anillo de foco de 3 px, fondo de la selección de texto, `accent-color` (casillas y botones de opción) y `caret-color` nativos. Es el único color saturado de la interfaz.
- **Pizarra del wordmark** (`brand-strong`): titulares de página (h1) y hover de la acción primaria.

### Neutral
- **Tinta pizarra** (`ink`): texto principal, valores de la línea de trabajo, avisos y errores, y relleno del botón de escala pulsado (contraste 12.5:1 sobre la mesa). Al 60 % es el velo tras el diálogo «Ampliar».
- **Pizarra atenuado** (`muted`): introducciones, etiquetas de campo y de la línea de trabajo, ayudas, resumen del parte plegado, placeholder del código, entrada de la lista de sugerencias, estado con nombre sobre la hoja, texto de la acción secundaria deshabilitada (5.6:1).
- **Filete frío** (`line`): bordes de campos, parte de trabajo, línea de trabajo (arriba y abajo), hoja, ventana 100 %, paneles de aviso, botones de herramienta, cabecera y pie; viñeta de las sugerencias; pulgar de las barras de desplazamiento. Solo trazos, nunca texto (3.1:1).
- **Papel** (`surface`): fondo de campos, parte de trabajo, paneles de aviso, botón Cerrar, idioma actual y pastilla del estado con nombre.
- **Mesa gris fría** (`canvas`): fondo de página, cabecera, pie, ventana 100 %, diálogo «Ampliar» y anclaje de anuncios; pista de las barras de desplazamiento.
- **Foco** (`focus`): alias del azul acero, reservado al contorno `:focus-visible`.

### Sheet grays
- **Negro de hoja** (`sheet-ink`): título, rótulos Nombre/Fecha y sus líneas, marco y letras de la cuadrícula, lista de palabras, cifras y rayas de las operaciones (columnas, casita, galera y renglón en línea) y texto de la pestaña de rol cuando va rellena (soluciones).
- **Gris medio de hoja** (`sheet-muted`): centro o docente, dominio del pie, cápsulas de solución, isotipo gris (`public/brand/mark-gray.svg`), índice del ejercicio, línea de datos del margen y texto de la pestaña de rol del alumno.
- **Gris claro de hoja** (`sheet-faint`): filetes bajo el encabezado y sobre el pie; trazo de la pestaña de rol del alumno y relleno de la pestaña de soluciones.
- **Blanco de hoja** (`sheet-paper`): fondo de la página.

### Named Rules
**The Steel Is for Action Rule.** El azul acero rellena o traza solo acciones (primaria rellena, secundaria con filete), las marcas de registro de la prueba, el foco y la selección. Los titulares van en pizarra, no en azul; el estado pulsado de un conmutador va en tinta, no en azul.

**The Grayscale Sheet Rule.** Dentro de la hoja solo existen los cuatro grises de `TONE_HEX`. Ningún token de interfaz entra en la hoja. Fuera de la hoja, los grises de hoja solo aparecen en la cuña de tonos, que es su leyenda. La cuña intercala un gris 50 % (`#808080`) entre medio y tenue solo como escalón de la leyenda; no es tinta de hoja y no puede usarse dentro de ella.

**The Ink Notice Rule.** Avisos, errores y validaciones se escriben en tinta (600 cuando bloquean) dentro de paneles o líneas con filete; no existe color de alarma.

## Typography

**Display Font:** Archivo (con system-ui, sans-serif)
**Body Font:** Archivo (con system-ui, sans-serif)
**Sheet Font:** Andika (con system-ui, sans-serif)

**Character:** Archivo aporta un grotesco técnico y compacto para el parte de trabajo; Andika, diseñada para lectores iniciales, da a la hoja formas de letra inequívocas. Solo se sirve el subconjunto latin, localmente.

### Hierarchy
- **Display** (600, 1.875rem, 1.2): h1 de portada y de cada generador, en pizarra.
- **Title** (600, 1.125rem, 1.556): h2 «Vista previa» y nombre de cada generador en la portada.
- **Legend** (600, 1rem, 1.5): leyendas de grupo del parte («Encabezado de la ficha», «Cuadrícula», «Operaciones», «Números», «Ejercicios y disposición»), título del resumen plegado y h3 de los paneles de aviso.
- **Body** (400, 1rem, 1.5): introducciones (máx. 42rem en portada), valores de campos; texto de botones de acción en 600.
- **Body small** (400, 0.875rem): valores de la línea de trabajo (600), botones de escala y «Ampliar» (600), casillas y botones de opción, paneles de aviso, estado con nombre sobre la hoja (600, `muted`), selector de idioma.
- **Label** (600, 0.75rem, 0.025em, mayúsculas): etiqueta visible de cada campo, subleyendas de grupo («Direcciones», «Primer número», «Llevada», «División», «Disposición») y rótulos de la línea de trabajo (Papel, Hojas, Páginas, Código).
- **Caption** (400, 0.75rem): ayudas de campo, contador de palabras, detalle del resumen plegado, leyenda de la cuña, mensajes por línea.
- **Sheet content in UI** (Andika 400, 1rem): texto que se imprimirá tal cual (la lista de palabras del campo; las palabras sin colocar en 600).
- **Sheet title / body / list / footer** (Andika 700 a 7 mm, ajustable hasta 4.5 mm y luego con elipsis; 400 a 3.5 mm; 400 a 5 mm; 400 a 2.5 mm ≈ 7 pt). Letras de cuadrícula en Andika 400 a 0.62 × celda.
- **Sheet digit / inline / index** (Andika 400 a 5 mm las cifras en columnas y los dos esquemas de división; 400 a 4.5 mm la expresión del renglón en línea; 400 a 2.5 mm el índice del ejercicio, en gris medio). La línea de datos y la pestaña de rol del margen usan también 2.5 mm. Sin kerning ni ligaduras: la maquetación mide con la suma de avances, igual que el PDF.

### Named Rules
**The 600 Ceiling Rule.** Archivo solo se carga en 400 y 600; ningún texto de interfaz usa 700. La negrita 700 es exclusiva de Andika en la hoja.

**The Two Faces Rule.** Archivo nunca aparece en la hoja. Andika aparece en la interfaz solo para mostrar texto que irá impreso en la hoja (palabras), nunca para etiquetas, títulos o controles.

**The Tabular Figures Rule.** `font-variant-numeric: tabular-nums` está activo en la raíz; toda cantidad (tamaños, cantidades, columnas, contadores, código) se alinea en columnas.

## Layout

Contenedor centrado de 80rem (cabecera, pie, página de generador) y de 64rem en portada, con 16px de margen lateral. Ritmo vertical en pasos de 4px: 4px entre etiqueta y control, 8px entre campo y ayuda, 12px dentro de grupos, 16px de relleno tras el filete que abre cada grupo del parte, 20px entre grupos, 16px entre piezas de la columna de vista previa, 24px entre parte y vista previa y entre páginas de prueba, 32px entre columnas y tarjetas, 40px de respiración superior en portada.

Página de generador (idéntica en los dos generadores): a partir de 768px, rejilla de dos columnas con el parte de trabajo a 22rem como máximo, anclado arriba, y la vista previa ocupando el resto. La columna de vista previa apila en este orden: h2 «Vista previa»; línea de trabajo con Imprimir y Descargar PDF al inicio y después Papel, Hojas (solo en el cuadernillo), Páginas y Código; cuña de tonos; avisos bloqueantes, avisos vivos y panel de ayuda (palabras sin colocar o ficha corta) cuando existen; conmutador de escala; páginas de prueba. A partir de 1024px, si hay anuncio lateral, se añade una columna fija de 300px a la derecha, fuera del lienzo de la herramienta.

Móvil (por debajo de 768px): el parte de trabajo empieza plegado arriba mostrando un resumen (sopa: palabras · tamaño · código; cuadernillo: n operaciones · código) para que la hoja entre en el primer viewport; debajo, la misma columna de vista previa a todo el ancho, con «Ampliar» en lugar del conmutador de escala.

Escala de la prueba: «Ajustar» escala la hoja al ancho disponible; «100 %» la monta a tamaño físico en mm dentro de una ventana con filete sobre la mesa, de 80dvh de alto como máximo, con canal de barra estable y barra fina en filete sobre mesa. «Ampliar» abre un diálogo a pantalla completa sobre la mesa con las páginas a tamaño físico y una barra de cierre fija arriba.

Portada: rejilla de pruebas de hoja (1 columna, 2 a 640px, 3 a 1024px), cada prueba limitada a 16rem; sopa de letras y cuadernillo muestran una ficha real generada con datos de ejemplo y código fijo (con su marca de página incluida), los generadores aún sin construir muestran solo el marco. Pie siempre al fondo del viewport (cuerpo en columna de altura mínima `100dvh`).

### La hoja
Geometría en mm: A4 210×297 o Carta 215.9×279.4, margen de 12 mm. Título centrado con línea base a 7 mm; centro o docente a 13 mm; Nombre y Fecha a 23 mm con líneas de 0.2 mm; filete de encabezado de 0.3 mm a 28 mm; contenido desde 32 mm; filete de pie de 0.2 mm a 8 mm del margen inferior, isotipo de 5 mm de alto y dominio a 2 mm de él. En impresión se monta a tamaño físico con `@page` sin márgenes y todo lo demás desaparece.

**Marca de página (`src/layout/common/frame.ts`), común a todos los generadores.** Se aplica al final, cuando ya se sabe cuántas hojas hay, y va entera en los márgenes:
- **Línea de datos**: `Página n/N · papel · código` a 2.5 mm en gris medio, alineada a la derecha y en la misma línea base que el dominio del pie. Sin código, no lo menciona; y se recorta por ancho medido contra el sitio que deja el pie, nunca por número de caracteres, para no imprimirse sobre el isotipo y el dominio.
- **Pestaña de rol**: colgada del filete del encabezado por la derecha, de 28 mm a 31.4 mm desde el margen (0.6 mm de aire hasta la caja de contenido), con 1.8 mm de relleno lateral y texto de 2.5 mm. La hoja del alumno lleva filete de 0.2 mm en gris claro con texto gris medio; la de soluciones va **rellena** en gris claro con texto negro, que es lo único que se distingue en una pila vista en miniatura.

Sopa de letras (`WORDSEARCH_LAYOUT`): la celda mide entre 6 y 14 mm, la mayor que quepa reservando alto para la lista; la cuadrícula se centra en horizontal arriba del área de contenido, con marco de 0.4 mm en negro y letras centradas por altura de mayúscula. A 6 mm por debajo, la lista de palabras en orden alfabético del idioma, a 5 mm con interlínea de 7.5 mm, en columnas del ancho de la palabra más larga más 6 mm, alineada al borde izquierdo de la cuadrícula y sin rebasar su ancho. Si la lista no cabe, continúa en páginas de alumno adicionales con el mismo marco. La página de soluciones lleva «Título — Soluciones», omite Nombre/Fecha y conserva la cuadrícula exactamente en la misma posición que la página del alumno; las soluciones son cápsulas de 0.78 × celda en gris medio de 0.35 mm. Si la celda no llega a 6 mm, no se maqueta: se informa del tamaño máximo admisible.

Cuadernillo de operaciones (`ARITHMETIC_LAYOUT`): retícula de bloques dentro de la caja de contenido, de 2 a 5 columnas pedidas y recortadas a las que caben; todos los bloques usan el ancho del más ancho, el paso horizontal se estira hasta 14 mm de hueco y, si sobra ancho, la retícula se centra en vez de separarlos más. Entre filas, 6 mm (en la disposición en línea el renglón de 11 mm ya es el paso completo). Tres esquemas:
- **Columnas** (suma, resta, multiplicación): índice arriba a la izquierda; operandos alineados a la derecha en la columna de cifras a 5 mm; el signo cuelga a 2.2 mm de esa columna, no del borde de la hoja; raya de 0.3 mm desde el signo hasta el borde derecho y hueco de respuesta de 7 mm bajo ella. El hueco reserva siempre el ancho del resultado, así la hoja de soluciones usa la misma retícula que la del alumno.
- **División**: casita en castellano (dividendo a la izquierda, trazo vertical, divisor y raya a la derecha, cociente bajo la raya y resto bajo el dividendo) y galera en inglés (divisor a la izquierda, corchete sobre el dividendo, cociente encima alineado por las unidades y resto como cola ` r 2`). Cada idioma dibuja la división como la enseña.
- **En línea**: `23 + 45 = ` a 4.5 mm sobre un renglón de 11 mm, con el índice en un ancho reservado fijo y, tras el igual, una raya de respuesta de 20 mm (o la solución escrita, lo que más ocupe).

Las páginas de soluciones repiten exactamente la paginación, los índices y la retícula de las del alumno, y van después de todas ellas.

### Named Rules
**The Off-Canvas Ads Rule.** Los anuncios solo ocupan la columna lateral de 300px, el anclaje inferior móvil o el cuerpo del artículo; nunca el lienzo de la herramienta, nunca junto a acciones y nunca en impresión.

**The Same Position Rule.** Todas las páginas de una ficha comparten marco; la cuadrícula y los bloques de la hoja de soluciones ocupan la misma posición que los del alumno para poder superponerlos.

**The Named Scales Rule.** La prueba solo se muestra en escalas con nombre: Ajustar o 100 % físico. No hay zoom continuo.

**The Margin Stamp Rule.** La marca de página (línea de datos y pestaña de rol) vive entera en los márgenes de la hoja, fuera de la caja de contenido y con los grises y la tipografía de la hoja. Ningún generador la mueve, la repinta ni le añade contenido: si algo hay que decir dentro de la caja, no es marca de página.

**The Row Baseline Rule.** En una fila de ejercicios los bloques se alinean por la línea base del primer operando, no por su borde superior (la galera reserva el hueco del cociente encima del dividendo). El índice, en cambio, se ancla al borde de la **fila**: los ejercicios de una fila se numeran en un solo renglón, sea cual sea el esquema que venga debajo. El precio aceptado es de capacidad, no de dibujo: una hoja inglesa mixta cabe a 20 ejercicios por hoja Carta en vez de 28.

## Elevation & Depth

Sistema plano sin ninguna sombra. La profundidad se expresa por contraste tonal (papel blanco sobre mesa gris fría) y por filetes de 1 px en `line`. El foco es el único trazo que crece: contorno sólido de 3 px en azul acero con 2 px de separación. Las únicas capas superpuestas son el diálogo «Ampliar», que ocupa toda la pantalla sobre un velo de tinta al 60 %, y la pastilla del estado con nombre sobre la hoja, que es papel con filete apoyado en la prueba; ninguno flota ni lleva sombra.

### Named Rules
**The Filete Rule.** Contener es trazar: un borde de 1 px en `line` delimita campos, parte de trabajo, línea de trabajo, hoja, ventana 100 %, paneles de aviso, cabecera y pie. No se usan sombras ni fondos tintados para separar.

## Shapes

Esquinas rectas (0px) en toda la interfaz: campos, botones, parte de trabajo, marco de la hoja, ventana 100 %, paneles, pastilla de estado, selector de idioma, hueco publicitario. Los rectángulos se leen como formularios impresos. El hueco publicitario sin rellenar es el único borde discontinuo de la interfaz, para distinguir espacio reservado de contenido.

Las marcas de prueba son trazos de 1px en azul acero: esquinas en L con brazos de 12 de 20 unidades en las cuatro esquinas del passe-partout de 20px, y cruces de registro (círculo más cruz, 16px) centradas arriba y abajo. Son decorativas, `aria-hidden` y nunca se imprimen.

Dentro de la hoja la geometría la dictan los primitivos: líneas finas de 0.2–0.4 mm (filetes del marco, rayas de las operaciones, corchete y casita de la división, pestaña de rol) y, para las soluciones de la sopa de letras, cápsulas de extremos redondos. Ese redondeo pertenece al lenguaje de la hoja y no contradice la esquina recta de la interfaz.

## Components

### Buttons
Sólidos o trazados, rectos y sin adorno.
- **Shape:** esquina recta (0px).
- **Primary:** relleno azul acero, texto blanco en Archivo 600, 8px × 16px. Imprimir, siempre primera en la línea de trabajo; también la acción que resuelve el panel de palabras sin colocar o el de ficha corta.
- **Hover / Focus:** hover cambia en seco a pizarra; foco con el contorno global de 3 px.
- **Secondary:** filete de 1 px y texto en azul acero, fondo transparente, mismo relleno; al pasar el cursor se rellena en azul acero con texto blanco. Descargar PDF, Nueva sopa, Nuevo cuadernillo.
- **Secondary disabled / working:** filete y texto pasan a `line` y `muted` y el hover no rellena. Descargar PDF se deshabilita cuando la ficha no se puede maquetar, cuando la hoja no lleva ejercicios y mientras prepara el archivo, con la etiqueta «Preparando PDF…» y `aria-busy`. Si falla, una línea en tinta a todo el ancho explica si faltaba conexión o si falló la preparación, recordando que la impresión directa sigue disponible.
- **Tool:** filete de 1 px en `line`, texto tinta 0.875rem 600, 4px × 12px. Conmutador de escala (Ajustar / 100 %, con `aria-pressed`; pulsado en tinta con texto blanco), «Ampliar» y Reintentar.
- **Close:** fondo papel, filete, tinta 600, 8px × 16px, en la barra fija del diálogo.

### Inputs / Fields
Campos de parte de trabajo.
- **Style:** fondo papel, filete de 1 px en `line`, esquina recta, 8px × 12px, texto 1rem en tinta; `select` nativo con el mismo trazo. Las cantidades se escriben en campos de texto con `inputMode="numeric"` y cifras tabulares (nunca `type="number"`, que añadiría flechas), y los rangos se pueden rellenar con un selector de dígitos que muestra «—» cuando el rango escrito no corresponde a ninguno.
- **Label:** etiqueta encima en mayúsculas con tracking (label, `muted`), 4px de separación.
- **Help:** caption `muted` debajo, a 8px; cuando hay contador, ayuda a la izquierda y cifra tabular a la derecha.
- **Choice:** casillas y botones de opción nativos de 16px con `accent-color` azul acero, etiqueta body-sm en tinta a 8px, en una o dos columnas.
- **Focus:** contorno global de 3 px en azul acero; caret azul acero.
- **Error:** `aria-invalid` y mensaje caption 600 en tinta bajo la ayuda (ver The Ink Notice Rule). No hay borde de error coloreado.

### Parte de trabajo (docket)
Formulario en papel con filete de 1 px y 20px de relleno, máximo 22rem, anclado arriba. Cada grupo tras el primero abre con un filete superior y 16px de relleno; el filete va en el envoltorio, no en el `fieldset`, para que la leyenda no parta la línea. Sopa: encabezado, palabras, cuadrícula, papel, código, incluir soluciones. Cuadernillo: encabezado, operaciones, números, ejercicios y disposición, papel, código, incluir soluciones. En móvil es un `details` plegado cuyo `summary` (12px × 20px) muestra «Opciones de la ficha» en 600 y debajo el detalle en caption tabular; a partir de 768px siempre está abierto y el resumen se oculta.

### Campo de palabras
Área de texto de 8 filas redimensionable en vertical, en Andika para ver las palabras como se imprimirán, sin corrector. Debajo, ayuda y contador «n de 50 palabras»; después, mensajes por línea en caption tinta con `aria-live`.

### Opciones de cuadrícula
Grupo con leyenda «Cuadrícula»: selector de tamaño en cifras tabulares («12 × 12») y subgrupo «Direcciones» con cuatro casillas en dos columnas (Horizontal, Vertical, Diagonal, Invertidas).

### Opciones del cuadernillo
Tres grupos: «Operaciones» (cuatro casillas en dos columnas), «Números» (mínimo y máximo de cada operando en dos columnas, más el selector de dígitos y una ayuda común) y «Ejercicios y disposición» (llevada y división como botones de opción, número de operaciones de 1 a 200, disposición en columnas o en línea y columnas por hoja de 2 a 5, con la ayuda «si no caben tantas, se usan las que quepan»). Cada campo numérico repite bajo sí el problema que le toca, en caption 600 tinta; el aviso bloqueante es solo el resumen.

### Campo de código
Entrada de texto tabular cuyo placeholder muestra en `muted` el código activo, para que dejarlo vacío conserve la ficha visible; ayuda en caption, error en tinta y acción secundaria («Nueva sopa», «Nuevo cuadernillo») debajo, alineada al inicio.

### Línea de trabajo (job line)
Franja entre dos filetes horizontales de 1 px, 12px de relleno vertical, sin fondo. Empieza con las acciones (8px entre ellas) y sigue con pares rótulo–valor: rótulo en label `muted`, valor en body-sm 600 tinta tabular, 20px entre pares. Hace envoltura en móvil manteniendo las acciones primero. Los pares son Papel, Páginas y Código en los dos generadores y, en el cuadernillo, **Hojas** («1 · máx. 28 por hoja»): la paginación es un dato permanente del trabajo, no un aviso. Todos los valores describen la hoja que se está viendo; cuando no hay nada imprimible dicen «—». Junto a las acciones, un estado «Generando…» con ancho reservado por una copia invisible, para que la línea no cambie de medida.

### Cuña de tonos (tone wedge)
Tira de cinco celdas de 16×12px, de negro a blanco, dentro de un filete de 1 px, con la leyenda «Tonos de impresión» en caption `muted` a 8px. Es la leyenda de tono de la hoja, fuera de ella.

### Prueba de hoja (proof sheet)
Cada página es un passe-partout de 20px sobre la mesa con las marcas de corte y registro, y dentro la hoja SVG en papel con filete de 1 px; las páginas se separan 24px. Al cambiar la ficha (contenido, código, encabezado, papel o soluciones) las marcas repiten el paso de registro. En escala 100 %, la pila entra en la ventana con filete descrita en Layout. En portada, la prueba es la tarjeta de cada generador (8px de passe-partout, máx. 16rem, sin marcas) con título y descripción debajo; el título se subraya al pasar el cursor.

**Estado con nombre.** Cuando lo que se ve no es imprimible, la prueba lleva encima una pastilla de papel con filete, 8px × 16px, body-sm 600 en `muted`, centrada al tercio superior de la primera página («Hoja sin ejercicios» / «Sheet with no exercises»). Sin ella, una hoja en blanco a tamaño real parece salida de la copiadora aunque Imprimir esté deshabilitado. La pastilla es de la prueba, no de la hoja: no entra en el SVG ni se imprime.

### Diálogo «Ampliar»
Diálogo modal nativo a pantalla completa sobre la mesa, desplazable en ambos ejes, con barra superior fija (mesa, filete inferior, Cerrar a la derecha) y las páginas a tamaño físico con filete, separadas 24px. Solo se ofrece por debajo de 768px.

### Paneles de aviso
Papel con filete de 1 px, 16px de relleno, texto body-sm en tinta, 12px entre piezas. El aviso bloqueante (`role="alert"`) lista los problemas y, si falló el generador, añade Reintentar. Los avisos vivos (columnas recortadas, llevada ignorada, factor recortado, operación que no ha salido) se montan siempre dentro de una región `aria-live` que solo muestra su caja cuando hay algo que decir.

Los paneles de ayuda repiten un mismo patrón: h3 legend, una frase que dice qué ocurre y una acción primaria que lo resuelve. El de **palabras sin colocar** lista las palabras en Andika 600 y sus sugerencias con viñeta. El de **ficha corta** («Faltan operaciones») dice la salvedad **una sola vez** en la entrada de la lista, en `muted` —«Estos ajustes amplían las operaciones posibles, aunque puede que no lleguen para todas las pedidas»—, y cada sugerencia es entonces solo su acción («Ampliar el segundo número al rango 5–7.»); la viñeta es un filete de 1 px en `line` de 12px de ancho alineado con la primera línea, no el punto del navegador.

### Marca de página (page stamp)
Signatura de la hoja impresa, descrita en Layout: línea de datos en el margen inferior y pestaña de rol colgada del filete del encabezado. La llevan las dos herramientas, el marco vacío y las miniaturas de portada, y se ve tanto en la prueba como en el PDF y en la impresión.

### Navigation
Cabecera y pie sobre la mesa, separados por un filete. Logotipo horizontal a 36px de alto a la izquierda; selector de idioma a la derecha: el idioma actual es un recuadro de papel con filete y texto en 600, los demás son texto atenuado que gana filete y tinta al pasar el cursor. Mismo tratamiento en móvil.

### Ad placeholder
Hueco reservado con dimensiones fijas (300×600 lateral, 320×50 anclaje, 280px mínimo in-article), borde discontinuo de 1 px sobre la mesa y rótulo caption `muted` con el formato; se oculta en impresión. El anclaje móvil es una franja fija inferior sobre la mesa con filete superior.

### Pendiente
Elementos del contrato de dirección que aún no existen o no están resueltos y no deben tratarse como componentes disponibles:
- Indicio visible de desplazamiento en la ventana 100 % cuando el sistema oculta las barras (decisión del operador pendiente).
- Anclaje publicitario móvil: debe ocultarse cerca de las acciones o pasar al flujo antes de activarse en la Fase 6; hoy está desactivado en producción.
- Techo del mundo sin usar: la cuña pegada a la hoja como barra de color. (La línea de datos y la marca de rol de página ya están construidas y salen en los dos generadores; ver «Marca de página».)

## Do's and Don'ts

### Do:
- **Do** poner cada página de prueba en papel con filete de 1 px sobre la mesa `canvas`, rodeada de sus marcas de corte y registro en azul acero.
- **Do** abrir la vista previa con la línea de trabajo: acciones primero (Imprimir relleno, PDF con filete), después papel, hojas, páginas y código en cifras tabulares.
- **Do** marcar cada hoja con su marca de página en el margen: línea de datos abajo a la derecha y pestaña de rol colgada del filete del encabezado, rellena en la hoja de soluciones.
- **Do** delimitar con bordes de 1 px en `line` y esquinas rectas (0px).
- **Do** reservar el azul acero para acciones, marcas de registro, foco y selección; titulares en pizarra `brand-strong`.
- **Do** usar Archivo solo en 400 y 600, y Andika en la hoja o para mostrar texto que irá impreso.
- **Do** dibujar la hoja exclusivamente con los grises de `TONE_HEX` y medidas en mm, compartidas por SVG y PDF.
- **Do** etiquetar cada campo con su etiqueta visible en mayúsculas con tracking de 0.75rem.
- **Do** escribir avisos y errores en tinta dentro de paneles con filete, y decir la salvedad de una lista una sola vez, en su entrada.
- **Do** dar nombre a la hoja que no es imprimible con una pastilla de papel sobre la prueba, en vez de dejar una hoja en blanco a tamaño real.
- **Do** alinear los bloques de una fila por la línea base del primer operando y anclar el índice al borde de la fila.
- **Do** cambiar estados en seco; el único movimiento es el paso de registro de 90 ms en dos pasos, anulado con reduced-motion.

### Don't:
- **Don't** añadir sombras ni esquinas redondeadas a la interfaz.
- **Don't** usar `font-bold` (700) con Archivo: no está cargado y el navegador lo sintetiza.
- **Don't** introducir colores de interfaz, ni la variante terracota #D57044, en la hoja o en la paleta de la herramienta.
- **Don't** usar `line` como color de texto: no alcanza contraste de texto.
- **Don't** ofrecer zoom continuo: solo Ajustar, 100 % y Ampliar.
- **Don't** convertir en aviso un dato permanente del trabajo (cuántas hojas salen, cuántos ejercicios caben): va en la línea de trabajo.
- **Don't** meter la marca de página dentro de la caja de contenido ni dejar que un generador la redibuje.
- **Don't** repetir la misma coletilla al final de cada sugerencia de una lista.
- **Don't** colocar anuncios dentro del lienzo de la herramienta, junto a acciones o en impresión.
