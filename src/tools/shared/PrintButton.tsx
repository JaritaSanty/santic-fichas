'use client';

export function PrintButton({ label, disabled = false }: { label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      data-action="print"
      onClick={() => window.print()}
      disabled={disabled}
      // Deshabilitado: sin relleno, filete interior en `line` (sin cambiar la medida) y texto atenuado, como la secundaria.
      className="bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-strong disabled:bg-transparent disabled:text-muted disabled:shadow-[inset_0_0_0_1px_var(--color-line)] disabled:hover:bg-transparent"
    >
      {label}
    </button>
  );
}
