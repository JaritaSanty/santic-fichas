import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isLang } from '@/core/lang';
import { getDictionary } from '@/i18n/dictionary';
import { SECTION_SLUGS, sectionPath, type SectionKey } from '@/i18n/routes';

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const dict = getDictionary(lang);
  const keys = Object.keys(SECTION_SLUGS) as SectionKey[];
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold text-brand-strong">{dict.home.heading}</h1>
      <p className="mt-3 max-w-2xl text-muted">{dict.home.intro}</p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {keys.map((key) => (
          <li key={key} className="border border-line bg-surface p-5">
            <h2 className="text-lg font-semibold">{dict.sections[key].title}</h2>
            <p className="mt-2 text-sm text-muted">{dict.sections[key].description}</p>
            <Link href={sectionPath(lang, key)} className="mt-4 inline-block font-semibold text-brand underline-offset-4 hover:underline">
              {dict.home.open}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
