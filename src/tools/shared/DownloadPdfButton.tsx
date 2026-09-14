'use client';

import { useState } from 'react';
import type { SheetDocument } from '@/core/sheet';

type State = 'idle' | 'working' | 'offline' | 'failed';

export function DownloadPdfButton({ doc, filename, disabled, labels }: {
  doc: SheetDocument;
  filename: string;
  disabled: boolean;
  labels: { download: string; preparing: string; offline: string; failed: string };
}) {
  const [state, setState] = useState<State>('idle');

  const download = async () => {
    setState('working');
    try {
      // Carga diferida obligatoria: pdf-lib y fontkit nunca entran en la primera vista.
      const { loadPdfAssets, renderPdf } = await import('@/render/pdf');
      const bytes = await renderPdf(doc, await loadPdfAssets());
      const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      const url = URL.createObjectURL(new Blob([buffer], { type: 'application/pdf' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setState('idle');
    } catch {
      setState(navigator.onLine ? 'failed' : 'offline');
    }
  };

  return (
    <>
      <button
        type="button"
        data-action="pdf"
        onClick={download}
        disabled={disabled || state === 'working'}
        aria-busy={state === 'working'}
        className="border border-brand px-4 py-2 font-semibold text-brand hover:bg-brand hover:text-surface disabled:border-line disabled:text-muted disabled:hover:bg-transparent"
      >
        {state === 'working' ? labels.preparing : labels.download}
      </button>
      {(state === 'offline' || state === 'failed') && (
        <p role="alert" className="basis-full text-sm text-ink">
          {state === 'offline' ? labels.offline : labels.failed}
        </p>
      )}
    </>
  );
}
