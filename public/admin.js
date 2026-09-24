import {renderChatIntake,chatIntake} from './admin-chat.js?v=conversation-2';
import {requestSource} from './request-summary.js';
const $=(s,r=document)=>r.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={pages:'Seiten',symptoms:'Schwerpunkte',services:'Therapien',team:'Team',reviews:'Bewertungen',faqs:'Häufige Fragen',prices:'Praxispreise',reimbursements:'Rückerstattung',settings:'Praxisdaten'};
const fields={
  pages:[['title','Überschrift'],['subtitle','Zweite Zeile'],['eyebrow','Dachzeile'],['intro','Einleitung','textarea'],['body','Inhalt','textarea'],['image','Bildpfad']],
  symptoms:[['title','Name'],['subtitle','Kurzzeile'],['intro','Einleitung','textarea'],['body','Beschreibung','textarea'],['service','Leistung (URL-Kürzel)'],['icon','Symbol','select',['jaw','head','ear','balance','movement']]],
  services:[['title','Name'],['tag','Dachzeile'],['intro','Einleitung','textarea'],['body','Beschreibung (## Überschrift, - Aufzählung)','textarea'],['methods','Methoden (pro Zeile: Titel|Beschreibung)','textarea'],['image','Bildpfad'],['related','Verwandte Leistungen (URL-Kürzel, mit Komma getrennt)']],
  team:[['title','Name'],['role','Fachrichtung'],['qualifications','Qualifikationen','textarea'],['body','Persönliche Vorstellung','textarea'],['specialties','Behandlungsschwerpunkte (eine Zeile mit - pro Punkt)','textarea'],['methods','Angebot & Methoden (eine Zeile mit - pro Punkt)','textarea'],['career','Beruflicher Werdegang (eine Zeile mit - pro Station)','textarea'],['phone','Telefon'],['email','E-Mail','email'],['image','Teamfoto (leere Auswahl entfernt das Foto)','media-image']],
  reviews:[['title','Anzeigename'],['body','Freigegebene Bewertung (Originalwortlaut)','textarea'],['rating','Sterne','rating'],['source','Quelle (z. B. Google oder direktes Feedback)'],['sourceUrl','Link zur Originalbewertung (optional)','url']],
  faqs:[['title','Frage'],['body','Antwort','textarea']],
  prices:[['category','Kategorie'],['title','Behandlung / Preisposition'],['duration','Terminart oder Dauer'],['amount','Preis in Euro','number'],['details','Zusatzinformation','textarea']],
  reimbursements:[['title','Leistung'],['oegkk','ÖGKK (€)'],['bvaeb','BVAEB (€)'],['kfa','KFA (€)'],['svs','SVS (€)'],['asOf','Tabellenstand (MM/JJJJ)']],
  settings:[['title','Bezeichnung'],['appointmentConcerns','Terminformular: Auswahlkategorien','concern-list'],['reviewsTitle','Bewertungen: Abschnittsüberschrift'],['reviewsIntro','Bewertungen: Einleitung','textarea'],['email','E-Mail','email'],['phone','Telefon'],['address','Adresse'],['city','PLZ & Ort'],['hours','Terminzeiten'],...['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'].map((day,i)=>[['monday','tuesday','wednesday','thursday','friday','saturdayHours','sunday'][i],day]),['payment','Zahlungshinweis','textarea'],['acute','Akuttermin-Hinweis'],['acuteAvailable','Aktuelle Akutverfügbarkeit bestätigt','checkbox']]
};
const defaultAppointmentConcerns=[{title:'Kiefer',titleEn:'Jaw'},{title:'Kopf & Migräne',titleEn:'Headaches & migraine'},{title:'Tinnitus',titleEn:'Tinnitus'},{title:'Schwindel',titleEn:'Dizziness'},{title:'Unfall & OP',titleEn:'Injury & surgery'},{title:'Andere Beschwerden',titleEn:'Other concern',custom:true}];
fields.settings.push(['chatEmergency','Chat: Notfallhinweis','textarea']);
let user,content={},view='overview',requests=[],staff=[],recoveryAccessToken='';
const heroFields=[['heroMedia','Hintergrund','select',[['video','Video'],['image','Foto']]],['image','Foto / Video-Standbild','media-image'],['video','Hintergrundvideo','media-video'],['heroAlt','Medienbeschreibung'],['heroHeight','Höhe','select',[['fullscreen','Bildschirmfüllend'],['large','Groß (kompakter)']]],['heroPosition','Bildausschnitt Desktop','select',[['left','Links'],['center','Mitte'],['right','Rechts']]],['heroMobilePosition','Bildausschnitt Mobil','select',[['left','Links'],['center','Mitte'],['right','Rechts']]],['heroOverlay','Abdunklung für lesbaren Text','select',[['soft','Leicht'],['balanced','Ausgewogen'],['strong','Stark']]]];
function recordFields(collection,record){return collection==='pages'&&record.id==='home'?[...fields.pages.filter(f=>f[0]!=='image'),...heroFields,['teamImage','Gruppenfoto auf der Startseite','media-image'],['teamImageAlt','Beschreibung des Gruppenfotos']]:fields[collection];}
function uploadMedia(file,alt,onProgress=()=>{}){
  const max=file.type==='video/mp4'?60_000_000:10_000_000;
  if(file.size>max)return Promise.reject(new Error('Video maximal 60 MB, Bild maximal 10 MB.'));
  return new Promise((resolve,reject)=>{
    const xhr=new XMLHttpRequest();xhr.open('POST',`/api/admin/media-upload?name=${encodeURIComponent(file.name)}&alt=${encodeURIComponent(alt)}`);xhr.setRequestHeader('Content-Type',file.type||'application/octet-stream');xhr.setRequestHeader('X-CSRF-Token',user.csrf);
    xhr.upload.onprogress=e=>{if(e.lengthComputable)onProgress(Math.round(e.loaded/e.total*100));};
    xhr.onload=()=>{let result;try{result=JSON.parse(xhr.responseText);}catch{return reject(new Error('Upload fehlgeschlagen.'));}if(xhr.status>=200&&xhr.status<300)resolve(result);else reject(new Error(result.error||'Upload fehlgeschlagen.'));};
    xhr.onerror=()=>reject(new Error('Upload unterbrochen. Bitte erneut versuchen.'));xhr.send(file);
  });
}
async function api(path,method='GET',body){const res=await fetch('/api/'+path,{method,headers:{'Content-Type':'application/json',...(user?{'X-CSRF-Token':user.csrf}:{})},...(body?{body:JSON.stringify(body)}:{})});const value=await res.json();if(!res.ok)throw new Error(value.error);return value;}
let toastTimer;
function toast(message){const el=$('#toast');el.textContent=message;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.hidden=true,4500);}
function formatDate(value){
  if(!value)return '—';
  const source=String(value).trim();
  const iso=source.includes('T')?source:source.replace(' ','T');
  const date=new Date(/[zZ]$|[+-]\d{2}:?\d{2}$/.test(iso)?iso:iso+'Z');
  return Number.isNaN(date.getTime())?'—':new Intl.DateTimeFormat(I18n.language==='en'?'en-GB':'de-AT',{dateStyle:'medium',timeStyle:'short'}).format(date);
}
const canEdit=()=>['owner','editor'].includes(user.role),canRequests=()=>['owner','reception'].includes(user.role);
function login(){
  $('#admin-app').innerHTML=`<div class="login-layout"><aside><a href="/"><img src="/assets/wordmark-white.png" alt="Citypraxis"></a><div><span class="eyebrow">PRAXISVERWALTUNG</span><h1>Mehr Zeit für<br>das Wesentliche.</h1><p>Inhalte pflegen. Anfragen im Blick behalten.<br>Gemeinsam die Praxis gestalten.</p></div><span>Citypraxis Wien · Interner Bereich</span></aside><main>${I18n.toggle()}<form id="login-form" class="form-card"><span class="eyebrow">WILLKOMMEN ZURÜCK</span><h2>In der Praxis anmelden</h2><label>E-Mail<input type="email" name="email" autocomplete="username" required></label><label>Passwort<input type="password" name="password" autocomplete="current-password" required></label><button class="button">Anmelden ↗</button><p role="alert" class="login-error"></p><button class="small-link recovery-link" type="button" id="forgot-password">${I18n.language==='en'?'Forgot your password?':'Passwort vergessen?'}</button><details class="setup-help"><summary>Erster Start?</summary><p>Ein Praxis-Owner legt Ihr Konto sicher in der Benutzerverwaltung oder in Supabase Auth an.</p></details><a class="small-link" href="/">← Zur Website</a></form></main></div>`;
  $('#login-form').onsubmit=async e=>{e.preventDefault();const b=$('button',e.currentTarget);b.disabled=true;try{await api('login','POST',Object.fromEntries(new FormData(e.currentTarget)));await init();}catch(error){$('.login-error').textContent=error.message;b.disabled=false;}};
  $('#forgot-password').onclick=showRecoveryRequest;
}
function showRecoveryRequest(){
  login();const en=I18n.language==='en';
  $('#login-form').outerHTML=`<form id="recovery-request-form" class="form-card"><span class="eyebrow">${en?'ACCOUNT RECOVERY':'KONTO WIEDERHERSTELLEN'}</span><h2>${en?'Reset your password':'Passwort zurücksetzen'}</h2><p>${en?'Enter your Admin email address. We will send you a link to choose a new password.':'Geben Sie Ihre Admin-E-Mail-Adresse ein. Sie erhalten einen Link, mit dem Sie ein neues Passwort wählen können.'}</p><label>${en?'Email address':'E-Mail-Adresse'}<input type="email" name="email" autocomplete="email" required></label><button class="button" type="submit">${en?'Send reset link':'Link anfordern'}</button><p class="recovery-message" role="status"></p><button class="small-link recovery-link" type="button" id="back-to-login">${en?'← Back to sign in':'← Zur Anmeldung'}</button></form>`;
  $('#back-to-login').onclick=login;
  $('#recovery-request-form').onsubmit=async event=>{event.preventDefault();const form=event.currentTarget,button=$('button[type=submit]',form);button.disabled=true;try{await api('recovery/request','POST',{email:form.elements.email.value});$('.recovery-message',form).textContent=en?'If this address has an account, a reset link is on its way.':'Wenn diese Adresse ein Konto hat, wurde ein neuer Link versendet.';}catch(error){$('.recovery-message',form).textContent=error.message;}finally{button.disabled=false;}};
}
function showRecoveryForm(message=''){
  login();const en=I18n.language==='en';
  $('#login-form').outerHTML=`<form id="recovery-password-form" class="form-card"><span class="eyebrow">${en?'ACCOUNT RECOVERY':'KONTO WIEDERHERSTELLEN'}</span><h2>${en?'Choose a new password':'Neues Passwort wählen'}</h2><p>${en?'Use at least 12 characters.':'Verwenden Sie mindestens 12 Zeichen.'}</p><label>${en?'New password':'Neues Passwort'}<input type="password" name="password" autocomplete="new-password" minlength="12" maxlength="512" required></label><label>${en?'Repeat new password':'Neues Passwort wiederholen'}<input type="password" name="confirm" autocomplete="new-password" minlength="12" maxlength="512" required></label><button class="button" type="submit" ${recoveryAccessToken?'':'disabled'}>${en?'Save new password':'Neues Passwort speichern'}</button><p class="recovery-message" role="status">${esc(message)}</p><button class="small-link recovery-link" type="button" id="back-to-login">${en?'← Back to sign in':'← Zur Anmeldung'}</button></form>`;
  $('#back-to-login').onclick=()=>{recoveryAccessToken='';login();};
  $('#recovery-password-form').onsubmit=async event=>{event.preventDefault();const form=event.currentTarget,button=$('button[type=submit]',form),password=form.elements.password.value;if(password!==form.elements.confirm.value){$('.recovery-message',form).textContent=en?'The passwords do not match.':'Die Passwörter stimmen nicht überein.';return;}button.disabled=true;try{await api('recovery/password','POST',{accessToken:recoveryAccessToken,password});recoveryAccessToken='';form.reset();form.innerHTML=`<span class="eyebrow">${en?'DONE':'FERTIG'}</span><h2>${en?'Password changed':'Passwort geändert'}</h2><p>${en?'You can now sign in with your new password.':'Sie können sich jetzt mit Ihrem neuen Passwort anmelden.'}</p><button class="button" type="button" id="return-to-login">${en?'Sign in':'Zur Anmeldung'}</button>`;$('#return-to-login').onclick=login;}catch(error){$('.recovery-message',form).textContent=error.message;button.disabled=false;}};
}
async function refresh(){if(canEdit())content=await api('admin/content');if(canRequests()){requests=await api('admin/requests');staff=await api('admin/staff');}}
function exportRequestsCsv(rows){
  const columns=['id','created_at','status','name','email','phone','acute','preference','notification_status','intake'];
  const cell=value=>`"${String(value??'').replace(/^([=+@-])/,'\t$1').replaceAll('"','""')}"`;
  const csv='\ufeff'+[columns.join(','),...rows.map(row=>columns.map(key=>cell(key==='intake'?typeof row.intake==='string'?row.intake:JSON.stringify(row.intake||{}):row[key])).join(','))].join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download=`citypraxis-requests-${new Date().toISOString().slice(0,10)}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function requestCard(row){
  const intake=chatIntake(row),en=I18n.language==='en';
  const source=({chatbot:'Chat',therapist_profile:en?'Form · therapist':'Formular · Therapeut:in',first_appointment:en?'Form':'Formular'})[requestSource(intake)];
  return `<details class="admin-panel request-card request-disclosure" data-request-id="${esc(row.id)}"><summary><span class="request-number">#${esc(row.id)}${row.acute?' · AKUT':''}</span><time>${esc(formatDate(row.created_at))}</time><strong>${esc(row.name)}</strong><span class="request-source">${esc(source)}</span><span class="request-toggle" aria-hidden="true">⌄</span></summary><div class="request-detail"><p class="request-contact"><a href="mailto:${esc(row.email)}">${esc(row.email)}</a>${row.phone?' · '+esc(row.phone):''}</p>${renderChatIntake(row,I18n.language)}${intake?'':`<p class="request-notes">${esc(row.preference)||'Keine bevorzugte Kontaktzeit angegeben.'}</p>`}<form data-request="${row.id}" class="request-actions"><label>Status<select name="status">${Object.entries({new:'Neu',contacted:'Kontaktiert',...(intake?.kind!=='digital_reception'?{confirmed:'Bestätigt'}:{}),closed:'Abgeschlossen'}).map(([key,label])=>`<option value="${key}" ${key===row.status?'selected':''}>${label}</option>`).join('')}</select></label><label>Zuständig<select name="assignee"><option value="">Nicht zugewiesen</option>${staff.map(member=>`<option value="${member.id}" ${member.id===row.assignee?'selected':''}>${esc(member.name)}</option>`).join('')}</select></label><button class="button">Speichern</button>${user.role==='owner'?`<button type="button" class="danger-text" data-delete-request="${row.id}">Löschen</button>`:''}</form></div></details>`;
}
function animateRequestDisclosure(details){
  const summary=details.querySelector(':scope > summary'),body=details.querySelector(':scope > .request-detail');
  summary.addEventListener('click',event=>{
    if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    event.preventDefault();if(details.dataset.animating)return;
    const opening=!details.open,start=details.getBoundingClientRect().height;
    details.dataset.animating='true';if(opening)details.open=true;
    const end=opening?details.scrollHeight:summary.getBoundingClientRect().height;
    details.style.overflow='hidden';
    const animation=details.animate({height:[`${start}px`,`${end}px`]},{duration:420,easing:'cubic-bezier(.22,1,.36,1)'});
    const bodyAnimation=body.animate(opening?{opacity:[0,1],transform:['translateY(-9px)','translateY(0)']}:{opacity:[1,0],transform:['translateY(0)','translateY(-7px)']},{duration:opening?340:220,easing:'cubic-bezier(.22,1,.36,1)',fill:'both'});
    animation.onfinish=()=>{details.open=opening;details.style.removeProperty('overflow');delete details.dataset.animating;bodyAnimation.cancel();};
  });
}
function mediaCard(media){
  const preview=media.path.endsWith('.mp4')?`<video controls muted playsinline preload="metadata" src="${esc(media.path)}" aria-label="${esc(media.alt)}"></video>`:`<img src="${esc(media.path)}" alt="${esc(media.alt)}" loading="lazy">`;
  return `<article class="admin-panel media-card"><div class="media-thumb">${preview}</div><h3 title="${esc(media.name)}">${esc(media.name)}</h3><p>${esc(media.alt)}</p><div class="media-card-actions"><a class="button button-outline" href="/api/admin/media/${encodeURIComponent(media.id)}/download" download>Herunterladen</a><button type="button" class="delete-entry" data-delete-media="${esc(media.id)}">Löschen</button></div></article>`;
}
function shell(){
  const links=[['overview','Übersicht','◫'],...(canEdit()?[['hero','Startbild & Video','▷']]:[]),...(canRequests()?[['requests','Terminanfragen','↗']]:[]),...(canEdit()?Object.entries(labels).map(([k,v])=>[k,v,'○']):[]),...(canEdit()?[['social','Social Media','◎'],['media','Mediathek','▧']]:[]),...(user.role==='owner'?[['users','Benutzer & Rollen','◎'],['audit','Aktivitäten','↺']]:[]),['account','Mein Konto','◇']];
  $('#admin-app').innerHTML=`<div class="admin-layout"><aside class="sidebar"><a href="/" class="admin-brand"><img src="/assets/wordmark-white.png" alt="Citypraxis"><span>PRAXISVERWALTUNG</span></a><nav aria-label="Verwaltung">${links.map(([key,label,symbol])=>`<button data-view="${key}" class="${key===view?'active':''}"><span aria-hidden="true">${symbol}</span>${label}${key==='requests'&&requests.filter(r=>r.status==='new').length?`<b>${requests.filter(r=>r.status==='new').length}</b>`:''}</button>`).join('')}</nav><a class="sidebar-site" href="/" target="_blank" rel="noopener">Website ansehen ↗</a><div class="admin-user"><span class="avatar">${esc(user.name.charAt(0))}</span><div><strong>${esc(user.name)}</strong><small>${esc(user.role)}</small></div><button id="logout" aria-label="Abmelden">↪</button></div></aside><main class="admin-main"><header class="admin-header"><div><span class="eyebrow">CITYPRAXIS · WIEN</span><h1 id="view-title"></h1></div>${I18n.toggle()}<span class="local-badge">Sichere Verwaltung</span></header><div id="workspace"></div></main></div>`;
  document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view;shell();render().catch(e=>toast(e.message));});
  $('#logout').onclick=async()=>{try{await api('logout','POST',{});user=null;login();}catch(e){toast(e.message);}};
}
async function render(){
  const title=labels[view]||{overview:'Guten Tag, '+user.name.split(' ')[0]+'.',hero:'Startbild & Video',requests:'Terminanfragen',social:'Social Media',media:'Mediathek',users:'Benutzer & Rollen',audit:'Aktivitäten',account:'Mein Konto'}[view];$('#view-title').textContent=title;
  const w=$('#workspace');
  if(view==='hero'){
    const h=content.pages.find(p=>p.id==='home');
    w.innerHTML=`<div class="admin-panel"><span class="eyebrow">DER ERSTE EINDRUCK</span><h2>Ein Blick in Ihre Praxis.</h2><p>Wählen Sie Foto oder Video, tauschen Sie Medien aus und passen Sie Bildausschnitt, Höhe und Texte an. Änderungen können Sie zuerst als Entwurf prüfen.</p><div class="hero-admin-preview">${h.heroMedia==='video'&&h.video?`<video controls muted playsinline preload="metadata" poster="${esc(h.image)}" src="${esc(h.video)}"></video>`:`<img src="${esc(h.image)}" alt="${esc(h.heroAlt||'Startbild')}">`}</div><div class="toolbar"><span class="status ${h.dirty?'draft':'live'}">${h.dirty?'Entwurf':'Veröffentlicht'} · ${h.heroMedia==='video'?'Video':'Foto'}</span><button class="button" id="edit-hero">Startbereich bearbeiten ↗</button></div></div>`;
    $('#edit-hero').onclick=()=>editContent('pages',h);
  } else if(view==='overview'){
    const items=Object.values(content).flat(),dirty=items.filter(i=>i.dirty).length;
    w.innerHTML=`<p class="admin-intro">Hier behalten Sie Ihre Website und die nächsten Schritte im Blick.</p><div class="stat-grid">${canRequests()?`<div class="stat"><span>Neue Anfragen</span><strong>${requests.filter(r=>r.status==='new').length}</strong><small>Warten auf Rückmeldung</small></div>`:''}${canEdit()?`<div class="stat"><span>Veröffentlichte Inhalte</span><strong>${items.filter(i=>i.published).length}</strong><small>Auf Ihrer Website sichtbar</small></div><div class="stat"><span>Offene Entwürfe</span><strong>${dirty}</strong><small>Noch nicht veröffentlicht</small></div>`:''}</div><section class="admin-panel welcome-panel"><div><span class="eyebrow">EIN GUTER AUFTRITT BEGINNT HIER</span><h2>Ihre Praxis.<br>Ihre Inhalte.</h2><p>Bearbeiten Sie Texte und speichern Sie zunächst einen Entwurf. Erst mit „Veröffentlichen“ wird die Änderung auf der Website sichtbar.</p><a class="button" href="/" target="_blank" rel="noopener">Website ansehen ↗</a></div><img src="/assets/logo-full.png" alt="Citypraxis Logo"></section><div class="admin-panel"><h3>Vor dem öffentlichen Start</h3><p>Teamprofile, aktuelle Tarife, vollständiges Impressum und Datenschutz ergänzen. Öffnungszeiten und Zahlungsinformationen prüfen. Terminanfragen werden in der Praxisdatenbank gespeichert. Den E-Mail-Versandstatus finden Sie bei jeder neuen Anfrage.</p></div>`;
  } else if(labels[view]) {
    const collection=view,records=content[view]||[];
    w.innerHTML=`<div class="toolbar"><p>Entwürfe bleiben intern, bis Sie sie veröffentlichen.</p>${view!=='settings'?'<button class="button" id="new-content">+ Neuer Eintrag</button>':''}</div><div class="admin-panel table-wrap"><table><thead><tr><th>Inhalt</th><th>Status</th><th>Reihenfolge</th><th>Aktion</th></tr></thead><tbody>${records.map(r=>`<tr><td><strong>${esc(I18n.language==='en'&&r.titleEn?r.titleEn:r.title)}</strong><small>${esc(r.id)}</small></td><td><span class="status ${r.dirty?'draft':'live'}">${r.dirty?'Entwurf':r.published?'Veröffentlicht':'Entwurf'}</span></td><td>${r.order||0}</td><td><div class="row-actions"><button class="table-action" data-edit="${esc(r.id)}">Bearbeiten ↗</button>${protectedContent(view,r.id)?'<span class="protected-entry">Basisinhalt</span>':`<button class="delete-entry" data-remove="${esc(r.id)}" aria-label="${esc(I18n.translate('Eintrag löschen')+': '+(I18n.language==='en'&&r.titleEn?r.titleEn:r.title))}">Löschen</button>`}</div></td></tr>`).join('')||'<tr><td colspan="4" class="empty">Noch keine Einträge. Legen Sie den ersten an.</td></tr>'}</tbody></table></div>`;
    document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>removeContent(collection,records.find(r=>r.id===b.dataset.remove)));
    if(collection==='reviews'){
      $('#new-content').disabled=records.length>=3;
      $('.toolbar p').textContent=I18n.language==='en'?`${records.length} / 3 reviews. Edit each review separately, or delete one to replace it. Drafts stay private until published.`:`${records.length} / 3 Bewertungen. Jede Bewertung ist einzeln bearbeitbar. Zum Ersetzen können Sie eine löschen. Entwürfe bleiben bis zur Veröffentlichung privat.`;
    }
    $('#new-content')?.addEventListener('click',()=>editContent(view));document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editContent(view,records.find(r=>r.id===b.dataset.edit)));
  } else if(view==='social') {
    const practice=(content.settings||[]).find(item=>item.id==='practice')||{};
    w.innerHTML=`<div class="admin-panel social-page"><span class="eyebrow">SOCIAL MEDIA</span><h2>Instagram & Facebook</h2><p>Fügen Sie Ihre Profil-Links hinzu. Nach dem Speichern erscheinen die Symbole im Footer der Website.</p><form id="social-form">${fieldHtml(['socialLinks','Plattform und Profil-Link','social-list'],practice)}<div class="editor-actions"><button class="button" type="submit">Links speichern ↗</button></div><p class="editor-message" role="alert"></p></form></div>`;
    wireSocialEditor(w.querySelector('[data-social-editor]'));
    $('#social-form').onsubmit=async event=>{event.preventDefault();const form=event.currentTarget,button=$('button[type=submit]',form);button.disabled=true;try{const socialLinks=JSON.parse(form.elements.socialLinks.value||'[]');await api('admin/social-links','PUT',{socialLinks});await refresh();await render();toast('Social-Media-Links veröffentlicht.');}catch(error){$('.editor-message',form).textContent=error.message;button.disabled=false;}};
  } else if(view==='requests') {
    w.innerHTML=`<div class="toolbar"><p>Gespeicherte Anfragen sind noch keine bestätigten Termine.</p><label class="filter-label">Status<select id="request-filter"><option value="all">Alle Anfragen</option><option value="new">Neu</option><option value="contacted">Kontaktiert</option><option value="confirmed">Bestätigt</option><option value="closed">Abgeschlossen</option></select></label></div><div id="request-list"></div>`;
    const exportButton=document.createElement('button');exportButton.className='button button-outline';exportButton.type='button';exportButton.textContent=I18n.language==='en'?'Download CSV':'CSV herunterladen';exportButton.onclick=()=>exportRequestsCsv(requests);$('.toolbar',w).append(exportButton);
    const count=document.createElement('p');count.className='request-count';count.textContent=I18n.language==='en'?`${requests.length} saved requests. Mark handled requests as Closed to archive them in this list. Database capacity: `:`${requests.length} gespeicherte Anfragen. Bearbeitete Anfragen können Sie hier als „Abgeschlossen“ archivieren. Datenbank-Kapazität: `;
    const usage=document.createElement('a');usage.href='https://supabase.com/dashboard/org/_/usage';usage.target='_blank';usage.rel='noopener noreferrer';usage.textContent=I18n.language==='en'?'Supabase usage ↗':'Supabase-Auslastung ↗';count.append(usage);$('.toolbar',w).after(count);
    const draw=()=>{const filter=$('#request-filter').value;const list=$('#request-list');const openIds=new Set([...list.querySelectorAll('.request-disclosure[open]')].map(item=>item.dataset.requestId));const filtered=requests.filter(row=>filter==='all'||row.status===filter);list.innerHTML=filtered.map(requestCard).join('')||'<div class="admin-panel empty">Keine Anfragen in dieser Ansicht.</div>';
      list.querySelectorAll('.request-disclosure').forEach(item=>{item.open=openIds.has(item.dataset.requestId);animateRequestDisclosure(item);});
      document.querySelectorAll('[data-retry-notification]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await api('admin/requests/notify','POST',{id:Number(b.dataset.retryNotification)});await refresh();draw();}catch(e){toast(e.message);b.disabled=false;}});
      document.querySelectorAll('[data-request]').forEach(f=>f.onsubmit=async e=>{e.preventDefault();try{await api('admin/requests','PUT',{id:Number(f.dataset.request),...Object.fromEntries(new FormData(f))});await refresh();draw();toast('Anfrage aktualisiert.');}catch(e){toast(e.message);}});
      document.querySelectorAll('[data-delete-request]').forEach(b=>b.onclick=async()=>{if(!confirm(I18n.translate('Diese Anfrage mit ihren Kontaktdaten endgültig löschen?')))return;try{await api('admin/requests','DELETE',{id:Number(b.dataset.deleteRequest)});await refresh();draw();toast('Anfrage gelöscht.');}catch(e){toast(e.message);}});
    };$('#request-filter').onchange=draw;draw();
  } else if(view==='media') {
    const media=await api('admin/media');
    w.innerHTML=`<div class="admin-panel"><h2>Foto oder Video hochladen</h2><p>Bilder: PNG, JPEG, WebP bis 10 MB. Videos: MP4 (H.264) bis 60 MB. Hintergrundvideos werden stumm abgespielt.</p><form id="upload-form" class="upload-form"><label>Datei<input type="file" name="file" accept="image/png,image/jpeg,image/webp,video/mp4" required></label><label>Beschreibung<input name="alt" required maxlength="300"></label><button class="button">Hochladen ↗</button></form><p role="status" id="upload-status"></p></div><div class="media-grid">${media.map(mediaCard).join('')}</div>`;
    $('#upload-form').onsubmit=async e=>{e.preventDefault();const form=e.currentTarget,button=$('button',form),file=$('input[type=file]',form).files[0];button.disabled=true;try{await uploadMedia(file,form.elements.alt.value,p=>$('#upload-status').textContent=`Upload: ${p} %`);await render();toast('Datei hochgeladen.');}catch(error){$('#upload-status').textContent=error.message;button.disabled=false;}};
    w.querySelectorAll('[data-delete-media]').forEach(button=>button.onclick=async()=>{
      const item=media.find(row=>row.id===button.dataset.deleteMedia);
      if(!item||!confirm(`„${item.name}“ wirklich aus der Mediathek löschen? Verwendete Medien können nicht gelöscht werden.`))return;
      button.disabled=true;
      try{await api(`admin/media/${encodeURIComponent(item.id)}`,'DELETE',{});await render();toast('Medium gelöscht.');}catch(error){toast(error.message);button.disabled=false;}
    });
  } else if(view==='users') {
    const users=await api('admin/users');
    w.innerHTML=`<div class="admin-panel table-wrap"><table><thead><tr><th>Benutzer</th><th>Rolle</th><th>Zugang</th><th>Aktion</th></tr></thead><tbody>${users.map(u=>`<tr><td><strong>${esc(u.name)}</strong><small>${esc(u.email)}</small></td><td>${esc(u.role)}</td><td>${u.active?'Aktiv':'Deaktiviert'}</td><td>${u.id!==user.id?`<button class="table-action" data-user="${u.id}" data-active="${u.active?'0':'1'}">${u.active?'Deaktivieren':'Aktivieren'}</button>`:'Ihr Konto'}</td></tr>`).join('')}</tbody></table></div><div class="admin-panel"><h2>Benutzer anlegen</h2><p>Owner: vollständiger Zugriff · Editor: Inhalte · Reception: Terminanfragen</p><form id="user-form" class="two-column-form"><label>Name<input name="name" required></label><label>E-Mail<input name="email" type="email" required></label><label>Passwort<input name="password" type="password" minlength="12" required autocomplete="new-password"></label><label>Rolle<select name="role"><option value="editor">Editor</option><option value="reception">Reception</option><option value="owner">Owner</option></select></label><button class="button">Benutzer anlegen</button></form></div>`;
    $('#user-form').onsubmit=async e=>{e.preventDefault();try{await api('admin/users','POST',Object.fromEntries(new FormData(e.currentTarget)));await render();toast('Benutzer angelegt.');}catch(error){toast(error.message);}};
    document.querySelectorAll('[data-user]').forEach(b=>b.onclick=async()=>{try{await api('admin/users','PUT',{id:b.dataset.user,active:b.dataset.active==='1'});await render();toast('Zugang aktualisiert.');}catch(error){toast(error.message);}});
  } else if(view==='audit') {
    const events=await api('admin/audit');w.innerHTML=`<p class="admin-intro">Die letzten 100 administrativen Aktionen.</p><div class="admin-panel table-wrap"><table><thead><tr><th>Zeit</th><th>Benutzer</th><th>Aktion</th><th>Eintrag</th></tr></thead><tbody>${events.map(e=>`<tr><td>${formatDate(e.created_at)}</td><td>${esc(e.actor)}</td><td>${esc(e.action)}</td><td>${esc(e.entity)}</td></tr>`).join('')}</tbody></table></div>`;
  } else if(view==='account') {
    w.innerHTML=`<div class="admin-panel"><h2>Passwort ändern</h2><p>${esc(user.name)} · ${esc(user.email)}</p><form id="password-form" class="narrow-form"><label>Aktuelles Passwort<input type="password" name="current" autocomplete="current-password" required></label><label>Neues Passwort<input type="password" name="password" autocomplete="new-password" minlength="12" required></label><button class="button">Passwort speichern</button></form></div>`;$('#password-form').onsubmit=async e=>{e.preventDefault();try{await api('admin/password','PUT',Object.fromEntries(new FormData(e.currentTarget)));e.target.reset();toast('Passwort geändert. Andere Sitzungen wurden beendet.');}catch(error){toast(error.message);}};
  }
}
function fieldHtml([name,label,type='text',options],record){
  if(type==='social-list'){
    const items=Array.isArray(record[name])?record[name]:[];
    return `<fieldset class="social-list-field" data-social-editor><legend>${label}</legend><p>Instagram oder Facebook auswählen und den vollständigen Profil-Link eintragen. Veröffentlichen, damit das Symbol im Footer erscheint.</p><input type="hidden" name="${name}" value="${esc(JSON.stringify(items))}"><div class="social-editor-rows">${items.map(socialRow).join('')}</div><button type="button" class="button button-outline add-social">+ Plattform hinzufügen</button></fieldset>`;
  }
  if(type==='concern-list'){
    const items=Array.isArray(record[name])&&record[name].length?record[name]:defaultAppointmentConcerns;
    const rows=items.map((item,index)=>concernRow(item,index)).join('');
    return `<fieldset class="concern-list-field" data-concern-editor><legend>${label}</legend><p>Jede Zeile erscheint als Auswahlknopf im Terminanfrageformular. Deutsch und Englisch werden gemeinsam gepflegt.</p><input type="hidden" name="${name}" value="${esc(JSON.stringify(items))}"><div class="concern-editor-rows">${rows}</div><button type="button" class="button button-outline add-concern">+ Kategorie hinzufügen</button></fieldset>`;
  }
  if(type==='checkbox')return `<label class="check-label"><input type="checkbox" name="${name}" ${record[name]?'checked':''}>${label}</label>`;
  if(type==='rating'){
    const value=Math.max(0,Math.min(5,Number(record[name])||0));
    return `<fieldset class="rating-field" data-rating-picker><legend>${label}</legend><input type="hidden" name="${name}" value="${value||''}"><div class="rating-buttons" role="group" aria-label="${label}">${[1,2,3,4,5].map(star=>`<button type="button" data-rating="${star}" aria-label="${star} ${star===1?'Stern':'Sterne'}" aria-pressed="${star<=value}">${star<=value?'★':'☆'}</button>`).join('')}</div><button type="button" class="rating-clear" data-rating="0">Keine Sterne anzeigen</button></fieldset>`;
  }
  if(type.startsWith('media-'))return `<div class="media-field"><label>${label}<select name="${name}" data-media-select="${type==='media-video'?'video':'image'}"><option value="${esc(record[name]||'')}">${esc(record[name]||'Bitte auswählen')}</option></select></label><label class="inline-upload">Neue Datei hochladen<input type="file" data-upload-target="${name}" accept="${type==='media-video'?'video/mp4':'image/png,image/jpeg,image/webp'}"></label><p class="upload-progress" role="status"></p></div>`;
  const input=type==='textarea'?`<textarea lang="${name.endsWith('En')?'en':'de'}" name="${name}" rows="${name==='body'||name==='bodyEn'?7:3}">${esc(record[name])}</textarea>`:type==='select'?`<select name="${name}">${options.map(o=>{const [value,label]=Array.isArray(o)?o:[o,o];return `<option value="${value}" ${record[name]===value?'selected':''}>${label}</option>`;}).join('')}</select>`:`<input name="${name}" type="${type}" value="${esc(record[name])}" ${name==='title'?'required':''} ${type==='number'?'min="0" step="0.01"':''}>`;
  return `<label>${label}${input}</label>`;
}
function concernRow(item={},index=0){return `<div class="concern-editor-row" data-concern-row><span class="concern-order" aria-hidden="true">${String(index+1).padStart(2,'0')}</span><label>Deutsch<input data-concern-title value="${esc(item.title||'')}" maxlength="60" required></label><label>Englisch<input data-concern-title-en value="${esc(item.titleEn||'')}" maxlength="60" required></label><label class="check-label concern-custom"><input type="checkbox" data-concern-custom ${item.custom?'checked':''}> Freitext öffnen</label><button type="button" class="delete-entry remove-concern">Entfernen</button></div>`;}
function socialRow(item={}){return `<div class="social-editor-row" data-social-row><label>Plattform<select data-social-platform><option value="instagram" ${item.platform==='instagram'?'selected':''}>Instagram</option><option value="facebook" ${item.platform==='facebook'?'selected':''}>Facebook</option></select></label><label>Profil-Link<input data-social-url type="url" value="${esc(item.url||'')}" placeholder="https://www.instagram.com/..." required></label><button type="button" class="delete-entry remove-social">Entfernen</button></div>`;}
function wireSocialEditor(editor){
  const rows=$('.social-editor-rows',editor),hidden=$('input[type=hidden]',editor),add=$('.add-social',editor);
  const sync=()=>{hidden.value=JSON.stringify([...rows.querySelectorAll('[data-social-row]')].map(row=>({platform:$('[data-social-platform]',row).value,url:$('[data-social-url]',row).value.trim()})));add.disabled=rows.children.length>=2;};
  const wire=row=>{row.querySelectorAll('input,select').forEach(input=>input.addEventListener('input',sync));$('.remove-social',row).onclick=()=>{row.remove();sync();};};
  rows.querySelectorAll('[data-social-row]').forEach(wire);
  add.onclick=()=>{if(rows.children.length>=2)return;const wrapper=document.createElement('div');wrapper.innerHTML=socialRow();const row=wrapper.firstElementChild;rows.append(row);wire(row);sync();$('[data-social-url]',row).focus();};
  sync();
}
const protectedContent=(collection,id)=>collection==='settings'||(collection==='pages'&&['home','about'].includes(id));
async function removeContent(collection,record){
  const name=I18n.language==='en'&&record.titleEn?record.titleEn:record.title;
  const accepted=await new Promise(resolve=>{
    const prompt=document.createElement('dialog');prompt.className='delete-confirmation';
    prompt.setAttribute('aria-labelledby','delete-title');
    prompt.innerHTML=`<h2 id="delete-title">${I18n.translate('Diesen Eintrag löschen?')}</h2><p class="delete-name" data-no-translate>${esc(name)}</p><p>Der Eintrag wird aus der Verwaltung und der Website entfernt.</p><div class="confirmation-actions"><button type="button" class="button button-outline" data-cancel>Abbrechen</button><button type="button" class="delete-entry" data-confirm>Löschen</button></div>`;
    document.body.append(prompt);const finish=value=>{prompt.close();prompt.remove();resolve(value);};
    prompt.querySelector('[data-cancel]').onclick=()=>finish(false);
    prompt.querySelector('[data-confirm]').onclick=()=>finish(true);
    prompt.addEventListener('cancel',e=>{e.preventDefault();finish(false);});
    prompt.showModal();prompt.querySelector('[data-cancel]').focus();
  });
  if(!accepted)return;
  try{
    await api(`admin/content/${collection}/${record.id}`,'DELETE',{});
    $('#editor-dialog').close();await refresh();await render();toast('Eintrag gelöscht.');
  }catch(error){toast(error.message);}
}
function editContent(collection,record={}){
  const isNew=!record.id;
  if(collection==='reviews'&&isNew&&(content.reviews||[]).length>=3){toast(I18n.language==='en'?'All three review slots are filled. Edit or delete an existing review.':'Alle drei Bewertungsplätze sind belegt. Bitte bearbeiten oder löschen Sie eine bestehende Bewertung.');return;}
  const entryId=record.id||(collection==='reviews'?`review-${crypto.randomUUID()}`:'');
  const dialog=$('#editor-dialog');
  const baseFields=recordFields(collection,record);
  const translatable=new Set(['title','subtitle','eyebrow','intro','body','tag','methods','role','specialties','career','qualifications','details','category','duration','reviewsTitle','reviewsIntro','city','hours','saturday','payment','acute','heroAlt','teamImageAlt','source','monday','tuesday','wednesday','thursday','friday','saturdayHours','sunday']);
  translatable.add('chatEmergency');
  const englishFields=baseFields.filter(f=>translatable.has(f[0]) && !(f[0]==='title'&&['team','reviews'].includes(collection))).map(([name,label,type])=>[name+'En',label,type]);
  const editableFields=[...baseFields,...englishFields];
  dialog.innerHTML=`<div class="editor-heading"><div><span class="eyebrow">${labels[collection]}</span><h2 id="editor-title">${record.id?'Eintrag bearbeiten':'Neuer Eintrag'}</h2></div><div class="editor-heading-actions">${record.id&&!protectedContent(collection,record.id)?'<button class="delete-entry" id="delete-content">Eintrag löschen</button>':''}<button class="close-dialog" aria-label="Schließen">×</button></div></div><form id="content-form"><label>URL-Kürzel<input name="id" pattern="[a-z0-9-]+" value="${esc(record.id)}" ${record.id?'readonly':''} required placeholder="zum-beispiel-kiefer"></label><h3>Deutsch · Originaltext</h3>${baseFields.map(f=>fieldHtml(f,record)).join('')}<section class="translation-fields"><h3>Englische Übersetzung</h3><p>Leere englische Felder verwenden den deutschen Originaltext. Namen, Preise und Medien gelten für beide Sprachen.</p>${englishFields.map(f=>fieldHtml(f,record)).join('')}</section>${fieldHtml(['order','Reihenfolge','number'],record)}<div class="editor-actions"><button type="submit" class="button button-outline" name="action" value="draft">Entwurf speichern</button><button type="submit" class="button" name="action" value="publish">Veröffentlichen ↗</button></div><p class="editor-message" role="alert"></p></form>${record.id?`<details id="revisions"><summary>Vorherige Versionen</summary><div id="revision-list">Versionen werden geladen …</div></details>`:''}`;
  const close=()=>dialog.close();$('.close-dialog',dialog).onclick=close;dialog.showModal();
  if(collection==='reviews'){
    const idInput=$('#content-form').elements.id;idInput.value=entryId;idInput.closest('label').style.display='none';
    if(isNew)$('#content-form').elements.order.value=Math.max(-1,...(content.reviews||[]).map(item=>Number(item.order)||0))+1;
  }
  dialog.querySelectorAll('[data-concern-editor]').forEach(editor=>{
    const rows=$('.concern-editor-rows',editor),hidden=$('input[type=hidden]',editor);
    const sync=()=>{
      const values=[...rows.querySelectorAll('[data-concern-row]')].map(row=>({title:$('[data-concern-title]',row).value.trim(),titleEn:$('[data-concern-title-en]',row).value.trim(),...($('[data-concern-custom]',row).checked?{custom:true}:{})})).filter(item=>item.title||item.titleEn);
      hidden.value=JSON.stringify(values);
      rows.querySelectorAll('.concern-order').forEach((number,index)=>number.textContent=String(index+1).padStart(2,'0'));
    };
    const wire=row=>{
      row.querySelectorAll('input').forEach(input=>input.addEventListener('input',sync));
      $('.remove-concern',row).onclick=()=>{row.remove();sync();};
    };
    rows.querySelectorAll('[data-concern-row]').forEach(wire);
    $('.add-concern',editor).onclick=()=>{const wrapper=document.createElement('div');wrapper.innerHTML=concernRow({},rows.children.length);const row=wrapper.firstElementChild;rows.append(row);wire(row);sync();$('[data-concern-title]',row).focus();};
  });
  dialog.querySelectorAll('[data-social-editor]').forEach(wireSocialEditor);
  dialog.querySelectorAll('[data-rating-picker]').forEach(picker=>{
    const input=$('input[type=hidden]',picker),buttons=[...picker.querySelectorAll('.rating-buttons button')];
    const update=value=>{input.value=value||'';buttons.forEach(button=>{const active=Number(button.dataset.rating)<=value;button.textContent=active?'★':'☆';button.setAttribute('aria-pressed',String(active));});};
    picker.querySelectorAll('[data-rating]').forEach(button=>button.onclick=()=>update(Number(button.dataset.rating)));
  });
  $('#content-form').onsubmit=async e=>{e.preventDefault();const form=e.currentTarget,values={...record,...Object.fromEntries(new FormData(form))};for(const f of editableFields)if(f[2]==='checkbox')values[f[0]]=form.elements[f[0]].checked;for(const f of editableFields)if(['concern-list','social-list'].includes(f[2])){try{values[f[0]]=JSON.parse(values[f[0]]||'[]');}catch{values[f[0]]=[];}}values.order=Number(values.order||0);try{await api(`admin/content/${collection}/${values.id}`,'PUT',{data:values,createOnly:isNew,publish:e.submitter?.value==='publish'});dialog.close();await refresh();await render();toast(e.submitter?.value==='publish'?'Inhalt veröffentlicht.':'Entwurf gespeichert.');}catch(error){$('.editor-message').textContent=error.message;}};
  if(dialog.querySelector('[data-media-select]')){
    api('admin/media').then(media=>{
      if(!dialog.open)return;
      dialog.querySelectorAll('[data-media-select]').forEach(select=>{
        const saved=select.value,isVideo=select.dataset.mediaSelect==='video';
        const files=media.filter(m=>m.path.endsWith('.mp4')===isVideo);
        if(!isVideo)files.push({path:'/assets/hero.jpg',name:'Therapie-Foto'});
        select.innerHTML=`<option value="">Bitte auswählen</option>${files.map(m=>`<option value="${esc(m.path)}">${esc(m.name)}</option>`).join('')}`;
        if(saved&&!files.some(m=>m.path===saved))select.add(new Option(saved,saved));select.value=saved;
      });
    }).catch(e=>toast(e.message));
    let uploads=0;
    dialog.querySelectorAll('[data-upload-target]').forEach(input=>input.onchange=async()=>{
      const file=input.files[0];if(!file)return;
      const message=input.closest('.media-field').querySelector('.upload-progress');uploads++;dialog.querySelectorAll('button[type=submit]').forEach(b=>b.disabled=true);input.disabled=true;
      try{const result=await uploadMedia(file,$('#content-form').elements.heroAlt?.value||$('#content-form').elements.title.value||file.name,p=>message.textContent=`Upload: ${p} %`);const select=$('#content-form').elements[input.dataset.uploadTarget];select.add(new Option(file.name,result.path));select.value=result.path;message.textContent='Hochgeladen. Entwurf speichern oder veröffentlichen, um die Auswahl zu übernehmen.';}catch(error){message.textContent=error.message;}finally{uploads--;input.disabled=false;if(!uploads)dialog.querySelectorAll('button[type=submit]').forEach(b=>b.disabled=false);}
    });
  }
  if(record.id){
    const previewPath=collection==='pages'?(record.id==='home'?'/':record.id==='about'?'/ueber-uns':'/'+record.id):collection==='symptoms'?'/schwerpunkte/'+record.id:collection==='services'?'/leistungen/'+record.id:collection==='team'?'/team/'+encodeURIComponent(record.id):collection==='prices'?'/ablauf-wahltherapie':'/';
    $('#revisions').insertAdjacentHTML('beforebegin',`<p><a class="text-link" href="${previewPath}?preview=1" target="_blank" rel="noopener">Gespeicherten Entwurf ansehen ↗</a></p><button type="button" class="danger-text" id="unpublish">Veröffentlichung zurücknehmen</button>`);
    $('#unpublish').onclick=async()=>{try{await api(`admin/content/${collection}/${record.id}`,'PATCH',{});dialog.close();await refresh();await render();toast('Veröffentlichung zurückgenommen.');}catch(error){$('.editor-message').textContent=error.message;}};
    $('#delete-content')?.addEventListener('click',()=>removeContent(collection,record));
    $('#revisions').addEventListener('toggle',async e=>{if(!e.target.open)return;try{const revisions=await api(`admin/revisions?collection=${collection}&id=${record.id}`);$('#revision-list').innerHTML=revisions.map(r=>`<div class="revision-row"><span>${formatDate(r.created_at)} · ${esc(r.actor)}</span><button type="button" data-restore="${r.id}">In Editor laden</button></div>`).join('')||'<p>Noch keine früheren Versionen.</p>';document.querySelectorAll('[data-restore]').forEach(b=>b.onclick=()=>{const snapshot=JSON.parse(revisions.find(r=>r.id===Number(b.dataset.restore)).snapshot);for(const [key,value]of Object.entries(snapshot)){const input=$('#content-form').elements[key];if(input){if(input.type==='checkbox')input.checked=Boolean(value);else input.value=value;}}toast('Version geladen. Speichern oder veröffentlichen Sie die Änderung.');});}catch(error){$('#revision-list').textContent=error.message;}});
  }
}
async function init(){try{user=await api('me');await refresh();shell();await render();}catch(error){user=null;login();}}
async function bootAdmin(){
  const fragment=new URLSearchParams(location.hash.slice(1)),query=new URLSearchParams(location.search);
  const recovery=fragment.get('type')==='recovery'||query.get('type')==='recovery'||fragment.has('error')||query.has('error');
  if(!recovery){await init();return;}
  const accessToken=fragment.get('access_token'),tokenHash=query.get('token_hash')||fragment.get('token_hash');
  const message=fragment.get('error_description')||query.get('error_description');
  history.replaceState(null,'',`/admin?lang=${I18n.language}`);
  if(message){showRecoveryForm(I18n.language==='en'?'This link is invalid or has expired. Request a new one.':'Dieser Link ist ungültig oder abgelaufen. Fordern Sie einen neuen an.');return;}
  if(accessToken){recoveryAccessToken=accessToken;showRecoveryForm();return;}
  if(tokenHash){showRecoveryForm(I18n.language==='en'?'Checking your recovery link…':'Wiederherstellungslink wird geprüft …');try{const result=await api('recovery/verify','POST',{tokenHash});recoveryAccessToken=result.accessToken;showRecoveryForm();}catch(error){showRecoveryForm(error.message);}return;}
  showRecoveryForm(I18n.language==='en'?'This link is invalid or has expired. Request a new one.':'Dieser Link ist ungültig oder abgelaufen. Fordern Sie einen neuen an.');
}
bootAdmin();
