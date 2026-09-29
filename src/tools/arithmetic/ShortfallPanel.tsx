'use client';

import { useId } from 'react';

/**
 * Ficha corta: no hay tantas operaciones distintas como se han pedido. Mismo patrón que el panel de palabras sin
 * colocar de la sopa (leyenda, sugerencias con viñeta y una acción primaria), con los datos de este generador.
 *
 * La lista de sugerencias puede venir vacía aunque la ficha esté incompleta (informe de la Tarea 4): el aviso no
 * depende de ella. La acción solo aparece si queda algo que generar (con cero operaciones no se propone nada).
 */
export function ShortfallPanel({ title, intro, lead, suggestions, action, onApply }: {
  title: string;
  intro: string;
  /** Entrada de la lista: dice una sola vez si los ajustes llenan la ficha, para que cada sugerencia sea su acción. */
  lead: string;
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
        <div className="grid gap-2">
          <p className="text-muted">{lead}</p>
          {/* La viñeta es un filete de 1 px, no el punto del navegador: en la hoja y en el parte todo se marca con trazo. */}
          <ul className="grid gap-1">
            {suggestions.map((s) => (
              <li key={s} className="grid grid-cols-[0.75rem_1fr] gap-2">
                <span aria-hidden="true" className="mt-[0.7em] block h-px w-3 bg-line" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {action && (
        <button type="button" data-action="generate" onClick={onApply} className="justify-self-start bg-brand px-4 py-2 font-semibold text-surface hover:bg-brand-strong">
          {action}
        </button>
      )}
    </section>
  );
}
