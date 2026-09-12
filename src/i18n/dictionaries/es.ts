import type { Dictionary } from '@/i18n/dictionary';

export const es: Dictionary = {
  meta: {
    siteName: 'Santic Education',
    homeTitle: 'Fichas imprimibles para el aula',
    homeDescription: 'Crea sopas de letras, crucigramas y cuadernillos de operaciones listos para imprimir. Todo se genera en tu navegador.',
  },
  nav: { languageSwitch: 'Idioma', languageName: { es: 'Español', en: 'English' }, skipToContent: 'Saltar al contenido', home: 'Inicio' },
  home: { heading: 'Fichas imprimibles para el aula', intro: 'Elige un generador, ajusta la ficha e imprímela o descárgala en PDF. Lo que escribes no sale de tu navegador.', open: 'Abrir' },
  sections: {
    wordsearch: { title: 'Sopa de letras', description: 'Con tu propio vocabulario, cuadrícula a medida y hoja de soluciones.' },
  },
  sheet: { name: 'Nombre', date: 'Fecha', solutions: 'Soluciones', defaultTitle: 'Sopa de letras', previewLabel: 'Vista previa de la ficha' },
  tool: {
    headerLegend: 'Encabezado de la ficha',
    titleLabel: 'Título',
    schoolLabel: 'Centro o docente',
    paperLabel: 'Papel',
    paperA4: 'A4',
    paperLetter: 'Carta',
    print: 'Imprimir',
    preview: 'Vista previa',
  },
  ads: { label: 'Publicidad' },
  footer: { tagline: 'Material educativo gratuito para docentes.' },
};
