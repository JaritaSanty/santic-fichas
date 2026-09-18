'use client';

import { useId } from 'react';
import { ARITHMETIC_LIMITS, type CarryMode, type DivisionMode, type SheetLayout } from '@/generators/arithmetic';

const COLUMN_VALUES = Array.from(
  { length: ARITHMETIC_LIMITS.maxColumns - ARITHMETIC_LIMITS.minColumns + 1 },
  (_, i) => ARITHMETIC_LIMITS.minColumns + i,
);

function RadioGroup<T extends string>({ legend, name, value, options, onChange, help }: {
  legend: string;
  name: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (next: T) => void;
  help?: string;
}) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{legend}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label key={option.value} className="flex items-center gap-2 text-sm text-ink">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="h-4 w-4"
            />
            {option.label}
          </label>
        ))}
      </div>
      {help && <p className="text-xs text-muted">{help}</p>}
    </fieldset>
  );
}

export interface OptionsLabels {
  carryLegend: string;
  carryAny: string;
  carryWith: string;
  carryWithout: string;
  carryHelp: string;
  divisionLegend: string;
  divisionExact: string;
  divisionRemainder: string;
  countLabel: string;
  countHelp: string;
  layoutLegend: string;
  layoutColumns: string;
  layoutInline: string;
  columnsLabel: string;
  columnsHelp: string;
}

/**
 * Llevada, modo de división, número de operaciones, disposición y columnas por hoja. Las columnas valen en las dos
 * disposiciones (también en línea reparten los renglones), así que el control nunca se oculta.
 */
export function OptionsFields({ carry, onCarryChange, division, onDivisionChange, count, onCountChange, layout, onLayoutChange, columns, onColumnsChange, labels }: {
  carry: CarryMode;
  onCarryChange: (next: CarryMode) => void;
  division: DivisionMode;
  onDivisionChange: (next: DivisionMode) => void;
  /** Texto, no número: un campo vacío debe poder escribirse sin romper la vista previa. */
  count: string;
  onCountChange: (next: string) => void;
  layout: SheetLayout;
  onLayoutChange: (next: SheetLayout) => void;
  columns: number;
  onColumnsChange: (next: number) => void;
  labels: OptionsLabels;
}) {
  const carryName = useId();
  const divisionName = useId();
  const layoutName = useId();
  const countHelpId = useId();
  const columnsHelpId = useId();
  return (
    <div className="grid gap-4 border-t border-line pt-4">
      <RadioGroup
        legend={labels.carryLegend}
        name={carryName}
        value={carry}
        onChange={onCarryChange}
        help={labels.carryHelp}
        options={[
          { value: 'any', label: labels.carryAny },
          { value: 'with', label: labels.carryWith },
          { value: 'without', label: labels.carryWithout },
        ] as const}
      />
      <RadioGroup
        legend={labels.divisionLegend}
        name={divisionName}
        value={division}
        onChange={onDivisionChange}
        options={[
          { value: 'exact', label: labels.divisionExact },
          { value: 'remainder', label: labels.divisionRemainder },
        ] as const}
      />
      <div className="grid gap-1">
        <label className="grid gap-1 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">{labels.countLabel}</span>
          <input
            type="text"
            inputMode="numeric"
            value={count}
            onChange={(e) => onCountChange(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            aria-describedby={countHelpId}
            className="border border-line bg-surface px-3 py-2 text-base tabular-nums text-ink"
          />
        </label>
        <p id={countHelpId} className="text-xs text-muted">{labels.countHelp}</p>
      </div>
      <RadioGroup
        legend={labels.layoutLegend}
        name={layoutName}
        value={layout}
        onChange={onLayoutChange}
        options={[
          { value: 'columns', label: labels.layoutColumns },
          { value: 'inline', label: labels.layoutInline },
        ] as const}
      />
      <div className="grid gap-1">
        <label className="grid gap-1 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">{labels.columnsLabel}</span>
          <select
            value={columns}
            onChange={(e) => onColumnsChange(Number(e.target.value))}
            aria-describedby={columnsHelpId}
            className="border border-line bg-surface px-3 py-2 text-base tabular-nums text-ink"
          >
            {COLUMN_VALUES.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
        <p id={columnsHelpId} className="text-xs text-muted">{labels.columnsHelp}</p>
      </div>
    </div>
  );
}
