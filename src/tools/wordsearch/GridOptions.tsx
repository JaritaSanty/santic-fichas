'use client';

import { WORDSEARCH_LIMITS, type DirectionOptions } from '@/generators/wordsearch';

const SIZES = Array.from({ length: WORDSEARCH_LIMITS.maxSize - WORDSEARCH_LIMITS.minSize + 1 }, (_, i) => WORDSEARCH_LIMITS.minSize + i);
const DIRECTION_KEYS = ['horizontal', 'vertical', 'diagonal', 'reversed'] as const;

export function GridOptions({ size, onSizeChange, directions, onDirectionsChange, labels }: {
  size: number;
  onSizeChange: (next: number) => void;
  directions: DirectionOptions;
  onDirectionsChange: (next: DirectionOptions) => void;
  labels: { legend: string; size: string; directions: string } & Record<(typeof DIRECTION_KEYS)[number], string>;
}) {
  return (
    <div className="border-t border-line pt-4">
      <fieldset className="grid gap-3">
        <legend className="mb-3 text-base font-semibold text-ink">{labels.legend}</legend>
        <label className="grid gap-1 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">{labels.size}</span>
          <select value={size} onChange={(e) => onSizeChange(Number(e.target.value))} className="border border-line bg-surface px-3 py-2 text-base tabular-nums text-ink">
            {SIZES.map((n) => (
              <option key={n} value={n}>{`${n} × ${n}`}</option>
            ))}
          </select>
        </label>
        <fieldset className="grid grid-cols-2 gap-2">
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{labels.directions}</legend>
          {DIRECTION_KEYS.map((key) => (
            <label key={key} className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={directions[key]} onChange={(e) => onDirectionsChange({ ...directions, [key]: e.target.checked })} className="h-4 w-4" />
              {labels[key]}
            </label>
          ))}
        </fieldset>
      </fieldset>
    </div>
  );
}
