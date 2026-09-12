import type { Dictionary } from '@/i18n/dictionary';

export const en: Dictionary = {
  meta: {
    siteName: 'Santic Education',
    homeTitle: 'Printable classroom worksheets',
    homeDescription: 'Word searches, crosswords and math worksheets ready to print, generated in the browser.',
  },
  nav: { languageSwitch: 'Language', languageName: { es: 'Español', en: 'English' }, skipToContent: 'Skip to content', home: 'Home' },
  home: { heading: 'Printable classroom worksheets', intro: 'Worksheet generators with live preview, direct printing and PDF download. Worksheet content is processed in the browser and never sent to a server.', open: 'Open' },
  sections: {
    wordsearch: { title: 'Word search', description: 'Custom vocabulary, adjustable grid size and an answer key.' },
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
