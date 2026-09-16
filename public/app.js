const $ = (selector, root = document) => root.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const externalUrl=value=>{try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)?url.href:'';}catch{return '';}};
const paragraph = text => String(text || '').split('\n\n').filter(t=>t.trim()).map(t => t.startsWith('### ')?`<h3>${esc(t.slice(4))}</h3>`:t.startsWith('## ')?`<h2>${esc(t.slice(3))}</h2>`:t.split('\n').every(line=>line.startsWith('- '))?`<ul>${t.split('\n').map(line=>`<li>${esc(line.slice(2))}</li>`).join('')}</ul>`:`<p>${esc(t).replaceAll('\n','<br>')}</p>`).join('');
let data;
const arrow = '<span class="arrow-symbol" aria-hidden="true">↗︎</span>';
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
  const links = [['/leistungen','Therapien'],['/schwerpunkte','Schwerpunkte'],['/ueber-uns','Team'],['/preise','Preise'],['/ablauf-wahltherapie','Ablauf'],['/kontakt','Kontakt']].map(([url,label])=>`<a href="${url}"${location.pathname===url?' aria-current="page"':''}>${label}</a>`).join('');
  return `<div class="topline"><div class="container"><span>Mitten in Wien. Ganz bei Ihnen.</span><a href="/kontakt">Stubenbastei 12 · 1010 Wien ${arrow}</a></div></div>
  <header class="header"><div class="container header-inner"><a href="/" class="brand" aria-label="Citypraxis Startseite"><img src="/assets/wordmark-black.png" alt="Citypraxis" width="218" height="29"></a><nav class="desktop-nav" aria-label="Hauptnavigation">${links}</nav><a class="button header-cta" href="/termin">Ersttermin buchen ${arrow}</a>${I18n.toggle()}<button class="menu-toggle" aria-expanded="false" aria-controls="mobile-nav" aria-label="Menü öffnen"><span></span><span></span></button></div><nav id="mobile-nav" class="mobile-nav" aria-label="Mobile Navigation" hidden>${links}<a href="/termin">Ersttermin buchen ↗︎</a></nav></header>`;
}
function footer() {
  const s = data.settings[0];
  return `<footer><div class="container footer-top"><div><img class="footer-logo" src="/assets/wordmark-black.png" alt="Citypraxis" width="250" height="34"><p>Gemeinsam weiterkommen.<br>Mitten in Wien.</p></div><div><h3>Besuchen Sie uns</h3><p>${esc(s.address)}<br>${esc(s.city)}</p><a href="https://www.google.com/maps/search/?api=1&query=Stubenbastei+12+1010+Wien" target="_blank" rel="noopener">Route planen ↗︎</a></div><div><h3>Wir sind für Sie da</h3><a href="tel:${esc(s.phone.replaceAll(' ',''))}">${esc(s.phone)}</a><a href="mailto:${esc(s.email)}">${esc(s.email)}</a><p>${esc(s.hours)}<br>${esc(s.saturdayHours?I18n.translate('Samstag')+' '+s.saturdayHours:s.saturday)}</p></div><div><h3>Gut zu wissen</h3><a href="/ablauf-wahltherapie">Ablauf & Wahltherapie</a><a href="/leistungen">Unsere Leistungen</a><p>${esc(s.payment)}</p></div></div><div class="container footer-bottom"><span>© ${new Date().getFullYear()} Citypraxis Wien</span><div><a href="/impressum">Impressum</a><a href="/datenschutz">Datenschutz</a><a href="/admin">Praxis-Login ↗︎</a></div></div></footer><div class="mobile-booking"><a href="tel:${esc(s.phone.replaceAll(' ',''))}">Anrufen</a><a class="button" href="/termin">Ersttermin buchen ${arrow}</a></div>`;
}
function processBlock() {
  const steps = [['Verordnung','Klären Sie die ärztliche Verordnung vor Ihrem ersten Termin.'],['Behandlung','Wir hören zu, untersuchen und planen gemeinsam Ihre Therapie.'],['Bezahlung','Sie bezahlen vor Ort und erhalten Ihre Rechnung.'],['Rückerstattung','Reichen Sie die Unterlagen bei Ihrer Versicherung ein.']];
  return `<ol class="process-grid">${steps.map(([title,text],i)=>`<li><div class="step-top"><span>0${i+1}</span>${i<3 ? '<span class="step-arrow" aria-hidden="true">→</span>':''}</div><h3>${title}</h3><p>${text}</p></li>`).join('')}</ol>`;
}
function faqs() { return `<div class="faq-list">${data.faqs.map(f=>`<details><summary>${esc(f.title)}<span aria-hidden="true">+</span></summary><div>${paragraph(f.body)}</div></details>`).join('')}</div>`; }
function heroMarkup(h,s) {
  const video=h.heroMedia==='video' && h.video;
  return `<section class="hero hero-immersive hero-${esc(h.heroHeight||'fullscreen')} overlay-${esc(h.heroOverlay||'balanced')} focus-${esc(h.heroPosition||'center')} mobile-focus-${esc(h.heroMobilePosition||'center')}" aria-label="Willkommen in der Citypraxis">
    <div class="hero-media"><img class="hero-backdrop" src="${esc(h.image)}" alt="${esc(h.heroAlt||'Einblicke in die Citypraxis Wien')}" fetchpriority="high">${video?`<video id="hero-video" class="hero-background-video" data-src="${esc(h.video)}" poster="${esc(h.image)}" muted loop playsinline preload="none" aria-hidden="true" tabindex="-1"></video>`:''}</div>
    <div class="hero-shade"></div><div class="container hero-stage"><div class="hero-copy"><span class="eyebrow"><span class="tiny-line"></span>${esc(h.eyebrow)}</span><h1>${esc(h.title)}<br><span>${esc(h.subtitle)}</span></h1><p>${esc(h.intro)}</p><div class="hero-actions"><a class="button" href="/termin">Ersttermin buchen ${arrow}</a><a class="urgent-button" href="/termin?akut=1"><span class="availability ${s.acuteAvailable?'is-available':''}"></span>Akuttermin anfragen ${arrow}</a></div></div><div class="hero-bottom">${video?'<button class="video-toggle" id="video-toggle" aria-label="Hintergrundvideo abspielen">Video abspielen ▷</button>':''}</div></div>
  </section>`;
}
function therapyCard(s) {
  return `<a class="therapy-card" href="/leistungen/${esc(s.id)}">${s.image?`<img src="${esc(s.image)}" alt="" loading="lazy">`:''}<div><h3>${esc(s.title)}</h3><span class="text-link">Behandlung kennenlernen ${arrow}</span></div></a>`;
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
  ${h.teamImage?`<section class="container team-feature" aria-labelledby="team-feature-title"><img class="team-group-photo" src="${esc(h.teamImage)}" alt="${esc(h.teamImageAlt||'Team-Gruppenfoto')}" loading="lazy" width="1299" height="870"><div class="team-feature-copy"><span class="eyebrow">DIE MENSCHEN IN DER CITYPRAXIS</span><h2 id="team-feature-title">Ihr Team. An Ihrer Seite.</h2><p>Physiotherapie, Osteopathie, Logopädie und Heilmassage. Gemeinsam für Sie.</p><a class="text-link" href="/ueber-uns">Das gesamte Team ${arrow}</a></div></section>`:''}
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
  return `<section class="container article service-article"><a class="breadcrumb" href="/leistungen">Leistungen / ${esc(item.title)}</a><div class="service-intro"><div><span class="eyebrow">${esc(item.tag||'CITYPRAXIS WIEN')}</span><h1>${esc(item.title)}</h1><p>${esc(item.intro)}</p></div>${item.image?`<img src="${esc(item.image)}" alt="${esc(item.title)} in der Citypraxis" fetchpriority="high">`:''}</div>${clinicalContents(item.body)?`<details class="mobile-contents"><summary>Auf dieser Seite</summary>${clinicalContents(item.body)}</details>`:''}<div class="clinical-layout"><div class="clinical-text">${clinicalBody(item.body)}${item.methods?`<div class="faq-list">${item.methods.split('\n').filter(Boolean).map(m=>{const [title,...text]=m.split('|');return `<details><summary>${esc(title)}<span>+</span></summary><div>${paragraph(text.join('|'))}</div></details>`;}).join('')}</div>`:''}${related.length?`<section class="clinical-card"><h2>Behandlungskonzepte entdecken</h2><div class="related-links">${related.map(r=>`<a href="/leistungen/${esc(r.id)}">${esc(r.title)} ↗︎</a>`).join('')}</div></section>`:''}</div><aside class="clinical-aside">${clinicalContents(item.body)}<span class="eyebrow">WIR SIND FÜR SIE DA</span><h2>Ihr nächster Schritt.</h2><p>Vereinbaren Sie Ihren Ersttermin in der Citypraxis.</p><a class="button" href="/termin">Ersttermin anfragen ↗︎</a><a class="text-link" href="/ablauf-wahltherapie">Ablauf & Wahltherapie →</a><a class="text-link" href="/preise">Preise & Rückerstattung →</a></aside></div></section>`;
}
function pricesBlock(){return `<section class="clinical-card"><h2>Praxispreise</h2><div class="price-list">${data.prices.map(p=>`<div><span><strong>${esc(p.title)}</strong>${p.duration?' · '+esc(p.duration)+' Minuten':''}<small>${esc(p.details||'')}</small></span><strong>${esc(p.amount)} €</strong></div>`).join('')}</div><p>Preise für einzelne Therapiesitzungen erhalten Sie direkt bei der Praxis.</p></section><section class="clinical-card"><span class="eyebrow">RÜCKERSTATTUNG DURCH DIE KRANKENKASSE</span><h2>Rückerstattungstarife</h2><p class="source-date">Stand der übernommenen Tabelle: ${esc(data.reimbursements[0]?.asOf||'04/2023')} – alle Angaben ohne Gewähr. Diese Beträge sind Rückerstattungen, keine Behandlungspreise. Aktuelle Beträge bitte bei Ihrer Versicherung prüfen.</p><div class="reimbursement-wrap"><table class="reimbursement-table"><caption>Rückerstattung laut bisheriger Praxiswebsite</caption><thead><tr><th scope="col">Leistung</th><th scope="col">ÖGKK</th><th scope="col">BVAEB</th><th scope="col">KFA</th><th scope="col">SVS</th></tr></thead><tbody>${data.reimbursements.map(r=>`<tr><th scope="row">${esc(r.title)}</th>${['oegkk','bvaeb','kfa','svs'].map(k=>`<td>${esc(r[k])}${r[k]&&r[k]!=='–'?' €':''}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>`;}
function teamThumbnail(t){
  return `<a class="team-thumbnail" href="/ueber-uns" aria-label="${esc(t.title)} – Team ansehen${t.placeholder||t.fictional?' (Beispielprofil)':''}">${t.image?`<img src="${esc(t.image)}" alt="" loading="lazy">`:'<span class="thumbnail-empty" aria-hidden="true"></span>'}</a>`;
}
function reviewStars(value){
  const rating=Number(value);
  return Number.isInteger(rating)&&rating>=1&&rating<=5?`<div class="review-stars" role="img" aria-label="${rating} von 5 Sternen"><span aria-hidden="true">${'★'.repeat(rating)}<span class="review-stars-empty">${'☆'.repeat(5-rating)}</span></span></div>`:'';
}
function reviewsSection(){
  const reviews=(data.reviews||[]).filter(r=>r.body?.trim()),settings=data.settings[0];
  return `<section class="section container reviews-section"><div class="section-heading"><div><span class="eyebrow">ERFAHRUNGEN MIT DER CITYPRAXIS</span><h2>${esc(settings.reviewsTitle||'Stimmen aus der Praxis.')}</h2>${settings.reviewsIntro?`<p>${esc(settings.reviewsIntro)}</p>`:''}</div>${reviews.length?'':'<p>Bewertungen folgen in Kürze.</p>'}</div><div class="reviews-grid">${reviews.length?reviews.map(r=>{const sourceUrl=externalUrl(r.sourceUrl);return `<figure class="review-card"><div class="review-top">${reviewStars(r.rating)}<span class="review-quote" aria-hidden="true">“</span></div><blockquote>${paragraph(r.body)}</blockquote><figcaption><span class="review-avatar" aria-hidden="true">${esc(r.title?.trim().charAt(0)||'•')}</span><div><strong>${esc(r.title)}</strong>${r.source?(sourceUrl?`<a class="review-source" href="${esc(sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(r.source)} ↗︎</a>`:`<span>${esc(r.source)}</span>`):''}</div></figcaption></figure>`;}).join(''):[1,2,3].map(()=>'<div class="review-card review-placeholder"><div class="review-top"><span class="review-stars review-stars-empty" aria-label="Sterne-Platzhalter, noch keine Bewertung">☆☆☆☆☆</span><span class="review-quote" aria-hidden="true">“</span></div><span class="eyebrow">BEWERTUNGS-VORSCHAU</span><p>Hier erscheint eine freigegebene Bewertung aus unserer Praxis.</p><div class="review-placeholder-footer"><span class="review-avatar" aria-hidden="true">+</span><span>Name und Quelle der Bewertung</span></div></div>').join('')}</div></section>`;
}

function teamCard(t){
  return `<article class="team-person"><div class="team-portrait">${t.image?`<img class="team-photo" src="${esc(t.image)}" alt="${esc(t.title)}" loading="lazy">`:'<div class="team-no-photo" aria-label="Noch kein Portrait hinterlegt">CP</div>'}</div><div class="team-card-copy"><h3>${esc(t.title)}</h3><p class="team-role">${esc(t.role).replaceAll(' / ','<br>').replaceAll(' · ','<br>')}</p>${t.phone||t.email?`<div class="team-contact">${t.phone?`<a href="tel:${esc(t.phone.replaceAll(' ',''))}">${esc(t.phone)}</a>`:''}${t.email?`<a href="mailto:${esc(t.email)}">${esc(t.email)}</a>`:''}</div>`:''}</div></article>`;
}
function listing(kind) {
  const symptoms = kind === 'symptoms';
  return article(symptoms?'Was führt Sie zu uns?':'Unsere Leistungen',symptoms?'Finden Sie einen ersten Einblick in unsere Schwerpunkte.':'Vier Fachrichtungen, ergänzt durch Bewegung in der Gruppe.','',`<div class="listing-grid ${symptoms?'symptom-listing':'service-listing'}">${data[kind].map(s=>`<a class="listing-card" href="/${symptoms?'schwerpunkte':'leistungen'}/${esc(s.id)}">${symptoms?icon(s.icon):'<span class="eyebrow">'+esc(s.tag)+'</span>'}<h2>${esc(s.title)}</h2><p>${esc(s.intro)}</p><span class="text-link">Mehr erfahren ${arrow}</span></a>`).join('')}</div>`);
}
function appointment() {
  const acute = new URLSearchParams(location.search).has('akut');
  return `<section class="container article booking-layout"><div><span class="eyebrow">DER ERSTE SCHRITT</span><h1>Schön, dass Sie<br>zu uns finden.</h1><p class="article-intro">Teilen Sie uns Ihren Terminwunsch mit. Wir melden uns persönlich, um Ihren ersten Termin abzustimmen.</p><div class="booking-note"><h3>Akuttermin benötigt?</h3><p>${esc(data.settings[0].acute)}</p><a class="text-link" href="tel:${esc(data.settings[0].phone.replaceAll(' ',''))}">${esc(data.settings[0].phone)} ↗︎</a></div><p class="fine-print">Die Anfrage ist noch keine Terminbestätigung. Bitte übermitteln Sie keine medizinischen Befunde oder sensiblen Gesundheitsangaben.</p></div><form id="booking-form" class="form-card"><h2>Ersttermin anfragen</h2><label>Ihr Name<input name="name" autocomplete="name" required maxlength="100"></label><label>E-Mail-Adresse<input name="email" type="email" autocomplete="email" required maxlength="200"></label><label>Telefon <span>(optional)</span><input name="phone" type="tel" autocomplete="tel" maxlength="40"></label><label>Wann sind Sie gut erreichbar?<textarea name="preference" rows="3" maxlength="300" placeholder="Zum Beispiel: nachmittags ab 14 Uhr"></textarea></label><label class="check-label"><input type="checkbox" name="acute" ${acute?'checked':''}> Ich möchte einen Akuttermin anfragen.</label><label class="check-label"><input type="checkbox" name="consent" required> Ich bin mit der Verarbeitung meiner Kontaktdaten zur Bearbeitung dieser Anfrage einverstanden.</label><div class="honeypot" aria-hidden="true"><label>Website<input name="website" tabindex="-1" autocomplete="off"></label></div><p class="form-notice">Lokale Vorschau: Bitte verwenden Sie ausschließlich Testdaten. Es werden keine E-Mails versendet.</p><button class="button" type="submit">Anfrage senden ${arrow}</button><p class="form-message" role="status"></p></form></section>`;
}
function weeklyHours(s){
  const days=[['monday','Montag'],['tuesday','Dienstag'],['wednesday','Mittwoch'],['thursday','Donnerstag'],['friday','Freitag'],['saturdayHours','Samstag'],['sunday','Sonntag']];
  return '<dl class="weekly-hours">'+days.map(([key,label])=>'<div><dt>'+I18n.translate(label)+'</dt><dd>'+esc(s[key]||(key==='saturdayHours'?(s.saturday||'').replace(/^(Samstag|Saturday)\s*/,''):'Nach Vereinbarung'))+'</dd></div>').join('')+'</dl>';
}
function contact() {
  const s=data.settings[0];
  const query=encodeURIComponent(s.address+', '+s.city+', Austria');
  const directions='https://www.google.com/maps/search/?api=1&query='+query;
  return article('Mitten in Wien. Ganz bei Ihnen.','Wir freuen uns darauf, Sie kennenzulernen.','',`<div class="contact-grid"><div class="info-card"><span class="eyebrow">SO ERREICHEN SIE UNS</span><h2>${esc(s.address)}</h2><p>${esc(s.city)}</p><a href="tel:${esc(s.phone.replaceAll(' ',''))}">${esc(s.phone)}</a><a href="mailto:${esc(s.email)}">${esc(s.email)}</a><h3>Termine & Öffnungszeiten</h3><p class="hours-intro">${esc(s.hours)}</p>${weeklyHours(s)}<a class="button" href="/termin">Ersttermin anfragen ↗︎</a></div><section class="map-card" aria-label="${I18n.translate('Anfahrt zur Citypraxis')}"><div class="contact-map"><img src="/assets/location-map.svg" alt="${I18n.translate('Lageskizze: Citypraxis an der Stubenbastei bei der Liebenberggasse')}" width="720" height="620" loading="lazy"><span class="map-scale-note">Lageskizze · nicht maßstabsgetreu</span></div><div class="map-caption"><div><span class="eyebrow">MITTEN IN WIEN</span><h2>Citypraxis</h2><p>${esc(s.address)} · ${esc(s.city)}</p></div><a class="button button-outline" href="${esc(directions)}" target="_blank" rel="noopener">Route planen ↗︎</a></div></section></div>`);
}
function route() {
  const path=location.pathname.replace(/\/$/,'')||'/';
  if(path==='/') return home();
  if(path==='/termin') return appointment();
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
  if(pageId==='about' && page)return article(page.title,page.intro,'',`<section class="team-directory"><div class="section-heading"><div><span class="eyebrow">DIE MENSCHEN IN DER CITYPRAXIS</span><h2>Unser Team</h2></div></div><div class="team-profiles">${data.team.map(teamCard).join('')}</div></section><div class="clinical-reading">${clinicalBody(page.body)}</div>`);
  if(page) return article(page.title,page.intro,page.body);
  if(['impressum','datenschutz'].includes(pageId)) return article(pageId==='impressum'?'Impressum':'Datenschutz','Diese Seite wird vor Veröffentlichung vervollständigt.','Dies ist eine lokale Entwicklungsvorschau. Bitte verwenden Sie keine echten Patientendaten.');
  return article('Seite nicht gefunden','Hier geht es zurück zu Ihrer Citypraxis.','', '<a class="button" href="/">Zur Startseite</a>');
}
function bind() {
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
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
  toggle.addEventListener('click',()=>{const open=nav.hidden;nav.hidden=!open;toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Menü schließen':'Menü öffnen');});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!nav.hidden){nav.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.focus();}});
  $('#booking-form')?.addEventListener('submit',async e=>{
    e.preventDefault();const form=e.currentTarget,button=$('button[type=submit]',form),message=$('.form-message',form),fields=new FormData(form);button.disabled=true;message.textContent='Anfrage wird gespeichert …';
    try{const response=await fetch('/api/requests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...Object.fromEntries(fields),acute:fields.has('acute'),consent:fields.has('consent')})});const result=await response.json();if(!response.ok)throw new Error(result.error);form.innerHTML=`<div class="success-mark">✓</div><h2>Vielen Dank, ${esc(fields.get('name'))}.</h2><p>${esc(result.message)}</p><p>Ihre Anfragenummer: <strong>#${result.id}</strong></p><a class="button" href="/">Zur Startseite ↗︎</a>`;}catch(error){message.textContent=error.message;button.disabled=false;}
  });
}
const contentCacheKey='citypraxis-public-content-v1',contentCacheLifetime=5*60*1000;
function renderApp(content,preview){
  data=I18n.localizeContent(content);
  $('#app').innerHTML=(preview?'<div class="preview-banner">Entwurfsvorschau · Änderungen sind noch nicht öffentlich. <a href="/admin">Zur Verwaltung ↗︎</a></div>':'')+header()+`<main id="main">${route()}</main>`+footer();
  I18n.apply();const title=$('h1')?.textContent;document.title=(title?`${title} · `:'')+'Citypraxis Wien';bind();
}
async function loadContent(preview){
  const response=await fetch(preview?'/api/admin/content':'/api/content');
  if(!response.ok)throw new Error(preview?'Für die Entwurfsvorschau bitte als Editor anmelden.':'Inhalte konnten nicht geladen werden.');
  return response.json();
}
async function boot(){
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
