import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SiteFooter } from '@/components/shell/SiteFooter';
import { SiteHeader } from '@/components/shell/SiteHeader';
import { isLang, LANGS } from '@/core/lang';
import { withBasePath } from '@/core/paths';
import { getDictionary } from '@/i18n/dictionary';
import '@/app/fonts.css';
import '@/app/globals.css';

export const dynamicParams = false;

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  const dict = getDictionary(lang);
  return {
    title: { default: dict.meta.homeTitle, template: `%s · ${dict.meta.siteName}` },
    description: dict.meta.homeDescription,
    icons: { icon: withBasePath('/brand/favicon.svg') },
  };
}

export default async function LangLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const dict = getDictionary(lang);
  return (
    <html lang={lang}>
      <body className="min-h-dvh bg-canvas font-ui text-ink antialiased">
        <a href="#contenido" className="no-print sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:border focus:border-line focus:bg-surface focus:px-3 focus:py-2">
          {dict.nav.skipToContent}
        </a>
        <SiteHeader lang={lang} dict={dict} />
        <main id="contenido">{children}</main>
        <SiteFooter dict={dict} />
      </body>
    </html>
  );
}
