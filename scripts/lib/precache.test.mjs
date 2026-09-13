import { describe, expect, it } from 'vitest';
import { precacheUrls } from './precache.mjs';

describe('precacheUrls', () => {
  const files = ['index.html', 'es/index.html', 'es/sopa-de-letras/index.html', 'es/index.txt', '_next/static/chunks/a.js', '404.html', 'sw.js', 'x.js.br', 'y.css.gz', '.DS_Store'];

  it('convierte index.html en rutas de directorio y aplica el basePath', () => {
    expect(precacheUrls(files, '/fichas')).toEqual([
      '/fichas/',
      '/fichas/es/',
      '/fichas/es/sopa-de-letras/',
      '/fichas/es/index.txt',
      '/fichas/_next/static/chunks/a.js',
      '/fichas/404.html',
    ]);
  });

  it('funciona sin basePath', () => {
    expect(precacheUrls(['index.html', 'a.css'], '')).toEqual(['/', '/a.css']);
  });

  it('codifica segmentos con corchetes (rutas dinámicas de Next.js) igual que el HTML generado', () => {
    expect(precacheUrls(['_next/static/chunks/app/[lang]/[section]/page-abc.js', '[lang]/index.html'], '/fichas')).toEqual([
      '/fichas/_next/static/chunks/app/%5Blang%5D/%5Bsection%5D/page-abc.js',
      '/fichas/%5Blang%5D/',
    ]);
  });

  it('deja intactos los tokens "$" y "!" de las cargas RSC, que el router cliente solicita sin codificar', () => {
    expect(
      precacheUrls(
        ['es/__next.$d$lang.__PAGE__.txt', 'es/sopa-de-letras/__next.$d$lang.$d$section.__PAGE__.txt', '__next.!KHJvb3Qp.__PAGE__.txt'],
        '/fichas',
      ),
    ).toEqual([
      '/fichas/es/__next.$d$lang.__PAGE__.txt',
      '/fichas/es/sopa-de-letras/__next.$d$lang.$d$section.__PAGE__.txt',
      '/fichas/__next.!KHJvb3Qp.__PAGE__.txt',
    ]);
  });
});
