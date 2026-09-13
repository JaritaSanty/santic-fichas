import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ToolPageLayout } from '@/components/shell/ToolPageLayout';
import { isLang } from '@/core/lang';
import { getDictionary } from '@/i18n/dictionary';
import { sectionFromSlug, sectionParams } from '@/i18n/routes';
import { WordSearchTool } from '@/tools/wordsearch';

export const dynamicParams = false;

export function generateStaticParams({ params }: { params: { lang: string } }) {
  return isLang(params.lang) ? sectionParams(params.lang) : [];
}

type Params = Promise<{ lang: string; section: string }>;

async function resolve(params: Params) {
  const { lang, section } = await params;
  if (!isLang(lang)) return null;
  const key = sectionFromSlug(lang, section);
  return key ? { lang, key, dict: getDictionary(lang) } : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const r = await resolve(params);
  return r ? { title: r.dict.sections[r.key].title, description: r.dict.sections[r.key].description } : {};
}

export default async function SectionPage({ params }: { params: Params }) {
  const r = await resolve(params);
  if (!r) notFound();
  const { dict, key, lang } = r;
  return (
    <ToolPageLayout
      title={dict.sections[key].title}
      intro={dict.sections[key].description}
      adLabel={dict.ads.label}
      tool={key === 'wordsearch' ? <WordSearchTool lang={lang} labels={{ sheet: dict.sheet, tool: dict.tool }} /> : null}
    />
  );
}
