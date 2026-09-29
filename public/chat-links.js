const escapeHtml=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const allowedHosts=new Set(['citypraxis-wien.onrender.com','citypraxis.wien','www.citypraxis.wien']);
const allowedPaths=new Set(['/preise','/ablauf-wahltherapie','/kontakt','/ueber-uns','/datenschutz','/termin']);
const linkPattern=/\[([^\]\n]{1,100})\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)|https?:\/\/[^\s<]+|\/(?:preise|ablauf-wahltherapie|kontakt|ueber-uns|datenschutz|termin)(?:\?[^\s<)]+)?(?:#[^\s<)]+)?/giu;

function safePageUrl(value){
  try{
    const url=new URL(value,'https://citypraxis-wien.onrender.com');
    if(!['http:','https:'].includes(url.protocol)||!allowedHosts.has(url.hostname)||!allowedPaths.has(url.pathname))return null;
    return `${url.pathname}${url.search}${url.hash}`;
  }catch{return null;}
}

export function formatChatMessage(value){
  const source=String(value??'');let html='',index=0;
  for(const match of source.matchAll(linkPattern)){
    html+=escapeHtml(source.slice(index,match.index));
    const markdown=Boolean(match[1]),raw=markdown?match[2]:match[0];
    const trimmed=markdown?raw:raw.replace(/[.,!?;:]+$/u,'');
    const suffix=markdown?'':raw.slice(trimmed.length);
    const href=safePageUrl(trimmed);
    html+=href?`<a href="${escapeHtml(href)}">${escapeHtml(markdown?match[1]:trimmed)}</a>${escapeHtml(suffix)}`:escapeHtml(match[0]);
    index=match.index+match[0].length;
  }
  return html+escapeHtml(source.slice(index));
}
