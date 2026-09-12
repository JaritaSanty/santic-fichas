import { DEFAULT_LANG, isLang, type Lang } from '@/core/lang';

export const LANG_STORAGE_KEY = 'santic-lang';

export function pickLang(languages: readonly string[]): Lang {
  for (const tag of languages) {
    const base = tag.toLowerCase().split('-')[0] ?? '';
    if (isLang(base)) return base;
  }
  return DEFAULT_LANG;
}
