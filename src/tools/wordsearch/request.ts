import type { Lang } from '@/core/lang';
import { collapseSpaces, normalizeWord, type WordEntry } from '@/core/text';
import type { DirectionOptions } from '@/generators/wordsearch';

/**
 * Clave de la petición al Worker. Incluye la grafía original y la línea de cada palabra: corregir solo una tilde
 * o una mayúscula debe regenerar para que la hoja imprima la grafía nueva (la colocación no cambia, porque el
 * desempate usa el orden relativo de las líneas).
 */
export function generationKey(entries: readonly WordEntry[], size: number, directions: DirectionOptions, seedCode: string, lang: Lang): string {
  return JSON.stringify({ words: entries.map((e) => [e.line, e.original, e.normalized]), size, directions, seedCode, lang });
}

/**
 * Quita del texto actual las líneas cuya forma normalizada está entre las no colocadas (también sus repeticiones).
 * Cada línea se limpia igual que en `parseWordList`, para reconocer las mismas palabras.
 */
export function removeWordLines(text: string, normalized: readonly string[], lang: Lang): string {
  const drop = new Set(normalized);
  return text
    .split(/\r?\n/)
    .filter((line) => {
      const result = normalizeWord(collapseSpaces(line), lang);
      return !(result.ok && drop.has(result.value));
    })
    .join('\n');
}
