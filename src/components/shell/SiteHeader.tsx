import Link from 'next/link';
import type { Lang } from '@/core/lang';
import { withBasePath } from '@/core/paths';
import type { Dictionary } from '@/i18n/dictionary';
import { LanguageSwitch } from '@/i18n/LanguageSwitch';
import { homePath } from '@/i18n/routes';

export function SiteHeader({ lang, dict }: { lang: Lang; dict: Dictionary }) {
  return (
    <header className="no-print border-b border-line bg-canvas">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link href={homePath(lang)} aria-label={`${dict.meta.siteName} — ${dict.nav.home}`}>
          {/* next/image no aplica basePath a rutas de cadena en exportación estática. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={withBasePath('/brand/logo.png')} alt={dict.meta.siteName} width={140} height={44} className="h-9 w-auto" />
        </Link>
        <LanguageSwitch current={lang} label={dict.nav.languageSwitch} names={dict.nav.languageName} />
      </div>
    </header>
  );
}
