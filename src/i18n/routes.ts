import { isLang, type Lang } from '@/core/lang';

/** Secciones con slug traducido. Fases posteriores añaden crossword, author y legales. */
export type SectionKey = 'wordsearch' | 'arithmetic';

export const SECTION_SLUGS: Record<SectionKey, Record<Lang, string>> = {
  wordsearch: { es: 'sopa-de-letras', en: 'word-search' },
  arithmetic: { es: 'operaciones', en: 'arithmetic' },
};

const SECTION_KEYS = Object.keys(SECTION_SLUGS) as SectionKey[];

export function homePath(lang: Lang): string {
  return `/${lang}/`;
}

export function sectionPath(lang: Lang, key: SectionKey): string {
  return `/${lang}/${SECTION_SLUGS[key][lang]}/`;
}

export function sectionFromSlug(lang: Lang, slug: string): SectionKey | null {
  return SECTION_KEYS.find((key) => SECTION_SLUGS[key][lang] === slug) ?? null;
}

export function sectionParams(lang: Lang): { section: string }[] {
  return SECTION_KEYS.map((key) => ({ section: SECTION_SLUGS[key][lang] }));
}

/** `pathname` sin basePath (como lo devuelve usePathname de Next.js). */
export function equivalentPath(pathname: string, target: Lang): string {
  const [first, second] = pathname.split('/').filter(Boolean);
  if (!first || !isLang(first) || !second) return homePath(target);
  const key = sectionFromSlug(first, second);
  return key ? sectionPath(target, key) : homePath(target);
}
