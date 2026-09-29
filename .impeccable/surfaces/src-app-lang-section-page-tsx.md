---
version: 1
slug: "src-app-lang-section-page-tsx"
primary_target: "src/app/[lang]/[section]/page.tsx"
related_targets: ["src/app/[lang]/page.tsx"]
---

# Superficie: página de generador

Alcance: páginas `/[lang]/[section]/` de los tres generadores y la portada que los enumera. Modo del visitante: Operate. Las páginas de contenido (Fase 5) heredan el mundo en modo Read.

Audiencia y tarea: docente que configura una ficha, la revisa y la imprime o descarga en PDF en pocos minutos, a menudo desde el móvil.
Restricciones: fichas en escala de grises; paleta del logotipo (#385777, #4A4C63); sin anuncios en el lienzo ni junto a acciones; 360 px; presupuesto < 300 KB; voz impersonal en español.

## Direction contract

THESIS: La herramienta es la mesa de pruebas de la hoja: lo que se aprueba aquí es exactamente lo que sale de la copiadora. Rechaza el panel SaaS de dos columnas con tarjetas redondeadas y la estética infantil de lápices de colores.

OWN-WORLD: Mesa gris fría (#E6E9EC) bajo una hoja blanca a escala real con marcas de corte en L y cruces de registro en azul acero #385777. Texto de interfaz en pizarra #4A4C63 con Archivo; cifras tabulares para toda cantidad. Controles como campos de un parte de trabajo: etiquetas en versalitas técnicas, filetes de 1 px, esquinas rectas. Cuña de 5 grises como leyenda de tono. Acción primaria sólida azul acero; secundaria con filete.

STORY: El docente entiende que la hoja que ve es la hoja que imprimirá, confía en que nada sale del navegador y ajusta, revisa y aprueba la ficha.

FIRST VIEWPORT: Escritorio: parte de trabajo a la izquierda (≈22 rem), hoja con marcas de corte centrada; encima de la hoja, una línea de trabajo con papel, páginas y semilla en cifras tabulares, e Imprimir/PDF al inicio de esa línea. Móvil: parte de trabajo plegable arriba, línea de trabajo y acciones, hoja a todo el ancho con «Ampliar».

FORM: Prueba de imprenta, posición 4 de 7 en la lista ordenada; seed a68aa808. Interacción firma: al cambiar un parámetro, las marcas de registro parpadean un paso seco (≤ 90 ms) y la línea de trabajo actualiza sus cifras; zoom en escalas enteras nombradas (Ajustar, 100 % tamaño real). Gramática de movimiento: pasos secos sin easing decorativo; nada se anima con reduced-motion. Aportes: estados con nombre y trazo (ciclorama), eje único en mm (inmersión), escalas enteras (un bit), cifras tabulares fijas (nixie), cambios secos (acetatos).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Estado tras la Fase 2

Construido en la Fase 2 (commits hasta fa4ff85): marcas de corte en L y cruces de registro; línea de trabajo con papel, páginas y código y las acciones Imprimir / Descargar PDF al inicio; zoom «Ajustar / 100 %» y «Ampliar» en móvil; paso seco de registro al cambiar parámetros; cuña de 5 grises; parte de trabajo plegable en móvil con resumen; acción secundaria PDF con filete.

Pendiente, con motivo:
- Indicio visible de desplazamiento en la ventana «100 %» cuando el sistema oculta las barras — el finish review de Fase 2 lo puntuó parcial al agotar sus dos rondas; decisión del operador.
- Anclaje publicitario móvil junto a acciones — desactivado en producción hasta revisar la política de AdSense; ocultarlo cerca de acciones o moverlo al flujo es condición previa para activarlo en Fase 6.
- Techo del mundo sin usar: línea de datos en el margen de la prueba (página n/N · papel · código), cuña pegada a la hoja como barra de color y marca de rol de página (alumno / soluciones) — se valorarán al construir crucigrama y cuadernillo.

Condición vigente: los textos de portada e introducción describen funciones de Fases 3–4; no se despliega públicamente nada antes de la Fase 6.

## Estado tras la Fase 3

Construido en la Fase 3 (hasta `7373298`): segundo generador en `/es/operaciones/` y `/en/math-worksheets/` sobre la misma superficie —mismo parte de trabajo, misma línea de trabajo, misma prueba con marcas, mismo zoom, mismo diálogo «Ampliar», misma cuña—; bloques de hoja nuevos (columnas con el signo colgado de la propia columna de cifras, casita castellana, galera inglesa y renglón en línea con raya de respuesta), con las filas alineadas por la línea base del primer operando y el índice anclado al borde de la fila.

Gastado del techo del mundo, ahora en los dos generadores (`src/layout/common/frame.ts`): **línea de datos en el margen** (`página n/N · papel · código`) y **marca de rol de página** (alumno con filete, soluciones rellena). La sopa de letras las hereda sin mover nada de su contenido.

Elementos de interfaz nuevos: la paginación como dato permanente de la línea de trabajo (HOJAS «1 · máx. 28 por hoja»), estado con nombre sobre la prueba cuando la hoja no es imprimible («Hoja sin ejercicios»), aviso de columnas recortadas y panel de ficha corta («Faltan operaciones») con la salvedad dicha una sola vez en la entrada de la lista y sugerencias que son solo su acción.

Pendiente, con motivo:
- Indicio visible de desplazamiento en la ventana «100 %» cuando el sistema oculta las barras — sin cambios desde la Fase 2; decisión del operador.
- Anclaje publicitario móvil junto a acciones — desactivado en producción; ocultarlo cerca de acciones o moverlo al flujo sigue siendo condición previa para activarlo en la Fase 6.
- Las sugerencias del panel de ficha corta siguen siendo prosa: dicen el ajuste, pero no lo aplican con un control de un clic.
- Techo del mundo sin usar: solo queda la cuña pegada a la hoja como barra de color.

Coste aceptado: con la fila alineada por la línea base del primer operando, una ficha inglesa mixta cabe a **20 ejercicios por hoja Carta** en vez de 28, porque el renglón reserva el hueco del cociente de la galera. Las fichas de un solo tipo de bloque y todas las castellanas conservan su capacidad.

Condición vigente: los textos de portada e introducción describen funciones de las Fases 4–5; no se despliega públicamente nada antes de la Fase 6.
