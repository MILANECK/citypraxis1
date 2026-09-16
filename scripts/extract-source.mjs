import { readFileSync,writeFileSync } from 'node:fs';
const html=readFileSync('docs/source-site.html','utf8');
const entities={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '};
const decode=text=>text.replace(/<br\s*\/?\s*>/gi,'\n').replace(/<[^>]+>/g,'').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,(m,k)=>k[0]==='#'?String.fromCodePoint(k[1]==='x'?parseInt(k.slice(2),16):Number(k.slice(1))):entities[k]||m).replace(/[\uFEFF\u200B\u00AD]/g,'').normalize('NFC').trim();
const sections=[...html.matchAll(/<section\b[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/section>/gi)].map(([,id,source])=>({id,paragraphs:[...source.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(([,p])=>decode(p)).filter(Boolean),images:[...source.matchAll(/<img\b[^>]*src="([^"]+)"[^>]*>/gi)].map(([tag,path])=>({path,alt:decode(/alt="([^"]*)"/.exec(tag)?.[1]||'')}))}));
writeFileSync('docs/source-content.json',JSON.stringify(sections,null,2)+'\n');
for(const match of html.matchAll(/<section\b[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/section>/gi)){
  const section=sections.find(s=>s.id===match[1]);
  section.lists=[...match[2].matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map(([,item])=>decode(item).replace(/\s+/g,' '));
  if(section.lists.length)console.log(section.id,JSON.stringify(section.lists));
}
writeFileSync('docs/source-content.json',JSON.stringify(sections,null,2)+'\n');
console.log(sections.map(s=>`${s.id}: ${s.paragraphs.length} paragraphs, ${s.images.length} images`).join('\n'));
