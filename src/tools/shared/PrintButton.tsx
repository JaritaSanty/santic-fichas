'use client';

export function PrintButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      data-action="print"
      onClick={() => window.print()}
      className="bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-strong"
    >
      {label}
    </button>
  );
}
