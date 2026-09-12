import { DEFAULT_LANG, LANGS } from '@/core/lang';
import { BASE_PATH, withBasePath } from '@/core/paths';
import { LANG_STORAGE_KEY } from '@/i18n/config';

// Se ejecuta antes de pintar: preferencia guardada → idiomas del navegador → español.
// Nginx ya redirige por Accept-Language en producción; esto cubre otros servidores.
const REDIRECT_SCRIPT = `(function(){
  var langs=${JSON.stringify(LANGS)}, pick=null, stored=null;
  try{stored=localStorage.getItem(${JSON.stringify(LANG_STORAGE_KEY)});}catch(e){}
  if(stored&&langs.indexOf(stored)>-1)pick=stored;
  var nav=navigator.languages||[navigator.language||''];
  for(var i=0;!pick&&i<nav.length;i++){var b=String(nav[i]).toLowerCase().split('-')[0];if(langs.indexOf(b)>-1)pick=b;}
  location.replace(${JSON.stringify(BASE_PATH)}+'/'+(pick||${JSON.stringify(DEFAULT_LANG)})+'/');
})();`;

export default function RootPage() {
  return (
    <main>
      <script dangerouslySetInnerHTML={{ __html: REDIRECT_SCRIPT }} />
      <noscript>
        <p>
          <a href={withBasePath('/es/')}>Español</a> · <a href={withBasePath('/en/')}>English</a>
        </p>
      </noscript>
    </main>
  );
}
