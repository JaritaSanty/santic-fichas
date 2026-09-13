import { readAdsConfig } from '@/ads/config';

// Acceso literal a cada variable: Next.js solo inyecta en el cliente las NEXT_PUBLIC_* referenciadas así.
export const adsConfig = readAdsConfig({
  NEXT_PUBLIC_ADSENSE_CLIENT: process.env.NEXT_PUBLIC_ADSENSE_CLIENT,
  NEXT_PUBLIC_ADS_PLACEHOLDER: process.env.NEXT_PUBLIC_ADS_PLACEHOLDER,
  NEXT_PUBLIC_ADS_SIDEBAR: process.env.NEXT_PUBLIC_ADS_SIDEBAR,
  NEXT_PUBLIC_ADS_IN_ARTICLE: process.env.NEXT_PUBLIC_ADS_IN_ARTICLE,
  NEXT_PUBLIC_ADS_ANCHOR: process.env.NEXT_PUBLIC_ADS_ANCHOR,
  NEXT_PUBLIC_AD_SLOT_SIDEBAR: process.env.NEXT_PUBLIC_AD_SLOT_SIDEBAR,
  NEXT_PUBLIC_AD_SLOT_IN_ARTICLE: process.env.NEXT_PUBLIC_AD_SLOT_IN_ARTICLE,
  NEXT_PUBLIC_AD_SLOT_ANCHOR: process.env.NEXT_PUBLIC_AD_SLOT_ANCHOR,
  NODE_ENV: process.env.NODE_ENV,
});
