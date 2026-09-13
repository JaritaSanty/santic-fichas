const EXCLUDED = [/^sw\.js$/, /\.(br|gz)$/, /(^|\/)\.DS_Store$/];

// Next.js codifica los segmentos de ruta dinámicos (p. ej. "[lang]") al referenciarlos desde el
// HTML y el runtime de webpack, pero las cargas RSC usan caracteres como "$" o "!" sin codificar
// (p. ej. "__next.$d$lang.__PAGE__.txt", "__next.!KHJvb3Qp.__PAGE__.txt") y el router cliente las
// solicita tal cual. `encodeURI` codifica lo primero (corchetes) y deja intacto lo segundo — a
// diferencia de `encodeURIComponent` por segmento, que escaparía también "$" y rompería esas
// claves —, igualando exactamente lo que se pide en tiempo de ejecución. `encodeURI` no toca "/".
function encodePath(file) {
  return encodeURI(file);
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
