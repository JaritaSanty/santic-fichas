import { BRAND_DOMAIN } from '@/core/brand';
import type { Dictionary } from '@/i18n/dictionary';

export function SiteFooter({ dict }: { dict: Dictionary }) {
  return (
    <footer className="no-print border-t border-line bg-canvas">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm text-muted">
        <p>{dict.footer.tagline}</p>
        <p>{BRAND_DOMAIN}</p>
      </div>
    </footer>
  );
}
