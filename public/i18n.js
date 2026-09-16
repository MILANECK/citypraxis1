/* UI translations are separate from editable clinical content and form values. */
(() => {
  const params = new URLSearchParams(location.search);
  let saved;
  try { saved = localStorage.getItem('citypraxis-language'); } catch {}
  const language = ['de','en'].includes(params.get('lang')) ? params.get('lang') : saved === 'en' ? 'en' : 'de';
  try { localStorage.setItem('citypraxis-language', language); } catch {}
  document.documentElement.lang = language;
  const dictionary = {};
  function translate(value) {
    if (language !== 'en' || !value) return value;
    const trimmed = value.trim();
    if (dictionary[trimmed]) return value.replace(trimmed, dictionary[trimmed]);
    const core = trimmed.replace(/^[←+]\s*|\s*[↗→Ⅱ▷]$/g, '').trim();
    if (dictionary[core]) return value.replace(core, dictionary[core]);
    return value.replace(/^Guten Tag, (.+)\.$/, 'Hello, $1.').replace(/^Vielen Dank, (.+)\.$/, 'Thank you, $1.')
      .replace(/(\d) von 5 Sternen/g, '$1 out of 5 stars').replace(/ – Team ansehen/g, ' – View team').replace(/\(Beispielprofil\)/g, '(sample profile)')
      .replace(/ in der Citypraxis$/, ' at Citypraxis').replace(/(\d+) Minuten/g, '$1 minutes').replace(/^Leistungen \/ /, 'Therapies / ').replace(/^ANFRAGE #/, 'REQUEST #').replace(/· AKUT$/, '· URGENT')
      .replace(/^Stand der übernommenen Tabelle: (.*?) – alle Angaben ohne Gewähr\. Diese Beträge sind Rückerstattungen, keine Behandlungspreise\. Aktuelle Beträge bitte bei Ihrer Versicherung prüfen\.$/, 'Original table dated $1 — information without guarantee. These are reimbursements, not treatment fees. Please check current amounts with your insurer.');
  }
  function localizeContent(content) {
    if (language !== 'en') return content;
    return Object.fromEntries(Object.entries(content).map(([collection, records]) => [collection, records.map(record => {
      const result = {...record};
      for (const [key, value] of Object.entries(record)) if (key.endsWith('En') && typeof value === 'string' && value.trim()) result[key.slice(0,-2)] = value;
      return result;
    })]));
  }
  function toggle() {
    return `<nav class="language-toggle" aria-label="${language === 'en' ? 'Language' : 'Sprache'}">${['de','en'].map(lang => {
      const url = new URL(location.href); url.searchParams.set('lang',lang);
      return `<a href="${url.pathname + url.search + url.hash}" lang="${lang}" data-language="${lang}" ${language === lang ? 'aria-current="true"' : ''} aria-label="${lang === 'de' ? 'Deutsch' : 'English'}">${lang.toUpperCase()}</a>`;
    }).join('')}</nav>`;
  }
  function apply(root = document.body) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      if (node.parentElement?.closest('script,style,textarea,code,[data-no-translate]')) continue;
      const translated = translate(node.nodeValue);
      if (translated !== node.nodeValue) node.nodeValue = translated;
    }
    for (const el of root.querySelectorAll('[aria-label],[placeholder],[alt],a[href]')) {
      for (const attr of ['aria-label','placeholder','alt']) if (el.hasAttribute(attr)) {
        const value=el.getAttribute(attr), translated=translate(value);
        if(value!==translated)el.setAttribute(attr,translated);
      }
      const href = el.getAttribute('href');
      if (href?.startsWith('/') && !href.startsWith('//') && !el.hasAttribute('data-language') && !/^\/(assets|uploads|api)\//.test(href)) {
        const url = new URL(href, location.origin); url.searchParams.set('lang', language);
        const next = url.pathname + url.search + url.hash;
        if (href !== next) el.setAttribute('href', next);
      }
    }
  }
  window.I18n = {language, translate, localizeContent, toggle, apply, dictionary};
  document.addEventListener('click', e => {
    if (!e.target.closest('[data-language]')) return;
    if (document.querySelector('#editor-dialog[open]') && !confirm(translate('Sprache wechseln und ungespeicherte Änderungen verwerfen?'))) e.preventDefault();
  });
  document.addEventListener('DOMContentLoaded', () => {
    if(language==='en') {
      document.title=document.title.replace('Praxisverwaltung', 'Practice admin');
      const description=document.querySelector('meta[name="description"]');
      if(description)description.content='Citypraxis Vienna: physiotherapy, osteopathy, speech and language therapy and therapeutic massage. Specialist treatment for the jaw, head and musculoskeletal system in 1010 Vienna.';
    }
    apply();
    new MutationObserver(() => apply()).observe(document.body, {subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:['aria-label','placeholder']});
  });
})();
