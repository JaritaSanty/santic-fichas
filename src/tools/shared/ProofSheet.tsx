'use client';

import { memo, useRef, useState } from 'react';
import type { SheetDocument } from '@/core/sheet';
import { SheetSvg } from '@/render/svg/SheetSvg';

type Zoom = 'fit' | 'actual';

// Cada página solo se vuelve a pintar si cambia su `page` (el documento está memoizado aguas arriba), no por
// una pulsación en otra parte del formulario.
const PageSvg = memo(SheetSvg);

const CORNERS = ['left-0 top-0', 'right-0 top-0 -scale-x-100', 'bottom-0 left-0 -scale-y-100', 'bottom-0 right-0 -scale-100'] as const;
const REGISTER = ['left-1/2 top-0.5 -translate-x-1/2', 'bottom-0.5 left-1/2 -translate-x-1/2'] as const;

/** Marcas de corte en L y cruces de registro alrededor de la hoja; decorativas y fuera de la ficha impresa. */
function ProofMarks() {
  return (
    <div aria-hidden="true" className="proof-marks pointer-events-none absolute inset-0 text-brand">
      {CORNERS.map((position) => (
        <svg key={position} viewBox="0 0 20 20" className={`absolute h-5 w-5 ${position}`}>
          <path d="M0 20 H12 M20 0 V12" fill="none" stroke="currentColor" strokeWidth="1" />
        </svg>
      ))}
      {REGISTER.map((position) => (
        <svg key={position} viewBox="0 0 16 16" className={`absolute h-4 w-4 ${position}`}>
          <circle cx="8" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth="1" />
          <path d="M8 0 V16 M0 8 H16" stroke="currentColor" strokeWidth="1" />
        </svg>
      ))}
    </div>
  );
}

export function ProofSheet({ doc, docKey, label, state, labels }: {
  doc: SheetDocument;
  docKey: string;
  label: string;
  /**
   * Estado con nombre sobre la hoja cuando lo que se ve no es imprimible (una hoja en blanco a tamaño real parece
   * salida de la copiadora aunque Imprimir esté deshabilitado). Sin él, la prueba es la ficha y nada se superpone.
   */
  state?: string;
  labels: { zoomLegend: string; zoomFit: string; zoomActual: string; enlarge: string; close: string };
}) {
  const [zoom, setZoom] = useState<Zoom>('fit');
  const [enlarged, setEnlarged] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const zoomButton = (value: Zoom, text: string) => (
    <button
      type="button"
      aria-pressed={zoom === value}
      onClick={() => setZoom(value)}
      className="border border-line px-3 py-1 text-sm font-semibold text-ink aria-pressed:bg-ink aria-pressed:text-surface"
    >
      {text}
    </button>
  );

  return (
    <div data-proof-sheet className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label={labels.zoomLegend} className="hidden gap-1 md:flex">
          {zoomButton('fit', labels.zoomFit)}
          {zoomButton('actual', labels.zoomActual)}
        </div>
        <button type="button" onClick={() => {
            setEnlarged(true);
            dialogRef.current?.showModal();
          }} className="border border-line px-3 py-1 text-sm font-semibold text-ink md:hidden">
          {labels.enlarge}
        </button>
      </div>

      <div className={zoom === 'actual' ? 'max-h-[80dvh] overflow-auto border border-line bg-canvas [scrollbar-gutter:stable]' : undefined}>
        <div className="grid gap-6">
          {doc.pages.map((page, i) => (
            <div key={i} className={`relative p-5 ${zoom === 'actual' ? 'w-max' : ''}`}>
              {/* La clave reinicia el paso seco de las marcas en cada ficha nueva. */}
              <ProofMarks key={docKey} />
              <div className="relative border border-line bg-surface">
                <PageSvg paper={doc.paper} page={page} sizing={zoom === 'actual' ? 'physical' : 'fluid'} label={`${label} ${i + 1}/${doc.pages.length}`} />
                {state !== undefined && (
                  <p data-sheet-state className="absolute inset-x-0 top-1/3 mx-auto w-max max-w-[80%] border border-line bg-surface px-4 py-2 text-center text-sm font-semibold text-muted">
                    {state}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* `close` llega también con Escape; las páginas ampliadas solo existen mientras el diálogo está abierto. */}
      <dialog ref={dialogRef} aria-label={label} onClose={() => setEnlarged(false)} className="m-0 h-dvh max-h-none w-screen max-w-none overflow-auto bg-canvas p-0 backdrop:bg-ink/60">
        <div className="sticky left-0 top-0 z-10 flex justify-end border-b border-line bg-canvas p-3">
          <button type="button" onClick={() => dialogRef.current?.close()} className="border border-line bg-surface px-4 py-2 font-semibold text-ink">
            {labels.close}
          </button>
        </div>
        <div className="grid gap-6 p-4">
          {enlarged && doc.pages.map((page, i) => (
            <div key={i} className="w-max border border-line bg-surface">
              <PageSvg paper={doc.paper} page={page} sizing="physical" label={`${label} ${i + 1}/${doc.pages.length}`} />
            </div>
          ))}
        </div>
      </dialog>
    </div>
  );
}
