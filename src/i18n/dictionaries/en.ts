import type { Dictionary } from '@/i18n/dictionary';

export const en: Dictionary = {
  meta: {
    siteName: 'Santic Education',
    homeTitle: 'Printable classroom worksheets',
    homeDescription: 'Create word searches, crosswords and math worksheets ready to print. Everything is generated in your browser.',
  },
  nav: { languageSwitch: 'Language', languageName: { es: 'Español', en: 'English' }, skipToContent: 'Skip to content', home: 'Home' },
  home: { heading: 'Printable classroom worksheets', intro: 'Pick a generator, adjust the worksheet, then print it or download a PDF. What you type never leaves your browser.', open: 'Open' },
  sections: {
    wordsearch: { title: 'Word search', description: 'With your own vocabulary, a custom grid size and an answer key.' },
  },
  sheet: { name: 'Name', date: 'Date', solutions: 'Answer key', defaultTitle: 'Word search', previewLabel: 'Worksheet preview' },
  tool: {
    headerLegend: 'Worksheet header',
    titleLabel: 'Title',
    schoolLabel: 'School or teacher',
    paperLabel: 'Paper',
    paperA4: 'A4',
    paperLetter: 'Letter',
    print: 'Print',
    preview: 'Preview',
  },
  ads: { label: 'Advertisement' },
  footer: { tagline: 'Free classroom materials for teachers.' },
};
