'use client';

import { useId } from 'react';

/**
 * Ficha corta: no hay tantas operaciones distintas como se han pedido. Mismo patrón que el panel de palabras sin
 * colocar de la sopa (leyenda, sugerencias con viñeta y una acción primaria), con los datos de este generador.
 *
 * La lista de sugerencias puede venir vacía aunque la ficha esté incompleta (informe de la Tarea 4): el aviso no
 * depende de ella. La acción solo aparece si queda algo que generar (con cero operaciones no se propone nada).
 */
export function ShortfallPanel({ title, intro, suggestions, action, onApply }: {
  title: string;
  intro: string;
  suggestions: string[];
  action: string | null;
  onApply: () => void;
}) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="grid gap-3 border border-line bg-surface p-4 text-sm text-ink">
      <h3 id={titleId} className="text-base font-semibold">{title}</h3>
      <p>{intro}</p>
      {suggestions.length > 0 && (
        <ul className="grid list-disc gap-1 pl-5">
          {suggestions.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      )}
      {action && (
        <button type="button" data-action="generate" onClick={onApply} className="justify-self-start bg-brand px-4 py-2 font-semibold text-surface hover:bg-brand-strong">
          {action}
        </button>
      )}
    </section>
  );
}
