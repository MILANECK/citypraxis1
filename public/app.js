const $ = (selector, root = document) => root.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paragraph = text => String(text || '').split('\n\n').map(t => `<p>${esc(t).replaceAll('\n','<br>')}</p>`).join('');
let data, selectedSymptom = 0, selectedService = 0;
const arrow = '<span aria-hidden="true">↗</span>';
const icons = {
  jaw: '<path d="M14 7c-5 1-7 6-6 12l3 9 9 7 8-8 2-12c0-5-4-9-10-9M11 24l7 3 8-3M18 16v5h4"/>',
  head: '<path d="M26 34v-6c5-3 7-7 6-12-1-6-5-10-12-10S9 10 9 16l-3 7h5v6h7v5M21 11l-4 8h7l-4 7"/>',
  ear: '<path d="M12 18c-1-8 4-13 10-12s10 5 9 11c-1 6-6 7-7 11-1 5-7 8-10 3M17 18c0-4 1-7 5-7 4 0 5 5 2 8l-5 3"/>',
  balance: '<path d="M8 18a13 13 0 0 1 24-3M31 8l1 7-7-1M32 24A13 13 0 0 1 8 27M9 34l-1-7 7 1"/><circle cx="20" cy="21" r="4"/>',
  movement: '<circle cx="24" cy="8" r="3"/><path d="m12 19 8-5 7 4 7-1M20 14l-3 11 8 4 2 7M17 25l-7 9M12 19l-4-1"/>'
};
function icon(name) { return `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.movement}</svg>`; }
function header() {
  return `<div class="topline"><div class="container"><span>Mitten in Wien. Ganz bei Ihnen.</span><a href="/kontakt">Stubenbastei 12 · 1010 Wien ${arrow}</a></div></div>
  <header class="header"><div class="container header-inner"><a href="/" class="brand" aria-label="Citypraxis Startseite"><img src="/assets/wordmark-black.png" alt="Citypraxis" width="218" height="29"><span>THERAPIE IM ZUSAMMENSPIEL</span></a><nav class="desktop-nav" aria-label="Hauptnavigation"><a href="/schwerpunkte">Schwerpunkte</a><a href="/leistungen">Leistungen</a><a href="/ablauf-wahltherapie">Ablauf & Wahltherapie</a><a href="/ueber-uns">Über uns</a></nav><a class="button header-cta" href="/termin">Ersttermin buchen ${arrow}</a><button class="menu-toggle" aria-expanded="false" aria-controls="mobile-nav" aria-label="Menü öffnen"><span></span><span></span></button></div><nav id="mobile-nav" class="mobile-nav" aria-label="Mobile Navigation" hidden><a href="/schwerpunkte">Schwerpunkte</a><a href="/leistungen">Leistungen</a><a href="/ablauf-wahltherapie">Ablauf & Wahltherapie</a><a href="/ueber-uns">Über uns</a><a href="/kontakt">Kontakt & Anfahrt</a><a href="/termin">Ersttermin buchen ↗</a></nav></header>`;
}
function footer() {
  const s = data.settings[0];
  return `<footer><div class="container footer-top"><div><img class="footer-logo" src="/assets/wordmark-white.png" alt="Citypraxis" width="250" height="34"><p>Gemeinsam weiterkommen.<br>Mitten in Wien.</p></div><div><h3>Besuchen Sie uns</h3><p>${esc(s.address)}<br>${esc(s.city)}</p><a href="https://www.google.com/maps/search/?api=1&query=Stubenbastei+12+1010+Wien" target="_blank" rel="noopener">Route planen ↗</a></div><div><h3>Wir sind für Sie da</h3><a href="tel:${esc(s.phone.replaceAll(' ',''))}">${esc(s.phone)}</a><a href="mailto:${esc(s.email)}">${esc(s.email)}</a><p>${esc(s.hours)}<br>${esc(s.saturday)}</p></div><div><h3>Gut zu wissen</h3><a href="/ablauf-wahltherapie">Ablauf & Wahltherapie</a><a href="/leistungen">Unsere Leistungen</a><p>${esc(s.payment)}</p></div></div><div class="container footer-bottom"><span>© ${new Date().getFullYear()} Citypraxis Wien</span><div><a href="/impressum">Impressum</a><a href="/datenschutz">Datenschutz</a><a href="/admin">Praxis-Login ↗</a></div></div></footer><div class="mobile-booking"><a href="tel:${esc(s.phone.replaceAll(' ',''))}">Anrufen</a><a class="button" href="/termin">Ersttermin buchen ${arrow}</a></div>`;
}
function symptomContent() {
  const s = data.symptoms[selectedSymptom];
  if (!s) return '';
  return `<div><span class="eyebrow">${esc(s.subtitle)}</span><p>${esc(s.intro)}</p></div><a class="text-link" href="/schwerpunkte/${esc(s.id)}">Mehr zu ${esc(s.title)} ${arrow}</a>`;
}
function processBlock() {
  const steps = [['Verordnung','Klären Sie die ärztliche Verordnung vor Ihrem ersten Termin.'],['Behandlung','Wir hören zu, untersuchen und planen gemeinsam Ihre Therapie.'],['Bezahlung','Sie bezahlen vor Ort und erhalten Ihre Rechnung.'],['Rückerstattung','Reichen Sie die Unterlagen bei Ihrer Versicherung ein.']];
  return `<ol class="process-grid">${steps.map(([title,text],i)=>`<li><div class="step-top"><span>0${i+1}</span>${i<3 ? '<span class="step-arrow" aria-hidden="true">→</span>':''}</div><h3>${title}</h3><p>${text}</p></li>`).join('')}</ol>`;
}
function serviceContent() {
  const s = data.services[selectedService];
  if (!s) return '';
  return `<div class="service-art"><img src="/assets/logo-full.png" alt="Citypraxis – Therapie im Zusammenspiel" loading="lazy"><span>BEWEGUNG. VERTRAUEN. LEBENSQUALITÄT.</span></div><div class="service-copy"><span class="eyebrow">${esc(s.tag)}</span><h3>${esc(s.title)}</h3><p>${esc(s.intro)}</p><a class="button" href="/leistungen/${esc(s.id)}">${esc(s.title)} entdecken ${arrow}</a></div>`;
}
function faqs() { return `<div class="faq-list">${data.faqs.map(f=>`<details><summary>${esc(f.title)}<span aria-hidden="true">+</span></summary><div>${paragraph(f.body)}</div></details>`).join('')}</div>`; }
function heroMarkup(h,s) {
  const video=h.heroMedia==='video' && h.video;
  return `<section class="hero hero-immersive hero-${esc(h.heroHeight||'fullscreen')} overlay-${esc(h.heroOverlay||'balanced')} focus-${esc(h.heroPosition||'center')} mobile-focus-${esc(h.heroMobilePosition||'center')}" aria-label="Willkommen in der Citypraxis">
    <div class="hero-media"><img class="hero-backdrop" src="${esc(h.image)}" alt="${esc(h.heroAlt||'Einblicke in die Citypraxis Wien')}" fetchpriority="high">${video?`<video id="hero-video" class="hero-background-video" data-src="${esc(h.video)}" poster="${esc(h.image)}" muted loop playsinline preload="none" aria-hidden="true" tabindex="-1"></video>`:''}</div>
    <div class="hero-shade"></div><div class="container hero-stage"><div class="hero-copy"><span class="eyebrow"><span class="tiny-line"></span>${esc(h.eyebrow)}</span><h1>${esc(h.title)}<br><span>${esc(h.subtitle)}</span></h1><p>${esc(h.intro)}</p><div class="hero-actions"><a class="button" href="/termin">Ersttermin buchen ${arrow}</a><a class="subtle-link" href="/termin?akut=1"><span class="availability ${s.acuteAvailable?'is-available':''}"></span>Akuttermin anfragen ${arrow}</a></div></div><div class="hero-bottom"><a class="hero-scroll" href="#schwerpunkte"><span aria-hidden="true">↓</span> Entdecken Sie Ihre Möglichkeiten</a><div class="hero-caption"><span>PHYSIO · OSTEO · LOGO · MASSAGE</span><strong>Vier Perspektiven. Ganz bei Ihnen.</strong></div>${video?'<button class="video-toggle" id="video-toggle" aria-label="Hintergrundvideo abspielen">Video abspielen ▷</button>':''}</div></div>
  </section>`;
}
function home() {
  const h = data.pages.find(p=>p.id==='home'), s = data.settings[0];
  return `${heroMarkup(h,s)}
  <div class="trust-strip"><div class="container"><span><b>4</b> Fachrichtungen. Ein Team.</span><span><b>CRAFTA®</b> als Schwerpunkt</span><span><b>1010</b> Mitten in Wien</span><a href="/kontakt"><b>Auch samstags</b> für Sie da ${arrow}</a></div></div>
  <section class="section container" id="schwerpunkte"><div class="section-heading"><div><span class="eyebrow">HIER BEGINNT IHR WEG</span><h2>Was führt Sie zu uns?</h2></div><p>Jede Beschwerde hat ihre Geschichte.<br>Wir nehmen uns Zeit für Ihre.</p></div><div class="symptom-grid">${data.symptoms.map((s,i)=>`<button class="symptom-card ${i===selectedSymptom ? 'selected':''}" data-symptom="${i}" aria-pressed="${i===selectedSymptom}">${icon(s.icon)}<span>${esc(s.title)}</span><span class="card-arrow" aria-hidden="true">↗</span></button>`).join('')}</div><div class="symptom-detail" aria-live="polite">${symptomContent()}</div><a class="small-link" href="/leistungen">Ihr Anliegen ist nicht dabei? Alle Leistungen ansehen →</a></section>
  <section class="process-section"><div class="container section"><div class="section-heading"><div><span class="eyebrow">GUT ZU WISSEN</span><h2>Ihr erster Schritt.<br>Wir machen ihn leichter.</h2></div><div><p>Private Wahltherapie, verständlich erklärt.<br>So läuft Ihre Behandlung bei uns ab.</p><a class="text-link" href="/ablauf-wahltherapie">Alles zu Ablauf & Kosten ${arrow}</a></div></div>${processBlock()}<p class="fine-print">Eine mögliche Rückerstattung hängt von Ihrer Behandlung und Versicherung ab.</p></div></section>
  <section class="section container"><div class="section-heading"><div><span class="eyebrow">UNSERE LEISTUNGEN</span><h2>Zusammen mehr bewegen.</h2></div><a class="text-link" href="/leistungen">Alle Leistungen ${arrow}</a></div><div class="service-tabs" role="tablist" aria-label="Fachrichtungen">${data.services.slice(0,4).map((s,i)=>`<button role="tab" id="tab-${i}" aria-controls="service-panel" aria-selected="${i===selectedService}" tabindex="${i===selectedService?0:-1}" data-service="${i}">${esc(s.title)}</button>`).join('')}</div><div class="service-panel" role="tabpanel" id="service-panel" aria-labelledby="tab-${selectedService}">${serviceContent()}</div><p class="course-link">Aktiv bleiben, gemeinsam trainieren. <a href="/leistungen/rueckenfit">Unser Rückenfit-Angebot →</a></p></section>
  <section class="team-section"><div class="container team-layout"><div><span class="eyebrow">MENSCHEN, DIE SICH ZEIT NEHMEN</span><h2>Viele Perspektiven.<br>Ein gemeinsames Ziel:<br><em>Ihr Wohlbefinden.</em></h2></div><div><p class="large-copy">Gute Therapie beginnt mit Zuhören. Und mit Menschen, die ihr Wissen miteinander teilen.</p><p>In der Citypraxis verbinden wir unterschiedliche Fachrichtungen. So entsteht ein gemeinsamer Blick auf Ihre Beschwerden – und ein persönlicher Weg für Sie.</p><a class="button button-outline" href="/ueber-uns">Die Citypraxis kennenlernen ${arrow}</a></div></div></section>
  <section class="section container faq-layout"><div><span class="eyebrow">BEVOR WIR UNS SEHEN</span><h2>Ihre Fragen.<br>Unsere Antworten.</h2><a class="text-link" href="/kontakt">Noch eine Frage? ${arrow}</a></div>${faqs()}</section>
  <section class="contact-banner container"><div><span class="eyebrow">WIR SIND FÜR SIE DA</span><h2>Gehen wir den nächsten<br>Schritt gemeinsam.</h2></div><a class="button" href="/termin">Ersttermin anfragen ${arrow}</a></section>`;
}
function article(title,intro,body,extra='') { return `<section class="container article"><a class="breadcrumb" href="/">Startseite /</a><span class="eyebrow">CITYPRAXIS WIEN</span><h1>${esc(title)}</h1><p class="article-intro">${esc(intro)}</p><div class="article-body">${paragraph(body)}</div>${extra}</section>`; }
function listing(kind) {
  const symptoms = kind === 'symptoms';
  return article(symptoms?'Was führt Sie zu uns?':'Unsere Leistungen',symptoms?'Finden Sie einen ersten Einblick in unsere Schwerpunkte.':'Vier Fachrichtungen, ergänzt durch Bewegung in der Gruppe.','',`<div class="listing-grid">${data[kind].map(s=>`<a class="listing-card" href="/${symptoms?'schwerpunkte':'leistungen'}/${esc(s.id)}">${symptoms?icon(s.icon):'<span class="eyebrow">'+esc(s.tag)+'</span>'}<h2>${esc(s.title)}</h2><p>${esc(s.intro)}</p><span class="text-link">Mehr erfahren ${arrow}</span></a>`).join('')}</div>`);
}
function appointment() {
  const acute = new URLSearchParams(location.search).has('akut');
  return `<section class="container article booking-layout"><div><span class="eyebrow">DER ERSTE SCHRITT</span><h1>Schön, dass Sie<br>zu uns finden.</h1><p class="article-intro">Teilen Sie uns Ihren Terminwunsch mit. Wir melden uns persönlich, um Ihren ersten Termin abzustimmen.</p><div class="booking-note"><h3>Akuttermin benötigt?</h3><p>${esc(data.settings[0].acute)}</p><a class="text-link" href="tel:${esc(data.settings[0].phone.replaceAll(' ',''))}">${esc(data.settings[0].phone)} ↗</a></div><p class="fine-print">Die Anfrage ist noch keine Terminbestätigung. Bitte übermitteln Sie keine medizinischen Befunde oder sensiblen Gesundheitsangaben.</p></div><form id="booking-form" class="form-card"><h2>Ersttermin anfragen</h2><label>Ihr Name<input name="name" autocomplete="name" required maxlength="100"></label><label>E-Mail-Adresse<input name="email" type="email" autocomplete="email" required maxlength="200"></label><label>Telefon <span>(optional)</span><input name="phone" type="tel" autocomplete="tel" maxlength="40"></label><label>Wann sind Sie gut erreichbar?<textarea name="preference" rows="3" maxlength="300" placeholder="Zum Beispiel: nachmittags ab 14 Uhr"></textarea></label><label class="check-label"><input type="checkbox" name="acute" ${acute?'checked':''}> Ich möchte einen Akuttermin anfragen.</label><label class="check-label"><input type="checkbox" name="consent" required> Ich bin mit der Verarbeitung meiner Kontaktdaten zur Bearbeitung dieser Anfrage einverstanden.</label><div class="honeypot" aria-hidden="true"><label>Website<input name="website" tabindex="-1" autocomplete="off"></label></div><p class="form-notice">Lokale Vorschau: Bitte verwenden Sie ausschließlich Testdaten. Es werden keine E-Mails versendet.</p><button class="button" type="submit">Anfrage senden ${arrow}</button><p class="form-message" role="status"></p></form></section>`;
}
function contact() {
  const s=data.settings[0];
  return article('Mitten in Wien. Ganz bei Ihnen.','Wir freuen uns darauf, Sie kennenzulernen.','',`<div class="contact-grid"><div class="info-card"><span class="eyebrow">SO ERREICHEN SIE UNS</span><h2>${esc(s.address)}</h2><p>${esc(s.city)}</p><a href="tel:${esc(s.phone.replaceAll(' ',''))}">${esc(s.phone)}</a><a href="mailto:${esc(s.email)}">${esc(s.email)}</a><h3>Termine</h3><p>${esc(s.hours)}<br>${esc(s.saturday)}</p><a class="button" href="/termin">Ersttermin anfragen ↗</a></div><a class="map-card" href="https://www.google.com/maps/search/?api=1&query=Stubenbastei+12+1010+Wien" target="_blank" rel="noopener"><span class="map-coordinate">48.205° N / 16.379° E</span><span class="map-pin">⌖</span><h2>1010 Wien</h2><p>Stubenbastei 12/11</p><span class="button button-outline">In Google Maps öffnen ↗</span></a></div>`);
}
function route() {
  const path=location.pathname.replace(/\/$/,'')||'/';
  if(path==='/') return home();
  if(path==='/termin') return appointment();
  if(path==='/kontakt') return contact();
  if(path==='/schwerpunkte') return listing('symptoms');
  if(path==='/leistungen') return listing('services');
  if(path==='/ablauf-wahltherapie') return article('Gut vorbereitet. Gut aufgehoben.','Ihr Weg zur Behandlung – Schritt für Schritt.','',`${processBlock()}<div class="notice"><h3>Private Wahltherapie</h3><p>${esc(data.settings[0].payment)} Die mögliche Rückerstattung hängt von Ihrer Behandlung und Versicherung ab. Aktuelle Kosten erfahren Sie vor der Terminvereinbarung.</p></div>${data.prices.length?`<h2>Tarife</h2><div class="price-list">${data.prices.map(p=>`<div><span>${esc(p.title)} · ${esc(p.duration)} Minuten</span><strong>${esc(p.amount)} €</strong></div>`).join('')}</div>`:''}${faqs()}<a class="button" href="/termin">Ersttermin anfragen ↗</a>`);
  const parts=path.split('/');
  const collection=parts[1]==='schwerpunkte'?'symptoms':parts[1]==='leistungen'?'services':null;
  if(collection && parts[2]) {
    const item=data[collection].find(i=>i.id===parts[2]);
    if(item) return article(item.title,item.intro,item.body,`${item.methods?`<div class="faq-list">${item.methods.split('\n').filter(Boolean).map(m=>{const [title,...text]=m.split('|');return `<details><summary>${esc(title)}<span>+</span></summary><div><p>${esc(text.join('|'))}</p></div></details>`;}).join('')}</div>`:''}<a class="button" href="/termin">Ersttermin anfragen ↗</a><a class="text-link article-link" href="/ablauf-wahltherapie">Ablauf & Wahltherapie →</a>`);
  }
  const pageId=path==='/ueber-uns'?'about':parts[1];
  const page=data.pages.find(p=>p.id===pageId);
  if(page) return article(page.title,page.intro,page.body,pageId==='about'?`<div class="team-profiles">${data.team.map(t=>`<article class="listing-card">${t.image?`<img class="team-photo" src="${esc(t.image)}" alt="${esc(t.title)}">`:''}<h2>${esc(t.title)}</h2><span class="eyebrow">${esc(t.role)}</span>${paragraph(t.body)}<p>${esc(t.qualifications)}</p></article>`).join('')}</div><a class="button" href="/termin">Lernen wir uns kennen ↗</a>`:'');
  if(['impressum','datenschutz'].includes(pageId)) return article(pageId==='impressum'?'Impressum':'Datenschutz','Diese Seite wird vor Veröffentlichung vervollständigt.','Dies ist eine lokale Entwicklungsvorschau. Bitte verwenden Sie keine echten Patientendaten.');
  return article('Seite nicht gefunden','Hier geht es zurück zu Ihrer Citypraxis.','', '<a class="button" href="/">Zur Startseite</a>');
}
function bind() {
  const video=$('#hero-video'),videoToggle=$('#video-toggle');
  if(video && videoToggle) {
    const motion=matchMedia('(prefers-reduced-motion: reduce)');
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
  document.querySelectorAll('[data-symptom]').forEach(b=>b.addEventListener('click',()=>{selectedSymptom=Number(b.dataset.symptom);document.querySelectorAll('[data-symptom]').forEach(el=>{el.classList.toggle('selected',el===b);el.setAttribute('aria-pressed',String(el===b));});$('.symptom-detail').innerHTML=symptomContent();}));
  const tabs=[...document.querySelectorAll('[data-service]')];
  function selectTab(i,focus=false){selectedService=i;tabs.forEach((b,n)=>{b.setAttribute('aria-selected',String(n===i));b.tabIndex=n===i?0:-1;});$('#service-panel').innerHTML=serviceContent();$('#service-panel').setAttribute('aria-labelledby',`tab-${i}`);if(focus)tabs[i].focus();}
  tabs.forEach((b,i)=>{b.addEventListener('click',()=>selectTab(i));b.addEventListener('keydown',e=>{let next;if(e.key==='ArrowRight')next=(i+1)%tabs.length;if(e.key==='ArrowLeft')next=(i-1+tabs.length)%tabs.length;if(e.key==='Home')next=0;if(e.key==='End')next=tabs.length-1;if(next!==undefined){e.preventDefault();selectTab(next,true);}});});
  $('#booking-form')?.addEventListener('submit',async e=>{
    e.preventDefault();const form=e.currentTarget,button=$('button[type=submit]',form),message=$('.form-message',form),fields=new FormData(form);button.disabled=true;message.textContent='Anfrage wird gespeichert …';
    try{const response=await fetch('/api/requests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...Object.fromEntries(fields),acute:fields.has('acute'),consent:fields.has('consent')})});const result=await response.json();if(!response.ok)throw new Error(result.error);form.innerHTML=`<div class="success-mark">✓</div><h2>Vielen Dank, ${esc(fields.get('name'))}.</h2><p>${esc(result.message)}</p><p>Ihre Anfragenummer: <strong>#${result.id}</strong></p><a class="button" href="/">Zur Startseite ↗</a>`;}catch(error){message.textContent=error.message;button.disabled=false;}
  });
}
async function boot(){
  try{const preview=new URLSearchParams(location.search).has('preview');const response=await fetch(preview?'/api/admin/content':'/api/content');if(!response.ok)throw new Error(preview?'Für die Entwurfsvorschau bitte als Editor anmelden.':'Inhalte konnten nicht geladen werden.');data=await response.json();$('#app').innerHTML=(preview?'<div class="preview-banner">Entwurfsvorschau · Änderungen sind noch nicht öffentlich. <a href="/admin">Zur Verwaltung ↗</a></div>':'')+header()+`<main id="main">${route()}</main>`+footer();const title=$('h1')?.textContent;document.title=(title?`${title} · `:'')+'Citypraxis Wien';bind();}
  catch(error){$('#app').innerHTML=`<main class="loading"><h1>Wir sind gleich wieder für Sie da.</h1><p>${esc(error.message)}</p><a href="/">Erneut versuchen</a></main>`;}
}
boot();
