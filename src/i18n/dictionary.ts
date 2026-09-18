import type { Lang } from '@/core/lang';
import type { SectionKey } from '@/i18n/routes';
import type { PluralMessage } from './format';
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
    optionsDetail: PluralMessage;
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
    unplaced: { title: string; intro: PluralMessage; increaseSize: string; enableDiagonal: string; enableReversed: string; removeWords: string; generateWithout: string };
  };
  arithmetic: {
    /** Título con el que sale la hoja antes de que el docente escriba el suyo (equivale a `sheet.defaultTitle`). */
    defaultTitle: string;
    kindsLegend: string;
    /** Etiquetas de los controles: forma suelta, con mayúscula inicial. */
    kinds: { add: string; sub: string; mul: string; div: string };
    /** Los mismos nombres dentro de una frase: minúscula y singular. */
    kindNames: { add: string; sub: string; mul: string; div: string };
    operandsLegend: string;
    firstLabel: string;
    secondLabel: string;
    /** Nombre de cada operando dentro de una frase («el primer número»). */
    firstName: string;
    secondName: string;
    minLabel: string;
    maxLabel: string;
    digitsLabel: string;
    digitsHelp: string;
    carryLegend: string;
    carryAny: string;
    carryWith: string;
    carryWithout: string;
    carryHelp: string;
    divisionLegend: string;
    divisionExact: string;
    divisionRemainder: string;
    countLabel: string;
    countHelp: string;
    layoutLegend: string;
    layoutColumns: string;
    layoutInline: string;
    columnsLabel: string;
    columnsHelp: string;
    seedLabel: string;
    seedHelp: string;
    seedInvalid: string;
    seedOtherVersion: string;
    newSheet: string;
    includeSolutions: string;
    generating: string;
    retry: string;
    /** Aviso de paginación; `count` es el número de hojas y también se pasa como `pages`. */
    pagination: PluralMessage;
    errors: {
      noKind: string;
      rangeInverted: string;
      operandOutOfRange: string;
      countOutOfRange: string;
      columnsOutOfRange: string;
      divisorZero: string;
      emptySpace: string;
      blockTooLarge: string;
      workerFailed: string;
    };
    warnings: { carryIgnored: string; factorCapped: string; kindMissing: string };
    /** Ficha incompleta: menos operaciones distintas que las pedidas. */
    shortfall: { title: string; none: string; intro: PluralMessage; apply: PluralMessage };
    /**
     * Un texto por código de sugerencia. Los códigos con `fills` llevan dos: la forma normal promete la ficha
     * completa y la `…Partial` no promete nada, porque `fills: false` es «no se ha podido comprobar».
     */
    suggestions: {
      raiseFirstMax: string;
      raiseFirstMaxPartial: string;
      lowerFirstMin: string;
      lowerFirstMinPartial: string;
      widenSecond: string;
      widenSecondPartial: string;
      allowRemainder: string;
      allowRemainderPartial: string;
      allowCarry: string;
      allowCarryPartial: string;
      allowAnyCarry: string;
      allowAnyCarryPartial: string;
      reduceCount: string;
    };
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
