'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LANGS, type Lang } from '@/core/lang';
import { LANG_STORAGE_KEY } from '@/i18n/config';
import { equivalentPath } from '@/i18n/routes';

export function LanguageSwitch({ current, label, names }: { current: Lang; label: string; names: Record<Lang, string> }) {
  const pathname = usePathname() ?? '/';
  return (
    <nav aria-label={label}>
      <ul className="flex items-center gap-1 text-sm">
        {LANGS.map((lang) => (
          <li key={lang}>
            {lang === current ? (
              <span aria-current="true" className="border border-line bg-surface px-2 py-1 font-semibold text-ink">
                {names[lang]}
              </span>
            ) : (
              <Link
                href={equivalentPath(pathname, lang)}
                hrefLang={lang}
                lang={lang}
                className="border border-transparent px-2 py-1 text-muted hover:border-line hover:text-ink"
                onClick={() => {
                  try {
                    localStorage.setItem(LANG_STORAGE_KEY, lang);
                  } catch {
                    // Almacenamiento bloqueado: el cambio de idioma funciona igualmente.
                  }
                }}
              >
                {names[lang]}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
