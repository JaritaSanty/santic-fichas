'use client';

import { useId } from 'react';

export function UnplacedPanel({ words, suggestions, onRemove, labels }: {
  words: string[];
  suggestions: string[];
  onRemove: () => void;
  labels: { title: string; intro: string; action: string };
}) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="grid gap-3 border border-line bg-surface p-4 text-sm text-ink">
      <h3 id={titleId} className="text-base font-semibold">{labels.title}</h3>
      <p>
        {labels.intro} <span className="font-sheet font-semibold">{words.join(', ')}</span>
      </p>
      <ul className="grid list-disc gap-1 pl-5">
        {suggestions.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
      <button type="button" data-action="generate" onClick={onRemove} className="justify-self-start bg-brand px-4 py-2 font-semibold text-surface hover:bg-brand-strong">
        {labels.action}
      </button>
    </section>
  );
}
