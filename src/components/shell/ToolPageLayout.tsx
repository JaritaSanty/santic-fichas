import { AdSlot } from '@/ads/AdSlot';
import { isAdVisible } from '@/ads/config';
import { adsConfig } from '@/ads/env';

/**
 * Ubicaciones permitidas (spec §8.2): lateral derecho fuera del lienzo (escritorio), in-article dentro
 * del contenido explicativo (solo si hay contenido) y anclaje inferior (móvil). Nunca dentro de `tool`.
 */
export function ToolPageLayout({ title, intro, tool, article, adLabel }: {
  title: string;
  intro: string;
  tool: React.ReactNode;
  article?: { lead: React.ReactNode; rest: React.ReactNode };
  adLabel: string;
}) {
  const showAnchor = isAdVisible(adsConfig, 'anchor', adsConfig.slots.anchor);
  const showSidebar = isAdVisible(adsConfig, 'sidebar', adsConfig.slots.sidebar);
  return (
    <>
      <div
        className={[
          'mx-auto grid max-w-7xl gap-8 px-4 py-6',
          showSidebar ? 'lg:grid-cols-[minmax(0,1fr)_300px]' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <section data-tool-canvas aria-labelledby="tool-title" className="min-w-0">
          <h1 id="tool-title" className="text-2xl font-bold text-brand-strong">{title}</h1>
          <p className="mt-2 text-muted">{intro}</p>
          <div className="mt-6">{tool}</div>
        </section>
        {showSidebar && (
          <div className="no-print hidden lg:block">
            <AdSlot format="sidebar" slot={adsConfig.slots.sidebar} label={adLabel} />
          </div>
        )}
      </div>

      {article && (
        <article className="mx-auto max-w-3xl px-4 pb-16">
          {article.lead}
          <AdSlot format="in-article" slot={adsConfig.slots['in-article']} label={adLabel} className="no-print my-8" />
          {article.rest}
        </article>
      )}

      {showAnchor && (
        <>
          <div aria-hidden="true" className="no-print h-[74px] lg:hidden" />
          <div data-ad-anchor className="no-print fixed inset-x-0 bottom-0 z-40 flex justify-center border-t border-line bg-canvas py-3 lg:hidden">
            <AdSlot format="anchor" slot={adsConfig.slots.anchor} label={adLabel} />
          </div>
        </>
      )}
    </>
  );
}
