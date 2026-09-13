# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js 16 (App Router, exportación estática, webpack), TypeScript estricto, Tailwind CSS 4. Servido como ficheros estáticos por Nginx en un VPS compartido con un Moodle en producción. Decidido por el operador en la especificación (`docs/superpowers/specs/2026-09-12-generador-fichas-design.md`).

## Users

Docentes de cualquier país que preparan material para su aula, en español o en inglés. Llegan con una necesidad concreta (una ficha para una clase próxima), a menudo desde el móvil o un ordenador del centro, y quieren salir con una hoja impresa o un PDF en pocos minutos. Muchos imprimen directamente desde el navegador sin descargar nada.

## Product Purpose

Generar tres tipos de material imprimible — sopa de letras, crucigrama y cuadernillo de operaciones aritméticas — con vista previa inmediata, hoja de soluciones, impresión directa y descarga en PDF. El éxito es una hoja limpia, correcta y lista para fotocopiar, obtenida sin registro y sin que el contenido del docente salga de su navegador.

## Positioning

Todo se procesa en el navegador: el vocabulario, los nombres y los enunciados del docente nunca se envían a ningún servidor. Soporte correcto del español (tildes, diéresis, eñe) en pantalla, impresión y PDF, precisamente donde fallan los generadores anglosajones equivalentes. Fichas reproducibles mediante un código de semilla.

## Operating Context

- Superficies: portada con los tres generadores, una página por generador y páginas de contenido editorial por intención, cada una en español (`/es/…`) e inglés (`/en/…`).
- La hoja se imprime y se fotocopia: las fichas son en escala de grises y deben seguir siendo legibles tras varias copias.
- Dos salidas equivalentes: impresión directa desde el navegador (`@media print`) y PDF con tipografías incrustadas.
- Papel A4 o Carta, según la región del navegador y elegible por el docente.
- Uso en móviles desde 360 px de ancho.
- Funciona sin conexión tras la primera carga.
- El sitio se financia con AdSense; los anuncios nunca aparecen junto a los controles de acción, dentro de la vista previa ni en la versión impresa.
- Rodeada de contenido editorial original (páginas por intención, p. ej. un tema y un curso concretos) con un generador preconfigurado.

## Capabilities and Constraints

- Exactamente tres generadores. No se añade un cuarto tipo de material.
- Sin base de datos, backend, rutas de API, autenticación ni analítica de terceros.
- Sin recursos remotos en tiempo de ejecución salvo AdSense y su plataforma de consentimiento; tipografías servidas localmente.
- Presupuesto de carga de la primera vista inferior a 300 KB comprimidos.
- Bilingüe con rutas `/es` y `/en`, detección del idioma del navegador y selector que conduce a la página equivalente.
- Cuadrícula: mayúsculas sin tildes con la Ñ conservada; listados y definiciones con la ortografía original.
- Pie de cada hoja con la marca y `santiceducation.com` en tamaño discreto.
- Abierto: datos del autor y textos legales (los aporta el operador antes de la Fase 5); nombre del subdominio.

## Brand Commitments

- Nombre: Santic Education.
- Logotipo en `img/`: isotipo (S con birrete) y wordmark «SANTIC / EDUCATION».
- Colores oficiales de la identidad base: azul acero `#385777` (isotipo) y pizarra `#4A4C63` (wordmark).
- La variante terracota `#D57044` del wordmark es una variante puntual, no parte de la identidad base de esta herramienta.
- Recursos fuente en `img/`: isotipo a 2481 px (`isotipo.png`), SVG monocromo del isotipo (`safari-pinned-tab.svg`), composición horizontal (`Santic-final-05.png`) e icono táctil (`apple-touch-icon.png`).
- La herramienta es independiente: marca propia discreta; solo el pie de la ficha y un enlace discreto remiten a santiceducation.com. No es un embudo hacia los cursos.
- Voz en español: impersonal, sin tuteo ni usted («Palabras de la ficha», «Descargar PDF», «Imprimir»). En inglés, equivalente neutro y directo.

## Evidence on Hand

- Recursos de marca en `img/` y derivados en `public/brand/` (logotipo horizontal, isotipo gris en SVG y PNG, favicon).
- No existen testimonios, cifras de uso, clientes ni reseñas: no se deben inventar.
- Credenciales del autor y textos legales: pendientes del operador; no se inventan.

## Product Principles

1. La hoja impresa es el producto: lo que se ve en la vista previa es exactamente lo que sale en papel y en PDF.
2. Privacidad por construcción: nada de lo que escribe el docente sale del navegador.
3. Precisión lingüística antes que cantidad de opciones.
4. Foco en tres generadores bien hechos; la dispersión es el error característico del nicho.
5. La publicidad financia la herramienta sin interponerse nunca en la tarea.

## Accessibility & Inclusion

- WCAG 2.2 AA en la interfaz: contraste, foco visible, navegación completa por teclado, etiquetas en todos los campos.
- Uso cómodo a 360 px de ancho, con zoom para inspeccionar la hoja.
- Fichas legibles para lectores iniciales: tipografía clara y tamaños generosos en la hoja.
