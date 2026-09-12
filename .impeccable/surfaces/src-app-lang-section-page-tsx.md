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
