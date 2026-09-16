import { describe, expect, it } from 'vitest';
import { cssFontUrls, detectBasePath, firstViewAssets, resolveAssetPath } from './html-assets.mjs';

const HTML = `<!DOCTYPE html><html><head>
<link rel="stylesheet" href="/fichas/_next/static/css/a.css" data-precedence="next"/>
<link rel="preload" as="font" href="/fichas/_next/static/media/f.woff2" crossorigin=""/>
<link rel="icon" href="/fichas/brand/favicon.svg"/>
<script src="/fichas/_next/static/chunks/polyfills.js" noModule=""></script>
<script src="/fichas/_next/static/chunks/main.js" async=""></script>
<script src="/fichas/_next/static/chunks/main.js" async=""></script>
<script>self.__next_f=[]</script>
<script src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>
</head></html>`;

describe('firstViewAssets', () => {
  it('excluye scripts noModule e inline y elimina duplicados', () => {
    expect(firstViewAssets(HTML)).toEqual({
      scripts: ['/fichas/_next/static/chunks/main.js', 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'],
      styles: ['/fichas/_next/static/css/a.css'],
      fonts: ['/fichas/_next/static/media/f.woff2'],
    });
  });
});

describe('firstViewAssets con precarga de scripts', () => {
  it('cuenta scripts que solo aparecen como <link rel="preload" as="script">', () => {
    const html = '<link rel="preload" as="script" href="/_next/static/chunks/solo-precarga.js"/><script src="/_next/static/chunks/main.js"></script>';
    expect(firstViewAssets(html).scripts).toEqual(['/_next/static/chunks/main.js', '/_next/static/chunks/solo-precarga.js']);
  });
});

describe('detectBasePath', () => {
  it('lo deduce del prefijo de _next/static', () => {
    expect(detectBasePath(HTML)).toBe('/fichas');
    expect(detectBasePath('<script src="/_next/static/chunks/x.js"></script>')).toBe('');
  });
});

describe('cssFontUrls', () => {
  it('extrae woff2 con y sin comillas', () => {
    const css = `@font-face{src:url(/fichas/_next/static/media/a.woff2) format("woff2")}@font-face{src:url("../media/b.woff2")}`;
    expect(cssFontUrls(css)).toEqual(['/fichas/_next/static/media/a.woff2', '../media/b.woff2']);
  });
});

describe('resolveAssetPath', () => {
  it('traduce URLs internas a rutas dentro de out/ y descarta externas', () => {
    expect(resolveAssetPath('/fichas/_next/static/chunks/app/%5Blang%5D/page.js?v=1', '/fichas')).toBe('_next/static/chunks/app/[lang]/page.js');
    expect(resolveAssetPath('https://pagead2.googlesyndication.com/x.js', '/fichas')).toBeNull();
    expect(resolveAssetPath('../media/b.woff2', '/fichas', '_next/static/css/a.css')).toBe('_next/static/media/b.woff2');
  });
});
