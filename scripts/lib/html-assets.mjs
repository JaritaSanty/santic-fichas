import path from 'node:path';

const unique = (items) => [...new Set(items)];

function attr(attrs, name) {
  const match = new RegExp(`\\b${name}=["']([^"']+)["']`, 'i').exec(attrs);
  return match ? match[1] : null;
}

const tags = (html, tag) => [...html.matchAll(new RegExp(`<${tag}\\b([^>]*)>`, 'gi'))].map((m) => m[1]);

export function firstViewAssets(html) {
  const links = tags(html, 'link');
  const scripts = [
    ...tags(html, 'script').filter((attrs) => !/\bnomodule\b/i.test(attrs)).map((attrs) => attr(attrs, 'src')),
    ...links.filter((a) => /\brel=["']?preload\b/i.test(a) && /\bas=["']?script\b/i.test(a)).map((a) => attr(a, 'href')),
  ].filter(Boolean);
  const styles = links.filter((a) => /\brel=["']?stylesheet\b/i.test(a)).map((a) => attr(a, 'href')).filter(Boolean);
  const fonts = links.filter((a) => /\brel=["']?preload\b/i.test(a) && /\bas=["']?font\b/i.test(a)).map((a) => attr(a, 'href')).filter(Boolean);
  return { scripts: unique(scripts), styles: unique(styles), fonts: unique(fonts) };
}

export function detectBasePath(html) {
  const match = /(?:src|href)=["']([^"']*)\/_next\/static\//i.exec(html);
  return match ? match[1] : '';
}

export function cssFontUrls(css) {
  return unique([...css.matchAll(/url\((["']?)([^)"']+\.woff2)\1\)/gi)].map((m) => m[2]));
}

/** Ruta relativa dentro de out/ para una URL de recurso; null si es externa o no pertenece a la app. */
export function resolveAssetPath(url, basePath, fromFile) {
  const clean = url.split(/[?#]/)[0];
  if (/^[a-z]+:/i.test(clean) || clean.startsWith('//')) return null;
  if (clean.startsWith('/')) {
    if (basePath && !clean.startsWith(`${basePath}/`)) return null;
    return decodeURIComponent(clean.slice(basePath.length + 1));
  }
  if (!fromFile) return null;
  return path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), decodeURIComponent(clean)));
}
