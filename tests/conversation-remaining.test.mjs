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


const row=(r,key)=>r.summary?.find(([label])=>label===key||key==='Name'&&['Patient name','Name der Patientin / des Patienten'].includes(label))?.[1];

regression('Reception contact questions never replace the patient contact details',async()=>{
  for(const language of ['en','de']){
    const f=fixture({language});await ready(f,language);
    const result=await f.turn(language==='en'?'Is info@citypraxis.wien your reception email, and can I call +43 699 12682157 to reach your team?':'Ist info@citypraxis.wien Ihre Empfangsadresse und erreiche ich Ihr Team unter +43 699 12682157?');
    assert.equal(row(result,language==='en'?'Email':'E-Mail'),'anna2026@example.test');
    assert.equal(row(result,language==='en'?'Phone':'Telefon'),'+12025550100');
    const mixed=await f.turn(language==='en'?'Is info@citypraxis.wien your email? My email is changed@example.test. My phone is +12025550199 and can I call your reception at +43 699 12682157?':'Ist info@citypraxis.wien Ihre E-Mail? Meine E-Mail ist changed@example.test. Meine Telefonnummer ist +12025550199 und erreiche ich Ihren Empfang unter +43 699 12682157?');
    assert.equal(row(mixed,language==='en'?'Email':'E-Mail'),'changed@example.test');
    assert.equal(row(mixed,language==='en'?'Phone':'Telefon'),'+12025550199');
  }
});

regression('CP-015: multi-field edit instructions remain pending until replacement values arrive',async()=>{
  for(const language of ['en','de']){
    const f=fixture({language});await ready(f,language);
    await f.call('edit',{field:'availability'});
    const pending=await f.turn(language==='en'?'I need to change my phone number and my preferred day.':'Meine Telefonnummer und mein gewünschter Tag müssten geändert werden.');
    assert.equal(pending.ready,false);assert.match(pending.message,/phone|Telefonnummer/u);
    await f.turn('+12025550199');
    const review=await f.turn(language==='en'?'Thursday after 17:00':'Donnerstag nach 17 Uhr');
    assert.equal(review.ready,true);assert.equal(row(review,language==='en'?'Phone':'Telefon'),'+12025550199');
    assert.match(row(review,language==='en'?'Availability note':'Hinweis zur Verfügbarkeit'),/Thursday|Donnerstag/u);
    assert.equal((await f.call('finish',{confirmed:true})).received,true);
    assert.doesNotMatch(f.saved[0].intake.availability_notes,/change|geändert/u);
  }
});

regression('CP-028/010/017: dictation and anchored partial corrections retain a concrete day and time',async()=>{
  for(const [language,initial,dictation,correction,dayOnly,expected] of [
    ['en','Tuesday after 17:00','Tuesday no sorry Thursday after 17:00','same day, but after 18:00 instead of 17:00','Friday instead of Thursday, keep the same time','Friday after 18:00'],
    ['de','Dienstag nach 17 Uhr','am Dienstag ach nein Donnerstag meinte ich nach 17 Uhr','gleicher Tag, aber nach 18 statt 17 Uhr','Freitag statt Donnerstag, die Uhrzeit bleibt gleich','Freitag nach 18 Uhr']
  ]){
    const f=fixture({language});await ready(f,language);
    for(const phrase of [initial,dictation,correction,dayOnly]){await f.call('edit',{field:'availability'});const r=await f.turn(phrase);assert.equal(r.ready,true);}
    await f.call('finish',{confirmed:true});assert.equal(f.saved[0].intake.availability_notes,expected);
  }
});

regression('CP-009/039: pause waits for resumption and optional availability deletion preserves contacts',async()=>{
  for(const language of ['en','de']){
    const f=fixture({language});await f.turn(language==='en'?'I want an appointment':'Ich möchte einen Termin');await f.turn(language==='en'?'I want to continue':'Vorbereiten');await f.turn('Alex Musterer');await f.turn('alex@example.test');
    const paused=await f.turn(language==='en'?"Please pause for a moment. Don't send anything yet.":'Einen Moment bitte, ich brauche eine Pause. Bitte noch nichts senden.');
    assert.equal(paused.ready,false);assert.doesNotMatch(paused.message,/share your phone|Unter welcher Telefonnummer/u);assert.equal(f.saved.length,0);
    const resumed=await f.turn(language==='en'?"I'm ready to continue now.":'Okay, wir können weitermachen.');assert.match(resumed.message,/phone|Telefonnummer/u);
    await f.turn('+12025550100');await f.turn(language==='en'?'Shoulder pain':'Schulterschmerzen');
    await f.call('edit',{field:'availability'});await f.turn(language==='en'?'Friday after 17:00':'Freitag nach 17 Uhr');await f.call('edit',{field:'availability'});
    const cleared=await f.turn(language==='en'?'forget Friday, keep the rest; don’t send yet':'Freitag vergessen, den Rest behalten; noch nicht senden');
    assert.equal(cleared.ready,true);assert.equal(row(cleared,language==='en'?'Availability note':'Hinweis zur Verfügbarkeit'),undefined);assert.equal(row(cleared,'Name'),'Alex Musterer');assert.equal(f.saved.length,0);
    assert.equal((await f.call('finish',{confirmed:true})).received,true);assert.equal(f.saved[0].intake.availability_notes,undefined);
  }
});

regression('CP-029: email prefaces are not names; adjacent unambiguous email fragments are joined',async()=>{
  for(const language of ['en','de']){
    const f=fixture({language});await f.turn(language==='en'?'I want an appointment':'Ich möchte einen Termin');await f.turn(language==='en'?'I want to continue':'Vorbereiten');
    await f.turn(language==='en'?'my email is':'mail ist');await f.turn('patient26.01846975@');await f.turn('organic.example.test');
    await f.turn('Alex Musterer');await f.turn('+12025550100');const review=await f.turn(language==='en'?'Shoulder pain':'Schulterschmerzen');
    assert.equal(review.ready,true);assert.equal(row(review,'Name'),'Alex Musterer');assert.equal(row(review,language==='en'?'Email':'E-Mail'),'patient26.01846975@organic.example.test');
    await f.call('finish',{confirmed:true});assert.equal(f.saved[0].phone,'+12025550100');
  }
  const f=fixture();await f.turn('I want an appointment');await f.turn('I want to continue');await f.turn('Alex Musterer');await f.turn('first@');await f.turn('What do you offer?');await f.turn('organic.example.test');
  assert.equal((await f.call('finish',{confirmed:true})).received,undefined);
});

regression('CP-035: proxy patient and sender stay distinct in review, storage and emails',async()=>{
  process.env.RESEND_API_KEY='fixture';process.env.CHAT_NOTIFY_TO='reception@example.test';process.env.CHAT_NOTIFY_FROM='Practice <practice@example.test>';process.env.PATIENT_CONFIRMATION_FROM='Practice <practice@example.test>';
  for(const language of ['en','de']){
    const f=fixture({language});await f.turn(language==='en'?'I want an appointment':'Ich möchte einen Termin');await f.turn(language==='en'?'I want to continue':'Vorbereiten');await f.turn('Alex Musterer');
    const proxy=await f.turn(language==='en'?'This request is for my mother; the patient is Mara Fiktiva and the email and phone are mine.':'Die Anfrage ist für meine Mutter. Die Patientin heißt Mara Fiktiva, die E-Mail und Telefonnummer gehören mir.');
    assert.doesNotMatch(proxy.message,/thank you, Mara|Vielen Dank, Mara/u);
    await f.turn('alex@example.test');await f.turn('+12025550100');const review=await f.turn(language==='en'?'Shoulder pain':'Schulterschmerzen');
    assert.equal(row(review,'Name'),'Mara Fiktiva');assert.ok(review.summary.some(([,v])=>v.includes('Alex Musterer')));assert.ok(review.summary.some(([,v])=>/mother|Mutter/u.test(v)));
    await f.call('finish',{confirmed:true});assert.equal(f.saved[0].name,'Mara Fiktiva');assert.equal(f.saved[0].intake.contact_name,'Alex Musterer');assert.match(f.emails.at(-1).text,/Alex Musterer/u);
  }
});

regression('CP-006/025: bare yes clarifies two choices; borrowed acknowledgements do not obscure missing fields',async()=>{
  for(const language of ['en','de']){
    const f=fixture({language});await f.turn(language==='en'?'I want an appointment':'Ich möchte einen Termin');
    const ambiguous=await f.turn(language==='en'?'yes':'ja');assert.equal(ambiguous.ready,false);assert.match(ambiguous.message,/form|Formular/u);assert.doesNotMatch(ambiguous.message,/Please send your|Bitte nennen/u);
    await f.turn(language==='en'?'I want to continue here':'Ich möchte hier im Chat weitermachen');await f.turn('Alex Musterer');await f.turn('alex@example.test');
    const missing=await f.turn(language==='en'?'okay danke; what else do you need from me?':'okay thanks; und was braucht ihr noch?');assert.match(missing.message,/phone|Telefonnummer/u);assert.doesNotMatch(missing.message,/rephrase|unklare/u);
  }
});

regression('availability questions, unrelated text and ambiguous edits cannot become appointment preferences',async()=>{
  const f=fixture();await ready(f);
  await f.call('edit',{field:'availability'});
  for(const message of ['Can you change that?','You decide','What time is free?']){const r=await f.turn(message);assert.equal(r.ready,false);assert.equal(row(r,'Availability note'),undefined);}
  const cancelled=await f.call('cancel-edit');assert.equal(cancelled.ready,true);assert.equal(row(cancelled,'Availability note'),undefined);
});

regression('ambiguous clock words ask once; the explicit answer retains the corrected weekday',async()=>{
  const f=fixture();await ready(f);await f.call('edit',{field:'availability'});
  const uncertain=await f.turn('Tuesday no sorry Thursday after five');assert.equal(uncertain.ready,false);assert.match(uncertain.message,/24-hour/u);
  const resolved=await f.turn('after 17:00');assert.equal(resolved.ready,true);assert.equal(row(resolved,'Availability note'),'Thursday after 17:00');
  await f.call('finish',{confirmed:true});assert.equal(f.saved[0].intake.availability_notes,'Thursday after 17:00');
});

regression('CP-058: summarize incomplete intake locally, name what is missing, and keep it unsent',async()=>{
  for(const language of ['en','de']){
    const f=fixture({language});await f.turn(language==='en'?'I want an appointment':'Ich möchte einen Termin');await f.turn(language==='en'?'I want to continue':'Vorbereiten');await f.turn('Alex Musterer');await f.turn('alex@example.test');await f.turn(language==='en'?'Shoulder pain':'Schulterschmerzen');
    const summary=await f.turn(language==='en'?'Please summarize first, do not send.':'Bitte zuerst zusammenfassen, nicht senden.');
    assert.equal(summary.ready,false);assert.match(summary.message,/Alex Musterer/u);assert.match(summary.message,/alex@example\.test/u);assert.match(summary.message,/Shoulder pain|Schulterschmerzen/u);assert.match(summary.message,/phone|Telefonnummer/u);assert.equal(f.saved.length,0);
    assert.equal((await f.call('finish',{confirmed:true})).received,undefined);
  }
});

regression('CP-043: cancelling an ambiguous referent distinguishes a draft from an existing appointment',async()=>{
  for(const language of ['en','de']){
    const f=fixture({language,interpret:input=>value({kind:'appointment',needs_clarification:true,booking_intent:'request'})});
    await f.turn(language==='en'?'I have an existing appointment and want to prepare another request here.':'Ich habe schon einen Termin und möchte noch eine neue Anfrage hier vorbereiten.');
    const ambiguous=await f.turn(language==='en'?'Yes, and cancel that please':'Ja, und das bitte absagen');
    assert.match(ambiguous.message,/existing appointment|bestehenden Termin/u);assert.match(ambiguous.message,/draft|Anfrage/u);assert.equal(ambiguous.ready,false);assert.equal(f.saved.length,0);
    const specific=await f.turn(language==='en'?'I mean cancel my existing appointment.':'Ich meine meinen bestehenden Termin absagen.');assert.match(specific.message,/reception|Empfang/u);assert.equal(f.saved.length,0);
  }
});

regression('proxy identity, concern and requested treatment in one message all reach review',async()=>{
  const f=fixture({interpret:()=>value({kind:'appointment',reason:'back discomfort'})});
  await f.turn('I want an appointment');await f.turn('I want to continue');await f.turn('Taylor Birkenhain');await f.turn('taylor@example.test');await f.turn('+12025550107');
  const review=await f.turn('This request is for my mother; the patient is Mara Fiktiva, and the email and phone are mine. She needs physiotherapy for her back discomfort.');
  assert.equal(review.ready,true);assert.equal(row(review,'Name'),'Mara Fiktiva');assert.match(row(review,'Your short description'),/back discomfort.*physiotherapy/u);assert.doesNotMatch(review.message,/What is the reason/u);
});

regression('proxy concerns are interpreted without requiring a therapy or symptom keyword',async()=>{
  for(const [language,message,reason] of [
    ['de','Die Anfrage ist für meinen Mann. Der Patient heißt Robin Fiktiv. Er hat Schulterschmerzen.','Schulterschmerzen'],
    ['en','This request is for my husband. The patient is Robin Fiktiv. His shoulder hurts.','His shoulder hurts']
  ]){
    const f=fixture({language,interpret:input=>value({kind:'appointment',reason:input.visitorMessage.includes(reason)?reason:null})});
    await f.turn(language==='de'?'Ich möchte einen Termin':'I want an appointment');await f.turn(language==='de'?'Vorbereiten':'I want to continue');await f.turn('Alex Musterer');await f.turn('alex@example.test');await f.turn('+12025550100');
    const review=await f.turn(message);assert.equal(review.ready,true);assert.equal(row(review,'Name'),'Robin Fiktiv');assert.equal(row(review,language==='de'?'Ihre kurze Beschreibung':'Your short description'),reason);
  }
});

regression('explicit information-only intent cannot be overridden by a model booking guess',async()=>{
  for(const language of ['en','de']){
    const f=fixture({language,interpret:()=>value({kind:'practice_question',booking_intent:'request',answer:language==='en'?'Our reception team arranges appointments by phone or email.':'Unser Sekretariat vereinbart Termine telefonisch oder per E-Mail.'})});
    const info=await f.turn(language==='en'?'I only want information: how does an appointment request work?':'Ich möchte nur Informationen: Wie funktioniert eine Terminanfrage?');
    assert.equal(info.ready,false);assert.doesNotMatch(info.message,/reason for your appointment|Anlass für Ihre Terminanfrage|Vor- und Nachnamen/u);assert.equal(f.saved.length,0);
  }
});

regression('original family phrases resolve a patient named in a separate pronoun clause',async()=>{
  for(const [language,phrase,patient] of [
    ['de','es geht um meine mama; die mail ist meine, patient heißt Mara Fiktiva','Mara Fiktiva'],
    ['en','Also for my husband, same email alex@example.test. He is Robin Fiktiv, +12025550100, shoulder pain.','Robin Fiktiv'],
    ['de','auch für meinen mann, gleiche mail alex@example.test. Er heißt Robin Fiktiv, +12025550100, Schulterschmerzen.','Robin Fiktiv']
  ]){
    const f=fixture({language});await f.turn(language==='en'?'I want an appointment':'Ich möchte einen Termin');await f.turn(language==='en'?'I want to continue':'Vorbereiten');await f.turn('Alex Musterer');
    await f.turn(phrase);await f.turn('alex@example.test');await f.turn('+12025550100');const review=await f.turn(language==='en'?'Shoulder pain':'Schulterschmerzen');
    assert.equal(review.ready,true);assert.equal(row(review,'Name'),patient);assert.equal(row(review,language==='en'?'Request sent by':'Anfrage von'),'Alex Musterer');
  }
});

regression('a witnessed full name at the end of a chat-choice sentence is retained, but invented model names are ignored',async()=>{
  const f=fixture({language:'de',interpret:input=>value({kind:'appointment',booking_choice:'chat',booking_intent:'request',first_name:'Alex',last_name:'Musterer',reason:input.visitorMessage==='Schulterschmerzen'?'Schulterschmerzen':null})});
  await f.turn('Ich möchte einen Termin');const named=await f.turn('Ich möchte es hier im Chat vorbereiten. Alex Musterer');assert.doesNotMatch(named.message,/benötige ich bitte Ihren vollständigen Vor- und Nachnamen/u);
  await f.turn('alex@example.test');await f.turn('+12025550100');const review=await f.turn('Schulterschmerzen');assert.equal(row(review,'Name'),'Alex Musterer');
  const guard=fixture({interpret:()=>value({kind:'appointment',first_name:'Invented',last_name:'Person'})});await guard.turn('I want an appointment');await guard.turn('I want to continue');const missing=await guard.turn('What treatments do you offer?');assert.equal(missing.ready,false);assert.match(missing.message,/first and last name/u);
});

regression('changing receipt language or contact preference never erases required contacts',async()=>{
  const f=fixture();await ready(f);await f.call('edit',{field:'availability'});
  await f.turn('Please change the email copy to English.');await f.turn('Change my preferred contact method from phone to email.');const review=await f.turn('Thursday after 17:00');
  assert.equal(review.ready,true);assert.equal(row(review,'Email'),'anna2026@example.test');assert.equal(row(review,'Phone'),'+12025550100');assert.equal(row(review,'Email copy language'),'English');assert.equal(row(review,'Preferred contact'),'Email');
});

regression('choosing chat and requesting a summary in the same message answers that request before another intake prompt',async()=>{
  const f=fixture({interpret:()=>value({kind:'appointment',booking_choice:'chat',booking_intent:'request',reason:'physiotherapy for back discomfort',availability:'Thursday after 17:00'})});await f.turn('I want an appointment');
  const summary=await f.turn('I want to continue here. My name is Alex Musterer, email alex@example.test. Physiotherapy for back discomfort, Thursday after 17:00. Please summarize first, do not send.');
  assert.equal(summary.ready,false);assert.match(summary.message,/Alex Musterer/u);assert.match(summary.message,/alex@example\.test/u);assert.match(summary.message,/back discomfort/u);assert.match(summary.message,/Thursday after 17:00/u);assert.match(summary.message,/Still missing: phone/u);assert.doesNotMatch(summary.message,/Could you also share/u);
});

regression('availability input with a contact correction and changed reason is interpreted as a whole message',async()=>{
  const f=fixture({interpret:input=>value({kind:'appointment',reason:input.visitorMessage.includes('knee pain')?'physiotherapy for knee pain':input.visitorMessage.includes('Shoulder pain')?'Shoulder pain':null,availability:input.visitorMessage.includes('Thursday after 17:00')?'Thursday after 17:00':null})});await ready(f);await f.call('edit',{field:'availability'});
  const review=await f.turn('Thursday after 17:00. My phone is +12025550199. Actually, my concern is knee pain and I want physiotherapy.');
  assert.equal(review.ready,true);assert.equal(row(review,'Availability note'),'Thursday after 17:00');assert.equal(row(review,'Phone'),'+12025550199');assert.match(row(review,'Your short description'),/knee pain/u);assert.doesNotMatch(row(review,'Your short description'),/Shoulder/u);
});
