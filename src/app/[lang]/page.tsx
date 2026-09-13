import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { SheetPage } from '@/core/sheet';
import { isLang } from '@/core/lang';
import { getDictionary } from '@/i18n/dictionary';
import { SECTION_SLUGS, sectionPath, type SectionKey } from '@/i18n/routes';
import { buildFrame } from '@/layout/common/frame';
import { SheetSvg } from '@/render/svg/SheetSvg';

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const dict = getDictionary(lang);
  const keys = Object.keys(SECTION_SLUGS) as SectionKey[];
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-semibold text-brand-strong">{dict.home.heading}</h1>
      <p className="mt-3 max-w-2xl text-muted">{dict.home.intro}</p>
      <ul className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {keys.map((key) => {
          const section = dict.sections[key];
          const page: SheetPage = {
            role: 'student',
            primitives: buildFrame({
              paper: 'a4',
              header: { title: section.title, school: '' },
              labels: { name: dict.sheet.name, date: dict.sheet.date, solutions: dict.sheet.solutions },
              role: 'student',
            }).primitives,
          };
          return (
            <li key={key}>
              <Link href={sectionPath(lang, key)} aria-label={section.cta} className="group block">
                <div className="max-w-64 border border-line bg-surface p-2">
                  <div aria-hidden="true">
                    <SheetSvg paper="a4" page={page} sizing="fluid" label={section.title} className="block w-full" />
                  </div>
                </div>
                <h2 className="mt-3 text-lg font-semibold text-ink group-hover:underline underline-offset-4">{section.title}</h2>
                <p className="mt-1 text-sm text-muted">{section.description}</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
