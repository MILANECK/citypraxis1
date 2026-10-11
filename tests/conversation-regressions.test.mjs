import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createConversationService,conversationFacts} from '../src/chat/conversation.mjs';
import {newSession} from '../src/chat/security.mjs';
import {structuredResponse} from '../src/chat/response.mjs';
import {patientConfirmationEmail} from '../src/chat/notify.mjs';

const value=(changes={})=>({kind:'practice_question',input_language:'unclear',answer:'Our reception team can help.',related_pages:[],booking_intent:'unspecified',booking_choice:'unspecified',needs_clarification:false,reason:null,availability:null,first_name:null,last_name:null,patient_status:null,...changes});
const output=answer=>({status:'completed',output:[{type:'message',role:'assistant',status:'completed',phase:'final_answer',content:[{type:'output_text',text:JSON.stringify(answer)}]}]});
function fixture({language='en',interpret=input=>value({reason:/pain|schmerzen/iu.test(input.visitorMessage)?input.visitorMessage:null}),facts=conversationFacts(),response=output,emailStatus=true}={}){
  const token=newSession(),inputs=[],saved=[],emails=[];
  const store={recent:async()=>[],save:async row=>{const stored={...row,id:1};saved.push(stored);return {created:true,row:stored};},notification:async()=>{}};
  const service=createConversationService({store,getFacts:async()=>facts,fetcher:async(url,options)=>{
    if(url==='https://api.resend.com/emails'){emails.push(JSON.parse(options.body));return {ok:emailStatus};}
    assert.equal(url,'https://api.openai.com/v1/responses');
    const request=JSON.parse(options.body),input=JSON.parse(request.input);inputs.push({request,...input});
    return {ok:true,json:async()=>response(interpret(input))};
  }});
  const call=async(route,body={})=>{let result;await service.handle({method:'POST',headers:{},socket:{remoteAddress:'test'}},`/api/chat/${route}`,{token,language,...body},(status,data)=>result={status,...data});return result;};
  return {call,inputs,saved,emails,turn:message=>call('turn',{message,consent:true,turnKey:randomUUID()})};
}
function regression(title,fn){test(title,async()=>{
  const old={...process.env};process.env.OPENAI_API_KEY='fixture';process.env.CHAT_AI_ENABLED='true';
  for(const key of ['RESEND_API_KEY','CHAT_NOTIFY_TO','CHAT_NOTIFY_FROM','PATIENT_CONFIRMATION_FROM'])delete process.env[key];
  try{await fn();}finally{process.env=old;}
});}
async function ready(f,language='en',fullName='Anna-Lena Birkenhain.'){
  await f.turn(language==='de'?'Ich möchte einen Termin':'I want an appointment');
  await f.turn(language==='de'?'Vorbereiten':'I want to continue');
  await f.turn(fullName);await f.turn('anna2026@example.test');await f.turn('+1 202 555 0100');
  const result=await f.turn(language==='de'?'Schulterschmerzen':'Shoulder pain');assert.equal(result.ready,true);return result;
}

regression('CP-048/050: commentary is not joined to JSON; incomplete/refused/ambiguous finals fail safely',async()=>{
  const message=(phase,answer)=>output(answer).output.map(item=>({...item,phase}))[0];
  const f=fixture({response:answer=>({status:'completed',output:[message('commentary',value({answer:'Preparing the answer.'})),message('final_answer',answer)]})});
  assert.equal((await f.turn('What payment methods do you accept?')).status,200);
  assert.throws(()=>structuredResponse({status:'completed',output:[message('final_answer',value()),message('final_answer',value())]}),{code:'ai_unavailable'});
  assert.throws(()=>structuredResponse({...output(value()),status:'incomplete'}),{code:'ai_unavailable'});
  assert.throws(()=>structuredResponse({status:'completed',output:[{...message('final_answer',value()),status:'incomplete'}]}),{code:'ai_unavailable'});
  assert.throws(()=>structuredResponse({status:'completed',output:[{...message('final_answer',value()),content:[{type:'refusal'}]}]}),{code:'ai_unavailable'});
  const legacy={status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(value())}]}]};
  assert.deepEqual(structuredResponse(legacy),value());
});

regression('CP-009/021/047/053: full-name labels, titles, surname particles and sentence punctuation survive review',async()=>{
  for(const [language,raw,expected] of [
    ['en','My full name is Dr. Anna-Lena Birkenhain.','Dr. Anna-Lena Birkenhain'],
    ['de','Mein vollständiger Name ist Dr. Anna-Lena Musterfrau.','Dr. Anna-Lena Musterfrau'],
    ['de','Anna-Lena von Birkenhain.','Anna-Lena von Birkenhain'],
    ['en','My first and last name is Anna Marie O’Brien.','Anna Marie O’Brien']
  ]){
    const f=fixture({language}),review=await ready(f,language,raw);
    assert.equal(review.summary.find(([key])=>key==='Name')[1],expected);
    assert.equal((await f.call('finish',{confirmed:true})).status,201);
    assert.equal(f.saved[0].name,expected);
  }
});

regression('CP-021/030/032: self-reported status and explicitly requested therapy are retained without accepting model guesses',async()=>{
  for(const [language,statusMessage,therapy,statusLabel] of [
    ['en','I am an existing patient.','I would like physiotherapy for shoulder pain.','Yes — treated here before'],
    ['de','Ich bin bereits bei Ihnen in Behandlung.','Ich möchte Physiotherapie wegen Schulterschmerzen.','Ja – bereits in Behandlung']
  ]){
    const f=fixture({language,interpret:input=>value({reason:/pain|schmerzen/iu.test(input.visitorMessage)?(language==='de'?'Schulterschmerzen':'Shoulder pain'):null,patient_status:'new',first_name:'Invented',last_name:'Person'})});
    await f.turn(language==='de'?'Ich möchte einen Termin':'I want an appointment');await f.turn(language==='de'?'Vorbereiten':'I want to continue');
    await f.turn(statusMessage);await f.turn('Anna Birkenhain');await f.turn('anna@example.test');await f.turn('+1 202 555 0100');
    const review=await f.turn(therapy);
    assert.equal(review.ready,true);
    assert.equal(review.summary.find(([key])=>/Patient status|Patientenstatus/u.test(key))[1],statusLabel);
    assert.match(review.summary.find(([key])=>/description|Beschreibung/u.test(key))[1],/physiotherap/iu);
    assert.equal((await f.call('finish',{confirmed:true})).received,true);
    assert.notEqual(f.saved[0].name,'Invented Person');
  }
});

regression('CP-014: ordinals follow the offered order and the form can be selected after intake has started',async()=>{
  for(const [language,ordinal] of [['de','Das erste bitte'],['en','The first one please']]){
    const f=fixture({language});await f.turn(language==='de'?'Ich möchte einen Termin':'I want an appointment');
    const form=await f.turn(ordinal);assert.match(form.message,/\]\(\/termin\?lang=/u);assert.doesNotMatch(form.message,/Vor- und Nachnamen|first and last name/u);assert.equal(f.inputs.length,0);
  }
  const f=fixture({language:'de',interpret:()=>value({booking_choice:'form',booking_intent:'defer'})});
  await f.turn('Ich möchte einen Termin');await f.turn('Vorbereiten');
  const switched=await f.turn('Eigentlich möchte ich doch lieber den Link zum Formular.');
  assert.match(switched.message,/Formular für Terminanfragen/u);assert.doesNotMatch(switched.message,/Vor- und Nachnamen/u);assert.equal(switched.ready,false);
  const refused=await f.turn('Ich möchte meine Daten nicht hier angeben; bitte schicken Sie mir den Link zum Formular.');
  assert.match(refused.message,/Formular für Terminanfragen/u);assert.doesNotMatch(refused.message,/Vor- und Nachnamen/u);
});

regression('CP-021/030: first-visit fragments and dialect status survive clarification and bundled opening details',async()=>{
  const f=fixture({language:'de',interpret:input=>input.visitorMessage.startsWith('servus')?value({kind:'appointment',needs_clarification:true,booking_intent:'request'}):value({kind:'appointment',booking_intent:'request',reason:'Rückenbeschwerden'})});
  const first=await f.turn('servus, i bräucht an termin wegen meim ruckn; bin no ned bei euch gwesn');assert.equal(first.clarification,'booking');
  await f.turn('Ja, genau – ich möchte eine Terminanfrage für Physiotherapie wegen Rückenbeschwerden stellen.');
  await f.turn('Anna Birkenhain');await f.turn('anna@example.test');const review=await f.turn('+1 202 555 0100');
  assert.equal(review.ready,true);assert.ok(review.summary.some(([,v])=>v==='Nein – noch nicht'));
  const bundled=fixture({interpret:()=>value({kind:'appointment',booking_intent:'request',reason:'back discomfort',availability:'Thursday after 17:00'})});
  const all=await bundled.turn("Hi, I'm AlexA Musterer, first visit, email alex@example.test, phone +12025550101, back discomfort, physiotherapy, Thursday after 17:00. I’d like to prepare a request here.");
  assert.equal(all.ready,true);assert.ok(all.summary.some(([,v])=>v==='No — not yet'));
  assert.match(all.summary.find(([key])=>key==='Your short description')[1],/physiotherapy/u);
});

regression('CP-013/016/058: earlier contacts and original availability resolve beyond the recent model window',async()=>{
  for(const language of ['de','en']){
    const f=fixture({language});await ready(f,language);
    await f.call('edit',{field:'availability'});await f.turn(language==='de'?'Donnerstag nach 17 Uhr':'Thursday after 17:00');
    await f.call('edit',{field:'availability'});await f.turn(language==='de'?'Freitag vormittags':'Friday morning');
    await f.call('edit',{field:'availability'});
    const restored=await f.turn(language==='de'?'doch wieder wie zuerst, Donnerstag':'Actually, back to the first choice, Thursday');
    assert.equal(restored.ready,true);assert.match(restored.summary.find(([key])=>/Availability|Verfügbarkeit/u.test(key))[1],/17/u);
    for(let i=0;i<4;i++)await f.turn(language==='de'?'Wie kann ich zur Praxis kommen?':'How can I reach the practice?');
    await f.call('edit',{field:'email'});const before=f.inputs.length;
    const email=await f.turn(language==='de'?'Bitte wieder die E-Mail von vorher':'Use the same email as before please');
    assert.equal(f.inputs.length,before);assert.equal(email.ready,true);assert.ok(email.summary.some(([,v])=>v==='anna2026@example.test'));
    assert.equal((await f.call('finish',{confirmed:true})).status,201);assert.match(f.saved[0].intake.availability_notes,/17/u);
    assert.equal(f.saved[0].email,'anna2026@example.test');
  }
});

regression('references clarify missing values and preserve the latest time when first refers to summarizing',async()=>{
  const f=fixture();await ready(f);await f.call('edit',{field:'availability'});
  const missing=await f.turn('same as before; summarize first, do not send');
  assert.equal(missing.ready,false);assert.match(missing.message,/Which days or times/u);assert.equal((await f.call('finish',{confirmed:true})).code,'invalid_request');
  await f.turn('Thursday after 17:00');await f.call('edit',{field:'availability'});await f.turn('Friday morning');await f.call('edit',{field:'availability'});
  const restored=await f.turn('same as before; summarize first, do not send');
  assert.equal(restored.ready,true);assert.ok(restored.summary.some(([,v])=>v==='Friday morning'));assert.equal(f.saved.length,0);
});

regression('CP-015/031: email corrections containing digits do not trigger a phone error',async()=>{
  const f=fixture();await f.turn('I want an appointment');await f.turn('I want to continue');await f.turn('Anna Birkenhain');await f.turn('anna@example.test');
  const corrected=await f.turn('My email is anna2026@example.test.');
  assert.doesNotMatch(corrected.message,/valid phone|gültige Telefonnummer/u);assert.match(corrected.message,/phone number/u);
  await f.turn('+1 202 555 0100');const review=await f.turn('Shoulder pain');assert.ok(review.summary.some(([,v])=>v==='anna2026@example.test'));
});

regression('CP-024/025/058: explicit DE/EN switches work at contact steps and preserve pending edits',async()=>{
  const f=fixture({language:'de'});await f.turn('Ich möchte einen Termin');await f.turn('Vorbereiten');await f.turn('Anna Birkenhain');await f.turn('anna@example.test');
  const english=await f.turn('can we continue in english pls');assert.equal(english.language,'en');assert.match(english.message,/phone number/u);
  const german=await f.turn('auf Deutsch bitte');assert.equal(german.language,'de');assert.match(german.message,/Telefonnummer/u);assert.doesNotMatch(german.message,/gültige|valid/u);
  await f.turn('+1 202 555 0100');await f.turn('Schulterschmerzen');await f.call('edit',{field:'availability'});
  const switchEdit=await f.turn('in English please');assert.equal(switchEdit.ready,false);assert.match(switchEdit.message,/days or times/u);
  assert.equal((await f.call('finish',{confirmed:true})).code,'invalid_request');
  const completed=await f.turn('Thursday after 17:00');assert.equal(completed.ready,true);assert.equal(completed.language,'en');
});

regression('CP-026: receipt language is independently reviewable and used by both patient email formats',async()=>{
  for(const language of ['de','en']){
    const f=fixture({language});await ready(f,language);
    const other=language==='de'?'en':'de';
    const preference=await f.turn(language==='de'?'Bitte die E-Mail-Kopie auf Englisch, der Chat bleibt auf Deutsch.':'Please send the email copy in German; keep the chat in English.');
    assert.equal(preference.language,language);assert.equal(preference.ready,true);
    assert.ok(preference.summary.some(([key])=>/Email copy language|Sprache der E-Mail-Kopie/u.test(key)));
    assert.equal((await f.call('review-choice',{field:'receipt_language',value:other})).ready,true);
    await f.call('finish',{confirmed:true});
    assert.equal(f.saved[0].intake.language,language);assert.equal(f.saved[0].intake.receipt_language,other);
    const email=patientConfirmationEmail(f.saved[0]);assert.match(email.html,new RegExp(`lang="${other}"`));
    assert.match(email.subject,other==='en'?/We received your request/u:/Wir haben Ihre Anfrage erhalten/u);
  }
});

regression('CP-042: existing appointment changes hand off in either language without requesting a new patient intake',async()=>{
  for(const [language,raw] of [['de','Ich möchte meinen bestehenden Termin verschieben.'],['en','I need to change my appointment.']]){
    const f=fixture({language,facts:conversationFacts({settings:[{phone:'+43 699 12682157',email:'info@citypraxis.wien'}]})});
    const result=await f.turn(raw);assert.equal(result.ready,false);assert.match(result.message,/info@citypraxis.wien/u);assert.doesNotMatch(result.message,/Vor- und Nachnamen|first and last name/u);assert.equal(f.inputs.length,0);assert.equal(f.saved.length,0);
  }
});

regression('CP-054: failed email copies do not discard saved requests or resend on a replay',async()=>{
  process.env.RESEND_API_KEY='fixture';process.env.CHAT_NOTIFY_FROM='reception@example.test';process.env.CHAT_NOTIFY_TO='office@example.test';process.env.PATIENT_CONFIRMATION_FROM='reception@example.test';
  const f=fixture({emailStatus:false});await ready(f);
  const first=await f.call('finish',{confirmed:true}),again=await f.call('finish',{confirmed:true});
  assert.equal(first.received,true);assert.equal(first.patientReceipt,'failed');assert.equal(again.patientReceipt,'failed');assert.equal(again.duplicate,true);
  assert.equal(f.saved.length,1);assert.equal(f.emails.length,2);
});

regression('information questions receive answers; English durations and current published retention reach the model',async()=>{
  const facts=conversationFacts({prices:[{title:'Ersttermin Physiotherapie',titleEn:'First physiotherapy visit',duration:'60 Minuten',durationEn:'60 minutes',amount:130}],pages:[{id:'datenschutz',body:'Legacy privacy information',bodyEn:'Legacy privacy information'}]});
  const f=fixture({facts,interpret:()=>value({answer:'A first physiotherapy visit is listed as 60 minutes. Historical reimbursement figures should be checked with your insurer.',related_pages:['prices']})});
  const result=await f.turn('Are the reimbursements on the prices website current, and where can I find the visit duration?');
  assert.match(result.message,/60 minutes/u);assert.match(result.message,/checked with your insurer/u);assert.equal(f.inputs.length,1);
  assert.equal(f.inputs[0].publishedFacts.samplePrices[0].service,'First physiotherapy visit');
  assert.equal(f.inputs[0].publishedFacts.samplePrices[0].duration,'60 minutes');
  assert.match(f.inputs[0].publishedFacts.requestRetention,/manually delete|manually deletes/u);
  assert.match(f.inputs[0].publishedFacts.informationPages[0].body,/not deleted automatically/u);
});

regression('recognized slash/dot phone formats are masked for the model while appointment dates stay meaningful',async()=>{
  const f=fixture();await f.turn('Please note my phone +43 699/12682157 and email anna@example.test. Would 2026-10-15 be possible?');
  const raw=f.inputs[0].visitorMessage;
  assert.doesNotMatch(raw,/12682157|anna@example/u);assert.match(raw,/\[phone provided\]/u);assert.match(raw,/2026-10-15/u);
});

regression('a practice answer containing thanks is not replaced by a contact-validation error',async()=>{
  const f=fixture({interpret:input=>/cost|payment/iu.test(input.visitorMessage)?value({answer:'Thank you for asking. Payment is made at the practice.',related_pages:['prices']}):value({reason:input.visitorMessage.includes('pain')?input.visitorMessage:null})});
  await f.turn('I want an appointment');await f.turn('I want to continue');
  assert.match((await f.turn('Tell me about payment')).message,/Payment is made at the practice/u);
  await f.turn('Anna Birkenhain');await f.turn('anna@example.test');
  const question=await f.turn('What payment methods do you accept?');assert.match(question.message,/Payment is made at the practice/u);assert.doesNotMatch(question.message,/valid phone/u);
  await f.turn('+1 202 555 0100');const review=await f.turn('Shoulder pain');
  assert.ok(review.summary.some(([,v])=>v==='Either is fine'),'Providing an email and phone does not by itself choose a preferred contact method');
});

regression('FR-01: a clear change from the form to chat starts intake, including semantic paraphrases',async()=>{
  for(const [language,raw] of [
    ['de','Ich möchte die Anfrage doch hier im Chat vorbereiten.'],
    ['en','I would like to prepare the request here in chat.'],
    ['de','Ich habe es mir anders überlegt, führen Sie mich bitte hier durch die Anfrage.'],
    ['en',"I've changed my mind; please walk me through the request here."],
    ['en','Please guide me through an appointment request here instead.'],
    ['de','Ich habe es mir anders überlegt; helfen Sie mir bitte hier mit einer Terminanfrage.']
  ]){
    const f=fixture({language,interpret:()=>value({kind:'appointment',booking_choice:'chat',booking_intent:'request',answer:language==='de'?'Ich bereite Ihre Anfrage hier vor.':'I can prepare it here.'})});
    await f.turn(language==='de'?'Ich möchte einen Termin':'I want an appointment');await f.turn(language==='de'?'Das erste bitte':'The first one please');
    const changed=await f.turn(raw);
    assert.doesNotMatch(changed.message,/Was ist Ihnen lieber|Which would you prefer|Would you prefer/u);
    assert.match(changed.message,language==='de'?/Vor- und Nachnamen/u:/first and last name/u);
    await f.turn('Anna Birkenhain');assert.match((await f.turn('anna@example.test')).message,language==='de'?/Telefonnummer/u:/phone number/u);
  }
});

regression('FR-01 complete round trip: after giving a name, a form request wins over contact refusal',async()=>{
  for(const [language,raw] of [
    ['de','Ich möchte keine Kontaktdaten im Chat nennen. Bitte schicken Sie mir den Link zum normalen Terminformular.'],
    ['de','Ich möchte keine E-Mail nennen. Bitte geben Sie mir das Terminanfrageformular.'],
    ['de','Ich möchte im Chat keine Daten angeben, bitte senden Sie mir das Online-Formular.'],
    ['en','I do not want to give contact details in chat. Please send me the appointment request form.'],
    ['en','I do not want to provide my email here; I would prefer the booking form.']
  ]){
    const f=fixture({language,interpret:()=>value({kind:'practice_question',booking_choice:'form',booking_intent:'defer'})});
    await f.turn(language==='de'?'Ich möchte einen Termin':'I want an appointment');
    await f.turn(language==='de'?'Das erste bitte':'The first one please');
    await f.turn(language==='de'?'Ich möchte die Anfrage doch hier im Chat vorbereiten.':'I want to continue here in chat.');
    const next=await f.turn('Dr. Anna-Lena Musterfrau');assert.match(next.message,/E-Mail|email/u);
    const form=await f.turn(raw);
    assert.match(form.message,new RegExp(`\\]\\(/termin\\?lang=${language}#booking-form\\)`,'u'));
    assert.doesNotMatch(form.message,/benötigt|Vor- und Nachnamen|E-Mail-Adresse dürfen|first and last name|share your phone/u);
    assert.equal(form.ready,false);assert.equal(f.saved.length,0);assert.equal(f.emails.length,0);
    assert.equal((await f.call('finish',{confirmed:true})).code,'invalid_request');
  }
  const f=fixture({interpret:()=>value({kind:'appointment',booking_choice:'chat',booking_intent:'request'})});
  await f.turn('I want an appointment');await f.turn('I want to continue');await f.turn('Anna Musterfrau');
  for(const apostrophe of ["'",'’']){
    const chat=await f.turn(`I don${apostrophe}t want the form. I would like to keep preparing the request here in chat.`);
    assert.doesNotMatch(chat.message,/\]\(\/termin/u);assert.match(chat.message,/email address/u);
  }
});

regression('FR-01 guard: vague acknowledgements after leaving chat do not restart intake',async()=>{
  for(const [language,raw] of [['de','Ja'],['en','okay']]){
    const f=fixture({language,interpret:()=>value({kind:'appointment',booking_choice:'chat',booking_intent:'request'})});
    await f.turn(language==='de'?'Ich möchte einen Termin':'I want an appointment');await f.turn(language==='de'?'Das erste bitte':'The first one please');
    const vague=await f.turn(raw);assert.equal(vague.ready,false);assert.match(vague.message,/Was ist Ihnen lieber|Which would you prefer|Just to confirm|Nur zur Sicherheit/u);assert.equal(f.saved.length,0);assert.equal((await f.call('finish',{confirmed:true})).code,'invalid_request');
  }
});

regression('FR-02: titles and full names are extracted from a multi-sentence intake without reasking',async()=>{
  for(const [language,raw,name] of [
    ['en','I want to continue here. My full name is Dr. Anna-Lena Birkenhain. It is my first visit. My email is anna@example.test, my phone is +12025550102. I would like physiotherapy for back discomfort, Thursday after 17:00.','Dr. Anna-Lena Birkenhain'],
    ['de','Ich möchte hier weitermachen. Mein vollständiger Name ist Dr. Anna-Lena Musterfrau. Das ist mein erster Termin. Meine E-Mail ist anna@example.test, meine Telefonnummer ist +12025550102. Ich möchte Physiotherapie wegen Rückenschmerzen, Donnerstag nach 17 Uhr.','Dr. Anna-Lena Musterfrau'],
    ['en','My name is Prof. Dr. Anna Marie von Birkenhain. This is my first visit. Email anna@example.test; phone +12025550102. I want physiotherapy for back discomfort, Thursday after 17:00.','Prof. Dr. Anna Marie von Birkenhain'],
    ['de','Mein Name ist Anna-Lena von Birkenhain. Außerdem möchte ich Physiotherapie. E-Mail anna@example.test, Telefon +12025550102. Donnerstag nach 17 Uhr.','Anna-Lena von Birkenhain']
  ]){
    const f=fixture({language,interpret:()=>value({kind:'appointment',booking_choice:'chat',booking_intent:'request',reason:language==='de'?'Physiotherapie wegen Rückenschmerzen':'physiotherapy for back discomfort',availability:language==='de'?'Donnerstag nach 17 Uhr':'Thursday after 17:00',answer:language==='de'?`Verstanden, ${name}. Darf ich bitte Ihren Vor- und Nachnamen erfahren?`:`Understood, ${name}. May I have your first and last name, please?`})});
    await f.turn(language==='de'?'Ich möchte einen Termin':'I want an appointment');
    const review=await f.turn(raw);assert.equal(review.ready,true);assert.equal(rowValue(review,'Name'),name);assert.doesNotMatch(review.message,/May I have your first and last name|Darf ich bitte Ihren Vor- und Nachnamen/u);
    assert.equal((await f.call('finish',{confirmed:true})).received,true);assert.equal(f.saved[0].name,name);
  }
});

const rowValue=(response,key)=>response.summary?.find(([label])=>label===key)?.[1];
regression('FR-03: previous email/phone means the value before the change; repeated rollbacks retain history',async()=>{
  for(const language of ['de','en']){
    const f=fixture({language});await ready(f,language);
    await f.call('edit',{field:'email'});await f.turn('changed@example.test');await f.call('edit',{field:'email'});
    const restored=await f.turn(language==='de'?'nimm die mail von vorher':'Use the email from before');
    assert.equal(rowValue(restored,language==='de'?'E-Mail':'Email'),'anna2026@example.test');
    await f.call('edit',{field:'email'});const toggled=await f.turn(language==='de'?'Bitte die vorherige E-Mail-Adresse':'Back to the previous email please');
    assert.equal(rowValue(toggled,language==='de'?'E-Mail':'Email'),'changed@example.test');
    await f.call('edit',{field:'phone'});await f.turn('+1 202 555 0104');await f.call('edit',{field:'phone'});
    const phone=await f.turn(language==='de'?'Nimm wieder die Nummer von vorher':'Use my previous phone number');assert.equal(rowValue(phone,language==='de'?'Telefon':'Phone'),'+12025550100');
  }
});

regression('FR-03: recalling the original weekday accepts singular/recurring phrasing without losing the time',async()=>{
  for(const [language,original,reference] of [
    ['de','Donnerstags nach 17 Uhr','doch wieder wie zuerst, donnerstag'],
    ['en','Thursdays after 17:00','Actually, back to the original time, Thursday']
  ]){
    const f=fixture({language});await ready(f,language);
    await f.call('edit',{field:'availability'});await f.turn(original);
    await f.call('edit',{field:'availability'});await f.turn(language==='de'?'Freitag vormittags':'Friday morning');
    await f.call('edit',{field:'availability'});const restored=await f.turn(reference);
    assert.equal(restored.ready,true);assert.equal(rowValue(restored,language==='de'?'Hinweis zur Verfügbarkeit':'Availability note'),original);
    await f.call('finish',{confirmed:true});assert.equal(f.saved[0].intake.availability_notes,original);
  }
});

regression('German conversational self-introduction and first-visit sentences are accepted without a duplicate name question',async()=>{
  const f=fixture({language:'de',interpret:()=>value({kind:'appointment',booking_choice:'chat',reason:'Beschwerden im Rücken',availability:'Donnerstags nach 17 Uhr',answer:'Gerne, Alex Musterer. Darf ich bitte Ihren Vor- und Nachnamen erfahren?'})});
  await f.turn('Ich möchte einen Termin');
  const review=await f.turn('Ich möchte die Anfrage hier im Chat vorbereiten. Ich bin Alex Musterer, meine E-Mail-Adresse ist alex@example.test und meine Telefonnummer ist +12025550103. Es ist mein erster Besuch; ich habe Beschwerden im Rücken und möchte Physiotherapie. Donnerstags nach 17 Uhr wäre mir am liebsten.');
  assert.equal(review.ready,true);assert.equal(rowValue(review,'Name'),'Alex Musterer');assert.equal(rowValue(review,'Patientenstatus (eigene Angabe)'),'Nein – noch nicht');assert.doesNotMatch(review.message,/Vor- und Nachnamen erfahren/u);
  for(const message of ['Ich bin bereits Patient','Ich bin in Behandlung','Ich bin eine neue Patientin']){
    const guard=fixture({language:'de',interpret:()=>value({kind:'appointment',first_name:'Invented',last_name:'Person'})});
    await guard.turn('Ich möchte einen Termin');await guard.turn('Vorbereiten');
    const next=await guard.turn(message);assert.match(next.message,/Vor- und Nachnamen/u);assert.equal(next.ready,false);
  }
});

regression('collected-detail questions are removed sentence by sentence, retaining factual answers and one receipt acknowledgement',async()=>{
  const f=fixture({interpret:()=>value({kind:'appointment',reason:'Shoulder discomfort',availability:'Friday afternoon',answer:'The first physiotherapy appointment costs €130. Could you share your phone number, please? Understood—the receipt should be in German, and we can continue chatting in English.'})});
  await f.turn('I want an appointment');await f.turn('I want to continue');await f.turn('Taylor Musterfrau');await f.turn('taylor@example.test');
  const review=await f.turn('Please send the receipt in German; we can keep chatting in English. My phone number is +12025550104. I want physiotherapy for shoulder discomfort and prefer Friday afternoon. What does the first physiotherapy appointment cost?');
  assert.equal(review.ready,true);assert.match(review.message,/costs €130/u);assert.doesNotMatch(review.message,/share your phone/u);assert.equal((review.message.match(/(?:in|be in) German/gu)||[]).length,1);assert.match(review.message,/Friday afternoon|ready to review/u);
});

regression('FR-04: preferences and contacts cannot bypass accompanying treatment/time details',async()=>{
  for(const [language,raw,reason,availability,other] of [
    ['en','Please send the receipt in German; we can keep chatting in English. My phone number is +12025550104. I’m requesting physiotherapy for shoulder discomfort and prefer Friday afternoon.','physiotherapy for shoulder discomfort','Friday afternoon','de'],
    ['de','Bitte die E-Mail-Kopie auf Englisch; der Chat bleibt auf Deutsch. Meine Telefonnummer ist +12025550104. Ich möchte Physiotherapie wegen Schulterschmerzen und bevorzuge Freitag nachmittags.','Physiotherapie wegen Schulterschmerzen','Freitag nachmittags','en'],
    ['en','My phone is +12025550104. I would like physiotherapy for shoulder discomfort and prefer Friday afternoon.','physiotherapy for shoulder discomfort','Friday afternoon',null],
    ['en','Please contact me by email. My phone is +12025550104. I would like physiotherapy for shoulder discomfort and prefer Friday afternoon.','physiotherapy for shoulder discomfort','Friday afternoon',null]
  ]){
    const f=fixture({language,interpret:()=>value({kind:'appointment',reason,availability,answer:language==='de'?'Ich habe Ihr Anliegen und Ihre Wunschzeit notiert.':'I’ve noted your concern and preferred time.'})});
    await f.turn(language==='de'?'Ich möchte einen Termin':'I want an appointment');await f.turn(language==='de'?'Vorbereiten':'I want to continue');await f.turn('Taylor Musterfrau');await f.turn('taylor@example.test');
    const review=await f.turn(raw);assert.equal(review.ready,true);assert.equal(review.language,language);
    assert.match(rowValue(review,language==='de'?'Ihre kurze Beschreibung':'Your short description'),/physiotherap/iu);assert.equal(rowValue(review,language==='de'?'Hinweis zur Verfügbarkeit':'Availability note'),availability);
    await f.call('finish',{confirmed:true});assert.equal(f.saved[0].intake.receipt_language,other||undefined);assert.equal(f.saved[0].intake.language,language);assert.equal(f.saved[0].intake.availability_notes,availability);
  }
});

regression('numeric email components never supply or replace a phone number',async()=>{
  for(const language of ['de','en']){
    const f=fixture({language,interpret:()=>value({kind:'appointment',booking_choice:'chat',reason:language==='de'?'Rückenbeschwerden':'Back discomfort'})});
    await f.turn(language==='de'?'Ich möchte einen Termin':'I want an appointment');
    const review=await f.turn(language==='de'?'Ich möchte hier im Chat vorbereiten. Ich bin Alex Musterer, meine E-Mail ist patient.01846975@example.test und meine Telefonnummer ist +12025550103. Ich habe Rückenbeschwerden.':'I want to continue here. My full name is Alex Musterer. My email is patient.01846975@example.test, my phone is +12025550103. I have back discomfort.');
    assert.equal(review.ready,true);assert.equal(rowValue(review,language==='de'?'Telefon':'Phone'),'+12025550103');
    const emailOnly=fixture({language});await emailOnly.turn(language==='de'?'Ich möchte einen Termin':'I want an appointment');await emailOnly.turn(language==='de'?'Vorbereiten':'I want to continue');await emailOnly.turn('Alex Musterer');
    const next=await emailOnly.turn('patient.01846975@example.test');assert.equal(next.ready,false);assert.match(next.message,/Telefonnummer|phone number/u);
  }
});
