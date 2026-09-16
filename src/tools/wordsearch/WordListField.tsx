'use client';

import { useId } from 'react';

export function WordListField({ value, onChange, messages, countLabel, labels }: {
  value: string;
  onChange: (next: string) => void;
  messages: string[];
  countLabel: string;
  labels: { label: string; help: string };
}) {
  const helpId = useId();
  const messagesId = useId();
  return (
    <div className="grid gap-2 border-t border-line pt-4">
      <label className="grid gap-1 text-sm">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">{labels.label}</span>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={8}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="none"
          aria-describedby={`${helpId} ${messagesId}`}
          className="resize-y border border-line bg-surface px-3 py-2 font-sheet text-base text-ink"
        />
      </label>
      <p id={helpId} className="flex flex-wrap justify-between gap-2 text-xs text-muted">
        <span>{labels.help}</span>
        <span className="tabular-nums">{countLabel}</span>
      </p>
      <ul id={messagesId} aria-live="polite" className="grid gap-1 text-xs text-ink">
        {messages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </div>
  );
}
