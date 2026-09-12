import type { Lang } from '@/core/lang';
import type { SectionKey } from '@/i18n/routes';
import { en } from './dictionaries/en';
import { es } from './dictionaries/es';

export interface Dictionary {
  meta: { siteName: string; homeTitle: string; homeDescription: string };
  nav: { languageSwitch: string; languageName: Record<Lang, string>; skipToContent: string; home: string };
  home: { heading: string; intro: string; open: string };
  sections: Record<SectionKey, { title: string; description: string }>;
  sheet: { name: string; date: string; solutions: string; defaultTitle: string; previewLabel: string };
  tool: {
    headerLegend: string;
    titleLabel: string;
    schoolLabel: string;
    paperLabel: string;
    paperA4: string;
    paperLetter: string;
    print: string;
    preview: string;
  };
  ads: { label: string };
  footer: { tagline: string };
}

const DICTIONARIES: Record<Lang, Dictionary> = { es, en };

export function getDictionary(lang: Lang): Dictionary {
  return DICTIONARIES[lang];
}
