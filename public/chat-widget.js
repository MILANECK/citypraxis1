import {choices,label,labels,nextStep,stepsFor,summaryRows,defaults} from './chat-model.js';

const en=window.I18n?.language==='en',lang=en?'en':'de',t=(de,enText)=>en?enText:de;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key='citypraxis-reception-v1';
const prompts={request_type:t('Wobei dürfen wir helfen?','How can we help?'),patient_status_claimed:t('Waren Sie schon bei Citypraxis in Behandlung?','Have you been treated at Citypraxis before?'),previous_therapist:t('Wer hat Sie bisher betreut?','Who was your previous therapist?'),discipline:t('Für welche Fachrichtung interessieren Sie sich?','Which therapy are you interested in?'),body_area:t('Um welchen Körperbereich geht es?','Which area of the body is involved?'),description:t('Was möchten Sie dem Team kurz mitteilen?','What would you like the team to know?'),referral_claimed:t('Haben Sie bereits eine ärztliche Verordnung?','Do you already have a medical referral?'),appointment_details:t('Welchen Termin betrifft Ihre Anfrage?','Which appointment is your request about?'),availability:t('Wann sind Sie grundsätzlich verfügbar?','When are you generally available?'),contact:t('Wie kann unser Team Sie erreichen?','How can our team reach you?'),preferred_contact:t('Wie dürfen wir uns bei Ihnen melden?','How would you like us to contact you?'),callback_time:t('Wann passt ein Rückruf am besten?','When is a good time to call?')};
const errors={invalid_email:t('Bitte prüfen Sie Ihre E-Mail-Adresse.','Please check your email address.'),invalid_phone:t('Bitte eine gültige Telefonnummer mit Vorwahl eingeben, z. B. +43 …','Please enter a valid phone number with a country code, e.g. +43 …'),invalid_name:t('Bitte Vor- und Nachname prüfen.','Please check your first and last name.'),rate_limit:t('Bitte machen Sie eine kurze Pause und versuchen Sie es später erneut.','Please pause and try again later.'),session_expired:t('Diese Sitzung ist abgelaufen. Bitte starten Sie eine neue Anfrage.','This session has expired. Please start a new request.'),already_submitted:t('Diese Anfrage wurde bereits übermittelt. Für Änderungen bitte eine neue Anfrage starten.','This request was already sent. Please start a new request for changes.'),invalid_choice:t('Bitte wählen Sie die passenden Optionen.','Please select the relevant options.'),invalid_description:t('Bitte beschreiben Sie Ihr Anliegen kurz und ohne Links.','Please briefly describe your request without links.'),invalid_text:t('Bitte einen kurzen, verständlichen Text ohne Links eingeben.','Please enter a short, meaningful message without links.'),consent_required:t('Bitte bestätigen Sie die Angaben und Ihr Einverständnis.','Please confirm the details and your consent.')};
const contactLabels={first_name:t('Vorname','First name'),last_name:t('Nachname','Last name'),email:t('E-Mail','Email'),phone:t('Telefon mit Vorwahl','Phone with country code')};
let state={data:{language:lang},receipts:[],started:false,intro:false},config={...defaults},opened=false,busy=false,pending=null,editing=null,emergency=false,medical=false;
let expiryTimer;
try{const saved=JSON.parse(sessionStorage.getItem(key));if(saved?.expires>Date.now()){state=saved;state.data.language=lang;}else sessionStorage.removeItem(key);}catch{}
const save=()=>{try{if(state.started)sessionStorage.setItem(key,JSON.stringify(state));}catch{}};
const root=document.createElement('div');root.id='cp-chat';root.dataset.noTranslate='';
root.innerHTML=`<button class="chat-launch" aria-expanded="false" aria-controls="chat-window"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M20 11.5a8 8 0 0 1-8 8H5l-3 2v-10a9 9 0 0 1 18 0Z"/><path d="M7 11h.01M11 11h.01M15 11h.01" stroke-width="2.5" stroke-linecap="round"/></svg><span>${t('Chat mit uns','Chat with us')}</span></button><section id="chat-window" class="chat-window" role="dialog" aria-labelledby="chat-title" aria-hidden="true" inert><header class="chat-heading"><img src="/assets/logo-symbol.png" width="30" height="42" alt=""><div><strong id="chat-title">${t('Ihr digitaler Empfang','Your digital reception')}</strong><small>Citypraxis · ${t('Wir hören zu.','We’re here to listen.')}</small></div><button type="button" class="chat-close" aria-label="${t('Chat schließen','Close chat')}">×</button></header><div class="chat-scroll"><div class="chat-content"></div><p class="chat-status" role="status" aria-live="polite"></p></div><footer class="chat-footer"><button type="button" data-reset>${t('Neu starten','Start again')}</button><a href="/datenschutz?lang=${lang}#digitaler-empfang">${t('Datenschutz','Privacy')}</a><span>${t('Kein Live-Chat','Not a live chat')}</span></footer></section>`;
document.body.append(root);
const $=s=>root.querySelector(s),panel=$('.chat-window'),content=$('.chat-content'),status=$('.chat-status');
const button=(text,action,cls='')=>`<button type="button" class="chat-action ${cls}" data-action="${action}">${text}</button>`;
const submit=text=>`<button type="submit" class="chat-primary">${text||t('Weiter','Continue')}</button>`;
const note=text=>`<p class="chat-note">${text}</p>`;
const input=(field,title,max=100,required=false)=>`<label>${esc(title)}<input name="${field}" value="${esc(state.data[field])}" maxlength="${max}" ${required?'required':''}></label>`;
const textarea=(field,title,max=650,required=false)=>`<label>${esc(title)}<textarea name="${field}" rows="3" maxlength="${max}" ${required?'required':''}>${esc(state.data[field])}</textarea><small>${t('Maximal','Up to')} ${max} ${t('Zeichen','characters')}</small></label>`;
function selection(field,multiple=false){return `<div class="chat-choices">${Object.keys(choices[field]).map(value=>{const chosen=multiple?state.data[field]?.includes(value):state.data[field]===value;return `<label class="chat-choice"><input type="${multiple?'checkbox':'radio'}" name="${field}" value="${value}" ${chosen?'checked':''}><span>${esc(label(field,value,lang))}</span></label>`;}).join('')}</div>`;}
function rows(d){return `<dl class="chat-summary">${summaryRows(d,lang).map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;}
async function api(route,body){
  const response=await fetch(`/api/chat/${route}`,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify({token:state.token,...body}):undefined,signal:AbortSignal.timeout(20000)});
  const result=await response.json();if(!response.ok){const error=new Error(errors[result.code]||t('Das hat leider nicht geklappt. Ihre Eingaben bleiben erhalten. Bitte erneut versuchen.','That did not work. Your entries are kept. Please try again.'));error.code=result.code;throw error;}return result;
}
function scheduleExpiry(){clearTimeout(expiryTimer);if(!state.expires)return;expiryTimer=setTimeout(()=>{try{sessionStorage.removeItem(key);}catch{}state={data:{language:lang},receipts:[],started:false,intro:false};pending=null;editing=null;medical=false;render();status.textContent=errors.session_expired;},Math.max(0,state.expires-Date.now()));}
async function session(){if(state.token&&state.expires>Date.now()){scheduleExpiry();return;}const result=await api('session');state.token=result.token;state.expires=result.expires;config=result;state.config=config;scheduleExpiry();save();}
if(state.config)config=state.config;
async function work(fn){if(busy)return;busy=true;status.textContent=t('Einen Moment …','One moment…');root.setAttribute('aria-busy','true');root.querySelectorAll('.chat-content button').forEach(b=>b.disabled=true);try{await fn();status.textContent='';}catch(error){if(error.code==='emergency'){emergency=true;render();}else{status.textContent=error.message;if(error.code==='session_expired')$('[data-reset]').focus();}}finally{busy=false;root.removeAttribute('aria-busy');root.querySelectorAll('.chat-content button').forEach(b=>b.disabled=false);}}
function render(){
  queueMicrotask(()=>{if(opened){const title=content.querySelector('h3');if(title){title.tabIndex=-1;title.focus({preventScroll:true});}}});
  const d=state.data,step=editing||nextStep(d);status.textContent='';
  if(state.sent){content.innerHTML=`<div class="chat-success" aria-hidden="true">✓</div><h3>${t('Ihre Anfrage ist angekommen.','Your request has been received.')}</h3><p>${t('Das Citypraxis-Team meldet sich während der Öffnungszeiten bei Ihnen. Ein Termin, eine Änderung oder Absage ist damit noch nicht bestätigt.','The Citypraxis team will contact you during opening hours. This does not confirm an appointment, change or cancellation.')}</p>${note(t('Anfragenummer','Request number')+' #'+esc(state.sent))}`;return;}
  if(emergency){content.innerHTML=`<h3>${t('Bitte wenden Sie sich direkt an Hilfe.','Please seek help directly.')}</h3><p>${esc(config[en?'emergencyEn':'emergencyDe'])}</p><div class="chat-choices"><a class="chat-primary" href="tel:144">${t('Rettung 144','Ambulance 144')}</a><a class="chat-action" href="tel:112">${t('Notruf 112','Emergency 112')}</a></div>${note(t('Dieser Chat ist kein Notfalldienst.','This chat is not an emergency service.'))}`;return;}
  if(!state.started){content.innerHTML=`<span class="chat-eyebrow">${t('WILLKOMMEN BEI CITYPRAXIS','WELCOME TO CITYPRAXIS')}</span><h3>${t('Was dürfen wir für Sie tun?','How can we help you?')}</h3><p>${t('Ich helfe Ihnen, eine Anfrage an unser Team vorzubereiten. Ich bin ein digitaler Assistent und gebe keine medizinische Beratung.','I can help prepare a request for our team. I’m a digital assistant and cannot provide medical advice.')}</p>${note(t('Keine direkte Terminbuchung. Für Notfälle in Österreich: 144 oder 112.','No direct appointment booking. For emergencies in Austria: 144 or 112.'))}<form data-form="start"><label class="chat-check"><input type="checkbox" name="consent" required><span>${t('Ich bin einverstanden, dass meine Angaben, auch freiwillige Gesundheitsangaben, zur Bearbeitung meiner Anfrage verarbeitet werden. Der Entwurf bleibt in diesem Browser-Tab für höchstens 30 Minuten gespeichert.','I agree to my details, including any health information I choose to provide, being processed to handle my request. The draft stays in this browser tab for up to 30 minutes.')} <a href="/datenschutz?lang=${lang}#digitaler-empfang">${t('Datenschutz lesen','Read privacy information')}</a></span></label>${config.aiAvailable?`<label class="chat-check"><input type="checkbox" name="ai"><span>${t('Optional: Freitext mit KI von OpenAI verstehen lassen. Dazu wird meine aktuelle Nachricht, möglicherweise mit Gesundheitsangaben, an OpenAI gesendet. Ich kann auch nur die Auswahlfelder nutzen.','Optional: let OpenAI AI help interpret free text. My current message, potentially including health information, is sent to OpenAI. I can use the selection buttons instead.')}</span></label>`:''}${submit(t('Anfrage starten','Start a request'))}</form>`;bind();return;}
  if(medical){content.innerHTML=`<h3>${t('Eine kurze Information','A quick note')}</h3><p>${esc(config[en?'medicalEn':'medicalDe'])}</p>${button(t('Als Frage an das Team aufnehmen','Include my question for the team'),'medical','chat-primary')}`;bind();return;}
  if(pending){const s=pending.result.suggestions;content.innerHTML=`<span class="chat-eyebrow">${t('BITTE KURZ PRÜFEN','PLEASE CHECK')}</span><h3>${pending.result.confidence<.8?t('Habe ich Sie richtig verstanden?','Have I understood you correctly?'):t('Passt diese Zusammenfassung?','Does this look right?')}</h3><p class="chat-quote">${esc(pending.raw)}</p><dl class="chat-summary">${Object.entries(s).map(([k,v])=>`<div><dt>${esc(contactLabels[k]||({request_type:t('Anfrage','Request'),patient_status_claimed:t('Patientenstatus','Patient status'),body_area:t('Körperbereich','Body area'),preferred_days:t('Tage','Days'),preferred_times:t('Zeiten','Times'),availability_notes:t('Hinweis','Note')}[k]||k))}</dt><dd>${esc(labels(k,v,lang))}</dd></div>`).join('')}</dl>${note(t('Nur Ihre Angaben – keine medizinische Einschätzung oder Terminbestätigung.','Your details only — no medical assessment or appointment confirmation.'))}${button(t('Ja, übernehmen','Yes, use these details'),'confirm','chat-primary')}${button(t('Ich wähle selbst','I’ll choose myself'),'reject')}`;bind();return;}
  if(!state.intro){content.innerHTML=`<h3>${t('Erzählen Sie uns kurz von Ihrem Anliegen.','Tell us briefly what you need.')}</h3>${note(t('Oder starten Sie direkt mit den Auswahlfeldern. Bitte keine Befunde oder ausführlichen Krankengeschichten eingeben.','Or go straight to the selection buttons. Please do not include reports or a detailed medical history.'))}<form data-form="initial">${textarea('initial_message_raw',t('Ihre Nachricht (optional)','Your message (optional)'))}${submit()}</form>${button(t('Mit Auswahlfeldern starten','Use selection buttons'),'skip-intro')}`;bind();return;}
  if(step==='review'){
    content.innerHTML=`<span class="chat-eyebrow">${t('FAST GESCHAFFT','ALMOST DONE')}</span><h3>${t('Ihre Anfrage auf einen Blick.','Your request at a glance.')}</h3>${rows(d)}<details class="chat-edit"><summary>${t('Angaben ändern','Edit details')}</summary>${stepsFor(d).map(k=>button(esc(prompts[k]),'edit:'+k)).join('')}</details><form data-form="review"><label class="chat-check"><input type="checkbox" name="review" required><span>${t('Ich habe meine Angaben geprüft und möchte sie an Citypraxis übermitteln.','I have reviewed my details and would like to send them to Citypraxis.')}</span></label>${note(t('Dies ist eine Anfrage. Das Team bestätigt alle Termine, Änderungen und Absagen persönlich.','This is a request. The team confirms all appointments, changes and cancellations personally.'))}${submit(t('Anfrage senden','Send my request'))}</form>`;bind();return;
  }
  let fields='';
  if(step==='availability')fields=`${note(t('Das sind Wünsche, keine freien Termine. Mehrfachauswahl möglich.','These are preferences, not available appointments. Select all that apply.'))}<fieldset><legend>${t('Tage','Days')}</legend>${selection('preferred_days',true)}</fieldset><fieldset><legend>${t('Zeiten','Times')}</legend>${selection('preferred_times',true)}</fieldset>${textarea('availability_notes',t('Zusätzlicher Hinweis (optional)','Additional note (optional)'),200)}${button(t('Freitext verstehen lassen','Interpret my note'),'interpret-availability')}`;
  else if(step==='contact')fields=`${note(t('Wir prüfen das Format, nicht die Identität oder Erreichbarkeit. Bereits angegebene Daten sind vorausgefüllt.','We check the format, not your identity or ownership of these contact details. Details already provided are filled in.'))}<div class="chat-contact-fields">${Object.entries(contactLabels).map(([k,title])=>`<label>${title}<input name="${k}" type="${k==='email'?'email':k==='phone'?'tel':'text'}" autocomplete="${{first_name:'given-name',last_name:'family-name',email:'email',phone:'tel'}[k]}" value="${esc(d[k])}" maxlength="${k==='email'?200:k==='phone'?40:48}" required></label>`).join('')}</div>`;
  else if(step==='description')fields=textarea(step,t('Kurze Nachricht','Short message'),650,!['appointment_request','change_request','cancellation_request','therapist_change'].includes(d.request_type))+note(t('Eine kurze Beschreibung reicht. Keine Befunde hochladen.','A short description is enough. Please do not upload medical reports.'));
  else if(step==='previous_therapist'||step==='appointment_details')fields=input(step,t('Falls bekannt (optional)','If known (optional)'),step==='previous_therapist'?100:200)+note(t('Diese Angabe wird nicht mit einem Patientenregister oder Kalender abgeglichen.','This information is not checked against a patient register or calendar.'));
  else if(step==='body_area')fields=selection(step,true)+textarea('problem_location_raw',t('Oder in eigenen Worten (optional)','Or in your own words (optional)'),300)+button(t('Beschreibung verstehen lassen','Interpret my description'),'interpret-body');
  else fields=selection(step)+(['patient_status_claimed','referral_claimed'].includes(step)?note(t('Wir übernehmen Ihre eigene Angabe, ohne sie zu verifizieren.','We record your own answer without verifying it.')):'');
  content.innerHTML=`<span class="chat-eyebrow">${t('IHRE ANFRAGE','YOUR REQUEST')}</span><h3 tabindex="-1">${prompts[step]}</h3><form data-form="step" data-step="${step}">${fields}${submit()}</form>${editing?button(t('Zur Übersicht','Back to review'),'review'):''}`;bind();
}
function bind(){
  content.querySelectorAll('form').forEach(form=>form.onsubmit=e=>{e.preventDefault();work(async()=>{
    const values=new FormData(form),kind=form.dataset.form,d=state.data;
    if(kind==='start'){await session();state.started=true;d.consent=true;d.ai_consent=values.get('ai')==='on';save();render();return;}
    if(kind==='initial'){const raw=values.get('initial_message_raw').trim();if(raw){await understand(raw,'initial');}else{state.intro=true;render();}return;}
    if(kind==='review'){
      const result=await api('submit',{data:{...d,language:lang,review_confirmed:values.get('review')==='on'},receipts:state.receipts});
      clearTimeout(expiryTimer);state={sent:result.id,data:{},receipts:[]};try{sessionStorage.removeItem(key);}catch{}render();return;
    }
    const step=form.dataset.step;
    if(step==='contact')Object.assign(d,await api('contact',Object.fromEntries(values)));
    else if(step==='availability'){
      const days=values.getAll('preferred_days'),times=values.getAll('preferred_times');if(!days.length||!times.length)throw new Error(errors.invalid_choice);
      const raw=values.get('availability_notes').trim();if(raw&&raw!==d.availability_notes){await understand(raw,'availability',{preferred_days:days,preferred_times:times});return;}
      Object.assign(d,{preferred_days:days,preferred_times:times,availability_notes:raw});
    }else if(step==='body_area'){
      const areas=values.getAll(step),raw=values.get('problem_location_raw').trim();if(raw&&raw!==d.problem_location_raw){await understand(raw,'body_area',areas.length?{body_area:areas}:{});return;}
      if(!areas.length)throw new Error(errors.invalid_choice);Object.assign(d,{body_area:areas,problem_location_raw:raw});
    }else if(step==='description'){
      const raw=values.get(step).trim();if(raw&&raw!==d.description){await understand(raw,'description');return;}d.description=raw;
    }else {const value=values.get(step);if(value===null)throw new Error(errors.invalid_choice);d[step]=value.trim();if(step==='request_type'){for(const k of ['discipline','body_area','referral_claimed','appointment_details','preferred_days','preferred_times','availability_notes'])delete d[k];}}
    editing=null;save();render();$('.chat-scroll').scrollTop=0;
  });});
  content.querySelectorAll('input[type=checkbox]').forEach(input=>input.onchange=()=>{if(!['preferred_days','preferred_times','body_area'].includes(input.name))return;const exclusive=input.name==='body_area'?'unsure':'flexible';if(input.checked)content.querySelectorAll(`input[name="${input.name}"]`).forEach(other=>{if(other!==input&&(input.value===exclusive||other.value===exclusive))other.checked=false;});});
  content.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>work(async()=>{
    const action=b.dataset.action;
    if(action==='skip-intro'){state.intro=true;}
    else if(action==='confirm'){
      Object.assign(state.data,pending.extra,pending.result.suggestions);state.receipts.push(pending.result.receipt);state.receipts=state.receipts.filter(Boolean).slice(-12);finishInterpretation(pending);pending=null;editing=null;
    }else if(action==='reject'){finishInterpretation(pending,true);pending=null;}
    else if(action==='medical'){medical=false;finishInterpretation(pending,true);pending=null;}
    else if(action.startsWith('edit:'))editing=action.slice(5);
    else if(action==='review')editing=null;
    else if(action.startsWith('interpret-')){const context=action==='interpret-body'?'body_area':'availability';const field=context==='body_area'?'problem_location_raw':'availability_notes';await understand(content.querySelector(`[name="${field}"]`).value,context);return;}
    save();render();$('.chat-scroll').scrollTop=0;
  }));
}
function finishInterpretation(p,rejected=false){
  const d=state.data;
  if(p.context==='initial'){state.intro=true;d.initial_message_raw=p.raw;d.description=p.raw;if(d.preferred_days?.length&&d.preferred_times?.length)d.availability_notes=d.availability_notes||'';}
  if(p.context==='body_area')d.problem_location_raw=p.raw;
  if(p.context==='availability')d.availability_notes=p.raw;
  if(p.context==='description')d.description=p.raw;
  if(rejected&&p.context==='body_area')editing='body_area';
  else if(rejected&&p.context==='availability')editing='availability';
  else editing=null;
}
async function understand(raw,context,extra={}){
  raw=raw.trim();if(!raw)throw new Error(errors.invalid_text);
  const result=await api('interpret',{raw,context,aiConsent:state.data.ai_consent===true});
  if(result.emergency){emergency=true;render();return;}
  if(!result.relevant)throw new Error(t('Ich kann nur bei Anliegen an die Praxis helfen. Bitte wählen Sie eine passende Option oder beschreiben Sie Ihr Anliegen kurz.','I can only help with requests for the practice. Please choose a relevant option or briefly describe your request.'));
  pending={raw,context,result,extra};
  if(result.medical_advice){medical=true;render();return;}
  if(Object.keys(result.suggestions).length){render();return;}
  Object.assign(state.data,extra);finishInterpretation(pending);pending=null;save();render();
}
function setOpen(value){opened=value;root.classList.toggle('is-open',value);$('.chat-launch').setAttribute('aria-expanded',String(value));panel.setAttribute('aria-hidden',String(!value));panel.inert=!value;if(value){$('.chat-close').focus();}else $('.chat-launch').focus();}
$('.chat-launch').onclick=()=>{setOpen(!opened);if(opened)work(async()=>{await session();render();});};
$('.chat-close').onclick=()=>setOpen(false);
root.addEventListener('keydown',event=>{if(event.key==='Escape'&&opened){event.preventDefault();setOpen(false);}});
$('[data-reset]').onclick=()=>{if(busy)return;if(state.started&&!state.sent&&!confirm(t('Diesen Entwurf verwerfen und neu starten?','Discard this draft and start again?')))return;try{sessionStorage.removeItem(key);}catch{}state={data:{language:lang},receipts:[],started:false,intro:false};pending=null;editing=null;emergency=false;medical=false;work(async()=>{await session();render();});};
scheduleExpiry();render();
