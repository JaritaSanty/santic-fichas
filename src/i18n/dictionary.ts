import type { Lang } from '@/core/lang';
import type { SectionKey } from '@/i18n/routes';
import { en } from './dictionaries/en';
import { es } from './dictionaries/es';

export interface Dictionary {
  meta: { siteName: string; homeTitle: string; homeDescription: string };
  nav: { languageSwitch: string; languageName: Record<Lang, string>; skipToContent: string; home: string };
  home: { heading: string; intro: string };
  sections: Record<SectionKey, { title: string; description: string; cta: string }>;
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
    optionsSummary: string;
    optionsDetail: string;
    headerUnsupportedChars: string;
    headerTitleShortened: string;
  };
  wordsearch: {
    sampleWords: string;
    wordsLabel: string;
    wordsHelp: string;
    wordsCount: string;
    gridLegend: string;
    sizeLabel: string;
    directionsLegend: string;
    horizontal: string;
    vertical: string;
    diagonal: string;
    reversed: string;
    seedLabel: string;
    seedHelp: string;
    seedInvalid: string;
    seedOtherVersion: string;
    newSheet: string;
    includeSolutions: string;
    generating: string;
    retry: string;
    quote: string;
    errors: {
      noWords: string;
      tooManyWords: string;
      wordTooLong: string;
      wordTooLongMax: string;
      sizeOutOfRange: string;
      noDirection: string;
      invalidChars: string;
      tooShort: string;
      unsupportedGlyph: string;
      cellsTooSmall: string;
      workerFailed: string;
    };
    warnings: { duplicate: string; contained: string; containedReversed: string; largeList: string };
    unplaced: { title: string; intro: string; increaseSize: string; enableDiagonal: string; enableReversed: string; removeWords: string; generateWithout: string };
  };
  proof: {
    zoomLegend: string;
    zoomFit: string;
    zoomActual: string;
    enlarge: string;
    close: string;
    toneLegend: string;
    jobPaper: string;
    jobPages: string;
    jobSeed: string;
    downloadPdf: string;
    preparingPdf: string;
    pdfOffline: string;
    pdfFailed: string;
  };
  ads: { label: string };
  footer: { tagline: string };
}

const DICTIONARIES: Record<Lang, Dictionary> = { es, en };

export function getDictionary(lang: Lang): Dictionary {
  return DICTIONARIES[lang];
}
