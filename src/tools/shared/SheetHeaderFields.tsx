'use client';

import { HEADER_LIMITS, type SheetHeader } from '@/layout/common/frame';

export function SheetHeaderFields({ value, onChange, labels }: {
  value: SheetHeader;
  onChange: (next: SheetHeader) => void;
  labels: { legend: string; title: string; school: string };
}) {
  return (
    <fieldset className="grid gap-3">
      <legend className="mb-3 text-base font-semibold text-ink">{labels.legend}</legend>
      <label className="grid gap-1 text-sm">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">{labels.title}</span>
        <input
          type="text"
          value={value.title}
          maxLength={HEADER_LIMITS.title}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
          className="border border-line bg-surface px-3 py-2 text-base text-ink"
          autoComplete="off"
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">{labels.school}</span>
        <input
          type="text"
          value={value.school}
          maxLength={HEADER_LIMITS.school}
          onChange={(e) => onChange({ ...value, school: e.target.value })}
          className="border border-line bg-surface px-3 py-2 text-base text-ink"
          autoComplete="off"
        />
      </label>
    </fieldset>
  );
}
