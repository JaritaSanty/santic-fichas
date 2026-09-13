const EXCLUDED = [/^sw\.js$/, /\.(br|gz)$/, /(^|\/)\.DS_Store$/];

// Next.js codifica los segmentos de ruta dinámicos (p. ej. "[lang]") al referenciarlos desde el
// HTML y el runtime de webpack. Hay que igualar esa codificación aquí o la clave cacheada en
// `install` no coincidirá con la petición real en tiempo de ejecución.
function encodePath(file) {
  return file.split('/').map(encodeURIComponent).join('/');
}

export function precacheUrls(files, basePath) {
  return files
    .filter((file) => !EXCLUDED.some((re) => re.test(file)))
    .map((file) => {
      if (file === 'index.html') return `${basePath}/`;
      if (file.endsWith('/index.html')) return `${basePath}/${encodePath(file.slice(0, -'index.html'.length))}`;
      return `${basePath}/${encodePath(file)}`;
    });
}
