'use client';

import type { PaperSize } from '@/core/paper';

export function PaperSelect({ value, onChange, labels }: {
  value: PaperSize;
  onChange: (next: PaperSize) => void;
  labels: { paper: string; a4: string; letter: string };
}) {
  return (
    <div className="border-t border-line pt-4">
      <label className="grid gap-1 text-sm">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">{labels.paper}</span>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value === 'letter' ? 'letter' : 'a4')}
          className="border border-line bg-surface px-3 py-2 text-base text-ink"
        >
          <option value="a4">{labels.a4}</option>
          <option value="letter">{labels.letter}</option>
        </select>
      </label>
    </div>
  );
}
