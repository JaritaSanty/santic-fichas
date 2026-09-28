import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Lang } from '@/core/lang';
import { isLang } from '@/core/lang';
import type { SheetPage } from '@/core/sheet';
import { generateArithmetic, validateArithmetic, type ArithmeticInput } from '@/generators/arithmetic';
import { generateWordSearch, validateWordSearch } from '@/generators/wordsearch';
import { getDictionary, type Dictionary } from '@/i18n/dictionary';
import { SECTION_SLUGS, sectionPath, type SectionKey } from '@/i18n/routes';
import { layoutArithmetic } from '@/layout/arithmetic';
import { buildFrame, stampPages, type FrameLabels } from '@/layout/common/frame';
import { layoutWordSearch } from '@/layout/wordsearch';
import { SheetSvg } from '@/render/svg/SheetSvg';

const SAMPLE_SEED = 'v1-PORTADA';
const SAMPLE_SIZE = 12;
const SAMPLE_DIRECTIONS = { horizontal: true, vertical: true, diagonal: true, reversed: false } as const;
// Mismos valores con los que abre `ArithmeticTool` (no se importan: la portada es un componente de servidor y no
// debe arrastrar la herramienta al paquete de la página).
const SAMPLE_ARITHMETIC: ArithmeticInput = {
  kinds: { add: true, sub: true, mul: false, div: false },
  first: { min: 10, max: 99 },
  second: { min: 10, max: 99 },
  carry: 'any',
  division: 'exact',
  count: 20,
  layout: 'columns',
  columns: 4,
};

/** Las miniaturas son hojas A4 de verdad, con la misma marca de página que la ficha impresa. */
function frameLabels(dict: Dictionary): FrameLabels {
  return {
    name: dict.sheet.name,
    date: dict.sheet.date,
    solutions: dict.sheet.solutions,
    student: dict.sheet.student,
    pageOf: dict.sheet.pageOf,
    paperName: dict.tool.paperA4,
  };
}

/** Portada de fase de construcción: prueba una sopa de letras real con el vocabulario de ejemplo. */
function wordsearchSamplePage(lang: Lang, dict: Dictionary): SheetPage | null {
  const validation = validateWordSearch({ wordsText: dict.wordsearch.sampleWords, size: SAMPLE_SIZE, directions: SAMPLE_DIRECTIONS }, lang);
  if (!validation.ok) return null;
  const result = generateWordSearch(validation.value, SAMPLE_SEED, lang);
  const layout = layoutWordSearch({
    result,
    header: { title: dict.sections.wordsearch.title, school: '' },
    labels: frameLabels(dict),
    paper: 'a4',
    lang,
    includeSolutions: false,
  });
  return layout.ok ? (layout.doc.pages[0] ?? null) : null;
}

/** Portada: cuadernillo real con la semilla fija, en el idioma de la página (la división se dibuja distinta en cada uno). */
function arithmeticSamplePage(lang: Lang, dict: Dictionary): SheetPage | null {
  const validation = validateArithmetic(SAMPLE_ARITHMETIC);
  if (!validation.ok) return null;
  const result = generateArithmetic(validation.value, SAMPLE_SEED);
  const layout = layoutArithmetic({
    result,
    header: { title: dict.sections.arithmetic.title, school: '' },
    labels: frameLabels(dict),
    paper: 'a4',
    lang,
    includeSolutions: false,
    layout: validation.value.layout,
    columns: validation.value.columns,
  });
  return layout.ok ? (layout.doc.pages[0] ?? null) : null;
}

function framePage(lang: Lang, dict: Dictionary, title: string): SheetPage {
  const page: SheetPage = {
    role: 'student',
    primitives: buildFrame({ paper: 'a4', header: { title, school: '' }, labels: frameLabels(dict), role: 'student' }).primitives,
  };
  return stampPages([page], { paper: 'a4', labels: frameLabels(dict), code: SAMPLE_SEED })[0] as SheetPage;
}

function thumbnailPage(key: SectionKey, lang: Lang, dict: Dictionary, title: string): SheetPage {
  if (key === 'wordsearch') return wordsearchSamplePage(lang, dict) ?? framePage(lang, dict, title);
  if (key === 'arithmetic') return arithmeticSamplePage(lang, dict) ?? framePage(lang, dict, title);
  return framePage(lang, dict, title);
}

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
          const page = thumbnailPage(key, lang, dict, section.title);
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
