'use client';

import { useId } from 'react';

export function SeedField({ value, onChange, onNewSeed, error, labels }: {
  value: string;
  onChange: (next: string) => void;
  onNewSeed: () => void;
  error: string | null;
  labels: { label: string; help: string; newSeed: string };
}) {
  const helpId = useId();
  const errorId = useId();
  return (
    <div className="grid gap-2 border-t border-line pt-4">
      <label className="grid gap-1 text-sm">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">{labels.label}</span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="v1-ABC234"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${helpId} ${errorId}` : helpId}
          className="border border-line bg-surface px-3 py-2 text-base tabular-nums text-ink"
        />
      </label>
      <p id={helpId} className="text-xs text-muted">{labels.help}</p>
      {error && (
        <p id={errorId} className="text-xs font-semibold text-ink">
          {error}
        </p>
      )}
      <button type="button" data-action="generate" onClick={onNewSeed} className="justify-self-start border border-brand px-4 py-2 font-semibold text-brand hover:bg-brand hover:text-surface">
        {labels.newSeed}
      </button>
    </div>
  );
}
