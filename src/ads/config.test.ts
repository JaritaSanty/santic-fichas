import { describe, expect, it } from 'vitest';
import { isAdVisible, readAdsConfig } from './config';

const CLIENT = 'ca-pub-1234567890123456';

describe('readAdsConfig', () => {
  it('sin identificador de editor no hay cliente', () => {
    expect(readAdsConfig({ NODE_ENV: 'production' }).client).toBeNull();
  });

  it('rechaza identificadores con formato inválido', () => {
    expect(readAdsConfig({ NEXT_PUBLIC_ADSENSE_CLIENT: 'ca-pub-XXXX', NODE_ENV: 'production' }).client).toBeNull();
    expect(readAdsConfig({ NEXT_PUBLIC_ADSENSE_CLIENT: 'pub-1234567890', NODE_ENV: 'production' }).client).toBeNull();
    expect(readAdsConfig({ NEXT_PUBLIC_ADSENSE_CLIENT: CLIENT, NEXT_PUBLIC_AD_SLOT_SIDEBAR: 'abc', NODE_ENV: 'production' }).slots.sidebar).toBeNull();
  });

  it('acepta identificadores válidos', () => {
    const c = readAdsConfig({ NEXT_PUBLIC_ADSENSE_CLIENT: CLIENT, NEXT_PUBLIC_AD_SLOT_SIDEBAR: '1234567890', NODE_ENV: 'production' });
    expect(c.client).toBe(CLIENT);
    expect(c.slots.sidebar).toBe('1234567890');
  });

  it('marcador visible en desarrollo y en producción solo con la bandera', () => {
    expect(readAdsConfig({ NODE_ENV: 'development' }).placeholder).toBe(true);
    expect(readAdsConfig({ NODE_ENV: 'production' }).placeholder).toBe(false);
    expect(readAdsConfig({ NODE_ENV: 'production', NEXT_PUBLIC_ADS_PLACEHOLDER: 'true' }).placeholder).toBe(true);
  });

  it('anclaje desactivado por defecto; lateral e in-article activados', () => {
    const c = readAdsConfig({ NODE_ENV: 'production' });
    expect(c.enabled).toEqual({ sidebar: true, 'in-article': true, anchor: false });
    expect(readAdsConfig({ NODE_ENV: 'production', NEXT_PUBLIC_ADS_ANCHOR: 'true', NEXT_PUBLIC_ADS_SIDEBAR: 'false' }).enabled).toEqual({ sidebar: false, 'in-article': true, anchor: true });
  });
});

describe('isAdVisible', () => {
  it('requiere formato activado y (anuncio real o marcador)', () => {
    const prodEmpty = readAdsConfig({ NODE_ENV: 'production' });
    expect(isAdVisible(prodEmpty, 'sidebar', null)).toBe(false);

    const dev = readAdsConfig({ NODE_ENV: 'development' });
    expect(isAdVisible(dev, 'sidebar', null)).toBe(true);
    expect(isAdVisible(dev, 'anchor', null)).toBe(false);

    const live = readAdsConfig({ NODE_ENV: 'production', NEXT_PUBLIC_ADSENSE_CLIENT: CLIENT, NEXT_PUBLIC_AD_SLOT_SIDEBAR: '1234567890' });
    expect(isAdVisible(live, 'sidebar', live.slots.sidebar)).toBe(true);
    expect(isAdVisible(live, 'in-article', live.slots['in-article'])).toBe(false);
  });
});
