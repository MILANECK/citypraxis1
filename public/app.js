import {editorialPage,editorialPages} from './page-copy.js?v=landing-1';
import {enhanceLanding} from './landing.js?v=30';
let landingCleanup,meshShaderCleanup;
const $ = (selector, root = document) => root.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const externalUrl=value=>{try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)?url.href:'';}catch{return '';}};
const headingId=value=>/^cookies\b/i.test(String(value||''))?'cookies':String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
const paragraph = text => String(text || '').split('\n\n').filter(t=>t.trim()).map(t => {
  const lines=t.split('\n'),heading=lines[0],rest=lines.slice(1).join('\n').trim();
  const marked=/^(#{2,6}) (.+)$/u.exec(heading);
  if(marked){const level=marked[1].length;return `<h${level} id="${headingId(marked[2])}">${esc(marked[2])}</h${level}>${rest?`<p>${esc(rest).replaceAll('\n','<br>')}</p>`:''}`;}
  return lines.every(line=>line.startsWith('- '))?`<ul>${lines.map(line=>`<li>${esc(line.slice(2))}</li>`).join('')}</ul>`:`<p>${esc(t).replaceAll('\n','<br>')}</p>`;
}).join('');
const optimizedImage=value=>value==='/assets/team-group.png'?'/assets/team-group.webp':/^\/assets\/[a-zA-Z0-9._-]+\.jpg$/.test(value||'')?value.replace(/\.jpg$/,'.webp'):value;
const privacyPreferenceKey='citypraxis-privacy-v1';
const mapEmbedUrl='https://www.google.com/maps?q=Citypraxis%20Stubenbastei%2012%2F11%2C%201010%20Wien&output=embed';
const privacyPreference=()=>{try{return JSON.parse(localStorage.getItem(privacyPreferenceKey)||'null');}catch{return null;}};
const privacyCopy=()=>I18n.language==='en'?{
  label:'YOUR PRIVACY',title:'Clear and simple.',body:'We do not use analytics or marketing tracking. The contact page includes Google Maps. Details about necessary storage and external services are available in our privacy information.',acknowledge:'Understood',details:'Cookie & privacy information',settings:'Cookie information'
}:{
  label:'IHRE PRIVATSPHÄRE',title:'Klar und einfach.',body:'Wir verwenden kein Analyse- oder Marketing-Tracking. Auf der Kontaktseite ist Google Maps eingebunden. Details zu notwendigen Speicherungen und externen Diensten finden Sie in der Datenschutzinfo.',acknowledge:'Verstanden',details:'Cookie- & Datenschutzinfo',settings:'Cookie-Information'
};
function cookiePanel(){const c=privacyCopy(),saved=privacyPreference();return `<aside class="cookie-panel" role="dialog" aria-labelledby="cookie-title" aria-describedby="cookie-description"${saved?' hidden':''}><button class="cookie-close" type="button" aria-label="${I18n.language==='en'?'Close cookie information':'Cookie-Information schließen'}">×</button><span class="eyebrow">${c.label}</span><h2 id="cookie-title">${c.title}</h2><p id="cookie-description">${c.body}</p><div class="cookie-actions"><a class="cookie-details" href="/datenschutz?lang=${I18n.language}#cookies">${c.details} ${arrow}</a><button class="button cookie-acknowledge" type="button">${c.acknowledge}</button></div></aside>`;}
let data;
const pageText=id=>editorialPage(id,data.pages.find(page=>page.id===id),I18n.language);
const lines=value=>esc(value).replaceAll('\n','<br>');
const arrow = '<span class="arrow-symbol" aria-hidden="true"></span>';
const healthIcons = {
  jaw: 'jaw_pain.svg',
  head: 'migraine_head.svg',
  ear: 'tinnitus_ear.svg',
  balance: 'dizzy_head.svg',
  movement: 'knee_pain.svg'
};
function icon(name) {
  const file = healthIcons[name] || healthIcons.movement;
  return `<img class="health-icon" src="/assets/icons/health/${file}" alt="" width="74" height="64" aria-hidden="true">`;
}
function header() {
  const links = [['/leistungen','Therapien'],['/schwerpunkte','Schwerpunkte'],['/ueber-uns','Team'],['/preise','Preise'],['/ablauf-wahltherapie','Ersttermin'],['/kontakt','Kontakt']].map(([url,label])=>`<a href="${url}"${location.pathname===url?' aria-current="page"':url==='/ueber-uns'&&location.pathname.startsWith('/team/')?' aria-current="location"':''}>${label}</a>`).join('');
  return `<div class="topline"><div class="container"><span>Mitten in Wien. Ganz bei Ihnen.</span><a href="/kontakt">Stubenbastei 12 · 1010 Wien ${arrow}</a></div></div>
  <header class="header${location.pathname==='/'?'':' header-is-scrolled'}"><div class="container header-inner"><a href="/" class="brand" aria-label="Citypraxis Startseite"><img class="brand-symbol" src="/assets/logo-symbol.png" alt="" width="31" height="40"><img class="brand-wordmark" src="/assets/wordmark-black.png" alt="Citypraxis" width="218" height="29"></a><nav class="desktop-nav" aria-label="Hauptnavigation">${links}</nav><a class="button header-cta" href="/termin">Ersttermin buchen ${arrow}</a>${I18n.toggle()}<button class="menu-toggle" aria-expanded="false" aria-controls="mobile-nav" aria-label="Menü öffnen"><span></span><span></span></button></div><nav id="mobile-nav" class="mobile-nav" aria-label="Mobile Navigation" aria-hidden="true" inert><div class="mobile-nav-inner">${links}<a href="/termin">Ersttermin buchen ${arrow}</a></div></nav></header>`;
}
function socialLinksMarkup(settings){
  const icons={
    instagram:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>',
    facebook:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.9 21v-8.2h2.8l.4-3.2h-3.2V7.5c0-.9.3-1.5 1.6-1.5h1.7V3.1a23 23 0 0 0-2.5-.1c-2.5 0-4.2 1.5-4.2 4.3v2.3H7.7v3.2h2.8V21z"/></svg>'
  };
  const links=(Array.isArray(settings.socialLinks)?settings.socialLinks:[]).flatMap(item=>{
    const platform=String(item?.platform||'').toLowerCase(),url=externalUrl(item?.url);
    return icons[platform]&&url?[`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer" aria-label="Citypraxis auf ${platform==='instagram'?'Instagram':'Facebook'}">${icons[platform]}</a>`]:[];
  });
  return links.length?`<nav class="footer-social" aria-label="Social Media">${links.join('')}</nav>`:'';
}
function footer() {
  const s = data.settings[0];
  const c=privacyCopy();
  return `<footer><div class="home-footer-watermark" aria-hidden="true"><img src="/assets/wordmark-black.png" alt="" width="1200" height="160"></div><div class="container footer-top"><div><div class="footer-identity"><img class="footer-logo" src="/assets/wordmark-black.png" alt="Citypraxis" width="250" height="34"><img class="footer-symbol" src="/assets/logo-symbol.png" alt="" width="38" height="49"></div><p>Gemeinsam weiterkommen.<br>Mitten in Wien.</p>${socialLinksMarkup(s)}</div><div><h3>Besuchen Sie uns</h3><p>${esc(s.address)}<br>${esc(s.city)}</p><a href="https://www.google.com/maps/search/?api=1&query=Stubenbastei+12+1010+Wien" target="_blank" rel="noopener">Route planen ↗︎</a></div><div><h3>Wir sind für Sie da</h3><a href="tel:${esc(s.phone.replaceAll(' ',''))}">${esc(s.phone)}</a><a href="mailto:${esc(s.email)}">${esc(s.email)}</a><p><a href="/kontakt#oeffnungszeiten"><strong>${I18n.language==='en'?'Opening hours':'Öffnungszeiten'}</strong></a><br>${esc(s.hours)}</p></div><div><h3>Gut zu wissen</h3><a href="/ablauf-wahltherapie">Ersttermin & Wahltherapie</a><a href="/leistungen">Unsere Leistungen</a><p>${esc(s.payment)}</p></div></div><div class="container footer-bottom"><span>© ${new Date().getFullYear()} Citypraxis Wien</span><div><a href="/impressum">Impressum</a><a href="/datenschutz">Datenschutz</a><button class="cookie-settings-link" type="button">${c.settings}</button><a href="/admin">Praxis-Login ↗︎</a></div></div></footer><nav class="mobile-booking" aria-label="${I18n.language==='en'?'Quick contact':'Schnellkontakt'}"><a class="mobile-call" href="tel:${esc(s.phone.replaceAll(' ',''))}" aria-label="${I18n.language==='en'?'Call us':'Anrufen'}" title="${I18n.language==='en'?'Call us':'Anrufen'}"><img src="/assets/icons/phone.svg" width="27" height="27" alt=""></a><a class="mobile-appointment" href="/termin#booking-form" aria-label="${I18n.language==='en'?'Book first appointment':'Ersttermin buchen'}" title="${I18n.language==='en'?'Book first appointment':'Ersttermin buchen'}"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="16" rx="2.5"/><path d="M7.5 3v4M16.5 3v4M3.5 10h17M8 15h8M12 12v6"/></svg></a></nav>`;
}
function processBlock() {
  const page=pageText('ablauf-wahltherapie');
  return `<ol class="process-grid">${[1,2,3,4].map((step,i)=>`<li><div class="step-top"><span>0${step}</span>${i<3 ? '<span class="step-arrow" aria-hidden="true">→</span>':''}</div><h3 data-copy-key="step${step}Title">${esc(page[`step${step}Title`])}</h3><p data-copy-key="step${step}Body">${esc(page[`step${step}Body`])}</p></li>`).join('')}</ol>`;
}
function faqs() { return `<div class="faq-list">${data.faqs.map(f=>`<details><summary>${esc(f.title)}<span aria-hidden="true">+</span></summary><div>${paragraph(f.body)}</div></details>`).join('')}</div>`; }
function heroMarkup(h,s,quickLinks='') {
  const video=h.heroMedia==='video' && h.video;
  const openingFrame=video==='/assets/hero-film.mp4' && h.image==='/assets/hero-video-poster.jpg';
  const poster=`${optimizedImage(h.image)}${openingFrame?'?v=opening-frame-1':''}`;
  return `<section class="hero hero-immersive${video?' hero-video-parallax':''} hero-${esc(h.heroHeight||'fullscreen')} overlay-${esc(h.heroOverlay||'balanced')} focus-${esc(h.heroPosition||'center')} mobile-focus-${esc(h.heroMobilePosition||'center')}" aria-label="Willkommen in der Citypraxis">
    <div class="hero-media"><img class="hero-backdrop" src="${esc(poster)}" alt="${esc(h.heroAlt||'Einblicke in die Citypraxis Wien')}" fetchpriority="high" decoding="sync">${video?`<video id="hero-video" class="hero-background-video" data-src="${esc(h.video)}" data-start-time="${openingFrame?'1':'0'}" poster="${esc(poster)}" muted loop playsinline preload="none" aria-hidden="true" tabindex="-1"></video>`:''}</div>
    <div class="hero-shade"></div><div class="container hero-stage"><div class="hero-copy"><span class="eyebrow" data-copy-key="eyebrow"><span class="tiny-line"></span>${esc(h.eyebrow)}</span><h1><span data-copy-key="title">${esc(h.title)}</span><br><span data-copy-key="subtitle">${esc(h.subtitle)}</span></h1><p data-copy-key="intro">${esc(h.intro)}</p><div class="hero-actions"><a class="button" href="/termin">Ersttermin buchen ${arrow}</a><a class="urgent-button" href="/termin?akut=1"><span class="availability ${s.acuteAvailable?'is-available':''}"></span>Akuttermin anfragen ${arrow}</a></div></div></div>${quickLinks}
  </section>`;
}
function therapyCard(s) {
  const visual=s.image?`<img src="${esc(optimizedImage(s.image))}" alt="" loading="lazy" decoding="async">`:'<img src="/assets/icons/lotus.svg" alt="" loading="lazy" decoding="async">';
  return `<a class="therapy-card" href="/leistungen/${esc(s.id)}"><div class="therapy-card-media${s.image?'':' therapy-card-media--symbol'}">${visual}</div><span class="therapy-card-mark" aria-hidden="true"></span><div class="therapy-card-copy"><h3>${esc(s.title)}</h3><p class="therapy-card-detail">${esc(s.intro||'')}</p></div></a>`;
}
function homeDistinction(about,en){
  if(!about.distinction?.items.length)return '';
  const title=about.distinction.title;
  const titleLines=title.replace(/^What makes Citypraxis special$/i,'What makes\nCitypraxis special').replace(/^Was die Citypraxis auszeichnet$/i,'Was die Citypraxis\nauszeichnet');
  const heading=lines(titleLines);
  const eyebrow=en?'WHY CITYPRAXIS':'WARUM CITYPRAXIS';
  const copy=`<span class="eyebrow">${eyebrow}</span><h2 id="home-distinction-title">${heading}</h2>`;
  return `<section class="container home-distinction" aria-labelledby="home-distinction-title" tabindex="0"><div class="home-distinction-copy">${copy}</div><div class="home-distinction-copy-white" aria-hidden="true"><div class="home-distinction-copy-white-inner"><span class="eyebrow">${eyebrow}</span><span class="home-distinction-white-heading">${heading}</span></div></div><div class="home-distinction-benefits"><ul>${about.distinction.items.map((item,index)=>`<li style="--benefit-delay:${210+index*45}ms">${esc(item)}</li>`).join('')}</ul></div><div class="home-distinction-visual" aria-hidden="true"><div class="home-distinction-logo"><img class="home-distinction-symbol" src="/assets/logo-symbol.png" alt="" width="58" height="76"></div><span class="home-distinction-plus"><svg viewBox="0 0 24 24" fill="none"><path d="M5 12h14M12 5v14" stroke="currentColor" stroke-width="1.5"/></svg></span></div></section>`;
}
function home() {
  const h = pageText('home'), s = data.settings[0];
  const therapies = ['physiotherapie','osteopathie','logopaedie','kindergesundheit','heilmassage'].map(id=>data.services.find(item=>item.id===id)).filter(Boolean);
  const quickLinks=`<div class="hero-quick-strip"><div class="home-hero-divider" aria-hidden="true"></div><nav class="quick-links container" aria-label="Direkt zum Anliegen">
    <a href="tel:${esc(s.phone.replaceAll(' ',''))}"><img class="quick-icon" src="/assets/icons/phone.svg" alt="" width="48" height="48"><div><strong>${esc(s.phone)}</strong><span>Persönlich für Sie da</span></div></a>
    <a href="/leistungen"><img class="quick-icon" src="/assets/icons/lotus.svg" alt="" width="48" height="48"><div><strong>Unsere Therapien</strong><span>Die passende Behandlung finden</span></div></a>
    <a href="/preise"><img class="quick-icon" src="/assets/icons/euro.svg" alt="" width="48" height="48"><div><strong>Preise & Rückerstattung</strong><span>Kosten verständlich erklärt</span></div></a>
    <a href="/kontakt"><img class="quick-icon" src="/assets/icons/pin.svg" alt="" width="48" height="48"><div><strong>1010 Wien</strong><span>${esc(s.address)}</span></div></a>
  </nav></div>`;
  const en=I18n.language==='en';
  const about=aboutBodySections(data.pages.find(page=>page.id==='about')?.body);
  const amounts=(data.prices||[]).map(item=>Number(String(item.amount??'').replace(',','.'))).filter(value=>Number.isFinite(value)&&value>0);
  const formatPrice=value=>new Intl.NumberFormat(en?'en-AT':'de-AT',{maximumFractionDigits:2}).format(value);
  const priceRange=amounts.length?`<b class="home-price-value" data-price-value="${Math.min(...amounts)}" aria-hidden="true">${formatPrice(Math.min(...amounts))}</b><span aria-hidden="true">—</span><b class="home-price-value" data-price-value="${Math.max(...amounts)}" aria-hidden="true">${formatPrice(Math.max(...amounts))}</b><small aria-hidden="true">€</small>`:'';
  return `${heroMarkup(h,s,quickLinks)}${h.body?`<section class="section container article-body" data-copy-key="body">${paragraph(h.body)}</section>`:''}
  <div class="home-atmosphere"><section class="home-therapies" id="therapien"><div class="container"><div class="home-section-intro" data-home-reveal><span class="eyebrow" data-copy-key="therapiesEyebrow">${esc(h.therapiesEyebrow)}</span><h2 data-copy-key="therapiesHeading">${lines(String(h.therapiesHeading).replace(/\. ?(?=[A-ZÄÖÜ])/g,'.\n'))}</h2><p data-copy-key="therapiesIntro">${esc(h.therapiesIntro)}</p></div><div class="therapy-grid">${therapies.map(therapyCard).join('')}</div><div class="home-section-link" data-home-reveal><a class="text-link" href="/leistungen">Alle Behandlungen ${arrow}</a></div></div></section>
  ${homeDistinction(about,en)}
  <div class="home-people">${h.teamImage?`<section class="container team-feature" aria-labelledby="team-feature-title"><div class="home-team-photo" data-home-reveal><div class="home-team-visual"><img class="team-group-photo" src="${esc(optimizedImage(h.teamImage))}" alt="${esc(h.teamImageAlt||'Team-Gruppenfoto')}" loading="lazy" decoding="async" width="1299" height="870"><span class="home-photo-caption">CITYPRAXIS · 1010 WIEN</span></div></div><nav class="home-team-roster" aria-label="${en?'Our team':'Unser Team'}"><ul>${(data.team||[]).map(person=>`<li><a href="${esc(teamPath(person))}"><span>${esc(String(person.title||'').trim().replace(/\s+/g,' '))}</span>${arrow}</a></li>`).join('')}</ul></nav><div class="team-feature-copy" data-home-reveal><span class="eyebrow" data-copy-key="teamEyebrow">${esc(h.teamEyebrow)}</span><h2 id="team-feature-title" data-copy-key="teamHeading">${esc(h.teamHeading)}</h2><p data-copy-key="teamIntro">${esc(h.teamIntro)}</p><a class="text-link" href="/ueber-uns">Das gesamte Team ${arrow}</a></div><span class="home-team-plus" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M5 12h14M12 5v14" stroke="currentColor" stroke-width="1.5"/></svg></span></section>`:''}
  ${reviewsSection()}</div>
  <section class="container home-price-wrap" aria-labelledby="home-price-title"><div class="home-price-panel" data-home-reveal><div class="home-price-copy"><span class="eyebrow" data-copy-key="pricesEyebrow">${esc(h.pricesEyebrow)}</span><h2 id="home-price-title" data-copy-key="pricesHeading">${lines(String(h.pricesHeading).replace('What doesmy treatment cost?','What does my treatment cost?').replace('Was kostetmeine Behandlung?','Was kostet meine Behandlung?'))}</h2><p data-copy-key="pricesIntro">${esc(h.pricesIntro)}</p><a class="text-link" href="/preise">Preise & Rückerstattung ${arrow}</a></div><div class="home-price-figure">${priceRange?`<span class="home-price-label">${en?'TREATMENT PRICES':'BEHANDLUNGSPREISE'}</span><div class="home-price-range" role="img" aria-label="${esc(en?`From ${formatPrice(Math.min(...amounts))} to ${formatPrice(Math.max(...amounts))} euros`:`Von ${formatPrice(Math.min(...amounts))} bis ${formatPrice(Math.max(...amounts))} Euro`)}">${priceRange}</div><p>${en?'Depending on treatment and appointment duration.':'Je nach Behandlung und Termindauer.'}</p>`:''}<span class="home-price-note">${en?'Private treatment · Reimbursement information in the price list':'Wahltherapie · Informationen zur Rückerstattung in der Preisliste'}</span></div></div></section>
  <section class="container home-faq" aria-labelledby="home-faq-title"><div class="home-faq-intro" data-home-reveal><span class="eyebrow">${en?'GOOD TO KNOW':'GUT ZU WISSEN'}</span><h2 id="home-faq-title" data-copy-key="faqHeading">${esc(h.faqHeading)}</h2><p data-copy-key="faqIntro">${esc(h.faqIntro)}</p><a class="text-link" href="/ablauf-wahltherapie">${en?'Your first visit':'Ihr erster Besuch'} ${arrow}</a></div><div data-home-reveal>${faqs()}</div></section></div>
  `;
}
function article(title,intro,body,extra='') { return `<section class="container article"><a class="breadcrumb" href="/">Startseite /</a><span class="eyebrow">CITYPRAXIS WIEN</span><h1 data-copy-key="title">${esc(title)}</h1><p class="article-intro" data-copy-key="intro">${esc(intro)}</p>${body?`<div class="article-body" data-copy-key="body">${paragraph(body)}</div>`:''}${extra}</section>`; }
function clinicalBody(body,serviceId=''){return String(body||'').split(/\n\n(?=## )/).map((part,i)=>{const content=serviceId==='heilmassage'?part.split('\n\n').map(block=>/^(?:We expressly point out that our massage services|Wir weisen ausdrücklich darauf hin, dass unsere Angebote bei den Massagen)/.test(block.trim())?`<aside class="clinical-highlight">${paragraph(block)}</aside>`:paragraph(block)).join(''):paragraph(part);return `<section class="clinical-card" id="abschnitt-${i}">${content}</section>`;}).join('');}
function aboutBodySections(body){
  const sections=String(body||'').trim().split(/\n\n(?=## )/);
  const sectionTitle=part=>/^## ([^\n]+)/.exec(part)?.[1]||'';
  const specialisationIndex=sections.findIndex(part=>/specialisation|spezialisierung/i.test(sectionTitle(part)));
  const aimIndex=sections.findIndex(part=>/^(?:Our aim|Unser Ziel)$/i.test(sectionTitle(part)));
  const distinctionIndex=sections.findIndex((part,index)=>index!==specialisationIndex&&index!==aimIndex&&/^## [^\n]+\n\n- /m.test(part));
  if(specialisationIndex<1||aimIndex<0)return {aim:'',distinction:null,reading:clinicalBody(body)};
  const compact=text=>text.trim().split(/\n\n+/).map(item=>item.trim()).filter(item=>item&&!/^(?:In short,|Kurzum gesagt,)/i.test(item)).join(' ');
  const specialisation=sections[specialisationIndex].replace(/^## [^\n]+\n*/, '');
  const summary=[compact(sections.slice(0,specialisationIndex).join('\n\n')),compact(specialisation)].filter(Boolean).join('\n\n');
  const distinctionItems=distinctionIndex<0?[]:[...sections[distinctionIndex].matchAll(/^- (.+)$/gm)].map(match=>match[1]);
  const items=distinctionItems.reduce((result,item)=>{if(/^\(=/.test(item)&&result.length)result[result.length-1]+=` ${item}`;else result.push(item);return result;},[]);
  const reading=`<section class="clinical-card about-specialisation" id="abschnitt-${specialisationIndex}"><h2 id="${headingId(sectionTitle(sections[specialisationIndex]))}">${esc(sectionTitle(sections[specialisationIndex]))}</h2><div class="about-specialisation-copy">${paragraph(summary)}</div></section>`+
    sections.map((part,index)=>index!==specialisationIndex&&index!==aimIndex&&index!==distinctionIndex&&index>specialisationIndex?`<section class="clinical-card" id="abschnitt-${index}">${paragraph(part)}</section>`:'').join('');
  return {aim:paragraph(sections[aimIndex]),distinction:distinctionIndex<0?null:{title:sectionTitle(sections[distinctionIndex]),items},reading};
}
function clinicalContents(body){
  const sections=String(body||'').split(/\n\n(?=## )/).map((part,i)=>({title:part.startsWith('## ')?part.split('\n')[0].slice(3):'Über die Behandlung',id:'abschnitt-'+i}));
  return sections.length>1?'<nav class="clinical-contents" aria-label="Auf dieser Seite"><strong>Auf dieser Seite</strong>'+sections.map(section=>'<a href="#'+section.id+'">'+esc(section.title)+'</a>').join('')+'</nav>':'';
}
function servicePage(item){
  const english=I18n.language==='en',isPhysio=item.id==='physiotherapie';
  const relatedIds=isPhysio?['kindergesundheit','faszienbehandlungen','crafta','cmd']:(item.related||'').split(',').map(id=>id.trim()).filter(Boolean);
  const related=relatedIds.map(id=>data.services.find(s=>s.id===id)).filter(Boolean);
  const extraApproaches=isPhysio?`<button class="related-info" type="button" disabled>${english?'Maitland manual therapy':'Manuelle Therapie nach Maitland'}</button><button class="related-info" type="button" disabled>${english?'Sports physiotherapy':'Sportphysiotherapie'}</button>`:'';
  const relatedSection=related.length?`<section class="clinical-card"><h2>${isPhysio?(english?'Treatment approaches in physiotherapy':'Behandlungsansätze in der Physiotherapie'):(english?'Related treatments':'Behandlungskonzepte entdecken')}</h2><div class="related-links">${related.map(r=>`<a href="/leistungen/${esc(r.id)}">${esc(r.title)} ↗︎</a>`).join('')}${extraApproaches}</div></section>`:'';
  return `<section class="container article service-article"><a class="breadcrumb" href="/leistungen">Leistungen / ${esc(item.title)}</a><div class="service-intro"><div><span class="eyebrow">${esc(item.tag||'CITYPRAXIS WIEN')}</span><h1>${esc(item.title)}</h1><p>${esc(item.intro)}</p></div>${item.image?`<img src="${esc(optimizedImage(item.image))}" alt="${esc(item.title)} in der Citypraxis" fetchpriority="high" decoding="async">`:''}</div>${clinicalContents(item.body)?`<details class="mobile-contents"><summary>Auf dieser Seite</summary>${clinicalContents(item.body)}</details>`:''}<div class="clinical-layout"><div class="clinical-text">${clinicalBody(item.body,item.id)}${item.id!=='kindergesundheit'&&item.methods?`<div class="faq-list">${item.methods.split('\n').filter(Boolean).map(m=>{const [title,...text]=m.split('|');return `<details><summary>${esc(title)}<span>+</span></summary><div>${paragraph(text.join('|'))}</div></details>`;}).join('')}</div>`:''}${relatedSection}</div><aside class="clinical-aside">${clinicalContents(item.body)}<span class="eyebrow">WIR SIND FÜR SIE DA</span><h2>Ihr nächster Schritt.</h2><p>Vereinbaren Sie Ihren Ersttermin in der Citypraxis.</p><a class="button" href="/termin">Ersttermin anfragen ↗︎</a><a class="text-link" href="/ablauf-wahltherapie">Ablauf & Wahltherapie →</a><a class="text-link" href="/preise">Preise & Rückerstattung →</a></aside></div></section>`;
}
function pricesBlock(){
  const en=I18n.language==='en',groups=[],copy=pageText('preise');
  for(const item of data.prices){const category=item.category|| (en?'Other':'Weitere');let group=groups.find(entry=>entry.category===category);if(!group){group={category,items:[]};groups.push(group);}group.items.push(item);}
  const tabs=groups.map((group,index)=>`<button id="price-tab-${index}" role="tab" aria-selected="${index===0}" aria-controls="price-panel-${index}" tabindex="${index===0?'0':'-1'}" data-price-tab="${index}">${esc(group.category)}</button>`).join('');
  const panels=groups.map((group,index)=>`<section id="price-panel-${index}" class="price-category-panel" role="tabpanel" aria-labelledby="price-tab-${index}"${index?' hidden':''}><div class="reimbursement-wrap"><table class="reimbursement-table price-table"><caption>${esc(group.category)}</caption><thead><tr><th scope="col">${en?'Treatment':'Behandlung'}</th><th scope="col">${en?'Appointment / duration':'Termin / Dauer'}</th><th scope="col">${en?'Price':'Preis'}</th></tr></thead><tbody>${group.items.map(item=>`<tr><th scope="row"><strong>${esc(item.title)}</strong>${item.details?`<small>${esc(item.details)}</small>`:''}</th><td>${esc(item.duration||'')}</td><td>${item.amount?`<span class="price-amount">${esc(item.amount)} €</span>`:''}</td></tr>`).join('')}</tbody></table></div></section>`).join('');
  return `<section class="clinical-card price-categories"><span class="eyebrow" data-copy-key="priceEyebrow">${esc(copy.priceEyebrow)}</span><h2 data-copy-key="priceHeading">${esc(copy.priceHeading)}</h2><div class="price-category-tabs" role="tablist" aria-label="${en?'Price categories':'Preiskategorien'}">${tabs}</div>${panels}<aside class="private-practice-note"><strong data-copy-key="priceNotice">${esc(copy.priceNotice)}</strong><span>${en?'Appointments by arrangement only':'Termine nur nach Vereinbarung'}</span></aside><p class="price-footnote" data-copy-key="priceFootnote">${esc(copy.priceFootnote)}</p></section><section class="clinical-card"><span class="eyebrow" data-copy-key="reimbursementEyebrow">${esc(copy.reimbursementEyebrow)}</span><h2 data-copy-key="reimbursementHeading">${esc(copy.reimbursementHeading)}</h2><p class="source-date" data-copy-key="reimbursementIntro">${esc(copy.reimbursementIntro.replace('{date}',data.reimbursements[0]?.asOf||'04/2023'))}</p><div class="reimbursement-wrap"><table class="reimbursement-table"><caption>Rückerstattung laut bisheriger Praxiswebsite</caption><thead><tr><th scope="col">Leistung</th><th scope="col">ÖGKK</th><th scope="col">BVAEB</th><th scope="col">KFA</th><th scope="col">SVS</th></tr></thead><tbody>${data.reimbursements.map(r=>`<tr><th scope="row">${esc(r.title)}</th>${['oegkk','bvaeb','kfa','svs'].map(k=>`<td>${esc(r[k])}${r[k]&&r[k]!=='–'?' €':''}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>`;
}
function teamThumbnail(t){
  return `<a class="team-thumbnail" href="${esc(teamPath(t))}" aria-label="${esc(t.title)} – Team ansehen${t.placeholder||t.fictional?' (Beispielprofil)':''}">${t.image?`<img src="${esc(optimizedImage(t.image))}" alt="" loading="lazy" decoding="async">`:'<span class="thumbnail-empty" aria-hidden="true"></span>'}</a>`;
}
function reviewStars(value){
  const rating=Number(value);
  return Number.isInteger(rating)&&rating>=1&&rating<=5?`<div class="review-stars" role="img" aria-label="${rating} von 5 Sternen"><span aria-hidden="true">${Array.from({length:5},(_,index)=>`<span class="review-star${index<rating?'':' review-stars-empty'}">${index<rating?'★':'☆'}</span>`).join('')}</span></div>`:'';
}
function reviewsSection(){
  const reviews=(data.reviews||[]).filter(r=>r.body?.trim()).slice(0,3),settings=data.settings[0];
  return `<section class="section container reviews-section"><div class="section-heading"><div><span class="eyebrow">ERFAHRUNGEN MIT DER CITYPRAXIS</span><h2>${esc(settings.reviewsTitle||'Stimmen aus der Praxis.')}</h2>${settings.reviewsIntro?`<p>${esc(settings.reviewsIntro)}</p>`:''}</div>${reviews.length?'':'<p>Bewertungen folgen in Kürze.</p>'}</div><div class="reviews-grid">${reviews.length?reviews.map(r=>{const sourceUrl=externalUrl(r.sourceUrl);return `<figure class="review-card"><div class="review-top"><span class="review-quote" aria-hidden="true"><svg viewBox="0 0 44 34" width="40" height="32" fill="currentColor" focusable="false"><path d="M3 29V18C3 9 7 4 16 2l1 5c-6 2-8 5-8 10h8v12H3Zm24 0V18c0-9 4-14 13-16l1 5c-6 2-8 5-8 10h8v12H27Z"/></svg></span></div><blockquote>${paragraph(r.body)}</blockquote><figcaption><span class="review-avatar" aria-hidden="true">${esc(r.title?.trim().charAt(0)||'•')}</span><div class="review-person"><div class="review-name-line"><strong>${esc(r.title)}</strong>${reviewStars(r.rating)}</div>${r.source?(sourceUrl?`<a class="review-source" href="${esc(sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(r.source)} ↗︎</a>`:`<span>${esc(r.source)}</span>`):''}</div></figcaption></figure>`;}).join(''):[1,2,3].map(()=>'<div class="review-card review-placeholder"><div class="review-top"><span class="review-quote" aria-hidden="true"><svg viewBox="0 0 44 34" width="40" height="32" fill="currentColor" focusable="false"><path d="M3 29V18C3 9 7 4 16 2l1 5c-6 2-8 5-8 10h8v12H3Zm24 0V18c0-9 4-14 13-16l1 5c-6 2-8 5-8 10h8v12H27Z"/></svg></span></div><span class="eyebrow">BEWERTUNGS-VORSCHAU</span><p>Hier erscheint eine freigegebene Bewertung aus unserer Praxis.</p><div class="review-placeholder-footer"><span class="review-avatar" aria-hidden="true">+</span><div class="review-name-line"><span>Name und Quelle der Bewertung</span><span class="review-stars review-stars-empty" aria-label="Sterne-Platzhalter, noch keine Bewertung">☆☆☆☆☆</span></div></div></div>').join('')}</div></section>`;
}

const teamPath=t=>`/team/${encodeURIComponent(t.id)}${new URLSearchParams(location.search).has('preview')?'?preview=1':''}`;
const teamMemberBookable=t=>typeof t.bookable==='boolean'?t.bookable:!(/\b(?:lisa|petra)\b/i.test(`${t.id||''} ${t.title||''}`)||/\b(?:secretary|receptionist|sekretär(?:in)?|sekretaer(?:in)?|rezeption(?:ist(?:in)?)?)\b/i.test(t.role||''));
function teamCardName(t){
  const name=String(t.title||'').trim().replace(/\s+/g,' ');
  if(t.id==='kornelia-komander'){
    const surnameEnd=name.indexOf(',')<0?name.length:name.indexOf(',');
    const breakAt=name.lastIndexOf(' ',surnameEnd);
    if(breakAt>0)return `${esc(name.slice(0,breakAt))}<br>${esc(name.slice(breakAt+1))}`;
  }
  return esc(name);
}
function teamCard(t){
  const cardLabel=String(t.cardLabel??(t.id==='isabella-casny'?(I18n.language==='en'?'Practice director':'Praxisleitung'):'')).trim();
  return `<article class="team-person${t.id==='sophia-shivarova'?' team-card-sophia':''}" data-team-id="${esc(t.id)}"><a class="team-profile-link" href="${esc(teamPath(t))}" aria-labelledby="team-name-${esc(t.id)}"><div class="team-portrait">${t.image?`<img class="team-photo" src="${esc(optimizedImage(t.image))}" alt="" loading="lazy" decoding="async" width="360" height="360">`:'<div class="team-no-photo" aria-hidden="true">CP</div>'}</div><div class="team-card-copy"><h3 id="team-name-${esc(t.id)}">${teamCardName(t)}</h3>${cardLabel?`<span class="team-lead-label">${esc(cardLabel)}</span>`:''}<p class="team-role">${esc(t.role).replaceAll(' / ','<br>').replaceAll(' · ','<br>')}</p><span class="team-profile-prompt">${I18n.language==='en'?'View profile':'Profil ansehen'} ${arrow}</span></div></a></article>`;
}
function therapistPage(t){
  const en=I18n.language==='en';
  const booking=`/termin?therapist=${encodeURIComponent(t.id)}`;
  const bookingAction=teamMemberBookable(t)?`<a class="button therapist-book" href="${booking}">${en?'Request an appointment':'Termin anfragen'} ${arrow}</a><p class="therapist-book-note">${en?'Your chosen therapist is already selected in the form.':'Im Formular ist Ihre gewünschte Betreuung bereits ausgewählt.'}</p>`:'';
  const section=(title,text)=>text?`<section class="therapist-section"><h2>${title}</h2>${paragraph(text)}</section>`:'';
  return `<article class="container therapist-profile"><nav class="profile-breadcrumb" aria-label="${en?'Breadcrumb':'Brotkrümelnavigation'}"><a class="text-link" href="/ueber-uns#team">${en?'Back to the team':'Zurück zum Team'}</a><span aria-hidden="true">/</span><span>${esc(t.title)}</span></nav><div class="therapist-hero"><div class="therapist-photo-frame">${t.image?`<img src="${esc(optimizedImage(t.image))}" alt="${esc(t.title)}" width="720" height="900" fetchpriority="high" decoding="async">`:'<div class="therapist-photo-empty" aria-hidden="true">CP</div>'}</div><div class="therapist-intro"><span class="eyebrow">CITYPRAXIS · ${en?'YOUR TEAM':'IHR TEAM'}</span><h1>${esc(t.title)}</h1><p class="therapist-role">${esc(t.role)}</p>${t.qualifications?`<p class="therapist-qualifications">${esc(t.qualifications)}</p>`:''}${t.body?`<div class="therapist-bio">${paragraph(t.body)}</div>`:''}${bookingAction}${t.phone||t.email?`<div class="therapist-contact">${t.phone?`<a class="text-link" href="tel:${esc(t.phone.replaceAll(' ',''))}">${esc(t.phone)}</a>`:''}${t.email?`<a class="text-link" href="mailto:${esc(t.email)}">${esc(t.email)}</a>`:''}</div>`:''}</div></div><div class="therapist-details">${section(en?'Treatment focus':'Behandlungsschwerpunkte',t.specialties)}${section(en?'Therapies & methods':'Angebot & Methoden',t.methods)}${section(en?'Professional background':'Beruflicher Werdegang',t.career)}</div><div class="therapist-profile-end"><a class="text-link" href="/ueber-uns#team">${en?'Meet the whole team':'Das gesamte Team kennenlernen'} ${arrow}</a>${teamMemberBookable(t)?`<a class="button" href="${booking}">${en?'Request an appointment':'Termin anfragen'} ${arrow}</a>`:''}</div></article>`;
}
function therapistSelection(){
  const en=I18n.language==='en',requested=new URLSearchParams(location.search).get('therapist'),selected=data.team.find(t=>t.id===requested);
  if(!selected||!teamMemberBookable(selected))return requested?'<p class="therapist-choice-note">'+(!selected?(en?'This profile is no longer available. Our secretary will help you find suitable care.':'Dieses Profil ist nicht mehr verfügbar. Unser Sekretariat hilft Ihnen bei der passenden Betreuung.'):(en?'This team member coordinates appointment requests and cannot be selected as a therapist. Please send a general request and our secretary will help you find the right care.':'Dieses Teammitglied koordiniert Terminanfragen und kann nicht als Therapeut ausgewählt werden. Bitte senden Sie eine allgemeine Anfrage; unser Sekretariat hilft Ihnen bei der passenden Betreuung.'))+'</p>':'';
  return `<section class="therapist-picker" aria-label="${en?'Requested therapist':'Gewünschte Betreuung'}"><input type="hidden" name="therapistId" value="${esc(selected.id)}"><div class="therapist-choice"><div class="therapist-choice-portrait" aria-hidden="true">${selected.image?`<img src="${esc(optimizedImage(selected.image))}" alt="" width="64" height="76">`:'<span>CP</span>'}</div><div class="therapist-choice-control"><span class="therapist-choice-label">${en?'Request from therapist profile':'Anfrage über das Therapeutenprofil'}</span><strong>${esc(selected.title)}</strong><p class="therapist-choice-role">${esc(selected.role)}</p></div></div><p class="therapist-choice-note">${en?'Our secretary will contact you by phone or email to arrange the appointment.':'Unser Sekretariat stimmt den Termin telefonisch oder per E-Mail mit Ihnen ab.'}</p></section>`;
}
function listing(kind) {
  const symptoms = kind === 'symptoms';
  const page=pageText(symptoms?'schwerpunkte':'leistungen');
  const services=['physiotherapie','osteopathie','logopaedie','heilmassage'].map(id=>data.services.find(service=>service.id===id)).filter(Boolean);
  const entries=symptoms?data.symptoms:services;
  return article(page.title,page.intro,page.body,`<div class="listing-grid ${symptoms?'symptom-listing':'service-listing'}">${entries.map(s=>`<a class="listing-card" href="/${symptoms?'schwerpunkte':'leistungen'}/${esc(s.id)}">${symptoms?icon(s.icon):'<span class="eyebrow">'+esc(s.tag)+'</span>'}<h2>${esc(s.title)}</h2><p>${esc(s.intro)}</p><span class="text-link">Mehr erfahren ${arrow}</span></a>`).join('')}</div>`);
}
function appointment() {
  const acute = new URLSearchParams(location.search).has('akut');
  const en=I18n.language==='en',s=data.settings[0],page=pageText('termin');
  const selectedTherapist=data.team.find(t=>t.id===new URLSearchParams(location.search).get('therapist'));
  const fallback=[{title:'Kiefer',titleEn:'Jaw'},{title:'Kopf & Migräne',titleEn:'Headaches & migraine'},{title:'Tinnitus',titleEn:'Tinnitus'},{title:'Schwindel',titleEn:'Dizziness'},{title:'Unfall & OP',titleEn:'Injury & surgery'},{title:'Kindergesundheit',titleEn:"Children's health"},{title:'Logopädie',titleEn:'Speech therapy'},{title:'Massage',titleEn:'Massage'},{title:'Andere Beschwerden',titleEn:'Other concern',custom:true}];
  const configured=Array.isArray(s.appointmentConcerns)&&s.appointmentConcerns.length?s.appointmentConcerns:fallback;
  const concerns=configured.map(item=>({...item}));
  for(const item of fallback.slice(5,8))if(!concerns.some(existing=>existing.title===item.title||existing.titleEn===item.titleEn)){const index=concerns.findIndex(existing=>existing.custom===true);concerns.splice(index<0?concerns.length:index,0,item);}
  const optionTitle=item=>en?(item.titleEn||item.title):item.title;
  return `<section class="container article booking-layout"><div><span class="eyebrow" data-copy-key="eyebrow">${esc(page.eyebrow)}</span><h1 data-copy-key="title">${lines(page.title)}</h1><p class="article-intro" data-copy-key="intro">${esc(page.intro)}</p>${page.body?`<div class="article-body" data-copy-key="body">${paragraph(page.body)}</div>`:''}<div class="booking-note"><h3 data-copy-key="urgentHeading">${esc(page.urgentHeading)}</h3><p>${esc(en&&s.acuteEn?s.acuteEn:s.acute)}</p><a class="text-link" href="tel:${esc(s.phone.replaceAll(' ',''))}">${esc(s.phone)} ↗︎</a></div><p class="fine-print" data-copy-key="finePrint">${esc(page.finePrint)}</p></div><form id="booking-form" class="form-card compact-booking"><h2 data-copy-key="formHeading">${selectedTherapist?(en?'Request an appointment':'Termin anfragen'):esc(page.formHeading)}</h2>${therapistSelection()}<div class="booking-contact-fields"><label class="booking-name">${en?'Your name':'Ihr Name'} *<input name="name" autocomplete="name" required maxlength="100"></label><label>${en?'Email address':'E-Mail-Adresse'} *<input name="email" type="email" autocomplete="email" required maxlength="200"></label><label>${en?'Phone':'Telefon'} *<input name="phone" type="tel" autocomplete="tel" required maxlength="40"></label></div><fieldset class="concern-fieldset"><legend>${en?'What brings you to us?':'Was führt Sie zu uns?'} <span>(${en?'optional':'optional'})</span></legend><p>${en?'Choose one or more.':'Mehrfachauswahl möglich.'}</p><div class="concern-options">${concerns.map(item=>`<label class="concern-chip"><input type="checkbox" name="concern" value="${esc(item.title)}"${item.custom?' data-other="true"':''}><span>${esc(optionTitle(item))}</span></label>`).join('')}</div><div class="custom-symptoms" aria-hidden="true" hidden><label>${en?'Other concern':'Andere Beschwerden'} <span>(${en?'optional':'optional'})</span><textarea name="symptoms" rows="3" maxlength="220" disabled placeholder="${en?'What would you like help with? One or two sentences is enough.':'Wobei dürfen wir helfen? Ein bis zwei Sätze genügen.'}"></textarea></label></div></fieldset><label class="check-label"><input type="checkbox" name="acute" ${acute?'checked':''}> ${en?'I need an urgent appointment.':'Ich brauche einen Akuttermin.'}</label><label class="check-label"><input type="checkbox" name="consent" required> ${en?'I consent to the processing of my contact details and any voluntarily provided health information for handling this request.':'Ich bin mit der Verarbeitung meiner Kontaktdaten und freiwillig angegebenen Gesundheitsinformationen zur Bearbeitung dieser Anfrage einverstanden.'}</label><div class="honeypot" aria-hidden="true"><label>Website<input name="website" tabindex="-1" autocomplete="off"></label></div><p class="form-notice">${en?'We will contact you to arrange a time. This is a request, not a confirmed booking.':'Wir melden uns zur Terminvereinbarung. Dies ist eine Anfrage, noch keine Terminbestätigung.'}</p><button class="button" type="submit">${en?'Send request':'Anfrage senden'} ${arrow}</button><p class="form-message" role="status"></p></form></section>`;
}
function weeklyHours(s){
  const days=[['monday','Montag'],['tuesday','Dienstag'],['wednesday','Mittwoch'],['thursday','Donnerstag'],['friday','Freitag'],['saturdayHours','Samstag'],['sunday','Sonntag']];
  return '<dl class="weekly-hours">'+days.map(([key,label])=>'<div><dt>'+I18n.translate(label)+'</dt><dd>'+esc(s[key]||(key==='saturdayHours'?(s.saturday||'').replace(/^(Samstag|Saturday)\s*/,''):'Nach Vereinbarung'))+'</dd></div>').join('')+'</dl>';
}
function contact() {
  const s=data.settings[0],page=pageText('kontakt');
  const en=I18n.language==='en';
  const query=encodeURIComponent(s.address+', '+s.city+', Austria');
  const directions='https://www.google.com/maps/search/?api=1&query='+query;
  return article(page.title,page.intro,page.body,`<div class="contact-grid"><div class="info-card"><span class="eyebrow" data-copy-key="eyebrow">${esc(page.eyebrow)}</span><h2>${esc(s.address)}</h2><p>${esc(s.city)}</p><a href="tel:${esc(s.phone.replaceAll(' ',''))}">${esc(s.phone)}</a><a href="mailto:${esc(s.email)}">${esc(s.email)}</a><h3 id="oeffnungszeiten" data-copy-key="hoursHeading">${esc(page.hoursHeading)}</h3><p class="hours-intro">${esc(s.hours)}</p>${weeklyHours(s)}<a class="button" href="/termin">${en?'Request a first appointment':'Ersttermin anfragen'} ↗︎</a></div><section class="map-card" aria-label="${I18n.translate('Anfahrt zur Citypraxis')}"><div class="contact-map"><iframe title="${esc(I18n.translate('Google Maps: Citypraxis, Stubenbastei 12/11, 1010 Wien'))}" src="${mapEmbedUrl.replaceAll('&','&amp;')}" loading="eager" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe></div><div class="faq-list map-details"><details><summary data-copy-key="mapHeading">${esc(page.mapHeading)}<span aria-hidden="true">+</span></summary><div class="map-details-copy"><div data-copy-key="detailsBody">${paragraph(page.detailsBody)}</div><p class="map-details-address"><strong>${esc(s.address)} · ${esc(s.city)}</strong></p><a class="button button-outline" href="${esc(directions)}" target="_blank" rel="noopener noreferrer">${en?'Open directions':'Route planen'} ↗︎</a></div></details></div></section></div>`);
}
function route() {
  const path=location.pathname.replace(/\/$/,'')||'/';
  if(path==='/') return home();
  if(path==='/termin') return `<div class="booking-gradient-stage"><canvas id="booking-gradient" class="booking-gradient-canvas" aria-hidden="true"></canvas>${appointment()}</div>`;
  if(path.startsWith('/team/')){
    const therapist=data.team.find(t=>path===`/team/${encodeURIComponent(t.id)}`);
    if(therapist)return therapistPage(therapist);
    return article(I18n.language==='en'?'Profile unavailable':'Profil nicht verfügbar',I18n.language==='en'?'This profile is no longer published.':'Dieses Profil ist nicht mehr veröffentlicht.','',`<a class="button" href="/ueber-uns#team">${I18n.language==='en'?'View team':'Team ansehen'} ${arrow}</a>`);
  }
  if(path==='/kontakt') return contact();
  if(path==='/schwerpunkte') return listing('symptoms');
  if(path==='/leistungen') return listing('services');
  if(path==='/preise'){const page=pageText('preise');return article(page.title,page.intro,page.body,pricesBlock());}
  if(path==='/ablauf-wahltherapie'){
    const page=pageText('ablauf-wahltherapie');
    return article(page?.title||'Private Wahltherapie',page?.intro||'Ihr Weg zur Behandlung','',''+processBlock()+`<div class="clinical-reading" data-copy-key="body">${clinicalBody(page?.body)}</div><a class="button" href="/preise">Preise & Rückerstattung ansehen ↗︎</a>`);
  }
  const parts=path.split('/');
  const collection=parts[1]==='schwerpunkte'?'symptoms':parts[1]==='leistungen'?'services':null;
  if(collection && parts[2]) {
    const item=data[collection].find(i=>i.id===parts[2]);
    if(item) return collection==='services'?servicePage(item):article(item.title,item.intro,item.body,`<a class="button" href="/termin">Ersttermin anfragen ↗︎</a><a class="text-link article-link" href="/leistungen/${esc(item.service||'physiotherapie')}">Zur Behandlung →</a>`);
  }
  const pageId=path==='/ueber-uns'?'about':parts[1];
  const page=data.pages.find(p=>p.id===pageId);
  if(pageId==='about' && page){
    const team=data.team||[];
    const lead=team.find(person=>person.id==='isabella-casny');
    const amanda=team.find(person=>person.id==='amanda-voeltl');
    const sophia=team.find(person=>person.id==='sophia-shivarova');
    const office=team.filter(person=>['team-2','petra'].includes(person.id)||/assistant of the ceo|sekretariat|empfang|reception|secretary/i.test(person.role||''));
    const clinicians=team.filter(person=>person!==lead&&person!==amanda&&person!==sophia&&!office.includes(person));
    const roster=[...clinicians.slice(0,4),...(amanda?[amanda]:[]),...clinicians.slice(4,8),...(sophia?[sophia]:[]),...clinicians.slice(8),...office];
    const copy=pageText('about'),about=aboutBodySections(page.body);
    return article(page.title,page.intro,'',`<section class="team-directory" id="team" aria-label="${I18n.language==='en'?'Citypraxis team':'Citypraxis Team'}"><p class="eyebrow team-directory-label" data-copy-key="teamEyebrow">${esc(copy.teamEyebrow)}</p><div class="team-profiles">${lead?`<div class="team-featured">${teamCard(lead)}</div>`:''}<div class="team-roster">${roster.map(teamCard).join('')}${about.aim?`<section class="team-aim-card">${about.aim}</section>`:''}</div></div></section><div class="clinical-reading about-reading" data-copy-key="body">${about.reading}</div>`);
  }
  if(page) return article(page.title,page.intro,page.body,pageId==='datenschutz'?chatPrivacyInfo():'');
  if(['impressum','datenschutz'].includes(pageId)) return article(pageId==='impressum'?'Impressum':'Datenschutz','Diese Seite wird vor Veröffentlichung vervollständigt.','Dies ist eine lokale Entwicklungsvorschau. Bitte verwenden Sie keine echten Patientendaten.');
  return article('Seite nicht gefunden','Hier geht es zurück zu Ihrer Citypraxis.','', '<a class="button" href="/">Zur Startseite</a>');
}
function chatPrivacyInfo(){
  const en=I18n.language==='en';
  return `<section id="digitaler-empfang" class="article-body" data-no-translate><h2>${en?'Digital reception':'Digitaler Empfang'}</h2><p>${en?'The digital assistant prepares administrative requests for the Citypraxis team. Starting a request is voluntary. With your consent, we process your contact details, your request, availability preferences and any health information you choose to share. Please provide only a short description, without medical reports.':'Der digitale Assistent bereitet organisatorische Anfragen für das Citypraxis-Team vor. Die Nutzung ist freiwillig. Mit Ihrem Einverständnis verarbeiten wir Ihre Kontaktdaten, Ihr Anliegen, Terminwünsche und freiwillig mitgeteilte Gesundheitsangaben. Bitte geben Sie nur eine kurze Beschreibung ohne medizinische Befunde ein.'}</p><p>${en?'The draft is kept in this browser tab and temporarily in server memory for a 30-minute session. A server restart can end the session. It is cleared after submission, restart or session expiry; an expired draft is not restored. Only after you review and send your request are the summary and conversation stored in the existing practice request database (Supabase), accessible to authorized reception staff and owners. Requests can be deleted by the practice. Contact us to withdraw consent or ask about your data; withdrawal does not affect processing already carried out.':'Der Entwurf wird in diesem Browser-Tab und vorübergehend im Arbeitsspeicher des Servers für eine Sitzung von 30 Minuten gespeichert. Ein Serverneustart kann die Sitzung beenden. Nach Absenden, Neustart oder Sitzungsablauf wird er gelöscht; abgelaufene Entwürfe werden nicht wiederhergestellt. Erst nach Ihrer Prüfung und dem Absenden werden Zusammenfassung und Gesprächsverlauf in der bestehenden Praxis-Anfragedatenbank (Supabase) gespeichert. Berechtigte EmpfangsmitarbeiterInnen und InhaberInnen haben Zugriff; die Praxis kann Anfragen löschen. Für Widerruf oder Auskunft zu Ihren Daten kontaktieren Sie uns bitte. Ein Widerruf betrifft nicht die bereits erfolgte Verarbeitung.'}</p><p>${en?'The conversational assistant uses OpenAI to process messages, which may contain health information. Recognized email addresses and phone numbers are removed where possible before transmission; this does not guarantee anonymity. We request that API responses are not stored, but provider security retention may still apply. You can use the appointment form instead. The assistant provides no medical advice and cannot confirm appointments. Please review your summary before submitting.':'Der dialogbasierte Assistent nutzt OpenAI zur Verarbeitung von Nachrichten, die Gesundheitsangaben enthalten können. Erkannte E-Mail-Adressen und Telefonnummern werden vor der Übermittlung nach Möglichkeit entfernt; dies garantiert keine Anonymität. Wir fordern keine Speicherung der API-Antworten an; Sicherheitsaufbewahrung beim Anbieter kann dennoch erfolgen. Alternativ können Sie das Terminformular nutzen. Der Assistent gibt keine medizinische Beratung und bestätigt keine Termine. Bitte prüfen Sie die Zusammenfassung vor dem Absenden.'}</p><p>${en?'When you send a request through the appointment form or chat, its details are stored in Supabase. If email delivery is configured, your contact details, selected concerns, any voluntary health information and contact preferences are also forwarded to the practice’s reception email address through Resend. The email identifies whether you used the general appointment form, a therapist profile or the chatbot. The secretary contacts you by phone or email; submitting a request does not book an appointment. This chat is not continuously monitored and is not an emergency service.':'Wenn Sie eine Anfrage über das Terminformular oder den Chat absenden, werden Ihre Angaben in Supabase gespeichert. Bei eingerichtetem E-Mail-Versand werden außerdem Kontaktdaten, ausgewählte Beschwerden, freiwillige Gesundheitsangaben und Kontaktwünsche über Resend an die Empfangsadresse der Praxis weitergeleitet. Die E-Mail kennzeichnet den Zugang über Erstterminformular, Therapeutenprofil oder Chatbot. Das Sekretariat meldet sich telefonisch oder per E-Mail; eine Anfrage ist keine Terminbuchung. Dieser Chat wird nicht laufend überwacht und ist kein Notfalldienst.'}</p><p>${en?'When email delivery is enabled, we may also send a copy of your submitted request to the email address you provide through Resend. This copy includes the contact details and concerns in your request. Delivery depends on the configured sender; the on-screen submission confirmation remains valid even if the copy cannot be emailed.':'Bei eingerichtetem E-Mail-Versand können wir Ihnen über Resend auch eine Kopie Ihrer abgesendeten Anfrage an die angegebene E-Mail-Adresse senden. Diese Kopie enthält die Kontaktdaten und Anliegen Ihrer Anfrage. Der Versand hängt von der eingerichteten Absenderadresse ab; die Bestätigung auf der Website gilt auch dann, wenn die Kopie nicht per E-Mail zugestellt werden kann.'}</p></section>`;
}
function bind() {
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  const bookingNote=document.querySelector('#main .booking-note');
  if(bookingNote&&matchMedia('(hover: hover) and (pointer: fine)').matches&&!reducedMotion.matches){
    let x=50,y=50,targetX=50,targetY=50,frame=0;
    const pointerPosition=event=>{
      const rect=bookingNote.getBoundingClientRect();
      return [Math.max(0,Math.min(100,(event.clientX-rect.left)/rect.width*100)),Math.max(0,Math.min(100,(event.clientY-rect.top)/rect.height*100))];
    };
    const paint=()=>{
      x+=(targetX-x)*.18;y+=(targetY-y)*.18;
      bookingNote.style.setProperty('--glow-x',`${x}%`);bookingNote.style.setProperty('--glow-y',`${y}%`);
      if(Math.abs(targetX-x)>.15||Math.abs(targetY-y)>.15)frame=requestAnimationFrame(paint);
      else{x=targetX;y=targetY;bookingNote.style.setProperty('--glow-x',`${x}%`);bookingNote.style.setProperty('--glow-y',`${y}%`);frame=0;}
    };
    bookingNote.addEventListener('pointerenter',event=>{
      if(frame)cancelAnimationFrame(frame);
      frame=0;[x,y]=pointerPosition(event);targetX=x;targetY=y;
      bookingNote.style.setProperty('--glow-x',`${x}%`);bookingNote.style.setProperty('--glow-y',`${y}%`);
    });
    bookingNote.addEventListener('pointermove',event=>{
      [targetX,targetY]=pointerPosition(event);
      if(!frame)frame=requestAnimationFrame(paint);
    });
    bookingNote.addEventListener('pointerleave',()=>{if(frame)cancelAnimationFrame(frame);frame=0;targetX=x;targetY=y;});
  }
  const panel=$('.cookie-panel');
  const acknowledgePrivacy=()=>{
    try{localStorage.setItem(privacyPreferenceKey,JSON.stringify({acknowledged:true,updatedAt:new Date().toISOString()}));}catch{}
    panel.hidden=true;
  };
  $('.cookie-settings-link')?.addEventListener('click',()=>{panel.hidden=false;panel.focus?.();});
  $('.cookie-close',panel)?.addEventListener('click',acknowledgePrivacy);
  $('.cookie-acknowledge',panel)?.addEventListener('click',acknowledgePrivacy);
  const priceTabs=[...document.querySelectorAll('[data-price-tab]')];
  const revealPriceAmounts=panel=>{
    if(!panel||panel.hidden||reducedMotion.matches)return;
    const amounts=[...panel.querySelectorAll('.price-amount')];
    amounts.forEach((amount,index)=>{amount.classList.add('price-amount-reveal');amount.classList.remove('is-visible');amount.style.setProperty('--price-delay',`${index*95}ms`);});
    if(!amounts.length)return;
    void panel.offsetHeight;
    requestAnimationFrame(()=>amounts.forEach(amount=>amount.classList.add('is-visible')));
  };
  const selectPriceTab=index=>{priceTabs.forEach((tab,i)=>{const active=i===index;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;$(`#price-panel-${i}`).hidden=!active;});revealPriceAmounts($(`#price-panel-${index}`));};
  priceTabs.forEach((tab,index)=>{tab.addEventListener('click',()=>selectPriceTab(index));tab.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?priceTabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+priceTabs.length)%priceTabs.length;selectPriceTab(next);priceTabs[next].focus();});});
  const priceSection=document.querySelector('#main .price-categories');
  const firstPricePanel=priceSection?.querySelector('.price-category-panel:not([hidden])');
  if(priceSection&&firstPricePanel&&!reducedMotion.matches){
    const amounts=[...firstPricePanel.querySelectorAll('.price-amount')];
    amounts.forEach((amount,index)=>{amount.classList.add('price-amount-reveal');amount.style.setProperty('--price-delay',`${index*95}ms`);});
    const pricesObserver=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){revealPriceAmounts(firstPricePanel);pricesObserver.disconnect();}},{threshold:.18,rootMargin:'0px 0px -4% 0px'});
    pricesObserver.observe(priceSection);
  }
  document.querySelectorAll('.faq-list details').forEach(details=>{
    const summary=details.querySelector(':scope > summary'),content=details.querySelector(':scope > div');
    if(!summary||!content)return;
    summary.addEventListener('click',event=>{
      if(reducedMotion.matches)return;
      event.preventDefault();
      if(details.dataset.animating==='true')return;
      const opening=!details.open,start=details.getBoundingClientRect().height;
      details.dataset.animating='true';
      if(opening)details.open=true;
      const end=opening?details.scrollHeight:summary.getBoundingClientRect().height;
      details.style.overflow='hidden';
      const panel=details.animate({height:[`${start}px`,`${end}px`]},{duration:420,easing:'cubic-bezier(.22,1,.36,1)'});
      content.animate(
        opening?{opacity:[0,1],transform:['translateY(-9px)','translateY(0)']}:{opacity:[1,0],transform:['translateY(0)','translateY(-7px)']},
        {duration:opening?340:220,easing:'cubic-bezier(.22,1,.36,1)',fill:'both'}
      );
      panel.onfinish=()=>{
        details.open=opening;
        details.style.removeProperty('overflow');
        details.style.removeProperty('height');
        delete details.dataset.animating;
        content.getAnimations().forEach(animation=>animation.cancel());
      };
    });
  });
  const video=$('#hero-video');
  if(video) {
    const motion=reducedMotion;
    const parallaxHero=document.body.classList.contains('home-page')?null:$('.hero-video-parallax');
    let parallaxFrame=0;
    const updateVideoParallax=()=>{
      if(parallaxFrame||motion.matches)return;
      parallaxFrame=requestAnimationFrame(()=>{
        parallaxFrame=0;
        const bounds=parallaxHero.getBoundingClientRect();
        if(bounds.bottom<0||bounds.top>innerHeight)return;
        const progress=(innerHeight-bounds.top)/(innerHeight+bounds.height);
        const distance=matchMedia('(max-width: 767px)').matches?10:18;
        parallaxHero.style.setProperty('--hero-video-y',`${((progress-.5)*distance).toFixed(2)}px`);
      });
    };
    if(parallaxHero){window.addEventListener('scroll',updateVideoParallax,{passive:true});window.addEventListener('resize',updateVideoParallax,{passive:true});motion.addEventListener('change',()=>{if(motion.matches)parallaxHero.style.removeProperty('--hero-video-y');else updateVideoParallax();});updateVideoParallax();}
    let inView=false,preparePromise,framePending=false;
    const prepare=()=>new Promise(resolve=>{
      if(!video.getAttribute('src')){
        video.preload='auto';
        video.src=video.dataset.src;
        video.load();
      }
      video.muted=true;
      const finish=()=>{
        const start=Number(video.dataset.startTime)||0;
        if(!start||!Number.isFinite(video.duration)||video.duration<=start){resolve(true);return;}
        video.addEventListener('seeked',()=>resolve(true),{once:true});
        video.currentTime=start;
      };
      if(video.readyState>=video.HAVE_METADATA)finish();
      else video.addEventListener('loadedmetadata',finish,{once:true});
      video.addEventListener('error',()=>resolve(false),{once:true});
    });
    async function play(){
      if(!preparePromise)preparePromise=prepare();
      if(!await preparePromise||!inView||motion.matches||navigator.connection?.saveData)return;
      try{
        await video.play();
        if(video.classList.contains('is-playing')||framePending)return;
        framePending=true;
        const reveal=()=>{framePending=false;if(!video.paused&&video.readyState>=video.HAVE_CURRENT_DATA)video.classList.add('is-playing');};
        if(video.requestVideoFrameCallback)video.requestVideoFrameCallback(reveal);
        else video.addEventListener('timeupdate',reveal,{once:true});
      }catch{}
    }
    video.addEventListener('error',()=>video.classList.remove('is-playing'));
    motion.addEventListener('change',()=>{if(motion.matches){video.pause();video.classList.remove('is-playing');}else if(inView&&!navigator.connection?.saveData)play();});
    new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;if(!inView)video.pause();else if(!motion.matches&&!navigator.connection?.saveData)play();},{threshold:.1}).observe(video);
  }
  const toggle=$('.menu-toggle'), nav=$('#mobile-nav');
  const setMenu=open=>{nav.classList.toggle('is-open',open);nav.inert=!open;nav.setAttribute('aria-hidden',String(!open));toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Menü schließen':'Menü öffnen');};
  toggle.addEventListener('click',()=>setMenu(toggle.getAttribute('aria-expanded')!=='true'));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&toggle.getAttribute('aria-expanded')==='true'){setMenu(false);toggle.focus();}});
  const concernOptions=document.querySelectorAll('input[name="concern"]'),customSymptoms=$('.custom-symptoms'),symptomsInput=$('textarea[name="symptoms"]');
  if(customSymptoms&&symptomsInput){
    let customAnimation=0;
    const toggleCustomSymptoms=show=>{
      if(customSymptoms.getAttribute('aria-hidden')===String(!show))return;
      const run=++customAnimation;
      customSymptoms.getAnimations().forEach(animation=>animation.cancel());
      customSymptoms.style.overflow='hidden';
      customSymptoms.setAttribute('aria-hidden',String(!show));
      symptomsInput.disabled=!show;
      if(reducedMotion.matches){customSymptoms.hidden=!show;customSymptoms.style.removeProperty('overflow');return;}
      if(show){
        customSymptoms.hidden=false;
        const end=customSymptoms.scrollHeight;
        const animation=customSymptoms.animate([{height:'0px',opacity:0,transform:'translateY(-8px)'},{height:`${end}px`,opacity:1,transform:'translateY(0)'}],{duration:430,easing:'cubic-bezier(.22,1,.36,1)'});
        animation.onfinish=()=>{if(run!==customAnimation)return;customSymptoms.style.removeProperty('overflow');customSymptoms.style.removeProperty('height');};
      }else if(!customSymptoms.hidden){
        const start=customSymptoms.getBoundingClientRect().height;
        const animation=customSymptoms.animate([{height:`${start}px`,opacity:1,transform:'translateY(0)'},{height:'0px',opacity:0,transform:'translateY(-6px)'}],{duration:300,easing:'cubic-bezier(.4,0,.2,1)'});
        animation.onfinish=()=>{if(run!==customAnimation)return;customSymptoms.hidden=true;customSymptoms.style.removeProperty('overflow');customSymptoms.style.removeProperty('height');};
      }
    };
    concernOptions.forEach(option=>option.addEventListener('change',()=>toggleCustomSymptoms([...concernOptions].some(input=>input.checked&&input.dataset.other==='true'))));
  }
  const bookingForm=$('#booking-form');
  if(bookingForm){
    const nameInput=bookingForm.elements.namedItem('name');
    const folder=document.createElement('div');
    folder.className='booking-folder';
    folder.setAttribute('aria-hidden','true');
    folder.innerHTML='<strong class="booking-folder-name"></strong>';
    bookingForm.prepend(folder);
    const folderName=$('.booking-folder-name',folder);
    const nameMeasure=document.createElement('canvas').getContext('2d');
    const updateFolder=()=>{
      const name=nameInput.value.trim();
      folderName.textContent=name;
      if(name && nameMeasure){
        nameMeasure.font=getComputedStyle(folderName).font;
        const width=Math.min(bookingForm.clientWidth,Math.max(140,Math.ceil(nameMeasure.measureText(name).width)+104));
        bookingForm.style.setProperty('--booking-folder-width',`${width}px`);
      }
      folder.classList.toggle('is-visible',Boolean(name));
      bookingForm.classList.toggle('has-folder',Boolean(name));
    };
    nameInput.addEventListener('input',updateFolder);
    nameInput.addEventListener('change',updateFolder);
    window.addEventListener('resize',updateFolder);
    updateFolder();
    import('/booking-review.js?v=compact-4').then(({initBookingReview})=>initBookingReview(bookingForm,{english:I18n.language==='en'})).catch(()=>{});
  }
  bookingForm?.addEventListener('submit',async e=>{
    e.preventDefault();const form=e.currentTarget,button=$('button[type=submit]',form),message=$('.form-message',form),fields=new FormData(form);form.dataset.submissionKey||=crypto.randomUUID();button.disabled=true;message.textContent=I18n.language==='en'?'Saving your request…':'Anfrage wird gespeichert …';
    try{const response=await fetch('/api/requests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...Object.fromEntries(fields),concerns:fields.getAll('concern'),language:I18n.language,submissionKey:form.dataset.submissionKey,acute:fields.has('acute'),consent:fields.has('consent')})});const result=await response.json();if(!response.ok)throw new Error(result.error);document.activeElement?.blur?.();form.querySelector('input[name=name]')?.dispatchEvent(new Event('input',{bubbles:true}));const folder=form.querySelector('.booking-folder');form.classList.add('request-confirmation');form.innerHTML=`<div class="success-mark">✓</div><h2>${I18n.language==='en'?'Thank you':'Vielen Dank'}, ${esc(fields.get('name'))}.</h2><p>${esc(result.message)}</p>${result.patientReceipt==='sent'?`<p>${I18n.language==='en'?'We have also emailed a copy of your request to':'Wir haben eine Kopie Ihrer Anfrage auch an'} ${esc(fields.get('email'))}${I18n.language==='en'?'.':' gesendet.'}</p>`:''}<a class="button" href="/">${I18n.language==='en'?'Back to home':'Zur Startseite'} ↗︎</a>`;if(folder)form.prepend(folder);import('/confirmation.js').then(({enhanceConfirmation})=>{enhanceConfirmation(form).catch(()=>{});requestAnimationFrame(()=>requestAnimationFrame(()=>form.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'})));}).catch(()=>{});}catch(error){message.textContent=error.message;button.disabled=false;}
  });
}
const contentCacheKey='citypraxis-public-content-v4',contentCacheLifetime=5*60*1000;
let previewSourceContent;
function renderApp(content,preview){
  landingCleanup?.();
  meshShaderCleanup?.();meshShaderCleanup=null;
  document.body.classList.add('public-page');
  document.body.classList.toggle('home-page',location.pathname==='/');
  document.body.classList.toggle('interior-page',location.pathname!=='/');
  document.body.dataset.page=location.pathname;
  document.body.classList.toggle('team-reveal-enabled',location.pathname==='/ueber-uns'&&!preview&&!matchMedia('(prefers-reduced-motion: reduce)').matches);
  data=I18n.localizeContent(content);
  document.body.classList.toggle('editor-preview-embedded',preview&&window.parent!==window);
  if(preview&&window.parent!==window&&!document.body.dataset.editorPreviewPage)document.body.dataset.editorPreviewPage='true';
  const shaderPreset=location.pathname==='/kontakt'?'contact':location.pathname==='/ueber-uns'?'team':location.pathname==='/'?'landing':['/preise','/ablauf-wahltherapie'].includes(location.pathname)?'interior':null;
  const shaderId=shaderPreset==='contact'?'contact-shader':shaderPreset==='team'?'team-shader':shaderPreset==='landing'?'home-mesh-shader':'interior-mesh-shader';
  const shaderClass=shaderPreset==='contact'?'contact-shader-canvas':shaderPreset==='team'?'contact-shader-canvas team-shader-canvas':shaderPreset==='landing'?'home-mesh-shader':'interior-mesh-shader-canvas';
  const shaderCanvas=shaderPreset?`<canvas id="${shaderId}" class="${shaderClass}" aria-hidden="true"></canvas>`:'';
  $('#app').innerHTML=(preview?'<div class="preview-banner">Entwurfsvorschau · Änderungen sind noch nicht öffentlich. <a href="/admin">Zur Verwaltung ↗︎</a></div>':'')+header()+'<div class="home-surface"><div class="home-atmosphere-background" aria-hidden="true"><div class="home-atmosphere-colors"></div>'+shaderCanvas+'<div class="home-atmosphere-grain"></div></div>'+`<main id="main">${route()}</main>`+footer()+'</div>'+cookiePanel();
  if(location.pathname==='/termin'&&!preview)import('/booking-gradient.js?v=booking-restored-1').then(({initBookingGradient})=>initBookingGradient()).catch(()=>{});
  if(shaderPreset&&!preview){
    const canvas=$(`#${shaderId}`);
    import('/contact-shader.js?v=team-palette-1').then(({initContactShader})=>{
      if(canvas.isConnected)meshShaderCleanup=initContactShader(canvas,{preset:shaderPreset});
    }).catch(()=>canvas.classList.add('is-fallback'));
  }
  if(preview)$('.cookie-panel')?.setAttribute('hidden','');
  I18n.apply();const title=$('h1')?.textContent;document.title=(title?`${title} · `:'')+'Citypraxis Wien';bind();
  landingCleanup=enhanceLanding({preview});
  if(['#team','#oeffnungszeiten','#booking-form'].includes(location.hash))requestAnimationFrame(()=>$(location.hash)?.scrollIntoView({block:location.hash==='#booking-form'?'start':'center'}));
}
async function loadContent(preview){
  const response=await fetch(preview?'/api/admin/content':'/api/content');
  if(!response.ok)throw new Error(preview?'Für die Entwurfsvorschau bitte als Editor anmelden.':'Inhalte konnten nicht geladen werden.');
  return response.json();
}
async function boot(){
  const fragment=new URLSearchParams(location.hash.slice(1)),query=new URLSearchParams(location.search);
  if(fragment.get('type')==='recovery'||query.get('type')==='recovery'||fragment.has('error')||query.has('error')||query.has('token_hash')){location.replace(`/admin${location.search}${location.hash}`);return;}
  const preview=new URLSearchParams(location.search).has('preview');
  try{
    let cached;
    if(!preview)try{const stored=JSON.parse(sessionStorage.getItem(contentCacheKey));if(stored&&Date.now()-stored.savedAt<contentCacheLifetime)cached=stored.content;}catch{}
    if(cached){
      renderApp(cached,false);
      loadContent(false).then(content=>{try{sessionStorage.setItem(contentCacheKey,JSON.stringify({savedAt:Date.now(),content}));}catch{}if(JSON.stringify(content)!==JSON.stringify(cached))renderApp(content,false);}).catch(()=>{});
      return;
    }
    const content=await loadContent(preview);
    if(preview)previewSourceContent=content;
    if(!preview)try{sessionStorage.setItem(contentCacheKey,JSON.stringify({savedAt:Date.now(),content}));}catch{}
    renderApp(content,preview);
    if(preview&&window.parent!==window)window.parent.postMessage({type:'citypraxis-editor-ready',pagePath:location.pathname},location.origin);
  }catch(error){$('#app').innerHTML=`<main class="loading"><h1>Wir sind gleich wieder für Sie da.</h1><p>${esc(error.message)}</p><a href="/">Erneut versuchen</a></main>`;}
}
if(new URLSearchParams(location.search).has('preview'))window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.data?.type!=='citypraxis-editor-preview'||!previewSourceContent)return;
  const {pageId,pagePath,values,key}=event.data;
  if(typeof pageId!=='string'||!/^[a-z0-9-]+$/.test(pageId)||typeof pagePath!=='string'||!pagePath.startsWith('/')||!values||typeof values!=='object')return;
  const onEditedPage=(location.pathname.replace(/\/$/,'')||'/')===(pagePath.replace(/\/$/,'')||'/');
  document.body.dataset.editorPreviewPage=String(onEditedPage);
  if(!onEditedPage)return;
  const source=structuredClone(previewSourceContent);
  source.pages||=[];
  let page=source.pages.find(item=>item.id===pageId);
  if(!page){page={id:pageId};source.pages.push(page);}
  for(const [field,value] of Object.entries(values))if(/^[a-zA-Z][a-zA-Z0-9]*$/.test(field)&&typeof value==='string')page[field]=value;
  renderApp(source,true);
  const marker=[...document.querySelectorAll('[data-copy-key]')].find(node=>node.dataset.copyKey===key);
  if(marker){marker.classList.add('admin-preview-highlight');marker.closest('details')?.setAttribute('open','');marker.scrollIntoView({block:'center',behavior:'instant'});}
});
if(new URLSearchParams(location.search).has('preview'))document.addEventListener('click',event=>{
  if(window.parent===window)return;
  event.preventDefault();event.stopImmediatePropagation();
  const marker=event.target.closest('[data-copy-key]');
  if(marker&&document.body.dataset.editorPreviewPage==='true'&&window.parent!==window){event.preventDefault();window.parent.postMessage({type:'citypraxis-editor-select',pagePath:location.pathname,key:marker.dataset.copyKey},location.origin);}
},true);
if(new URLSearchParams(location.search).has('preview'))document.addEventListener('mouseup',()=>{
  if(window.parent===window||document.body.dataset.editorPreviewPage!=='true')return;
  const selection=window.getSelection();
  if(!selection?.toString().trim())return;
  const markerFor=node=>(node?.nodeType===Node.ELEMENT_NODE?node:node?.parentElement)?.closest('[data-copy-key]');
  const anchor=markerFor(selection.anchorNode);
  const focus=markerFor(selection.focusNode);
  if(anchor&&anchor===focus)window.parent.postMessage({type:'citypraxis-editor-select',pagePath:location.pathname,key:anchor.dataset.copyKey},location.origin);
},true);
if(new URLSearchParams(location.search).has('preview'))document.addEventListener('submit',event=>{if(window.parent!==window){event.preventDefault();event.stopImmediatePropagation();}},true);
boot();
