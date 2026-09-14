'use client';

import { useState, useSyncExternalStore } from 'react';

const DESKTOP_QUERY = '(min-width: 768px)';

function subscribe(callback: () => void) {
  const mql = window.matchMedia(DESKTOP_QUERY);
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
}

export function Docket({ summary, children }: { summary: string; children: React.ReactNode }) {
  // A partir de md el parte siempre está abierto (el <summary> se oculta); por debajo, su estado lo
  // decide el toggle del usuario, para que no quede inaccesible tras cambiar de tamaño de viewport.
  const isDesktop = useSyncExternalStore(subscribe, () => window.matchMedia(DESKTOP_QUERY).matches, () => false);
  const [openOnMobile, setOpenOnMobile] = useState(true);

  return (
    <details
      // La key fuerza a recrear el nodo al cruzar el punto de ruptura: si un toggle nativo cerró el
      // parte justo antes de que cambiara `isDesktop`, React no vería diferencia en `open` y dejaría
      // el nodo real desincronizado; el remount lo repone siempre desde el valor correcto.
      key={isDesktop ? 'desktop' : 'mobile'}
      open={isDesktop || openOnMobile}
      onToggle={(e) => {
        if (!isDesktop) setOpenOnMobile(e.currentTarget.open);
      }}
      className="border border-line bg-surface"
    >
      <summary className="cursor-pointer px-5 py-3 font-semibold text-ink md:hidden">{summary}</summary>
      <div className="grid content-start gap-5 p-5">{children}</div>
    </details>
  );
}
