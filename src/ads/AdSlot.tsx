'use client';

import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { AD_BOX, isAdVisible, type AdFormat } from '@/ads/config';
import { adsConfig } from '@/ads/env';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

// useSyncExternalStore evita setState dentro de efectos (regla react-hooks/set-state-in-effect).
function useMediaQuery(query: string | null): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (query === null) return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => query === null || window.matchMedia(query).matches,
    () => query === null,
  );
}

export function AdSlot({ slot, format, label, className = '' }: { slot: string | null; format: AdFormat; label: string; className?: string }) {
  const box = AD_BOX[format];
  const matches = useMediaQuery(box.media);
  const pushed = useRef(false);
  const live = adsConfig.client !== null && slot !== null;

  useEffect(() => {
    // Solo se solicita el anuncio cuando su contenedor es visible en este viewport (AdSense falla con ancho 0).
    if (!live || !matches || pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle ?? []).push({});
    } catch {
      // Script bloqueado o sin consentimiento: el hueco reservado permanece vacío.
    }
  }, [live, matches]);

  if (!isAdVisible(adsConfig, format, slot)) return null;

  const style = box.fixedHeight ? { width: box.width, maxWidth: '100%', height: box.height } : { width: box.width, minHeight: box.height };

  return (
    <aside aria-label={label} data-ad-format={format} className={`ad-slot ${className}`} style={style}>
      {live ? (
        matches && (
          <ins
            className="adsbygoogle"
            style={{ display: 'block', ...style }}
            data-ad-client={adsConfig.client ?? undefined}
            data-ad-slot={slot ?? undefined}
            {...(format === 'in-article' ? { 'data-ad-layout': 'in-article', 'data-ad-format': 'fluid' } : {})}
          />
        )
      ) : (
        <div aria-hidden="true" className="flex h-full min-h-[inherit] w-full items-center justify-center border border-dashed border-line bg-canvas text-xs text-muted">
          {`${label} · ${box.width} × ${box.height}`}
        </div>
      )}
    </aside>
  );
}
