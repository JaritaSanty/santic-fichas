# Informe de cierre — Fase 3

- **Rama:** `feat/fase-3` (desde `main` cdbf7e0)
- **Plan:** [docs/superpowers/plans/2026-09-16-fase-3-cuadernillo-operaciones.md](../plans/2026-09-16-fase-3-cuadernillo-operaciones.md)
- **Spec:** [docs/superpowers/specs/2026-09-12-generador-fichas-design.md](../specs/2026-09-12-generador-fichas-design.md) (enmiendas en §18 y §19)

## Resultado

Cuadernillo de operaciones completo, 100 % en el navegador, en `/es/operaciones/` y `/en/math-worksheets/`:

- **Parámetros:** las cuatro operaciones en cualquier combinación, rango por operando con selector de dígitos, llevada (indiferente, con, sin), división exacta o con resto, 1–200 operaciones sin repetir, disposición en columnas o en línea y 2–5 columnas por hoja.
- **Generación:** el espacio de combinaciones se enumera entero cuando cabe y se muestrea cuando no; la división se construye desde divisor, cociente y resto, nunca por rechazo. El reparto entre operaciones es equilibrado y redistribuye lo que una operación no puede dar. Todo corre en un Worker con el almacén compartido con la sopa de letras.
- **Cuando no sale:** panel «Faltan operaciones» con la cifra disponible y ajustes concretos —ampliar un extremo hasta el primer valor válido, ensanchar el segundo número, permitir resto o llevada, pedir menos—, cada uno diciendo si la ficha saldrá entera o solo dejará de estar vacía.
- **Hoja:** formato escolar en columnas, casita en español y galera en inglés, disposición en línea, página de soluciones, paginación automática y marca de página en el margen.
- **Interfaz:** la misma prueba de imprenta de la Fase 2, con la paginación como dato permanente de la línea de trabajo.

## Verificación (desde cero)

| Comprobación | Resultado |
|---|---|
| `pnpm lint` | 0 errores, 0 advertencias |
| `pnpm typecheck` | sin errores |
| `pnpm test` | 38 ficheros, 392 pruebas en verde |
| `pnpm build` | exportación estática sin advertencias |
| `pnpm test:e2e` (`/fichas`) | 61 pruebas en verde |
| `pnpm test:e2e:root` | 1 prueba en verde |
| `pnpm budget` | ruta más pesada 235.2 KB (`es/operaciones/`); sopa 234.5 KB; portadas 218.7 KB; redirección 136.4 KB |

### Criterios de validación de la spec aplicables a la Fase 3

| Criterio | Evidencia |
|---|---|
| Casos límite §5.5: división exacta con rangos incompatibles | `arithmetic.spec`: mensaje y sugerencias con el ajuste mínimo, sin hoja generada |
| Casos límite §5.5: menos combinaciones que operaciones pedidas | panel con el máximo disponible y botón para generarlo; `reduce-count` es punto fijo (comprobado en 45 360 configuraciones) |
| Casos límite §5.5: más operaciones de las que caben | capacidad calculada con la geometría real; la línea de trabajo declara hojas y máximo por hoja |
| Sin repeticiones dentro de la ficha | clave `kind:a:b`, probada en el generador y en el fixture dorado |
| PDF con tildes y eñes | heredado de la Fase 2; `pdf.spec` comprueba además el recuento de páginas y la numeración continuada |
| Impresión limpia | `print.spec`: solo `#print-root`; una ficha sin ejercicios no monta nada |
| Sin red tras la primera carga | `offline.spec`: el segundo Worker está precacheado |
| Nada del docente en consola, URL, almacenamiento, caché o peticiones | `network.spec` con centinela en las dos rutas nuevas, incluida la descarga del PDF |
| Anuncios lejos de las acciones | `ads.spec` mide el lienzo del cuadernillo en escritorio y móvil, con el panel de ficha corta desplegado |
| Cuadrícula/ejercicios legibles a 360 px | `arithmetic.spec` (móvil) y capturas `user-360.png` / `en-360.png` |
| Presupuesto < 300 KB | tabla anterior |

## codegraph — dependencias reales frente a la spec §4.3

- `generateArithmetic` → `workers/arithmetic` y la portada (permitido para `app`, como la sopa).
- `layoutArithmetic` → `tools/arithmetic` y la portada.
- `createArithmeticClient` y `suggestArithmetic` → solo `ArithmeticTool`.
- `renderPdf` → solo `import()` en `tools/shared/DownloadPdfButton`.
- Sin desviaciones.

## impeccable

Dos rondas sobre el contrato de dirección, con capturas nuevas de las dos lenguas, escritorio, 360 px y hoja impresa.

- **Aplicadas:** alineación de filas por la línea base del primer operando; índice anclado al borde de la fila; paginación como dato de la línea de trabajo; estado vacío con nombre; aviso duplicado suprimido; panel de ficha corta con una sola salvedad y marcas propias; marca de página y línea de datos en el marco compartido; identidades `a ÷ a` y `a − a` descartadas salvo como último recurso.
- **Descartado tras comprobarlo:** el error de la portada era un fallo puntual del servidor de desarrollo; la pestaña de soluciones tiene contraste suficiente (texto negro sobre gris claro, no blanco sobre gris).
- **Abiertas para el operador:** indicio de desplazamiento en la ventana 100 %; sugerencias en prosa en lugar de controles de un clic; anclaje móvil antes de la Fase 6.

El documentador actualizó `DESIGN.md`, `.impeccable/design.json` y el contrato con «Estado tras la Fase 3».

## Revisión final de la rama

Revisor con el modelo más capaz sobre cdbf7e0..HEAD: **con correcciones**, sin nada crítico. Un aviso que mentía (se echaba en falta una operación que nunca se pidió, cuando se piden menos ejercicios que operaciones elegidas), la línea de datos recortada por caracteres en vez de por ancho medido, dos parámetros de maquetación que forzaban una regeneración inútil, y la documentación desactualizada. Todo corregido antes de cerrar.

## Decisiones no triviales de la fase

- **La división se construye, no se busca:** dividendo = divisor × cociente (+ resto), con la ventana de restos que de verdad cabe. El texto del plan estaba mal y producía vacíos falsos en configuraciones escolares corrientes.
- **Pedir menos tiene que dar menos, no menos todavía:** el reparto del déficit se repite mientras alguna operación crezca, y el presupuesto de muestreo es constante en vez de proporcional a lo pedido. Sin las dos cosas, «genera 75» devolvía 58, y seguir el consejo llevaba a 42.
- **Identidades fuera:** `22 ÷ 22` no es un ejercicio; se descartan salvo que el espacio no dé otra cosa.
- **Alineación por línea base:** una fila mixta en inglés cuesta 20 ejercicios por hoja de Carta en vez de 28, porque la fila reserva el hueco del cociente de la galera. La retícula cuadrada vale más que esos ocho ejercicios.
- **La casita no desarrolla la resta:** el resto va bajo el dividendo; una hoja de soluciones da la respuesta, no reenseña el algoritmo.
- **Marca de página en el marco compartido:** la sopa de letras también la lleva, porque el contrato la tenía prevista y una pila de fotocopias sin numerar no se ordena.
- **Paginación como dato, no como aviso** (enmienda §19): una cifra siempre presente se ve más que un aviso que aparece y desaparece.

## Pendiente de comprobación manual del operador (antes de fusionar)

- **Imprimir** un cuadernillo con soluciones en Chrome, Firefox y Safari, en A4 y Carta: una hoja por página, sin márgenes ni encabezados del navegador, y la marca de página legible en el margen.
- **Abrir el PDF** en Acrobat Reader y Vista Previa: casita y galera bien trazadas, tildes y ñ, numeración de páginas.
- **Mirar una hoja impresa de verdad** con las cuatro operaciones mezcladas en inglés: es donde se paga el coste de la alineación (20 ejercicios por hoja en vez de 28) y donde conviene decir si compensa.
- **Decidir** si la ventana 100 % necesita un indicio visible de desplazamiento.

## Observaciones abiertas para fases siguientes

- Puertas de la Fase 6, sin cambios: anclaje móvil cerca de las acciones, pasada e2e con la CSP real, textos de portada que coincidan con lo construido, CI que ejecute `test:e2e:root`.
- Los dos paneles de ayuda han divergido: el de palabras no colocadas usa las viñetas del navegador y el de ficha corta dibuja sus marcas. Unificarlos al tocar el patrón compartido en la Fase 4.
- En la sopa de letras, `PrintRoot` sigue montando el marco vacío, así que Ctrl+P imprime una hoja en blanco aunque el botón esté deshabilitado. Corregido ya en el cuadernillo; se traslada.
- En una ficha mixta, el índice se queda en el raíl izquierdo mientras la operación cuelga del borde derecho (hasta 20 mm en bloques estrechos). Sigue abierto tras el finish review; se mira con una hoja impresa en la Fase 4.
- `empty-space` existe en los tipos y en los dos diccionarios pero no lo emite nadie: se reserva o se borra en la Fase 4.

## Anexo A — Decisiones (rulings) de la ejecución

Formato: decisión — motivo — coste si es errónea.

**Antes de la ejecución**
- La Tarea 6 dibuja también un esquema neutro de división con su prueba de medida, y la Tarea 7 lo sustituye — evita dejar una rama sin implementación — unas líneas que se reescriben.
- Slugs `es: operaciones` / `en: arithmetic` — la spec no parecía fijarlos — **corregido más tarde**: la spec sí los fija.

**Validación y espacio (Tareas 1–2)**
- Con multiplicación o división, el tope de tres dígitos se aplica a los dos extremos del segundo operando — así `min ≤ max` es invariante de `ValidArithmetic` y el resto del generador puede confiar en ella — un rango recortado en silencio donde el operador esperaba un error.
- La división con resto enumera la terna (divisor, cociente, resto) con la ventana que de verdad cabe, y el cociente mínimo es `max(1, ceil((first.min − b + 1)/b))` — el texto del plan producía vacíos falsos: 100–110 ÷ 9 devolvía cero de diez operaciones válidas — enumerar más ternas de las necesarias.
- La prueba de tiempo del muestreo usa semilla fija y límite amplio — el peor caso medido es de milisegundos y el límite solo podía fallar por ruido de máquina — ninguno.

**Generación y sugerencias (Tareas 3–4)**
- El fixture dorado incorpora un caso con déficit y dos operaciones elegibles — la segunda vuelta del reparto decide la ficha y dos mutaciones la cambiaban sin romper ninguna prueba — un caso más que mantener.
- `index.ts` mantiene exportados los internos del espacio, como hace la sopa — la simetría entre generadores vale más que ocultar dos constantes que ESLint ya cerca — ninguno.
- El reparto del déficit se repite mientras quede pendiente y alguna operación haya crecido — hace el total monótono en `count` y convierte «pide menos» en una salida real — fichas v1 guardadas en local cambiarían (nada publicado).
- Las sugerencias llevan `fills` — la interfaz tiene que poder decir si la ficha saldrá entera sin calcular nada — un campo más en cuatro códigos.
- Se añade `allow-any-carry` — «con llevada» podía dejar al docente sin ninguna sugerencia — un texto más por idioma.
- **Desviación aceptada del implementador:** presupuesto de muestreo constante (40 000) en lugar de `max(wanted × 200, ENUMERATE_MAX)` — con mi fórmula el caso del revisor seguía fallando (200→17→7) y con la constante es punto fijo — ninguno; además cierra el menor aplazado de la Tarea 2.

**Maquetación (Tareas 6–7)**
- `layoutArithmetic` recibe `layout` y `columns` además de lo que decía el plan — no viajan en el resultado del generador — la interfaz los pasa explícitamente.
- En la disposición en línea el paso vertical es `inlineLineMm` solo — con la suma se desperdiciaba un tercio del papel (14 renglones en A4 en vez de 21) — renglones algo más juntos.
- El signo se ancla a la columna de operandos de su bloque y la raya empieza ahí — en una ficha mixta el signo quedaba a 14 mm de su número — unas líneas.
- Las columnas dejan de justificarse de margen a margen: paso acotado a `bloque + 14 mm` y retícula centrada — con sumas de tres cifras a dos columnas quedaban 158 mm de blanco entre ellas — una hoja algo más estrecha de lo esperado.
- `columns` se valida también en la disposición en línea — la spec §5.4 no distingue y una ficha en línea usaba cualquier valor del formulario — cambiar una prueba.
- `minColumns` sigue en 2 en línea — la spec fija 2–5 y la maquetación ya dibuja menos cuando solo caben menos — no poder pedir un ejercicio por renglón.
- La casita resuelta escribe el resto sin la fila de resta — reservarla costaba dos renglones por hoja en todas las fichas con resto y una hoja de soluciones no reenseña el algoritmo — la casita muestra menos trabajo del que algún docente esperaría.
- El ancho del bloque sí cambia en inglés, así que la paginación puede diferir entre idiomas — ninguno, la capacidad se deriva.

**Textos e interfaz (Tareas 8–9)**
- El slug inglés es `math-worksheets`, como fija la spec — mi ruling previo se hizo sin verla — cambiar una cadena y las rutas de las pruebas.
- No se añaden recuentos por operación al resultado: la interfaz los cuenta desde `result.operations` y avisa con `kindMissing` — un aviso calculado en la interfaz en vez de en el generador.
- `validateArithmetic` rechaza extremos que no sean enteros, `NaN` incluido — es superficie pública y ninguna comparación se disparaba con `NaN` — una comprobación más.
- Una ficha sin ninguna operación no se imprime ni se descarga — imprimir un marco vacío nunca es lo que el docente quiere — una condición más.
- `capacity` devuelve las columnas reales y la interfaz avisa cuando son menos de las pedidas — el docente no puede quedarse con un ajuste que la hoja ignora sin decirlo — un campo y un texto por idioma.
- `PrintRoot` se monta solo con ficha vigente y no vacía — Ctrl+P imprimía el marco en blanco — la sopa comparte el defecto y se traslada.
- `quote` se mueve al bloque compartido `tool` — es puntuación del idioma, no vocabulario de una herramienta — tocar los dos diccionarios.

**Pruebas y cierre (Tareas 10–11)**
- El texto singular de paginación interpola `{pages}` — con «Se generará 1 hoja» escrito a mano, todo escenario de una hoja era ciego a un recuento equivocado — dos cadenas.
- Los cambios del algoritmo se quedan en `ARITHMETIC_ALGORITHM_VERSION = 1` — nada está publicado hasta la Fase 6 — un código guardado en local cambiaría de ficha.
- La alineación por línea base cuesta 28 → 20 ejercicios por hoja en fichas mixtas inglesas — la retícula cuadrada vale más que ocho ejercicios — una hoja más por cada 200 ejercicios.
- El índice se ancla al borde de la fila, no al bloque — con la alineación por línea base el raíl de índices quedaba dentado en inglés — unas líneas.
- La paginación pasa a ser dato permanente de la línea de trabajo en vez del «aviso visible» de la spec §5.5 (enmienda §19) — una cifra siempre presente se ve más que un aviso condicional — una línea de spec.
- `Página n/N` cuenta también las soluciones — la marca sirve para ordenar una pila de fotocopias y la pila las incluye; la línea de trabajo ya separa HOJAS de PÁGINAS — cambiar el denominador.

## Anexo B — Hallazgos menores aplazados y triaje

| Origen | Hallazgo | Triaje |
|---|---|---|
| T2 | Presupuesto de muestreo `wanted × 200` sin tope absoluto | Corregido en la ronda 2 de la Tarea 4 (constante de 40 000) |
| T6 | En ficha mixta el índice queda en el raíl izquierdo y la operación cuelga del borde derecho (hasta 20 mm) | **Sigue abierto**: el finish review no lo recogió; se traslada a la Fase 4 con una hoja impresa delante |
| T8-9 | En la sopa, `PrintRoot` monta el marco vacío | Se traslada a la Fase 4, al tocar el patrón compartido |
| Final | `kindMissing` mentía cuando se piden menos ejercicios que operaciones elegidas | Corregido |
| Final | La línea de datos se recortaba por caracteres y podía pisar la marca de pie | Corregido (recorte por ancho medido y semilla acotada a 24 caracteres) |
| Final | `layout` y `columns` en la clave de generación pese a que el generador no los lee | Corregido |
| Final | `empty-space` sin emisor, en tipos y en los dos diccionarios | Se traslada: reservarlo o borrarlo en la Fase 4 |
| Final | El código de la línea de trabajo y el de la hoja difieren durante la regeneración | Se traslada (cosmético; no se imprime en ese estado) |
| Final | `data-generation` marca `pending` sin petición en curso | Se traslada (mismo caso que el «idle» de la Fase 2) |
| impeccable | Viñetas del navegador en el panel de la sopa frente a las marcas propias del cuadernillo | Se traslada a la Fase 4 |

**Arrastrados de la Fase 2**

| Hallazgo | Triaje |
|---|---|
| `FOOTER_TEXT_SIZE` frente a `7 * PT_TO_MM` | Se traslada; el marco se ha tocado, pero la constante sigue escrita a mano |
| `noscript` con `withBasePath` en lugar de `homePath`; `alt`/`width` del logotipo; `PrintRoot` releyendo `#print-page-size`; aserción de build ante `?`/`#`; gzip duplicado | Se trasladan sin cambios |
| Metadatos, `apple-touch-icon`, placeholder in-article | Fase 5 |
| Rama `live && !matches` de `AdSlot` sin prueba | Fase 6 |

## Anexo C — Pendientes para el plan de la Fase 4

- El crucigrama reutiliza el almacén genérico (`tools/shared/generationClient`), el patrón de Worker por generador, el marco con marca de página y la superficie de prueba. Ninguna de esas piezas debería necesitar cambios de forma; si los necesita, es señal de que la abstracción se quedó corta.
- Evaluación documentada de `crossword-layout-generator` frente a una colocación propia, como pide la spec §14 — con el mismo criterio que la Fase 2 aplicó a la sopa: algoritmo sembrado, reproducible por código y con resultado parcial explícito.
- Versión de algoritmo y fixture dorado propios del crucigrama.
- Casos límite §5.5 que le tocan: una sola palabra (con aviso de que no habrá cruces) y palabras sin cruce posible, con el mismo panel de sugerencias.
- Cerrar de paso los tres menores compartidos: `PrintRoot` con marco vacío en la sopa, las viñetas del panel de palabras no colocadas, y el índice frente a la operación en fichas mixtas.
- Decidir qué se hace con `empty-space`.
