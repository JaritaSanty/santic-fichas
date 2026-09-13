import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLang } from '@/core/lang';
import { getDictionary } from '@/i18n/dictionary';
import { sectionFromSlug, sectionParams } from '@/i18n/routes';

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
  const { dict, key } = r;
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="text-2xl font-bold text-brand-strong">{dict.sections[key].title}</h1>
      <p className="mt-2 text-muted">{dict.sections[key].description}</p>
    </div>
  );
}
