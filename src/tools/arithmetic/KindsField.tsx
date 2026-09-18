'use client';

import { KIND_ORDER, type OperationKind } from '@/generators/arithmetic';

export function KindsField({ value, onChange, labels }: {
  value: Record<OperationKind, boolean>;
  onChange: (next: Record<OperationKind, boolean>) => void;
  labels: { legend: string } & Record<OperationKind, string>;
}) {
  return (
    <div className="border-t border-line pt-4">
      <fieldset className="grid grid-cols-2 gap-2">
        <legend className="mb-3 text-base font-semibold text-ink">{labels.legend}</legend>
        {KIND_ORDER.map((kind) => (
          <label key={kind} className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={value[kind]}
              onChange={(e) => onChange({ ...value, [kind]: e.target.checked })}
              className="h-4 w-4"
            />
            {labels[kind]}
          </label>
        ))}
      </fieldset>
    </div>
  );
}
