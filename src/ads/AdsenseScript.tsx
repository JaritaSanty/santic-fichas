import Script from 'next/script';
import { adsConfig } from '@/ads/env';

export function AdsenseScript() {
  if (!adsConfig.client) return null;
  return (
    <Script
      id="adsense"
      strategy="afterInteractive"
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsConfig.client}`}
    />
  );
}
