const $ = (selector, root = document) => root.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const externalUrl=value=>{try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)?url.href:'';}catch{return '';}};
const headingId=value=>/^cookies\b/i.test(String(value||''))?'cookies':String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
const paragraph = text => String(text || '').split('\n\n').filter(t=>t.trim()).map(t => {
  const lines=t.split('\n'),heading=lines[0],rest=lines.slice(1).join('\n').trim();
  if(heading.startsWith('### '))return `<h3 id="${headingId(heading.slice(4))}">${esc(heading.slice(4))}</h3>${rest?`<p>${esc(rest).replaceAll('\n','<br>')}</p>`:''}`;
  if(heading.startsWith('## '))return `<h2 id="${headingId(heading.slice(3))}">${esc(heading.slice(3))}</h2>${rest?`<p>${esc(rest).replaceAll('\n','<br>')}</p>`:''}`;
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
  const links = [['/leistungen','Therapien'],['/schwerpunkte','Schwerpunkte'],['/ueber-uns','Team'],['/preise','Preise'],['/ablauf-wahltherapie','Ablauf'],['/kontakt','Kontakt']].map(([url,label])=>`<a href="${url}"${location.pathname===url?' aria-current="page"':url==='/ueber-uns'&&location.pathname.startsWith('/team/')?' aria-current="location"':''}>${label}</a>`).join('');
  return `<div class="topline"><div class="container"><span>Mitten in Wien. Ganz bei Ihnen.</span><a href="/kontakt">Stubenbastei 12 · 1010 Wien ${arrow}</a></div></div>
  <header class="header"><div class="container header-inner"><a href="/" class="brand" aria-label="Citypraxis Startseite"><img class="brand-symbol" src="/assets/logo-symbol.png" alt="" width="31" height="40"><img class="brand-wordmark" src="/assets/wordmark-black.png" alt="Citypraxis" width="218" height="29"></a><nav class="desktop-nav" aria-label="Hauptnavigation">${links}</nav><a class="button header-cta" href="/termin">Ersttermin buchen ${arrow}</a>${I18n.toggle()}<button class="menu-toggle" aria-expanded="false" aria-controls="mobile-nav" aria-label="Menü öffnen"><span></span><span></span></button></div><nav id="mobile-nav" class="mobile-nav" aria-label="Mobile Navigation" aria-hidden="true" inert><div class="mobile-nav-inner">${links}<a href="/termin">Ersttermin buchen ${arrow}</a></div></nav></header>`;
}
function footer() {
  const s = data.settings[0];
  const c=privacyCopy();
  return `<footer><div class="container footer-top"><div><img class="footer-logo" src="/assets/wordmark-black.png" alt="Citypraxis" width="250" height="34"><img class="footer-symbol" src="/assets/logo-symbol.png" alt="" width="38" height="49"><p>Gemeinsam weiterkommen.<br>Mitten in Wien.</p></div><div><h3>Besuchen Sie uns</h3><p>${esc(s.address)}<br>${esc(s.city)}</p><a href="https://www.google.com/maps/search/?api=1&query=Stubenbastei+12+1010+Wien" target="_blank" rel="noopener">Route planen ↗︎</a></div><div><h3>Wir sind für Sie da</h3><a href="tel:${esc(s.phone.replaceAll(' ',''))}">${esc(s.phone)}</a><a href="mailto:${esc(s.email)}">${esc(s.email)}</a><p>${esc(s.hours)}<br>${esc(s.saturdayHours?I18n.translate('Samstag')+' '+s.saturdayHours:s.saturday)}</p></div><div><h3>Gut zu wissen</h3><a href="/ablauf-wahltherapie">Ablauf & Wahltherapie</a><a href="/leistungen">Unsere Leistungen</a><p>${esc(s.payment)}</p></div></div><div class="container footer-bottom"><span>© ${new Date().getFullYear()} Citypraxis Wien</span><div><a href="/impressum">Impressum</a><a href="/datenschutz">Datenschutz</a><button class="cookie-settings-link" type="button">${c.settings}</button><a href="/admin">Praxis-Login ↗︎</a></div></div></footer><div class="mobile-booking"><a href="tel:${esc(s.phone.replaceAll(' ',''))}">Anrufen</a><a class="button" href="/termin">Ersttermin buchen ${arrow}</a></div>`;
}
function processBlock() {
  const steps = [['Verordnung','Klären Sie die ärztliche Verordnung vor Ihrem ersten Termin.'],['Behandlung','Wir hören zu, untersuchen und planen gemeinsam Ihre Therapie.'],['Bezahlung','Sie bezahlen vor Ort und erhalten Ihre Rechnung.'],['Rückerstattung','Reichen Sie die Unterlagen bei Ihrer Versicherung ein.']];
  return `<ol class="process-grid">${steps.map(([title,text],i)=>`<li><div class="step-top"><span>0${i+1}</span>${i<3 ? '<span class="step-arrow" aria-hidden="true">→</span>':''}</div><h3>${title}</h3><p>${text}</p></li>`).join('')}</ol>`;
}
function faqs() { return `<div class="faq-list">${data.faqs.map(f=>`<details><summary>${esc(f.title)}<span aria-hidden="true">+</span></summary><div>${paragraph(f.body)}</div></details>`).join('')}</div>`; }
function heroMarkup(h,s) {
  const video=h.heroMedia==='video' && h.video;
  return `<section class="hero hero-immersive hero-${esc(h.heroHeight||'fullscreen')} overlay-${esc(h.heroOverlay||'balanced')} focus-${esc(h.heroPosition||'center')} mobile-focus-${esc(h.heroMobilePosition||'center')}" aria-label="Willkommen in der Citypraxis">
    <div class="hero-media"><img class="hero-backdrop" src="${esc(optimizedImage(h.image))}" alt="${esc(h.heroAlt||'Einblicke in die Citypraxis Wien')}" fetchpriority="high" decoding="async">${video?`<video id="hero-video" class="hero-background-video" data-src="${esc(h.video)}" poster="${esc(optimizedImage(h.image))}" muted loop playsinline preload="none" aria-hidden="true" tabindex="-1"></video>`:''}</div>
    <div class="hero-shade"></div><div class="container hero-stage"><div class="hero-copy"><span class="eyebrow"><span class="tiny-line"></span>${esc(h.eyebrow)}</span><h1>${esc(h.title)}<br><span>${esc(h.subtitle)}</span></h1><p>${esc(h.intro)}</p><div class="hero-actions"><a class="button" href="/termin">Ersttermin buchen ${arrow}</a><a class="urgent-button" href="/termin?akut=1"><span class="availability ${s.acuteAvailable?'is-available':''}"></span>Akuttermin anfragen ${arrow}</a></div></div><div class="hero-bottom">${video?'<button class="video-toggle" id="video-toggle" aria-label="Hintergrundvideo abspielen">Video abspielen ▷</button>':''}</div></div>
  </section>`;
}
function therapyCard(s) {
  return `<a class="therapy-card" href="/leistungen/${esc(s.id)}">${s.image?`<div class="therapy-card-media"><img src="${esc(optimizedImage(s.image))}" alt="" loading="lazy" decoding="async"></div>`:''}<div class="therapy-card-copy"><h3>${esc(s.title)}</h3><span class="text-link">Behandlung kennenlernen ${arrow}</span></div></a>`;
}
function home() {
  const h = data.pages.find(p=>p.id==='home'), s = data.settings[0];
  const therapies = ['physiotherapie','osteopathie','logopaedie','heilmassage'].map(id=>data.services.find(item=>item.id===id)).filter(Boolean);
  return `${heroMarkup(h,s)}
  <nav class="quick-links container" aria-label="Direkt zum Anliegen">
    <a href="tel:${esc(s.phone.replaceAll(' ',''))}"><img class="quick-icon" src="/assets/icons/phone.svg" alt="" width="48" height="48"><div><strong>${esc(s.phone)}</strong><span>Persönlich für Sie da</span></div></a>
    <a href="/leistungen"><img class="quick-icon" src="/assets/icons/lotus.svg" alt="" width="48" height="48"><div><strong>Unsere Therapien</strong><span>Die passende Behandlung finden</span></div></a>
    <a href="/preise"><img class="quick-icon" src="/assets/icons/euro.svg" alt="" width="48" height="48"><div><strong>Preise & Rückerstattung</strong><span>Kosten verständlich erklärt</span></div></a>
    <a href="/kontakt"><img class="quick-icon" src="/assets/icons/pin.svg" alt="" width="48" height="48"><div><strong>1010 Wien</strong><span>${esc(s.address)}</span></div></a>
  </nav>
  <section class="section container" id="therapien"><div class="section-heading"><div><span class="eyebrow">UNSERE THERAPIEN</span><h2>Vier Fachrichtungen.<br>Gemeinsam für Sie.</h2></div><a class="text-link" href="/leistungen">Alle Behandlungen ${arrow}</a></div><div class="therapy-grid">${therapies.map(therapyCard).join('')}</div></section>
  ${h.teamImage?`<section class="container team-feature" aria-labelledby="team-feature-title"><img class="team-group-photo" src="${esc(optimizedImage(h.teamImage))}" alt="${esc(h.teamImageAlt||'Team-Gruppenfoto')}" loading="lazy" decoding="async" width="1299" height="870"><div class="team-feature-copy"><span class="eyebrow">DIE MENSCHEN IN DER CITYPRAXIS</span><h2 id="team-feature-title">Ihr Team. An Ihrer Seite.</h2><p>Physiotherapie, Osteopathie, Logopädie und Heilmassage. Gemeinsam für Sie.</p><a class="text-link" href="/ueber-uns">Das gesamte Team ${arrow}</a></div></section>`:''}
  ${reviewsSection()}
  <section class="container cost-overview"><div><span class="eyebrow">PREISE & WAHLTHERAPIE</span><h2>Was kostet<br>meine Behandlung?</h2><p>Informationen zu Praxispreisen und zur Rückerstattung durch Ihre Krankenkasse finden Sie an einem Ort.</p><a class="button button-outline" href="/preise">Preise & Rückerstattung ${arrow}</a></div><div><h3>Fragen vor dem ersten Termin</h3>${faqs()}</div></section>
  `;
}
function article(title,intro,body,extra='') { return `<section class="container article"><a class="breadcrumb" href="/">Startseite /</a><span class="eyebrow">CITYPRAXIS WIEN</span><h1>${esc(title)}</h1><p class="article-intro">${esc(intro)}</p><div class="article-body">${paragraph(body)}</div>${extra}</section>`; }
function clinicalBody(body){return String(body||'').split(/\n\n(?=## )/).map((part,i)=>`<section class="clinical-card" id="abschnitt-${i}">${paragraph(part)}</section>`).join('');}
function clinicalContents(body){
  const sections=String(body||'').split(/\n\n(?=## )/).map((part,i)=>({title:part.startsWith('## ')?part.split('\n')[0].slice(3):'Über die Behandlung',id:'abschnitt-'+i}));
  return sections.length>1?'<nav class="clinical-contents" aria-label="Auf dieser Seite"><strong>Auf dieser Seite</strong>'+sections.map(section=>'<a href="#'+section.id+'">'+esc(section.title)+'</a>').join('')+'</nav>':'';
}
function servicePage(item){
  const related=(item.related||'').split(',').map(id=>data.services.find(s=>s.id===id)).filter(Boolean);
  return `<section class="container article service-article"><a class="breadcrumb" href="/leistungen">Leistungen / ${esc(item.title)}</a><div class="service-intro"><div><span class="eyebrow">${esc(item.tag||'CITYPRAXIS WIEN')}</span><h1>${esc(item.title)}</h1><p>${esc(item.intro)}</p></div>${item.image?`<img src="${esc(optimizedImage(item.image))}" alt="${esc(item.title)} in der Citypraxis" fetchpriority="high" decoding="async">`:''}</div>${clinicalContents(item.body)?`<details class="mobile-contents"><summary>Auf dieser Seite</summary>${clinicalContents(item.body)}</details>`:''}<div class="clinical-layout"><div class="clinical-text">${clinicalBody(item.body)}${item.methods?`<div class="faq-list">${item.methods.split('\n').filter(Boolean).map(m=>{const [title,...text]=m.split('|');return `<details><summary>${esc(title)}<span>+</span></summary><div>${paragraph(text.join('|'))}</div></details>`;}).join('')}</div>`:''}${related.length?`<section class="clinical-card"><h2>Behandlungskonzepte entdecken</h2><div class="related-links">${related.map(r=>`<a href="/leistungen/${esc(r.id)}">${esc(r.title)} ↗︎</a>`).join('')}</div></section>`:''}</div><aside class="clinical-aside">${clinicalContents(item.body)}<span class="eyebrow">WIR SIND FÜR SIE DA</span><h2>Ihr nächster Schritt.</h2><p>Vereinbaren Sie Ihren Ersttermin in der Citypraxis.</p><a class="button" href="/termin">Ersttermin anfragen ↗︎</a><a class="text-link" href="/ablauf-wahltherapie">Ablauf & Wahltherapie →</a><a class="text-link" href="/preise">Preise & Rückerstattung →</a></aside></div></section>`;
}
function pricesBlock(){
  const en=I18n.language==='en',groups=[];
  for(const item of data.prices){const category=item.category|| (en?'Other':'Weitere');let group=groups.find(entry=>entry.category===category);if(!group){group={category,items:[]};groups.push(group);}group.items.push(item);}
  const tabs=groups.map((group,index)=>`<button id="price-tab-${index}" role="tab" aria-selected="${index===0}" aria-controls="price-panel-${index}" tabindex="${index===0?'0':'-1'}" data-price-tab="${index}">${esc(group.category)}</button>`).join('');
  const panels=groups.map((group,index)=>`<section id="price-panel-${index}" class="price-category-panel" role="tabpanel" aria-labelledby="price-tab-${index}"${index?' hidden':''}><div class="reimbursement-wrap"><table class="reimbursement-table price-table"><caption>${esc(group.category)}</caption><thead><tr><th scope="col">${en?'Treatment':'Behandlung'}</th><th scope="col">${en?'Appointment / duration':'Termin / Dauer'}</th><th scope="col">${en?'Price':'Preis'}</th></tr></thead><tbody>${group.items.map(item=>`<tr><th scope="row"><strong>${esc(item.title)}</strong>${item.details?`<small>${esc(item.details)}</small>`:''}</th><td>${esc(item.duration||'')}</td><td>${item.amount?`${esc(item.amount)} €`:''}</td></tr>`).join('')}</tbody></table></div></section>`).join('');
  return `<section class="clinical-card price-categories"><span class="eyebrow">${en?'PRICE LIST 2026':'PREISLISTE 2026'}</span><h2>${en?'Practice prices':'Praxispreise'}</h2><div class="price-category-tabs" role="tablist" aria-label="${en?'Price categories':'Preiskategorien'}">${tabs}</div>${panels}<aside class="private-practice-note"><strong>${en?'Private practitioners · no direct insurance contracts':'WahltherapeutInnen · keine Kassen'}</strong><span>${en?'Appointments by arrangement only':'Termine nur nach Vereinbarung'}</span></aside><p class="price-footnote">${en?'The stated times cover the total time for your appointment, including the preliminary conversation, changing and resting afterwards. The effective treatment time may therefore differ. Prices dated 12 January 2026; changes and errors excepted.':'Die angegebenen Zeiten umfassen den gesamten Zeitaufwand Ihres Termins einschließlich Vorgespräch, Umziehen und Nachruhen. Die effektive Behandlungszeit kann daher abweichen. Preisliste Stand 12. Januar 2026 – Änderungen und Irrtümer vorbehalten.'}</p></section><section class="clinical-card"><span class="eyebrow">RÜCKERSTATTUNG DURCH DIE KRANKENKASSE</span><h2>Rückerstattungstarife</h2><p class="source-date">Stand der übernommenen Tabelle: ${esc(data.reimbursements[0]?.asOf||'04/2023')} – alle Angaben ohne Gewähr. Diese Beträge sind Rückerstattungen, keine Behandlungspreise. Aktuelle Beträge bitte bei Ihrer Versicherung prüfen.</p><div class="reimbursement-wrap"><table class="reimbursement-table"><caption>Rückerstattung laut bisheriger Praxiswebsite</caption><thead><tr><th scope="col">Leistung</th><th scope="col">ÖGKK</th><th scope="col">BVAEB</th><th scope="col">KFA</th><th scope="col">SVS</th></tr></thead><tbody>${data.reimbursements.map(r=>`<tr><th scope="row">${esc(r.title)}</th>${['oegkk','bvaeb','kfa','svs'].map(k=>`<td>${esc(r[k])}${r[k]&&r[k]!=='–'?' €':''}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>`;
}
function teamThumbnail(t){
  return `<a class="team-thumbnail" href="${esc(teamPath(t))}" aria-label="${esc(t.title)} – Team ansehen${t.placeholder||t.fictional?' (Beispielprofil)':''}">${t.image?`<img src="${esc(optimizedImage(t.image))}" alt="" loading="lazy" decoding="async">`:'<span class="thumbnail-empty" aria-hidden="true"></span>'}</a>`;
}
function reviewStars(value){
  const rating=Number(value);
  return Number.isInteger(rating)&&rating>=1&&rating<=5?`<div class="review-stars" role="img" aria-label="${rating} von 5 Sternen"><span aria-hidden="true">${'★'.repeat(rating)}<span class="review-stars-empty">${'☆'.repeat(5-rating)}</span></span></div>`:'';
}
function reviewsSection(){
  const reviews=(data.reviews||[]).filter(r=>r.body?.trim()),settings=data.settings[0];
  return `<section class="section container reviews-section"><div class="section-heading"><div><span class="eyebrow">ERFAHRUNGEN MIT DER CITYPRAXIS</span><h2>${esc(settings.reviewsTitle||'Stimmen aus der Praxis.')}</h2>${settings.reviewsIntro?`<p>${esc(settings.reviewsIntro)}</p>`:''}</div>${reviews.length?'':'<p>Bewertungen folgen in Kürze.</p>'}</div><div class="reviews-grid">${reviews.length?reviews.map(r=>{const sourceUrl=externalUrl(r.sourceUrl);return `<figure class="review-card"><div class="review-top">${reviewStars(r.rating)}<span class="review-quote" aria-hidden="true">“</span></div><blockquote>${paragraph(r.body)}</blockquote><figcaption><span class="review-avatar" aria-hidden="true">${esc(r.title?.trim().charAt(0)||'•')}</span><div><strong>${esc(r.title)}</strong>${r.source?(sourceUrl?`<a class="review-source" href="${esc(sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(r.source)} ↗︎</a>`:`<span>${esc(r.source)}</span>`):''}</div></figcaption></figure>`;}).join(''):[1,2,3].map(()=>'<div class="review-card review-placeholder"><div class="review-top"><span class="review-stars review-stars-empty" aria-label="Sterne-Platzhalter, noch keine Bewertung">☆☆☆☆☆</span><span class="review-quote" aria-hidden="true">“</span></div><span class="eyebrow">BEWERTUNGS-VORSCHAU</span><p>Hier erscheint eine freigegebene Bewertung aus unserer Praxis.</p><div class="review-placeholder-footer"><span class="review-avatar" aria-hidden="true">+</span><span>Name und Quelle der Bewertung</span></div></div>').join('')}</div></section>`;
}

const teamPath=t=>`/team/${encodeURIComponent(t.id)}${new URLSearchParams(location.search).has('preview')?'?preview=1':''}`;
function teamCard(t){
  return `<article class="team-person"><a class="team-profile-link" href="${esc(teamPath(t))}" aria-labelledby="team-name-${esc(t.id)}"><div class="team-portrait">${t.image?`<img class="team-photo" src="${esc(optimizedImage(t.image))}" alt="" loading="lazy" decoding="async" width="360" height="360">`:'<div class="team-no-photo" aria-hidden="true">CP</div>'}</div><div class="team-card-copy"><h3 id="team-name-${esc(t.id)}">${esc(t.title)}</h3><p class="team-role">${esc(t.role).replaceAll(' / ','<br>').replaceAll(' · ','<br>')}</p><span class="team-profile-prompt">${I18n.language==='en'?'View profile':'Profil ansehen'} ${arrow}</span></div></a></article>`;
}
function therapistPage(t){
  const en=I18n.language==='en';
  const booking=`/termin?therapist=${encodeURIComponent(t.id)}`;
  const section=(title,text)=>text?`<section class="therapist-section"><h2>${title}</h2>${paragraph(text)}</section>`:'';
  return `<article class="container therapist-profile"><nav class="profile-breadcrumb" aria-label="${en?'Breadcrumb':'Brotkrümelnavigation'}"><a class="text-link" href="/ueber-uns#team">${en?'Back to the team':'Zurück zum Team'}</a><span aria-hidden="true">/</span><span>${esc(t.title)}</span></nav><div class="therapist-hero"><div class="therapist-photo-frame">${t.image?`<img src="${esc(optimizedImage(t.image))}" alt="${esc(t.title)}" width="720" height="900" fetchpriority="high" decoding="async">`:'<div class="therapist-photo-empty" aria-hidden="true">CP</div>'}</div><div class="therapist-intro"><span class="eyebrow">CITYPRAXIS · ${en?'YOUR TEAM':'IHR TEAM'}</span><h1>${esc(t.title)}</h1><p class="therapist-role">${esc(t.role)}</p>${t.qualifications?`<p class="therapist-qualifications">${esc(t.qualifications)}</p>`:''}${t.body?`<div class="therapist-bio">${paragraph(t.body)}</div>`:''}<a class="button therapist-book" href="${booking}">${en?'Request an appointment':'Termin anfragen'} ${arrow}</a><p class="therapist-book-note">${en?'Your chosen therapist is already selected in the form.':'Im Formular ist Ihre gewünschte Betreuung bereits ausgewählt.'}</p>${t.phone||t.email?`<div class="therapist-contact">${t.phone?`<a class="text-link" href="tel:${esc(t.phone.replaceAll(' ',''))}">${esc(t.phone)}</a>`:''}${t.email?`<a class="text-link" href="mailto:${esc(t.email)}">${esc(t.email)}</a>`:''}</div>`:''}</div></div><div class="therapist-details">${section(en?'Treatment focus':'Behandlungsschwerpunkte',t.specialties)}${section(en?'Therapies & methods':'Angebot & Methoden',t.methods)}${section(en?'Professional background':'Beruflicher Werdegang',t.career)}</div><div class="therapist-profile-end"><a class="text-link" href="/ueber-uns#team">${en?'Meet the whole team':'Das gesamte Team kennenlernen'} ${arrow}</a><a class="button" href="${booking}">${en?'Request an appointment':'Termin anfragen'} ${arrow}</a></div></article>`;
}
function therapistSelection(){
  const en=I18n.language==='en',requested=new URLSearchParams(location.search).get('therapist'),selected=data.team.find(t=>t.id===requested);
  return `<fieldset class="therapist-picker"><legend>${en?'Your preferred therapist':'Ihre gewünschte Betreuung'}</legend><div class="therapist-choice"><div class="therapist-choice-portrait" aria-hidden="true">${selected?.image?`<img src="${esc(optimizedImage(selected.image))}" alt="" width="64" height="76">`:'<span>CP</span>'}</div><div class="therapist-choice-control"><label for="therapist-choice">${en?'Choose or change therapist':'TherapeutIn auswählen oder ändern'}</label><select id="therapist-choice" name="therapistId"><option value="">${en?'No preference — please advise me':'Keine Präferenz – bitte beraten Sie mich'}</option>${data.team.map(t=>`<option value="${esc(t.id)}"${selected?.id===t.id?' selected':''}>${esc(t.title)}</option>`).join('')}</select><p class="therapist-choice-role" aria-live="polite">${esc(selected?.role||'')}</p></div></div><p class="therapist-choice-note">${requested&&!selected?(en?'This profile is no longer available. Please choose another therapist or leave your preference open.':'Dieses Profil ist nicht mehr verfügbar. Bitte wählen Sie eine andere Person oder lassen Sie die Auswahl offen.'):(en?'We will confirm availability personally.':'Wir bestätigen die Verfügbarkeit persönlich.')}</p></fieldset>`;
}
function listing(kind) {
  const symptoms = kind === 'symptoms';
  return article(symptoms?'Was führt Sie zu uns?':'Unsere Leistungen',symptoms?'Finden Sie einen ersten Einblick in unsere Schwerpunkte.':'Vier Fachrichtungen, ergänzt durch Bewegung in der Gruppe.','',`<div class="listing-grid ${symptoms?'symptom-listing':'service-listing'}">${data[kind].map(s=>`<a class="listing-card" href="/${symptoms?'schwerpunkte':'leistungen'}/${esc(s.id)}">${symptoms?icon(s.icon):'<span class="eyebrow">'+esc(s.tag)+'</span>'}<h2>${esc(s.title)}</h2><p>${esc(s.intro)}</p><span class="text-link">Mehr erfahren ${arrow}</span></a>`).join('')}</div>`);
}
function appointment() {
  const acute = new URLSearchParams(location.search).has('akut');
  const en=I18n.language==='en',s=data.settings[0];
  const fallback=[{title:'Kiefer',titleEn:'Jaw'},{title:'Kopf & Migräne',titleEn:'Headaches & migraine'},{title:'Tinnitus',titleEn:'Tinnitus'},{title:'Schwindel',titleEn:'Dizziness'},{title:'Unfall & OP',titleEn:'Injury & surgery'},{title:'Andere Beschwerden',titleEn:'Other concern',custom:true}];
  const concerns=Array.isArray(s.appointmentConcerns)&&s.appointmentConcerns.length?s.appointmentConcerns:fallback;
  const optionTitle=item=>en?(item.titleEn||item.title):item.title;
  return `<section class="container article booking-layout"><div><span class="eyebrow">${en?'THE FIRST STEP':'DER ERSTE SCHRITT'}</span><h1>${en?'We are glad<br>you found us.':'Schön, dass Sie<br>zu uns finden.'}</h1><p class="article-intro">${en?'Tell us when you would like to come. We will contact you personally to arrange your first appointment.':'Teilen Sie uns Ihren Terminwunsch mit. Wir melden uns persönlich, um Ihren ersten Termin abzustimmen.'}</p><div class="booking-note"><h3>${en?'Need an urgent appointment?':'Akuttermin benötigt?'}</h3><p>${esc(en&&s.acuteEn?s.acuteEn:s.acute)}</p><a class="text-link" href="tel:${esc(s.phone.replaceAll(' ',''))}">${esc(s.phone)} ↗︎</a></div><p class="fine-print">${en?'Your request is not yet an appointment confirmation. Please do not send medical reports or detailed sensitive health information.':'Die Anfrage ist noch keine Terminbestätigung. Bitte übermitteln Sie keine medizinischen Befunde oder detaillierten sensiblen Gesundheitsangaben.'}</p></div><form id="booking-form" class="form-card"><h2>${en?'Request a first appointment':'Ersttermin anfragen'}</h2>${therapistSelection()}<fieldset class="concern-fieldset"><legend>${en?'What brings you to us?':'Was führt Sie zu uns?'} <span>(${en?'optional':'optional'})</span></legend><p>${en?'Choose the closest category. A rough selection is enough.':'Wählen Sie die passendste Kategorie. Eine ungefähre Auswahl genügt.'}</p><div class="concern-options">${concerns.map(item=>`<label class="concern-chip"><input type="radio" name="concern" value="${esc(optionTitle(item))}"${item.custom?' data-other="true"':''}><span>${esc(optionTitle(item))}</span></label>`).join('')}</div><div class="custom-symptoms" aria-hidden="true" hidden><label>${en?'Briefly describe your concern':'Beschreiben Sie Ihr Anliegen kurz'} <span>(${en?'optional':'optional'})</span><textarea name="symptoms" rows="3" maxlength="220" disabled placeholder="${en?'A short description is enough. Please do not include reports or diagnoses.':'Eine kurze Beschreibung genügt. Bitte keine Befunde oder Diagnosen eintragen.'}"></textarea></label></div></fieldset><label>${en?'Your name':'Ihr Name'}<input name="name" autocomplete="name" required maxlength="100"></label><label>${en?'Email address':'E-Mail-Adresse'}<input name="email" type="email" autocomplete="email" required maxlength="200"></label><label>${en?'Phone':'Telefon'} <span>(${en?'optional':'optional'})</span><input name="phone" type="tel" autocomplete="tel" maxlength="40"></label><label>${en?'When can we best reach you?':'Wann sind Sie gut erreichbar?'}<textarea name="preference" rows="3" maxlength="300" placeholder="${en?'For example: afternoons after 2 pm':'Zum Beispiel: nachmittags ab 14 Uhr'}"></textarea></label><label class="check-label"><input type="checkbox" name="acute" ${acute?'checked':''}> ${en?'I would like to request an urgent appointment.':'Ich möchte einen Akuttermin anfragen.'}</label><label class="check-label"><input type="checkbox" name="consent" required> ${en?'I consent to the processing of my contact details and any voluntarily provided health information for handling this request.':'Ich bin mit der Verarbeitung meiner Kontaktdaten und freiwillig angegebenen Gesundheitsinformationen zur Bearbeitung dieser Anfrage einverstanden.'}</label><div class="honeypot" aria-hidden="true"><label>Website<input name="website" tabindex="-1" autocomplete="off"></label></div><p class="form-notice">${en?'Your data is transmitted securely and used only to process this request.':'Ihre Daten werden sicher übertragen und ausschließlich zur Bearbeitung dieser Anfrage verwendet.'}</p><button class="button" type="submit">${en?'Send request':'Anfrage senden'} ${arrow}</button><p class="form-message" role="status"></p></form></section>`;
}
function weeklyHours(s){
  const days=[['monday','Montag'],['tuesday','Dienstag'],['wednesday','Mittwoch'],['thursday','Donnerstag'],['friday','Freitag'],['saturdayHours','Samstag'],['sunday','Sonntag']];
  return '<dl class="weekly-hours">'+days.map(([key,label])=>'<div><dt>'+I18n.translate(label)+'</dt><dd>'+esc(s[key]||(key==='saturdayHours'?(s.saturday||'').replace(/^(Samstag|Saturday)\s*/,''):'Nach Vereinbarung'))+'</dd></div>').join('')+'</dl>';
}
function contact() {
  const s=data.settings[0];
  const query=encodeURIComponent(s.address+', '+s.city+', Austria');
  const directions='https://www.google.com/maps/search/?api=1&query='+query;
  return article('Mitten in Wien. Ganz bei Ihnen.','Wir freuen uns darauf, Sie kennenzulernen.','',`<div class="contact-grid"><div class="info-card"><span class="eyebrow">SO ERREICHEN SIE UNS</span><h2>${esc(s.address)}</h2><p>${esc(s.city)}</p><a href="tel:${esc(s.phone.replaceAll(' ',''))}">${esc(s.phone)}</a><a href="mailto:${esc(s.email)}">${esc(s.email)}</a><h3>Termine & Öffnungszeiten</h3><p class="hours-intro">${esc(s.hours)}</p>${weeklyHours(s)}<a class="button" href="/termin">Ersttermin anfragen ↗︎</a></div><section class="map-card" aria-label="${I18n.translate('Anfahrt zur Citypraxis')}"><div class="contact-map"><iframe title="${esc(I18n.translate('Google Maps: Citypraxis, Stubenbastei 12/11, 1010 Wien'))}" src="${mapEmbedUrl.replaceAll('&','&amp;')}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe></div><div class="map-caption"><div><span class="eyebrow">MITTEN IN WIEN</span><h2>Citypraxis</h2><p>${esc(s.address)} · ${esc(s.city)}</p></div><a class="button button-outline" href="${esc(directions)}" target="_blank" rel="noopener noreferrer">Route planen ↗︎</a></div></section></div>`);
}
function route() {
  const path=location.pathname.replace(/\/$/,'')||'/';
  if(path==='/') return home();
  if(path==='/termin') return appointment();
  if(path.startsWith('/team/')){
    const therapist=data.team.find(t=>path===`/team/${encodeURIComponent(t.id)}`);
    if(therapist)return therapistPage(therapist);
    return article(I18n.language==='en'?'Profile unavailable':'Profil nicht verfügbar',I18n.language==='en'?'This profile is no longer published.':'Dieses Profil ist nicht mehr veröffentlicht.','',`<a class="button" href="/ueber-uns#team">${I18n.language==='en'?'View team':'Team ansehen'} ${arrow}</a>`);
  }
  if(path==='/kontakt') return contact();
  if(path==='/schwerpunkte') return listing('symptoms');
  if(path==='/leistungen') return listing('services');
  if(path==='/preise')return article('Preise & Rückerstattung','Kosten und Informationen zur Wahltherapie.','',pricesBlock());
  if(path==='/ablauf-wahltherapie'){
    const page=data.pages.find(p=>p.id==='ablauf-wahltherapie');
    return article(page?.title||'Private Wahltherapie',page?.intro||'Ihr Weg zur Behandlung','',''+processBlock()+`<div class="source-date">Die folgenden Angaben zur Verordnung und Versicherung wurden von der bisherigen Praxiswebsite übernommen. Bitte klären Sie aktuelle Vorgaben vor Behandlungsbeginn.</div><div class="clinical-reading">${clinicalBody(page?.body)}</div><a class="button" href="/preise">Preise & Rückerstattung ansehen ↗︎</a>`);
  }
  const parts=path.split('/');
  const collection=parts[1]==='schwerpunkte'?'symptoms':parts[1]==='leistungen'?'services':null;
  if(collection && parts[2]) {
    const item=data[collection].find(i=>i.id===parts[2]);
    if(item) return collection==='services'?servicePage(item):article(item.title,item.intro,item.body,`<a class="button" href="/termin">Ersttermin anfragen ↗︎</a><a class="text-link article-link" href="/leistungen/${esc(item.service||'physiotherapie')}">Zur Behandlung →</a>`);
  }
  const pageId=path==='/ueber-uns'?'about':parts[1];
  const page=data.pages.find(p=>p.id===pageId);
  if(pageId==='about' && page)return article(page.title,page.intro,'',`<section class="team-directory" id="team"><div class="section-heading"><div><span class="eyebrow">DIE MENSCHEN IN DER CITYPRAXIS</span><h2>Unser Team</h2></div></div><div class="team-profiles">${data.team.map(teamCard).join('')}</div></section><div class="clinical-reading">${clinicalBody(page.body)}</div>`);
  if(page) return article(page.title,page.intro,page.body,pageId==='datenschutz'?chatPrivacyInfo():'');
  if(['impressum','datenschutz'].includes(pageId)) return article(pageId==='impressum'?'Impressum':'Datenschutz','Diese Seite wird vor Veröffentlichung vervollständigt.','Dies ist eine lokale Entwicklungsvorschau. Bitte verwenden Sie keine echten Patientendaten.');
  return article('Seite nicht gefunden','Hier geht es zurück zu Ihrer Citypraxis.','', '<a class="button" href="/">Zur Startseite</a>');
}
function chatPrivacyInfo(){
  const en=I18n.language==='en';
  return `<section id="digitaler-empfang" class="article-body" data-no-translate><h2>${en?'Digital reception':'Digitaler Empfang'}</h2><p>${en?'The digital assistant prepares administrative requests for the Citypraxis team. Starting a request is voluntary. With your consent, we process your contact details, your request, availability preferences and any health information you choose to share. Please provide only a short description, without medical reports.':'Der digitale Assistent bereitet organisatorische Anfragen für das Citypraxis-Team vor. Die Nutzung ist freiwillig. Mit Ihrem Einverständnis verarbeiten wir Ihre Kontaktdaten, Ihr Anliegen, Terminwünsche und freiwillig mitgeteilte Gesundheitsangaben. Bitte geben Sie nur eine kurze Beschreibung ohne medizinische Befunde ein.'}</p><p>${en?'The draft is kept in this browser tab for a 30-minute session. It is cleared after submission, restart or session expiry; an expired draft is not restored. Only after you review and send your request is it stored in the existing practice request database (Supabase), accessible to authorized reception staff and owners. Requests can be deleted by the practice. Contact us to withdraw consent or ask about your data; withdrawal does not affect processing already carried out.':'Der Entwurf wird in diesem Browser-Tab für eine Sitzung von 30 Minuten gespeichert. Nach Absenden, Neustart oder Sitzungsablauf wird er gelöscht; abgelaufene Entwürfe werden nicht wiederhergestellt. Erst nach Ihrer Prüfung und dem Absenden wird die Anfrage in der bestehenden Praxis-Anfragedatenbank (Supabase) gespeichert. Berechtigte EmpfangsmitarbeiterInnen und InhaberInnen haben Zugriff; die Praxis kann Anfragen löschen. Für Widerruf oder Auskunft zu Ihren Daten kontaktieren Sie uns bitte. Ein Widerruf betrifft nicht die bereits erfolgte Verarbeitung.'}</p><p>${en?'If optional AI interpretation is enabled, you can consent separately to sending your current free-text answer to OpenAI. It may include health information. Recognized contact details are removed where possible, but this does not guarantee anonymity. AI use is optional: the selection buttons also work without it. Interpretations are shown for your confirmation. No medical advice or appointment confirmation is generated.':'Wenn die optionale KI-Auswertung aktiviert ist, können Sie gesondert einwilligen, Ihre aktuelle Freitextantwort an OpenAI zu senden. Diese kann Gesundheitsangaben enthalten. Erkannte Kontaktdaten werden nach Möglichkeit entfernt; das garantiert keine Anonymität. Die KI-Nutzung ist freiwillig: Die Auswahlfelder funktionieren auch ohne sie. Zuordnungen werden Ihnen zur Bestätigung angezeigt. Es werden weder medizinische Beratung noch Terminbestätigungen erzeugt.'}</p><p>${en?'If email notifications are configured, the practice receives only the request number and a link to the protected Admin inbox via Resend, without health details. This chat is not continuously monitored and is not an emergency service.':'Wenn E-Mail-Benachrichtigungen eingerichtet sind, erhält die Praxis über Resend nur die Anfragenummer und einen Link zum geschützten Admin-Bereich, ohne Gesundheitsangaben. Dieser Chat wird nicht laufend überwacht und ist kein Notfalldienst.'}</p></section>`;
}
function bind() {
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  const panel=$('.cookie-panel');
  const acknowledgePrivacy=()=>{
    try{localStorage.setItem(privacyPreferenceKey,JSON.stringify({acknowledged:true,updatedAt:new Date().toISOString()}));}catch{}
    panel.hidden=true;
  };
  $('.cookie-settings-link')?.addEventListener('click',()=>{panel.hidden=false;panel.focus?.();});
  $('.cookie-close',panel)?.addEventListener('click',acknowledgePrivacy);
  $('.cookie-acknowledge',panel)?.addEventListener('click',acknowledgePrivacy);
  const priceTabs=[...document.querySelectorAll('[data-price-tab]')];
  const selectPriceTab=index=>{priceTabs.forEach((tab,i)=>{const active=i===index;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;$(`#price-panel-${i}`).hidden=!active;});};
  priceTabs.forEach((tab,index)=>{tab.addEventListener('click',()=>selectPriceTab(index));tab.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?priceTabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+priceTabs.length)%priceTabs.length;selectPriceTab(next);priceTabs[next].focus();});});
  if(!reducedMotion.matches){
    const headlines=[...document.querySelectorAll('#main h1, #main h2')];
    const revealObserver=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(!entry.isIntersecting)return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    },{threshold:.18,rootMargin:'0px 0px -8% 0px'});
    headlines.forEach((headline,index)=>{
      headline.classList.add('headline-reveal');
      headline.style.setProperty('--reveal-delay',`${Math.min(index,3)*45}ms`);
      revealObserver.observe(headline);
    });
    document.querySelectorAll('.process-grid').forEach(grid=>{
      grid.classList.add('process-sequence-ready');
      grid.querySelectorAll(':scope > li').forEach((step,index)=>step.style.setProperty('--step-delay',`${index*130}ms`));
      const processObserver=new IntersectionObserver(entries=>{
        if(!entries[0].isIntersecting)return;
        grid.classList.add('is-visible');
        processObserver.disconnect();
      },{threshold:.2,rootMargin:'0px 0px -6% 0px'});
      processObserver.observe(grid);
    });
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
  const urgent=$('.urgent-button');
  if(urgent){
    urgent.addEventListener('pointermove',event=>{
      if(event.pointerType==='touch'||reducedMotion.matches)return;
      const bounds=urgent.getBoundingClientRect();
      urgent.style.setProperty('--glow-x', ((event.clientX-bounds.left)/bounds.width*100)+'%');
      urgent.style.setProperty('--glow-y', ((event.clientY-bounds.top)/bounds.height*100)+'%');
    });
    urgent.addEventListener('pointerleave',()=>{urgent.style.removeProperty('--glow-x');urgent.style.removeProperty('--glow-y');});
  }
  const video=$('#hero-video'),videoToggle=$('#video-toggle');
  if(video && videoToggle) {
    const motion=reducedMotion;
    let manuallyPaused=false;
    const update=()=>{const playing=!video.paused;videoToggle.textContent=playing?'Video pausieren Ⅱ':'Video abspielen ▷';videoToggle.setAttribute('aria-label',playing?'Hintergrundvideo pausieren':'Hintergrundvideo abspielen');};
    async function play(){if(!video.getAttribute('src'))video.src=video.dataset.src;video.muted=true;try{await video.play();}catch{update();}}
    video.addEventListener('playing',()=>{video.classList.add('is-playing');update();});video.addEventListener('pause',update);
    video.addEventListener('error',()=>{video.classList.remove('is-playing');videoToggle.hidden=true;});
    videoToggle.addEventListener('click',()=>{if(video.paused){manuallyPaused=false;play();}else{manuallyPaused=true;video.pause();}});
    motion.addEventListener('change',()=>{if(motion.matches)video.pause();else if(!manuallyPaused)play();});
    new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)video.pause();else if(!motion.matches&&!manuallyPaused&&!navigator.connection?.saveData)play();},{threshold:.1}).observe(video);
  }
  const toggle=$('.menu-toggle'), nav=$('#mobile-nav');
  const setMenu=open=>{nav.classList.toggle('is-open',open);nav.inert=!open;nav.setAttribute('aria-hidden',String(!open));toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Menü schließen':'Menü öffnen');};
  toggle.addEventListener('click',()=>setMenu(toggle.getAttribute('aria-expanded')!=='true'));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&toggle.getAttribute('aria-expanded')==='true'){setMenu(false);toggle.focus();}});
  const concernOptions=document.querySelectorAll('input[name="concern"]'),customSymptoms=$('.custom-symptoms'),symptomsInput=$('textarea[name="symptoms"]');
  if(customSymptoms&&symptomsInput){
    let customAnimation=0;
    const toggleCustomSymptoms=show=>{
      const run=++customAnimation;
      customSymptoms.getAnimations().forEach(animation=>animation.cancel());
      customSymptoms.style.overflow='hidden';
      customSymptoms.setAttribute('aria-hidden',String(!show));
      symptomsInput.disabled=!show;
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
    concernOptions.forEach(option=>option.addEventListener('change',()=>toggleCustomSymptoms(option.dataset.other==='true')));
  }
  $('#therapist-choice')?.addEventListener('change',e=>{
    const selected=data.team.find(t=>t.id===e.target.value),portrait=$('.therapist-choice-portrait');
    portrait.innerHTML=selected?.image?`<img src="${esc(optimizedImage(selected.image))}" alt="" width="64" height="76">`:'<span>CP</span>';
    $('.therapist-choice-role').textContent=selected?.role||'';
    $('.therapist-choice-note').textContent=I18n.language==='en'?'We will confirm availability personally.':'Wir bestätigen die Verfügbarkeit persönlich.';
    const url=new URL(location.href);if(selected)url.searchParams.set('therapist',selected.id);else url.searchParams.delete('therapist');
    history.replaceState(null,'',url.pathname+url.search+url.hash);
    document.querySelectorAll('[data-language]').forEach(link=>{const target=new URL(link.href);if(selected)target.searchParams.set('therapist',selected.id);else target.searchParams.delete('therapist');link.href=target.pathname+target.search+target.hash;});
  });
  $('#booking-form')?.addEventListener('submit',async e=>{
    e.preventDefault();const form=e.currentTarget,button=$('button[type=submit]',form),message=$('.form-message',form),fields=new FormData(form);button.disabled=true;message.textContent='Anfrage wird gespeichert …';
    try{const response=await fetch('/api/requests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...Object.fromEntries(fields),acute:fields.has('acute'),consent:fields.has('consent')})});const result=await response.json();if(!response.ok)throw new Error(result.error);form.innerHTML=`<div class="success-mark">✓</div><h2>Vielen Dank, ${esc(fields.get('name'))}.</h2><p>${esc(result.message)}</p><p>Ihre Anfragenummer: <strong>#${result.id}</strong></p><a class="button" href="/">Zur Startseite ↗︎</a>`;}catch(error){message.textContent=error.message;button.disabled=false;}
  });
}
const contentCacheKey='citypraxis-public-content-v2',contentCacheLifetime=5*60*1000;
function renderApp(content,preview){
  data=I18n.localizeContent(content);
  $('#app').innerHTML=(preview?'<div class="preview-banner">Entwurfsvorschau · Änderungen sind noch nicht öffentlich. <a href="/admin">Zur Verwaltung ↗︎</a></div>':'')+header()+`<main id="main">${route()}</main>`+footer()+cookiePanel();
  const profile=data.team.find(t=>location.pathname.replace(/\/$/,'')===`/team/${encodeURIComponent(t.id)}`);
  if(profile)document.querySelectorAll('.header a[href="/termin"],.mobile-booking a[href="/termin"]').forEach(link=>link.href=`/termin?therapist=${encodeURIComponent(profile.id)}`);
  I18n.apply();const title=$('h1')?.textContent;document.title=(title?`${title} · `:'')+'Citypraxis Wien';bind();
  if(location.hash==='#team')requestAnimationFrame(()=>$('#team')?.scrollIntoView());
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
      loadContent(false).then(content=>{try{sessionStorage.setItem(contentCacheKey,JSON.stringify({savedAt:Date.now(),content}));}catch{}}).catch(()=>{});
      return;
    }
    const content=await loadContent(preview);
    if(!preview)try{sessionStorage.setItem(contentCacheKey,JSON.stringify({savedAt:Date.now(),content}));}catch{}
    renderApp(content,preview);
  }catch(error){$('#app').innerHTML=`<main class="loading"><h1>Wir sind gleich wieder für Sie da.</h1><p>${esc(error.message)}</p><a href="/">Erneut versuchen</a></main>`;}
}
boot();
