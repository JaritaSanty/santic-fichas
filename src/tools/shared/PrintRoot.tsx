'use client';

import { memo, useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { PAPER } from '@/core/paper';
import type { SheetDocument } from '@/core/sheet';
import { SheetSvg } from '@/render/svg/SheetSvg';

// Medio milímetro menos que la hoja física: evita que el redondeo del navegador genere una página en blanco.
const PAGE_SAFETY_MM = 0.5;

const noopSubscribe = () => () => {};

// Memoizado: la copia oculta para imprimir solo se vuelve a pintar si cambia el documento (memoizado aguas arriba).
export const PrintRoot = memo(function PrintRoot({ doc, label }: { doc: SheetDocument; label: string }) {
  // true solo en el cliente tras hidratar; sin setState dentro de efectos.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);

  useEffect(() => {
    document.documentElement.dataset.printSheet = 'true';
    const style = document.createElement('style');
    style.id = 'print-page-size';
    document.head.appendChild(style);
    return () => {
      style.remove();
      delete document.documentElement.dataset.printSheet;
    };
  }, []);

  useEffect(() => {
    const style = document.getElementById('print-page-size');
    if (style) style.textContent = `@page { size: ${PAPER[doc.paper].cssPageSize}; margin: 0; }`;
  }, [doc.paper]);

  if (!mounted) return null;
  const { widthMm, heightMm } = PAPER[doc.paper];
  // El portal inserta #print-root como hijo directo de body, requisito del CSS de impresión.
  return createPortal(
    <div id="print-root">
      {doc.pages.map((page, i) => (
        <div key={i} className="print-page" style={{ width: `${widthMm}mm`, height: `${heightMm - PAGE_SAFETY_MM}mm` }}>
          <SheetSvg paper={doc.paper} page={page} sizing="physical" label={`${label} ${i + 1}`} />
        </div>
      ))}
    </div>,
    document.body,
  );
});
