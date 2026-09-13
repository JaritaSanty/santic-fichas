import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readAdsConfig } from '@/ads/config';

// adsConfig es un singleton calculado al importar el módulo: cada caso necesita su propio
// registro de módulos (vi.resetModules + vi.doMock + import dinámico) para simular un valor distinto.
describe('ToolPageLayout', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('sin anuncio lateral visible: no reserva columna ni renderiza el marcador', async () => {
    vi.doMock('@/ads/env', () => ({ adsConfig: readAdsConfig({ NODE_ENV: 'production' }) }));
    const { ToolPageLayout } = await import('./ToolPageLayout');
    const html = renderToStaticMarkup(<ToolPageLayout title="Título" intro="Intro" adLabel="Publicidad" tool={null} />);
    expect(html).not.toContain('data-ad-format="sidebar"');
    expect(html).not.toContain('_300px');
  });

  it('con marcador visible: reserva la columna y renderiza el marcador', async () => {
    vi.doMock('@/ads/env', () => ({
      adsConfig: readAdsConfig({ NODE_ENV: 'production', NEXT_PUBLIC_ADS_PLACEHOLDER: 'true' }),
    }));
    const { ToolPageLayout } = await import('./ToolPageLayout');
    const html = renderToStaticMarkup(<ToolPageLayout title="Título" intro="Intro" adLabel="Publicidad" tool={null} />);
    expect(html).toContain('data-ad-format="sidebar"');
    expect(html).toContain('_300px');
  });
});
