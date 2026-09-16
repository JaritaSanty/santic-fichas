# Cuadernillo de operaciones — Plan de implementación (Fase 3)

> **Para agentes:** SUB-SKILL OBLIGATORIA: usa superpowers:subagent-driven-development para ejecutar este plan tarea a tarea. Los pasos usan casillas (`- [ ]`).

**Objetivo:** un generador de cuadernillos de sumas, restas, multiplicaciones y divisiones con las mismas garantías que la sopa de letras: validación con mensajes concretos, generación sembrada y reproducible en un Worker, maquetación en milímetros compartida por pantalla, impresión y PDF, y soluciones.

**Arquitectura:** `generators/arithmetic` construye operaciones puras a partir de parámetros validados y un código de semilla; `layout/arithmetic` las convierte en un `SheetDocument` paginado; `workers/arithmetic.worker.ts` aísla la generación; `tools/arithmetic` es la interfaz, que reutiliza el parte de trabajo, la prueba de imprenta, la impresión y el PDF de `tools/shared`. El cliente de generación se generaliza en `tools/shared` para que lo usen los dos generadores.

**Stack:** Next.js 16 (export estático, webpack), TypeScript estricto, Tailwind 4, Vitest, Playwright.

**Spec:** [docs/superpowers/specs/2026-09-12-generador-fichas-design.md](../specs/2026-09-12-generador-fichas-design.md) — §5.0, §5.4, §5.5, §6, §13; enmiendas en §17 y §18.

**Informe de la fase anterior:** [docs/superpowers/reports/2026-09-13-fase-2-cierre.md](../reports/2026-09-13-fase-2-cierre.md) — el Anexo C lista los pendientes que esta fase debe recoger.

## Restricciones globales

Se aplican a todas las tareas:

- TypeScript estricto con `noUncheckedIndexedAccess`. `pnpm lint` debe terminar con 0 errores y 0 advertencias; `no-console` es error.
- Fronteras de módulo de §4.3, verificadas por ESLint: `core` no depende de nada; `generators/arithmetic` solo de `core`; `layout/arithmetic` solo de `core`, `layout/common` y los tipos de `generators/arithmetic`; `render/*` no conoce generadores ni maquetación; `tools/arithmetic` no importa otras herramientas, ni `ads`, ni `components`, ni `content`. Nada de imports con `../`: siempre `@/`.
- `@/render/pdf` solo con `import()` dinámico.
- Nada de lo que escribe el usuario puede llegar a URL, almacenamiento, caché, consola ni peticiones.
- Primera vista por debajo de 300 KB comprimidos (`pnpm budget`).
- Sin dependencias nuevas.
- Interfaz bilingüe es/en, castellano impersonal (nada de tuteo), paridad de claves entre diccionarios.
- La hoja usa solo los cuatro grises de `TONE_HEX` y medidas en milímetros; el texto se mide con `measureTextMm`, nunca se estima.
- El documento de hoja es el único origen geométrico: la misma `SheetDocument` alimenta vista previa, impresión y PDF.
- Commits convencionales en español, uno por unidad coherente, terminados con:
  `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`
- Cada tarea termina en verde: `pnpm lint && pnpm typecheck && pnpm test`.

## Decisiones de diseño fijadas antes de ejecutar

1. **Rangos por operando, no por operación.** Hay dos rangos: primer operando y segundo operando, aplicados a todas las operaciones elegidas. En multiplicación y división el segundo operando (factor y divisor) está limitado a 3 dígitos, según §5.4.
2. **Espacio de combinaciones.** Si el rectángulo de pares cabe en `ENUMERATE_MAX = 20000`, se enumera completo, se filtra y se baraja con el PRNG sembrado (recuento exacto). Si no, se muestrea con rechazo y tope de intentos. La división siempre se construye desde `(divisor, cociente[, resto])`, nunca por rechazo sobre dividendos.
3. **Sin repeticiones** dentro de la ficha: clave `kind:a:b`.
4. **Menos combinaciones que operaciones pedidas:** no es error. Se genera el máximo disponible y la interfaz avisa con esa cifra.
5. **Paginación:** la capacidad por hoja se calcula con la geometría real (papel, disposición, columnas) y la interfaz avisa del número de hojas y del máximo por hoja antes de imprimir.
6. **División:** `es` dibuja la casita (divisor a la derecha); `en` dibuja la galera (divisor a la izquierda, cociente encima). Es una decisión de maquetación, nunca del generador.
7. **Versión de algoritmo propia:** `ARITHMETIC_ALGORITHM_VERSION = 1`, con códigos `v1-…` igual que la sopa. Un código de otra versión se rechaza antes de llegar al Worker.

## Estructura de ficheros

| Fichero | Responsabilidad |
|---|---|
| `src/generators/arithmetic/types.ts` | `OperationKind`, `Operation`, `Range`, `CarryMode`, `DivisionMode`, `SheetLayout` |
| `src/generators/arithmetic/params.ts` | Límites, `ArithmeticInput`, `ValidArithmetic`, errores, avisos, `validateArithmetic` |
| `src/generators/arithmetic/space.ts` | Validez de un par por operación, enumeración y muestreo del espacio |
| `src/generators/arithmetic/generate.ts` | Reparto entre operaciones, mezcla sembrada, sin repeticiones, déficit |
| `src/generators/arithmetic/seed.ts` | Lectura del código de semilla con la versión del algoritmo |
| `src/generators/arithmetic/suggest.ts` | Ajustes sugeridos cuando algo no cabe o no es posible |
| `src/generators/arithmetic/index.ts` | Superficie pública del generador |
| `src/layout/arithmetic/blocks.ts` | Geometría de un bloque: columnas (suma, resta, multiplicación), división es/en, en línea |
| `src/layout/arithmetic/layoutArithmetic.ts` | Capacidad, paginación, páginas de soluciones, `SheetDocument` |
| `src/layout/arithmetic/index.ts` | Superficie pública de la maquetación |
| `src/workers/arithmetic.ts` | Contrato de mensajes y manejador puro |
| `src/workers/arithmetic.worker.ts` | Entrada del Worker |
| `src/tools/shared/generationClient.ts` | Almacén externo genérico (se extrae del cliente de la sopa) |
| `src/tools/arithmetic/*` | Interfaz: campos, mensajes, clave de petición, herramienta |
| `src/i18n/routes.ts`, `src/i18n/dictionary.ts`, `src/i18n/dictionaries/{es,en}.ts` | Ruta traducida y textos |
| `tests/e2e/arithmetic.spec.ts` | Recorrido completo en el navegador |

---

### Task 1: Tipos, límites y validación de parámetros

**Ficheros:**
- Crear: `src/generators/arithmetic/types.ts`, `src/generators/arithmetic/params.ts`
- Probar: `src/generators/arithmetic/params.test.ts`

**Interfaces:**
- Produce:
  ```ts
  export type OperationKind = 'add' | 'sub' | 'mul' | 'div';
  export type CarryMode = 'any' | 'with' | 'without';
  export type DivisionMode = 'exact' | 'remainder';
  export type SheetLayout = 'columns' | 'inline';
  export interface Range { min: number; max: number }
  /** `remainder` es 0 salvo en división con resto. */
  export interface Operation { kind: OperationKind; a: number; b: number; result: number; remainder: number }

  export const ARITHMETIC_LIMITS = {
    minCount: 1, maxCount: 200,
    minOperand: 0, maxOperand: 99999,
    maxFactor: 999,
    minDigits: 1, maxDigits: 5, maxFactorDigits: 3,
    minColumns: 2, maxColumns: 5,
  } as const;

  export interface ArithmeticInput {
    kinds: Record<OperationKind, boolean>;
    first: Range;
    second: Range;
    carry: CarryMode;
    division: DivisionMode;
    count: number;
    layout: SheetLayout;
    columns: number;
  }
  export interface ValidArithmetic extends Omit<ArithmeticInput, 'kinds'> { kinds: OperationKind[] }

  export type ArithmeticError =
    | { code: 'no-kind' }
    | { code: 'range-inverted'; operand: 'first' | 'second' }
    | { code: 'operand-out-of-range'; operand: 'first' | 'second'; min: number; max: number }
    | { code: 'count-out-of-range'; min: number; max: number }
    | { code: 'columns-out-of-range'; min: number; max: number }
    | { code: 'divisor-zero' }
    | { code: 'empty-space'; kind: OperationKind };

  export type ArithmeticWarning =
    | { code: 'carry-ignored'; kinds: OperationKind[] }
    | { code: 'factor-capped'; max: number };

  export type ArithmeticValidation =
    | { ok: true; value: ValidArithmetic; warnings: ArithmeticWarning[] }
    | { ok: false; errors: ArithmeticError[]; warnings: ArithmeticWarning[] };

  export function rangeForDigits(digits: number, maxDigits: number): Range;
  export function validateArithmetic(input: ArithmeticInput): ArithmeticValidation;
  ```
- Consume: nada fuera de `core`.

`rangeForDigits(d, maxDigits)` acota `d` a `[1, maxDigits]` y devuelve `{ min: d === 1 ? 0 : 10 ** (d - 1), max: 10 ** d - 1 }`. El mínimo de un dígito es 0 salvo en el segundo operando de división y multiplicación, donde el llamador sube el mínimo a 1 (se comprueba en la Tarea 2).

`validateArithmetic` comprueba, en este orden: alguna operación elegida; rangos dentro de `[minOperand, maxOperand]`; `min ≤ max`; el segundo operando no supera `maxFactor` cuando hay multiplicación o división (si lo supera, no es error: se recorta y se avisa con `factor-capped`); divisor máximo mayor que 0 cuando hay división; `count` dentro de límites; `columns` dentro de límites solo si `layout === 'columns'`. El aviso `carry-ignored` aparece cuando `carry !== 'any'` y las operaciones elegidas no incluyen ninguna a la que la llevada afecte (`add`, `sub`, `mul`). `empty-space` se delega a la Tarea 2 y aquí no se emite.

- [ ] **Paso 1: Escribir las pruebas que fallan**

```ts
import { describe, expect, it } from 'vitest';
import { ARITHMETIC_LIMITS, rangeForDigits, validateArithmetic } from './params';
import type { ArithmeticInput } from './types';

const base: ArithmeticInput = {
  kinds: { add: true, sub: false, mul: false, div: false },
  first: { min: 10, max: 99 },
  second: { min: 10, max: 99 },
  carry: 'any',
  division: 'exact',
  count: 20,
  layout: 'columns',
  columns: 3,
};

describe('rangeForDigits', () => {
  it('un dígito empieza en 0 y cinco dígitos llegan al máximo', () => {
    expect(rangeForDigits(1, 5)).toEqual({ min: 0, max: 9 });
    expect(rangeForDigits(3, 5)).toEqual({ min: 100, max: 999 });
    expect(rangeForDigits(5, 5)).toEqual({ min: 10000, max: 99999 });
  });

  it('acota al máximo de dígitos del operando', () => {
    expect(rangeForDigits(9, 3)).toEqual({ min: 100, max: 999 });
    expect(rangeForDigits(0, 5)).toEqual({ min: 0, max: 9 });
  });
});

describe('validateArithmetic', () => {
  it('acepta los parámetros por defecto', () => {
    const v = validateArithmetic(base);
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.value.kinds).toEqual(['add']);
  });

  it('exige al menos una operación', () => {
    const v = validateArithmetic({ ...base, kinds: { add: false, sub: false, mul: false, div: false } });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.errors).toContainEqual({ code: 'no-kind' });
  });

  it('rechaza rangos invertidos y fuera de límites', () => {
    const inverted = validateArithmetic({ ...base, first: { min: 90, max: 10 } });
    expect(inverted.ok).toBe(false);
    if (!inverted.ok) expect(inverted.errors).toContainEqual({ code: 'range-inverted', operand: 'first' });

    const tooBig = validateArithmetic({ ...base, first: { min: 10, max: 1000000 } });
    expect(tooBig.ok).toBe(false);
    if (!tooBig.ok) {
      expect(tooBig.errors).toContainEqual({
        code: 'operand-out-of-range',
        operand: 'first',
        min: ARITHMETIC_LIMITS.minOperand,
        max: ARITHMETIC_LIMITS.maxOperand,
      });
    }
  });

  it('recorta el segundo operando a tres dígitos con multiplicación y avisa', () => {
    const v = validateArithmetic({ ...base, kinds: { add: false, sub: false, mul: true, div: false }, second: { min: 10, max: 5000 } });
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.value.second.max).toBe(ARITHMETIC_LIMITS.maxFactor);
      expect(v.warnings).toContainEqual({ code: 'factor-capped', max: ARITHMETIC_LIMITS.maxFactor });
    }
  });

  it('rechaza un divisor máximo de 0', () => {
    const v = validateArithmetic({ ...base, kinds: { add: false, sub: false, mul: false, div: true }, second: { min: 0, max: 0 } });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.errors).toContainEqual({ code: 'divisor-zero' });
  });

  it('rechaza cantidades y columnas fuera de rango', () => {
    const count = validateArithmetic({ ...base, count: 201 });
    expect(count.ok).toBe(false);
    if (!count.ok) {
      expect(count.errors).toContainEqual({
        code: 'count-out-of-range',
        min: ARITHMETIC_LIMITS.minCount,
        max: ARITHMETIC_LIMITS.maxCount,
      });
    }

    const columns = validateArithmetic({ ...base, columns: 6 });
    expect(columns.ok).toBe(false);
    if (!columns.ok) {
      expect(columns.errors).toContainEqual({
        code: 'columns-out-of-range',
        min: ARITHMETIC_LIMITS.minColumns,
        max: ARITHMETIC_LIMITS.maxColumns,
      });
    }
  });

  it('ignora las columnas cuando la disposición es en línea', () => {
    expect(validateArithmetic({ ...base, layout: 'inline', columns: 9 }).ok).toBe(true);
  });

  it('avisa de que la llevada no afecta a la división sola', () => {
    const v = validateArithmetic({ ...base, kinds: { add: false, sub: false, mul: false, div: true }, carry: 'without' });
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.warnings).toContainEqual({ code: 'carry-ignored', kinds: ['div'] });
  });

  it('conserva el orden canónico de operaciones', () => {
    const v = validateArithmetic({ ...base, kinds: { add: true, sub: true, mul: true, div: true } });
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.value.kinds).toEqual(['add', 'sub', 'mul', 'div']);
  });
});
```

- [ ] **Paso 2: Ejecutar y ver que falla**

`pnpm test src/generators/arithmetic/params.test.ts` — falla porque el módulo no existe.

- [ ] **Paso 3: Implementar `types.ts` y `params.ts`**

Orden canónico `const KIND_ORDER: OperationKind[] = ['add', 'sub', 'mul', 'div']`, exportado para que la Tarea 3 reparta siempre igual. `validateArithmetic` devuelve `value` con los rangos ya recortados.

- [ ] **Paso 4: Pruebas en verde**

`pnpm test src/generators/arithmetic/params.test.ts && pnpm lint && pnpm typecheck`

- [ ] **Paso 5: Commit**

```bash
git add src/generators/arithmetic tests
git commit -m "feat(operaciones): tipos, límites y validación de parámetros"
```

---

### Task 2: Espacio de combinaciones

**Ficheros:**
- Crear: `src/generators/arithmetic/space.ts`
- Probar: `src/generators/arithmetic/space.test.ts`

**Interfaces:**
- Consume: `types.ts`, `params.ts` (`ValidArithmetic`, `ARITHMETIC_LIMITS`), `@/core/random` (`sfc32`/`fork` tal como los usa `generators/wordsearch/generate.ts`; lee ese fichero antes de empezar).
- Produce:
  ```ts
  export const ENUMERATE_MAX = 20000;
  export const SAMPLE_ATTEMPTS_PER_ITEM = 200;

  /** Construye la operación si el par cumple las reglas; si no, null. */
  export function buildOperation(kind: OperationKind, a: number, b: number, value: ValidArithmetic): Operation | null;

  /** Operaciones distintas de una operación concreta, barajadas con `rand`. Devuelve como mucho `wanted`. */
  export function drawOperations(kind: OperationKind, value: ValidArithmetic, wanted: number, rand: () => number): Operation[];
  ```

**Reglas por operación** (todas con `value.first` para el primer operando y `value.second` para el segundo):

- `add`: `result = a + b`. Sin llevada significa que ninguna columna decimal suma más de 9; con llevada, que al menos una la supera.
- `sub`: se ordena para que nunca dé negativo (`a` es el mayor de los dos; si `a < b` se intercambian, y si el intercambiado se sale de los rangos el par se descarta). Sin llevada significa sin préstamo en ninguna columna.
- `mul`: `result = a * b`, con `b` acotado a `maxFactor`. Sin llevada significa que ningún producto parcial dígito a dígito pasa de 9 y que la suma de los parciales no arrastra.
- `div`: nunca por rechazo. Se recorre el divisor `b` en `[max(1, second.min), second.max]` y el cociente `q` desde `ceil(first.min / b)` hasta `floor(first.max / b)`; en modo `exact`, `a = b * q` y `remainder = 0`; en modo `remainder`, se elige `r` en `[1, b - 1]` con `rand` y se descarta si `b * q + r > first.max`. El divisor 0 no existe y el cociente 0 tampoco.

**Estrategia:** si `(first.max - first.min + 1) * (second.max - second.min + 1) <= ENUMERATE_MAX`, se enumeran todos los pares, se filtran con `buildOperation` y se barajan (Fisher-Yates con `rand`); el resultado es exacto. Si no, se muestrea con rechazo hasta `wanted * SAMPLE_ATTEMPTS_PER_ITEM` intentos, con un `Set` de claves `a:b` para no repetir. La división usa siempre la construcción por divisor y cociente, enumerando cuando el número de pares `(b, q)` cabe en `ENUMERATE_MAX`.

- [ ] **Paso 1: Escribir las pruebas que fallan**

```ts
import { describe, expect, it } from 'vitest';
import { buildOperation, drawOperations } from './space';
import { validateArithmetic } from './params';
import type { ArithmeticInput, ValidArithmetic } from './types';

const valueOf = (input: Partial<ArithmeticInput>): ValidArithmetic => {
  const v = validateArithmetic({
    kinds: { add: true, sub: false, mul: false, div: false },
    first: { min: 10, max: 99 },
    second: { min: 10, max: 99 },
    carry: 'any',
    division: 'exact',
    count: 10,
    layout: 'columns',
    columns: 3,
    ...input,
  });
  if (!v.ok) throw new Error('parámetros no válidos en la prueba');
  return v.value;
};

const rand = () => 0.5;

describe('buildOperation', () => {
  it('suma sin llevada acepta 34 + 25 y rechaza 47 + 38', () => {
    const value = valueOf({ carry: 'without' });
    expect(buildOperation('add', 34, 25, value)?.result).toBe(59);
    expect(buildOperation('add', 47, 38, value)).toBeNull();
  });

  it('suma con llevada exige al menos un arrastre', () => {
    const value = valueOf({ carry: 'with' });
    expect(buildOperation('add', 47, 38, value)?.result).toBe(85);
    expect(buildOperation('add', 34, 25, value)).toBeNull();
  });

  it('la resta nunca es negativa y ordena los operandos', () => {
    const value = valueOf({ kinds: { add: false, sub: true, mul: false, div: false } });
    const op = buildOperation('sub', 27, 52, value);
    expect(op).not.toBeNull();
    expect(op?.a).toBe(52);
    expect(op?.b).toBe(27);
    expect(op?.result).toBe(25);
  });

  it('resta sin llevada rechaza el préstamo', () => {
    const value = valueOf({ kinds: { add: false, sub: true, mul: false, div: false }, carry: 'without' });
    expect(buildOperation('sub', 58, 23, value)?.result).toBe(35);
    expect(buildOperation('sub', 52, 27, value)).toBeNull();
  });

  it('multiplicación sin llevada acepta 23 × 3 y rechaza 47 × 6', () => {
    const value = valueOf({ kinds: { add: false, sub: false, mul: true, div: false }, second: { min: 2, max: 9 }, carry: 'without' });
    expect(buildOperation('mul', 23, 3, value)?.result).toBe(69);
    expect(buildOperation('mul', 47, 6, value)).toBeNull();
  });

  it('división exacta solo acepta múltiplos', () => {
    const value = valueOf({ kinds: { add: false, sub: false, mul: false, div: true }, second: { min: 2, max: 9 }, division: 'exact' });
    const op = buildOperation('div', 84, 7, value);
    expect(op?.result).toBe(12);
    expect(op?.remainder).toBe(0);
    expect(buildOperation('div', 85, 7, value)).toBeNull();
  });

  it('división por cero no existe', () => {
    const value = valueOf({ kinds: { add: false, sub: false, mul: false, div: true }, second: { min: 0, max: 9 } });
    expect(buildOperation('div', 84, 0, value)).toBeNull();
  });
});

describe('drawOperations', () => {
  it('no repite pares', () => {
    const value = valueOf({ first: { min: 0, max: 9 }, second: { min: 0, max: 9 } });
    const ops = drawOperations('add', value, 100, rand);
    const keys = new Set(ops.map((o) => `${o.a}:${o.b}`));
    expect(keys.size).toBe(ops.length);
  });

  it('devuelve como mucho el espacio disponible', () => {
    // 3 × 3 pares posibles: 0..2 con 0..2.
    const value = valueOf({ first: { min: 0, max: 2 }, second: { min: 0, max: 2 } });
    expect(drawOperations('add', value, 50, rand)).toHaveLength(9);
  });

  it('todas las divisiones con resto tienen resto entre 1 y divisor - 1', () => {
    const value = valueOf({
      kinds: { add: false, sub: false, mul: false, div: true },
      first: { min: 100, max: 999 },
      second: { min: 2, max: 9 },
      division: 'remainder',
    });
    const ops = drawOperations('div', value, 40, Math.random);
    expect(ops.length).toBeGreaterThan(0);
    for (const op of ops) {
      expect(op.remainder).toBeGreaterThan(0);
      expect(op.remainder).toBeLessThan(op.b);
      expect(op.b * op.result + op.remainder).toBe(op.a);
      expect(op.a).toBeLessThanOrEqual(999);
      expect(op.a).toBeGreaterThanOrEqual(100);
    }
  });

  it('devuelve una lista vacía cuando el espacio es imposible', () => {
    // Divisiones exactas de 3 dígitos con divisor 500..999: el único múltiplo posible sería el propio divisor
    // con cociente 1; se comprueba que, si no hay ninguno, la lista es vacía en lugar de colgarse.
    const value = valueOf({
      kinds: { add: false, sub: false, mul: false, div: true },
      first: { min: 100, max: 101 },
      second: { min: 200, max: 300 },
      division: 'exact',
    });
    expect(drawOperations('div', value, 10, rand)).toEqual([]);
  });

  it('el muestreo de espacios grandes no se cuelga', () => {
    const value = valueOf({ first: { min: 10000, max: 99999 }, second: { min: 10000, max: 99999 } });
    const started = Date.now();
    expect(drawOperations('add', value, 200, Math.random)).toHaveLength(200);
    expect(Date.now() - started).toBeLessThan(400);
  });
});
```

- [ ] **Paso 2: Ejecutar y ver que falla**

`pnpm test src/generators/arithmetic/space.test.ts`

- [ ] **Paso 3: Implementar `space.ts`**

Funciones auxiliares privadas y puras: `digitsOf(n)`, `addHasCarry(a, b)`, `subNeedsBorrow(a, b)`, `mulHasCarry(a, b)`. Todas trabajan por columnas decimales, sin cadenas.

- [ ] **Paso 4: Pruebas en verde**

- [ ] **Paso 5: Commit**

```bash
git commit -am "feat(operaciones): espacio de combinaciones con llevada y división construida"
```

---

### Task 3: Generación sembrada, mezcla y déficit

**Ficheros:**
- Crear: `src/generators/arithmetic/generate.ts`, `src/generators/arithmetic/seed.ts`, `src/generators/arithmetic/index.ts`
- Probar: `src/generators/arithmetic/generate.test.ts`, `src/generators/arithmetic/golden.test.ts`, `src/generators/arithmetic/stress.test.ts`

**Interfaces:**
- Consume: `space.ts`, `params.ts`, `@/core/random`.
- Produce:
  ```ts
  export const ARITHMETIC_ALGORITHM_VERSION = 1;

  export interface ArithmeticResult {
    operations: Operation[];
    /** Operaciones pedidas; si `operations.length` es menor, el espacio no daba para más. */
    requested: number;
    seedCode: string;
    version: number;
  }

  export function generateArithmetic(value: ValidArithmetic, seedCode: string): ArithmeticResult;
  export function readSeedInput(input: string): SeedRead; // misma forma que en generators/wordsearch/seed.ts
  ```

**Reparto entre operaciones:** `base = Math.floor(count / kinds.length)`, y el resto se reparte de una en una siguiendo `KIND_ORDER`. Si una operación aporta menos de lo que le tocaba, el déficit se reparte entre las demás en una segunda vuelta (una sola vuelta, para que el algoritmo termine siempre). Las operaciones resultantes se barajan con el PRNG antes de devolverlas.

Lee `src/generators/wordsearch/{generate,seed}.ts` y copia el patrón de semilla: el mismo código canónico y la misma forma de `readSeedInput`, con `ARITHMETIC_ALGORITHM_VERSION` en lugar de la versión de la sopa.

- [ ] **Paso 1: Escribir las pruebas que fallan**

`generate.test.ts` cubre:
- el mismo código de semilla y los mismos parámetros dan exactamente las mismas operaciones, y dos códigos distintos dan listas distintas;
- con las cuatro operaciones y `count = 20`, hay 5 de cada una;
- con `count = 7` y dos operaciones, hay 4 y 3 siguiendo el orden canónico;
- si una operación no tiene espacio suficiente, las demás cubren el déficit y `operations.length === requested`;
- si el espacio total es menor que lo pedido, `operations.length < requested` y no hay repeticiones;
- `readSeedInput('v2-ABC234')` indica que el código es de otra versión;
- `readSeedInput('hola')` indica que el código no es válido.

`golden.test.ts` congela v1 con tres casos fijos (suma sin llevada; mezcla de las cuatro con división con resto; multiplicación de 3 × 1 dígitos), comparando la lista completa de operaciones serializada y afirmando `version === 1`.

`stress.test.ts` mide el peor caso razonable: 200 operaciones mixtas con rangos de cinco dígitos y división con resto, con límite `process.env.CI ? 1200 : 400` ms, igual que la prueba de estrés de la sopa.

- [ ] **Paso 2: Ejecutar y ver que falla**
- [ ] **Paso 3: Implementar**
- [ ] **Paso 4: Pruebas en verde**
- [ ] **Paso 5: Commit**

```bash
git commit -am "feat(operaciones): generación sembrada con reparto equilibrado y fixture dorado"
```

---

### Task 4: Sugerencias de ajuste

**Ficheros:**
- Crear: `src/generators/arithmetic/suggest.ts`
- Modificar: `src/generators/arithmetic/index.ts`
- Probar: `src/generators/arithmetic/suggest.test.ts`

**Interfaces:**
- Produce:
  ```ts
  export type ArithmeticSuggestion =
    | { code: 'raise-first-max'; to: number }      // primer múltiplo válido del dividendo
    | { code: 'lower-first-min'; to: number }
    | { code: 'widen-second'; min: number; max: number }
    | { code: 'allow-remainder' }
    | { code: 'allow-carry' }
    | { code: 'reduce-count'; to: number };

  /** `available` es lo que el generador consiguió producir. */
  export function suggestArithmetic(value: ValidArithmetic, available: number): ArithmeticSuggestion[];
  ```

Casos que deben quedar cubiertos por pruebas, con los valores comprobados a mano:
- División exacta con `first = { min: 100, max: 101 }` y `second = { min: 7, max: 7 }`: el primer múltiplo de 7 a partir de 101 es 105, así que sugiere `raise-first-max: 105`.
- División exacta imposible por abajo: sugiere `lower-first-min` al múltiplo válido inmediatamente inferior cuando existe.
- División exacta sin ningún múltiplo en el rango: sugiere además `allow-remainder`.
- Suma sin llevada con rangos que la hacen casi imposible: sugiere `allow-carry`.
- Espacio menor que la cantidad pedida: sugiere `reduce-count: available`.

Las sugerencias se ordenan de menos a más invasiva y nunca se inventan valores fuera de `ARITHMETIC_LIMITS`.

- [ ] Pasos 1–5 con la misma forma que las tareas anteriores. Commit: `feat(operaciones): sugerencias concretas cuando el espacio no da`

---

### Task 5: Worker y cliente de generación compartido

**Ficheros:**
- Crear: `src/workers/arithmetic.ts`, `src/workers/arithmetic.worker.ts`, `src/tools/shared/generationClient.ts`
- Modificar: `src/tools/wordsearch/wordSearchClient.ts` (pasa a envolver el cliente genérico), `src/tools/wordsearch/WordSearchTool.tsx` si cambia algún tipo
- Mover: `src/tools/wordsearch/wordSearchClient.test.ts` → `src/tools/shared/generationClient.test.ts`, conservando todos los casos
- Probar: `src/tools/shared/generationClient.test.ts`, `src/workers/arithmetic.test.ts`

**Interfaces:**
- Produce:
  ```ts
  // tools/shared/generationClient.ts
  export const GENERATION_TIMEOUT_MS = 1500;
  export type GenerationStatus = 'idle' | 'pending' | 'done' | 'failed';
  export interface GenerationResponse { requestId: number; ok: boolean }
  export interface GenerationSnapshot<R extends GenerationResponse> { status: GenerationStatus; key: string | null; response: R | null }
  export interface WorkerLike<R extends GenerationResponse> { … }
  export function createGenerationClient<Req extends { requestId: number }, R extends GenerationResponse>(createWorker: () => WorkerLike<R>): …;

  // workers/arithmetic.ts
  export interface ArithmeticRequest { requestId: number; value: ValidArithmetic; seedCode: string }
  export type ArithmeticResponse = { requestId: number; ok: true; result: ArithmeticResult } | { requestId: number; ok: false };
  export function handleArithmeticRequest(request: ArithmeticRequest): ArithmeticResponse;
  ```

El comportamiento del almacén no cambia: invalida respuestas viejas, termina un Worker ocupado, corta a 1,5 s, nunca reenvía el texto de un error. La extracción debe dejar las pruebas existentes pasando sin cambiar su intención (solo los tipos).

`src/workers/arithmetic.worker.ts` copia la forma de `wordsearch.worker.ts`.

- [ ] **Paso 1:** mover las pruebas del cliente y adaptarlas a los genéricos; añadir `workers/arithmetic.test.ts` (respuesta correcta; parámetros imposibles devuelven `ok: false` sin texto).
- [ ] **Paso 2:** ver fallar.
- [ ] **Paso 3:** implementar el cliente genérico, reescribir `wordSearchClient.ts` como una envoltura tipada y crear el Worker de operaciones.
- [ ] **Paso 4:** `pnpm test && pnpm lint && pnpm typecheck` en verde (toda la suite: esta tarea toca código de la Fase 2).
- [ ] **Paso 5:** Commit: `refactor(herramientas): cliente de generación genérico y Worker de operaciones`

---

### Task 6: Maquetación en columnas y paginación

**Ficheros:**
- Crear: `src/layout/arithmetic/blocks.ts`, `src/layout/arithmetic/layoutArithmetic.ts`, `src/layout/arithmetic/index.ts`
- Probar: `src/layout/arithmetic/blocks.test.ts`, `src/layout/arithmetic/layoutArithmetic.test.ts`

**Interfaces:**
- Consume: `@/core/measure` (`measureTextMm`, `capHeightMm`), `@/core/sheet`, `@/layout/common/frame` (`buildFrame`), tipos de `@/generators/arithmetic`.
- Produce:
  ```ts
  export const ARITHMETIC_LAYOUT = {
    digitSizeMm: 5,
    inlineSizeMm: 4.5,
    indexSizeMm: 2.5,
    ruleWidthMm: 0.3,
    lineGapMm: 2.2,
    answerGapMm: 7,
    blockGapXMm: 6,
    blockGapYMm: 6,
    inlineLineMm: 11,
    answerRuleMm: 20,
  } as const;

  export interface BlockBox { w: number; h: number }
  /** Geometría de un bloque: mide sin dibujar (capacidad) y dibuja con `solved` (soluciones). */
  export function measureBlock(op: Operation, layout: SheetLayout, lang: Lang): BlockBox;
  export function blockPrimitives(op: Operation, x: number, y: number, layout: SheetLayout, lang: Lang, index: number, solved: boolean): Primitive[];

  export type ArithmeticLayoutResult =
    | { ok: true; doc: SheetDocument; capacity: { perPage: number; pages: number } }
    | { ok: false; error: { code: 'block-too-large' } };

  export function layoutArithmetic(input: {
    result: ArithmeticResult;
    header: SheetHeader;
    labels: FrameLabels;
    paper: PaperSize;
    lang: Lang;
    includeSolutions: boolean;
  }): ArithmeticLayoutResult;
  ```

**Bloque en columnas** (suma, resta, multiplicación): índice pequeño arriba a la izquierda; primer operando alineado a la derecha; en la línea siguiente el signo a la izquierda y el segundo operando alineado a la derecha; una raya horizontal del ancho del bloque; debajo, el hueco de respuesta con la altura de una línea. Con `solved`, el resultado se escribe en ese hueco alineado a la derecha.

**Capacidad:** todos los bloques de una hoja usan el ancho del bloque más ancho, para que las columnas queden alineadas. `perPage = filas × columnas`, con `filas = floor((contenido.h + blockGapYMm) / (alto + blockGapYMm))` y el ancho de columna derivado de `contenido.w` y del número de columnas. Si un solo bloque no cabe en la caja de contenido, se devuelve `block-too-large`.

Esta tarea cubre `add`, `sub`, `mul` y la disposición en línea deja el hueco de respuesta como una raya de `answerRuleMm`. La división se añade en la Tarea 7; hasta entonces `blockPrimitives` para `div` puede delegar en una función que la Tarea 7 implementa, pero **no** debe quedar sin prueba: si la Tarea 7 aún no existe, esta tarea prueba que `measureBlock` para `div` devuelve una caja no vacía.

**Pruebas** (`layoutArithmetic.test.ts`): capacidad esperada en A4 y Carta con 2 y 5 columnas; el total de bloques dibujados en todas las páginas de alumno es igual al número de operaciones; ningún primitivo se sale de los márgenes de la hoja (comprobación numérica sobre todas las páginas); con soluciones, hay tantas páginas de soluciones como de alumno y cada una lleva los mismos índices; `pages` y `perPage` de `capacity` coinciden con lo dibujado.

- [ ] Pasos 1–5. Commit: `feat(operaciones): bloques en columnas, capacidad y paginación`

---

### Task 7: División en dos idiomas y disposición en línea

**Ficheros:**
- Modificar: `src/layout/arithmetic/blocks.ts`
- Probar: `src/layout/arithmetic/blocks.test.ts`

La división tiene dos dibujos, elegidos por `lang`:

- **`es` (casita):** dividendo a la izquierda; línea vertical a su derecha, desde arriba del dividendo hasta debajo de la línea de base; divisor a la derecha de esa vertical; línea horizontal bajo el divisor; el hueco del cociente queda bajo esa horizontal. Con `solved`, el cociente va en ese hueco y, en modo con resto, el resto se escribe bajo el dividendo precedido de la resta.
- **`en` (galera):** divisor a la izquierda; línea vertical a su derecha y línea horizontal encima del dividendo, formando el corchete; el hueco del cociente queda encima de la horizontal, alineado con el dividendo. Con `solved`, el cociente va encima y el resto se escribe a su derecha como `r 3`.

Las pruebas comprueban, para los dos idiomas: que las líneas existen con la orientación correcta (una vertical y una horizontal, con los extremos esperados en milímetros); que el cociente va debajo en `es` y encima en `en`; que la caja medida contiene todos los primitivos dibujados; que en modo con resto aparece el resto al resolver y no aparece sin resolver. Ningún texto se solapa: se comprueba con `measureTextMm` que las cajas de dividendo y divisor no se cruzan.

La disposición en línea se prueba aparte: `23 + 45 = ` seguido de una raya de `answerRuleMm`, y en división con resto el texto resuelto muestra cociente y resto.

- [ ] Pasos 1–5. Commit: `feat(operaciones): casita en español, galera en inglés y disposición en línea`

---

### Task 8: Rutas, diccionarios y mensajes

**Ficheros:**
- Modificar: `src/i18n/routes.ts` (`SectionKey` pasa a `'wordsearch' | 'arithmetic'`, slugs `es: 'operaciones'`, `en: 'arithmetic'`), `src/i18n/dictionary.ts`, `src/i18n/dictionaries/es.ts`, `src/i18n/dictionaries/en.ts`
- Crear: `src/tools/arithmetic/messages.ts`
- Probar: `src/tools/arithmetic/messages.test.ts`, y la prueba de paridad de diccionarios existente debe seguir en verde

El bloque `arithmetic` del diccionario cubre: etiquetas de operaciones, rangos y dígitos, llevada, modo de división, cantidad, disposición y columnas, semilla, soluciones, estado «Generando…», reintento, errores (uno por código de la Tarea 1 más `empty-space`), avisos (`carry-ignored`, `factor-capped`, menos combinaciones de las pedidas), sugerencias (una por código de la Tarea 4) y el aviso de paginación con plural: «Se generarán {pages} hojas, máx. {perPage} por hoja».

`messages.ts` copia el patrón de `tools/wordsearch/messages.ts`: funciones `describeError`, `describeWarning`, `describeSuggestion`, `describeSeed`, cada una con prueba por código. Castellano impersonal, sin tuteo (la prueba de tuteo existente cubre los diccionarios completos).

- [ ] Pasos 1–5. Commit: `feat(operaciones): ruta traducida, textos bilingües y mensajes`

---

### Task 9: Interfaz de la herramienta

**Ficheros:**
- Crear: `src/tools/arithmetic/ArithmeticTool.tsx`, `KindsField.tsx`, `RangeFields.tsx`, `OptionsFields.tsx`, `request.ts`, `index.ts`
- Modificar: `src/app/[lang]/[section]/page.tsx`, `src/app/[lang]/page.tsx` (miniatura real de la portada)
- Probar: `src/tools/arithmetic/request.test.ts`

La herramienta reutiliza `Docket`, `SheetHeaderFields`, `PaperSelect`, `SeedField`, `IncludeSolutionsField`, `JobLine`, `ToneWedge`, `ProofSheet`, `PrintButton`, `PrintRoot` y `DownloadPdfButton`. Lee `WordSearchTool.tsx` entero antes de escribir: el flujo (validación → clave de petición → debounce de 250 ms → Worker → maquetación → documento) se repite igual, incluidas estas reglas:

- Imprimir y Descargar PDF solo se habilitan con un resultado vigente para la clave actual.
- El estado «Generando…» reserva su ancho con una copia invisible.
- La semilla mostrada es «—» si el código no es válido o es de otra versión.
- Los campos numéricos se validan en el modelo, no con `type="number"` a secas: un valor vacío no debe romper la vista previa.
- `request.ts` construye la clave con todos los parámetros que cambian la ficha (operaciones, rangos, llevada, modo de división, cantidad, disposición, columnas, semilla) y **no** con el encabezado ni el papel.

La interfaz muestra, además de los errores bloqueantes: el aviso de paginación con hojas y máximo por hoja; el aviso de menos combinaciones disponibles con la cifra; las sugerencias de la Tarea 4 con el mismo panel que la sopa usa para las palabras no colocadas (reutilizar el patrón, no el componente, si los datos no encajan).

La portada dibuja una miniatura real: `thumbnailPage` para `arithmetic` genera un cuadernillo de ejemplo con semilla fija `v1-PORTADA`, igual que la sopa.

- [ ] Pasos 1–5. Commit: `feat(operaciones): interfaz del cuadernillo con prueba de imprenta`

---

### Task 10: Pruebas de extremo a extremo y presupuesto

**Ficheros:**
- Crear: `tests/e2e/arithmetic.spec.ts`
- Modificar: `tests/e2e/{ads,print,offline,network,pdf}.spec.ts` donde haga falta cubrir la nueva ruta

`arithmetic.spec.ts` cubre, con `/es/operaciones/` y `/en/arithmetic/`:
1. carga y generación por defecto: la vista previa muestra una hoja con operaciones;
2. cambiar a las cuatro operaciones y 200 operaciones: aparece el aviso de paginación y el número de páginas de la línea de trabajo coincide;
3. semilla fija: dos cargas producen la misma hoja (comparar el texto del SVG);
4. código de otra versión (`v2-ABC234`): mensaje concreto, Imprimir y PDF deshabilitados;
5. división exacta con rangos incompatibles: mensaje con la sugerencia y sin hoja generada;
6. móvil a 360 px: el parte se pliega y la hoja se puede ampliar;
7. impresión: `#print-root` con el número de páginas esperado.

El resto de specs deben seguir en verde con la nueva sección; `ads.spec` mide las distancias también en la ruta nueva.

- [ ] **Verificación:** `pnpm build:e2e && pnpm test:e2e && pnpm test:e2e:root && pnpm budget`. El presupuesto debe seguir por debajo de 300 KB en todas las rutas; si la ruta nueva se pasa, hay que dividir el código de la herramienta antes de cerrar la tarea.
- [ ] Commit: `test(operaciones): recorrido completo en el navegador`

---

### Task 11: Cierre de fase

Sin código nuevo salvo correcciones.

- [ ] **Paso 1:** verificación desde cero: `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm budget`, `pnpm build:e2e && pnpm test:e2e && pnpm test:e2e:root`.
- [ ] **Paso 2:** codegraph: `codegraph sync` y comprobación de fronteras (`generateArithmetic` solo desde `workers` y la portada; `layoutArithmetic` solo desde `tools/arithmetic` y la portada; `renderPdf` solo con `import()`), con la matriz de importaciones frente a §4.3.
- [ ] **Paso 3:** impeccable: `finish` sobre la superficie de la herramienta, correcciones en un solo lote, y `documenter` si cambia el sistema visual.
- [ ] **Paso 4:** revisión final de toda la rama con el modelo más capaz, una onda de correcciones y una re-revisión acotada.
- [ ] **Paso 5:** informe `docs/superpowers/reports/AAAA-MM-DD-fase-3-cierre.md` con resultado, tablas de verificación y presupuesto, codegraph, impeccable, decisiones, comprobaciones manuales pendientes del operador y anexos con todos los `Ruling:` y menores aplazados del ledger.
- [ ] **Paso 6:** parada para la revisión del operador.

## Autorrevisión del plan

- **Cobertura de la spec §5.4:** operaciones seleccionables y ficha mixta (T1, T3), rangos por operando y selector de dígitos (T1, T9), llevada en suma, resta y multiplicación (T2), división exacta o con resto construida desde el divisor (T2), 1–200 sin repeticiones (T1, T3), disposición en columnas o en línea con 2–5 columnas (T6, T7), división según idioma (T7), enumeración o muestreo según el tamaño del espacio (T2), semilla nueva en cada regeneración (T3, T9), soluciones con resultado y resto (T6, T7).
- **Cobertura de §5.5:** división exacta con rangos incompatibles (T4, T9, T10), menos combinaciones que operaciones pedidas (T3, T4, T9), más operaciones de las que caben con aviso de hojas (T6, T9, T10), fallo del Worker con reintento (T5, T9), PDF sin red (heredado de la Fase 2).
- **Anexo C de la Fase 2:** cliente genérico y patrón de Worker (T5), `DEFAULT_STROKE_WIDTH_MM` en los rect de los bloques (T6), versión de algoritmo y fixture dorado propios (T3).
- **Sin marcadores de relleno:** cada tarea nombra ficheros exactos, interfaces con firmas y pruebas con valores comprobados a mano.
- **Consistencia de tipos:** `ValidArithmetic` (T1) es lo que consumen `space.ts` (T2), `generate.ts` (T3), el Worker (T5) y la clave de petición (T9); `ArithmeticResult` (T3) es lo que consume `layoutArithmetic` (T6).
