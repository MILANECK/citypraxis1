import {editorialPage} from '../../public/page-copy.js';

// Resolve the same defaults and published translations as the homepage.
export function practiceStrengths(content={}){
  const record=content.pages?.find(page=>page.id==='home')||{};
  const localizedRecord={...record};
  for(const [key,value] of Object.entries(record))if(key.endsWith('En')&&typeof value==='string'&&value.trim())localizedRecord[key.slice(0,-2)]=value;
  const de=editorialPage('home',record,'de'),en=editorialPage('home',localizedRecord,'en');
  const items=value=>String(value||'').split('\n').map(item=>item.trim()).filter(Boolean);
  return {heading:de.distinctionHeading,headingEn:en.distinctionHeading,items:items(de.distinctionItems),itemsEn:items(en.distinctionItems)};
}

// Common phrasing has a reliable link fallback; the model handles other paraphrases.
const strengthsQuestion=raw=>/\bwhy\b.{0,100}\b(?:choose|better|different|special|stand\s+out)\b|\b(?:what|how)\b.{0,70}\b(?:makes?\b.{0,50}\b(?:special|different)|sets?\b.{0,50}\bapart|stand\s+out)\b|\b(?:your|citypraxis(?:['’]s)?)\s+(?:strengths|advantages|benefits)\b|\b(?:warum|weshalb|wieso)\b.{0,100}\b(?:wählen|waehlen|entscheiden|besser|besonders)\b|\b(?:was|wie)\b.{0,60}\b(?:auszeichnet|zeichnet\b.{0,50}\baus|unterscheidet|besonders|besonderes|abhebt)\b|\b(?:stärken|staerken|vorteile|besonderheiten)\b/iu.test(raw);

// One catalog for model selection and server-generated, domain-independent links.
export function chatPages(content={}){
  const strengths=practiceStrengths(content);
  const pages=[
    ...(strengths.items.length||strengths.itemsEn.length?[{id:'strengths',url:'/#home-distinction-title',title:strengths.heading,titleEn:strengths.headingEn}]:[]),
    {id:'hours',url:'/kontakt#oeffnungszeiten',title:'Öffnungszeiten',titleEn:'Opening hours'},
    {id:'prices',url:'/preise',title:'Preise & Rückerstattung',titleEn:'Prices & reimbursement'},
    {id:'visit',url:'/ablauf-wahltherapie',title:'Ersttermin & Ablauf',titleEn:'Your first visit'},
    {id:'contact',url:'/kontakt',title:'Kontakt & Anfahrt',titleEn:'Contact & directions'},
    {id:'team',url:'/ueber-uns#team',title:'Unser Team',titleEn:'Our team'},
    {id:'therapies',url:'/leistungen',title:'Unsere Therapien',titleEn:'Our therapies'},
    {id:'specializations',url:'/schwerpunkte',title:'Unsere Schwerpunkte',titleEn:'Our specializations'},
    {id:'booking',url:'/termin#booking-form',title:'Terminanfrage',titleEn:'Appointment request'},
    {id:'privacy',url:'/datenschutz#digitaler-empfang',title:'Datenschutz',titleEn:'Privacy'},
    {id:'legal',url:'/impressum',title:'Impressum',titleEn:'Legal notice'}
  ];
  for(const [collection,prefix,route] of [['services','service','leistungen'],['symptoms','specialism','schwerpunkte'],['team','person','team']]){
    for(const row of (content[collection]||[]).filter(row=>row.id&&row.title&&!row.fictional)){
      pages.push({id:`${prefix}:${row.id}`,url:`/${route}/${encodeURIComponent(row.id)}`,title:row.title,titleEn:row.titleEn||row.title});
    }
  }
  return pages;
}

export function localizedPageUrl(page,lang){
  const [path,hash]=page.url.split('#');
  return `${path}?lang=${lang==='en'?'en':'de'}${hash?'#'+hash:''}`;
}

export function relatedPageLinks(raw,selected,facts,lang){
  const catalog=facts.sitePages||chatPages();
  const ids=Array.isArray(selected)?selected.filter(id=>catalog.some(page=>page.id===id)):[];
  if(strengthsQuestion(raw)&&catalog.some(page=>page.id==='strengths')){
    const index=ids.indexOf('strengths');if(index!==-1)ids.splice(index,1);
    ids.unshift('strengths');
  }
  // Common administrative questions must get a link even if the model omits it.
  const topics=[
    ['hours',/öffnungszeit|oeffnungszeit|opening\s*(?:hours|times)|\bhours\b|\b(?:you|practice|clinic)\b.{0,20}\b(?:open|closed|close)\b|\b(?:open|closed)\s+(?:on|today|tomorrow|at|during|until)\b|\b(?:geöffnet|offen|geschlossen)\b/iu],
    ['prices',/\b(?:prices?|costs?|fees?|preise?|kosten|gebühren|reimbursement|refund|insurance|payment|pay|cash|rückerstattung|erstattung|krankenkasse|zahlung|bezahlen|barzahlung)\b/iu],
    ['visit',/\b(?:first visit|first appointment|referral|prescription|cancellation|cancel|ersttermin|erstbesuch|verordnung|überweisung|absag\w*|storn\w*)\b/iu],
    ['contact',/\b(?:address|location|directions|parking|where are you|how (?:do|can) i (?:get|reach)|adresse|anfahrt|parken|wo (?:sind|ist|finde))\b/iu],
    ['privacy',/\b(?:privacy|personal data|data protection|datenschutz|personenbezogen\w*|daten speichern)\b/iu],
    ['therapies',/\b(?:therapies|treatments|therapien|behandlungen|leistungen)\b/iu],
    ['specializations',/\b(?:speciali[sz]ations|specialties|schwerpunkte|spezialisierungen)\b/iu],
    ['team',/\b(?:team|therapists|therapeuten|therapeutinnen)\b/iu]
  ];
  const detailPrefix={therapies:'service:',specializations:'specialism:',team:'person:'};
  for(const [id,pattern] of topics)if(pattern.test(raw)&&!ids.includes(id)&&!ids.some(selected=>detailPrefix[id]&&selected.startsWith(detailPrefix[id])))ids.push(id);
  const label=page=>String(lang==='en'?page.titleEn||page.title:page.title).replace(/[\[\]<>\r\n]/g,'').slice(0,75);
  const links=[...new Set(ids)].slice(0,3).map(id=>catalog.find(page=>page.id===id)).filter(Boolean).map(page=>`[${label(page)}](${localizedPageUrl(page,lang)})`);
  if(!links.length)return '';
  const joined=links.length===1?links[0]:`${links.slice(0,-1).join(', ')}${lang==='en'?' and ':' und '}${links.at(-1)}`;
  return lang==='en'?`For more details, see ${joined} on our website.`:`Weitere Informationen finden Sie auf unserer Website unter ${joined}.`;
}
