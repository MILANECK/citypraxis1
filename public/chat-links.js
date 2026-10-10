const escapeHtml=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const allowedHosts=new Set(['citypraxis-wien.onrender.com','citypraxis.wien','www.citypraxis.wien']);
const allowedPaths=new Set(['/','/preise','/ablauf-wahltherapie','/kontakt','/ueber-uns','/datenschutz','/termin','/leistungen','/schwerpunkte','/impressum']);
const linkPattern=/\[([^\]\n]{1,100})\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)|https?:\/\/[^\s<]+|(?<![\w/])\/[^\s<)]+/giu;

function safePageUrl(value,origin){
  try{
    if(value.startsWith('//')||value.includes('\\'))return null;
    const base=new URL(origin),url=new URL(value,base);
    const page=allowedPaths.has(url.pathname)||/^\/(?:leistungen|schwerpunkte|team)\/[^/]+$/u.test(url.pathname);
    if(!['http:','https:'].includes(url.protocol)||url.username||url.password||!(url.origin===base.origin||allowedHosts.has(url.hostname))||!page)return null;
    return `${url.pathname}${url.search}${url.hash}`;
  }catch{return null;}
}

export function formatChatMessage(value,origin=globalThis.location?.origin||'https://citypraxis-wien.onrender.com'){
  const source=String(value??'');let html='',index=0;
  for(const match of source.matchAll(linkPattern)){
    html+=escapeHtml(source.slice(index,match.index));
    const markdown=Boolean(match[1]),raw=markdown?match[2]:match[0];
    const trimmed=markdown?raw:raw.replace(/[.,!?;:]+$/u,'');
    const suffix=markdown?'':raw.slice(trimmed.length);
    const href=safePageUrl(trimmed,origin);
    html+=href?`<a href="${escapeHtml(href)}">${escapeHtml(markdown?match[1]:trimmed)}</a>${escapeHtml(suffix)}`:escapeHtml(match[0]);
    index=match.index+match[0].length;
  }
  return html+escapeHtml(source.slice(index));
}
