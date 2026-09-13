export type AdFormat = 'sidebar' | 'in-article' | 'anchor';

export interface AdsEnv {
  NEXT_PUBLIC_ADSENSE_CLIENT?: string | undefined;
  NEXT_PUBLIC_ADS_PLACEHOLDER?: string | undefined;
  NEXT_PUBLIC_ADS_SIDEBAR?: string | undefined;
  NEXT_PUBLIC_ADS_IN_ARTICLE?: string | undefined;
  NEXT_PUBLIC_ADS_ANCHOR?: string | undefined;
  NEXT_PUBLIC_AD_SLOT_SIDEBAR?: string | undefined;
  NEXT_PUBLIC_AD_SLOT_IN_ARTICLE?: string | undefined;
  NEXT_PUBLIC_AD_SLOT_ANCHOR?: string | undefined;
  NODE_ENV?: string | undefined;
}

export interface AdsConfig {
  client: string | null;
  placeholder: boolean;
  enabled: Record<AdFormat, boolean>;
  slots: Record<AdFormat, string | null>;
}

/** Espacio reservado antes de que cargue el anuncio (evita CLS). */
export const AD_BOX: Record<AdFormat, { width: string; height: string; fixedHeight: boolean; media: string | null }> = {
  sidebar: { width: '300px', height: '600px', fixedHeight: true, media: '(min-width: 1024px)' },
  'in-article': { width: '100%', height: '280px', fixedHeight: false, media: null },
  anchor: { width: '320px', height: '50px', fixedHeight: true, media: '(max-width: 1023.98px)' },
};

const CLIENT_RE = /^ca-pub-\d{10,20}$/;
const SLOT_RE = /^\d{6,20}$/;

const flag = (value: string | undefined, fallback: boolean) => (value === undefined || value === '' ? fallback : value === 'true');
const valid = (value: string | undefined, re: RegExp) => (value && re.test(value.trim()) ? value.trim() : null);

export function readAdsConfig(env: AdsEnv): AdsConfig {
  return {
    client: valid(env.NEXT_PUBLIC_ADSENSE_CLIENT, CLIENT_RE),
    placeholder: env.NODE_ENV !== 'production' || env.NEXT_PUBLIC_ADS_PLACEHOLDER === 'true',
    enabled: {
      sidebar: flag(env.NEXT_PUBLIC_ADS_SIDEBAR, true),
      'in-article': flag(env.NEXT_PUBLIC_ADS_IN_ARTICLE, true),
      anchor: flag(env.NEXT_PUBLIC_ADS_ANCHOR, false),
    },
    slots: {
      sidebar: valid(env.NEXT_PUBLIC_AD_SLOT_SIDEBAR, SLOT_RE),
      'in-article': valid(env.NEXT_PUBLIC_AD_SLOT_IN_ARTICLE, SLOT_RE),
      anchor: valid(env.NEXT_PUBLIC_AD_SLOT_ANCHOR, SLOT_RE),
    },
  };
}

export function isAdVisible(config: AdsConfig, format: AdFormat, slot: string | null): boolean {
  if (!config.enabled[format]) return false;
  return (config.client !== null && slot !== null) || config.placeholder;
}
