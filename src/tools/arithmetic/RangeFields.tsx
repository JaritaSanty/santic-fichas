'use client';

import { useId } from 'react';
import { rangeForDigits } from '@/generators/arithmetic';

/** Los extremos viajan como texto: un campo a medias no puede convertirse en un número inventado. */
export interface RangeText {
  min: string;
  max: string;
}

export interface RangeFieldLabels {
  legend: string;
  first: string;
  second: string;
  min: string;
  max: string;
  digits: string;
  digitsHelp: string;
}

const digitValues = (maxDigits: number) => Array.from({ length: maxDigits }, (_, i) => i + 1);

/** Dígitos que describen el rango escrito, o «» si no coincide con ninguno: el selector nunca miente sobre el rango. */
function digitsOf(value: RangeText, maxDigits: number): string {
  const match = digitValues(maxDigits).find((d) => {
    const range = rangeForDigits(d, maxDigits);
    return String(range.min) === value.min.trim() && String(range.max) === value.max.trim();
  });
  return match === undefined ? '' : String(match);
}

function NumberField({ label, value, onChange, error, errorId }: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  error: string | null;
  errorId: string;
}) {
  return (
    // `min-w-0`: sin él el ancho intrínseco del input (20 caracteres) desborda su columna de la retícula.
    <label className="grid min-w-0 gap-1 text-sm">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        spellCheck={false}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="w-full min-w-0 border border-line bg-surface px-3 py-2 text-base tabular-nums text-ink"
      />
    </label>
  );
}

function OperandFields({ legend, value, onChange, maxDigits, error, helpId, labels }: {
  legend: string;
  value: RangeText;
  onChange: (next: RangeText) => void;
  maxDigits: number;
  /** El problema del rango, repetido bajo sus dos campos: el aviso bloqueante es el resumen. */
  error: string | null;
  /** La ayuda de los dígitos se escribe una sola vez para los dos operandos y los dos selectores la citan. */
  helpId: string;
  labels: RangeFieldLabels;
}) {
  const errorId = useId();
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{legend}</legend>
      <div className="grid grid-cols-2 gap-3">
        <NumberField label={labels.min} value={value.min} onChange={(min) => onChange({ ...value, min })} error={error} errorId={errorId} />
        <NumberField label={labels.max} value={value.max} onChange={(max) => onChange({ ...value, max })} error={error} errorId={errorId} />
      </div>
      {error && (
        <p id={errorId} className="text-xs font-semibold text-ink">
          {error}
        </p>
      )}
      <label className="grid gap-1 text-sm">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">{labels.digits}</span>
        <select
          value={digitsOf(value, maxDigits)}
          onChange={(e) => {
            const digits = Number(e.target.value);
            if (!digits) return;
            const range = rangeForDigits(digits, maxDigits);
            onChange({ min: String(range.min), max: String(range.max) });
          }}
          aria-describedby={helpId}
          className="border border-line bg-surface px-3 py-2 text-base tabular-nums text-ink"
        >
          <option value="">—</option>
          {digitValues(maxDigits).map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </label>
    </fieldset>
  );
}

/**
 * Rangos del primer y del segundo número. El selector de dígitos es un atajo que rellena los dos extremos; el docente
 * puede escribir cualquier otro rango a mano y entonces el selector se queda en «—».
 */
export function RangeFields({ first, onFirstChange, second, onSecondChange, firstMaxDigits, secondMaxDigits, firstError, secondError, labels }: {
  first: RangeText;
  onFirstChange: (next: RangeText) => void;
  second: RangeText;
  onSecondChange: (next: RangeText) => void;
  firstMaxDigits: number;
  firstError: string | null;
  secondError: string | null;
  /** Con multiplicación o división el segundo número es un factor y no pasa de tres cifras. */
  secondMaxDigits: number;
  labels: RangeFieldLabels;
}) {
  const helpId = useId();
  return (
    <div className="border-t border-line pt-4">
      <fieldset className="grid gap-4">
        <legend className="mb-3 text-base font-semibold text-ink">{labels.legend}</legend>
        <OperandFields legend={labels.first} value={first} onChange={onFirstChange} maxDigits={firstMaxDigits} error={firstError} helpId={helpId} labels={labels} />
        <OperandFields legend={labels.second} value={second} onChange={onSecondChange} maxDigits={secondMaxDigits} error={secondError} helpId={helpId} labels={labels} />
        <p id={helpId} className="text-xs text-muted">{labels.digitsHelp}</p>
      </fieldset>
    </div>
  );
}
