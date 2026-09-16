const MAX_SLUG = 60;

/** Nombre de fichero PDF derivado del título: ASCII, minúsculas y guiones. */
export function worksheetFilename(title: string, fallback: string): string {
  const slug = title
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG)
    .replace(/-+$/, '');
  return `${slug || fallback}.pdf`;
}
