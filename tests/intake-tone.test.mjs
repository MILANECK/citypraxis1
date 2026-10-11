import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createConversationService,conversationFacts} from '../src/chat/conversation.mjs';
import {newSession} from '../src/chat/security.mjs';

const value=changes=>({kind:'appointment',input_language:'unclear',answer:'',related_pages:[],booking_intent:'unspecified',booking_choice:'unspecified',needs_clarification:false,reason:null,availability:null,first_name:null,last_name:null,patient_status:null,...changes});
async function enabled(fn){
  const old={...process.env};process.env.OPENAI_API_KEY='fixture';process.env.CHAT_AI_ENABLED='true';
  try{await fn();}finally{process.env=old;}
}
function fixture(language='en',interpret=()=>value()){
  const calls=[],token=newSession();
  const service=createConversationService({store:{save:async()=>{throw new Error('No submission authorized');},recent:async()=>{throw new Error('No submission authorized');}},getFacts:async()=>conversationFacts(),fetcher:async(url,options)=>{
    assert.equal(url,'https://api.openai.com/v1/responses');
    const input=JSON.parse(JSON.parse(options.body).input);calls.push(input);
    return {ok:true,json:async()=>({status:'completed',output:[{type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:JSON.stringify(interpret(input))}]}]})};
  }});
  const call=async(route,body)=>{let result;await service.handle({method:'POST',headers:{},socket:{remoteAddress:'test'}},`/api/chat/${route}`,{token,language,consent:true,...body},(status,data)=>result={status,...data});assert.equal(result.status,200,JSON.stringify(result));return result;};
  return {calls,call,turn:message=>call('turn',{message,turnKey:randomUUID()})};
}
async function start(f,lang){await f.turn(lang==='de'?'Ich möchte einen Termin':'I want an appointment');await f.turn(lang==='de'?'Vorbereiten':'I want to continue');}
const thanks=lang=>lang==='de'?/Danke|Dank|danke/u:/Thank|thank|Thanks/u;

test('each accepted name, email and phone receives a polite, varied acknowledgement before the next missing detail',()=>enabled(async()=>{
  for(const lang of ['en','de']){
    const f=fixture(lang);await start(f,lang);
    const named=await f.turn('Alex Musterer'),emailed=await f.turn('alex@example.test'),numbered=await f.turn('+12025550100');
    for(const result of [named,emailed,numbered]){assert.match(result.message,thanks(lang));assert.equal(result.ready,false);assert.ok(result.message.length<=700);assert.doesNotMatch(result.message,/^Gerne/u);}
    assert.match(named.message,/Alex Musterer/u);assert.match(emailed.message,lang==='de'?/E-Mail-Adresse/u:/email/u);assert.match(numbered.message,lang==='de'?/Telefonnummer/u:/phone number/u);
    assert.equal(new Set([named,emailed,numbered].map(result=>result.message.split('\n')[0])).size,3);
    assert.match(numbered.message,lang==='de'?/Terminanfrage vervollständigen.*Anliegen.*Ein paar Worte/su:/To complete your appointment request.*concern.*A few words/su);
    assert.doesNotMatch(numbered.message,/I can prepare your appointment request here|Ich bereite Ihre Terminanfrage hier/u);
    assert.equal(f.calls.length,0,'Validated contact-only turns must not spend AI credit');
  }
}));

test('a generated preparation sentence after a phone detail is replaced by a specific thank-you',()=>enabled(async()=>{
  for(const lang of ['en','de']){
    const f=fixture(lang,()=>value({answer:lang==='de'?'Ich bereite Ihre Terminanfrage hier im Chat vor.':'I can prepare your appointment request here in chat.'}));
    await start(f,lang);await f.turn('Alex Musterer');await f.turn('alex@example.test');
    const result=await f.turn(lang==='de'?'Hier ist meine Telefonnummer: +12025550100':'Here is my phone number: +12025550100');
    assert.match(result.message,thanks(lang));assert.match(result.message,lang==='de'?/Telefonnummer/u:/phone number/u);assert.doesNotMatch(result.message,/I can prepare your appointment request here|Ich bereite Ihre Terminanfrage hier/u);
    assert.equal(result.ready,false);
  }
}));

test('receiving contacts alongside a website question preserves the factual answer and thanks the visitor',()=>enabled(async()=>{
  for(const lang of ['en','de']){
    const f=fixture(lang,()=>value({kind:'practice_question',answer:lang==='de'?'Der physiotherapeutische Ersttermin kostet €130.':'The first physiotherapy appointment costs €130.',related_pages:['prices']}));
    await start(f,lang);await f.turn('Alex Musterer');
    const result=await f.turn(lang==='de'?'Meine E-Mail-Adresse ist alex@example.test. Was kostet der physiotherapeutische Ersttermin?':'My email address is alex@example.test. What does the first physiotherapy appointment cost?');
    assert.match(result.message,thanks(lang));assert.match(result.message,/€130/u);assert.match(result.message,/\/preise\?lang=/u);assert.match(result.message,lang==='de'?/Telefonnummer/u:/phone number/u);assert.doesNotMatch(result.message,/alex@example.test/u);
  }
}));

test('invalid contacts do not receive an acknowledgement of successful receipt',()=>enabled(async()=>{
  for(const lang of ['en','de']){
    const f=fixture(lang,()=>value({answer:lang==='de'?'Danke.':'Thank you.'}));await start(f,lang);
    const firstName=await f.turn('Alex');assert.doesNotMatch(firstName.message,thanks(lang));await f.turn('Alex Musterer');
    const badEmail=await f.turn('alex@');assert.doesNotMatch(badEmail.message,/I have your email|E-Mail-Adresse.*notiert/u);await f.turn('example.test');
    const badPhone=await f.turn('12345');assert.doesNotMatch(badPhone.message,thanks(lang));assert.equal(badPhone.ready,false);
  }
}));

test('a known concern is retained and contact corrections use different polite wording',()=>enabled(async()=>{
  for(const lang of ['en','de']){
    const concern=lang==='de'?'Schulterschmerzen':'Shoulder pain';
    const f=fixture(lang,()=>value({reason:concern,answer:lang==='de'?'Unser Team kann Ihr Anliegen beim Ersttermin besprechen.':'Our team can discuss your concern at the first visit.'}));
    await start(f,lang);await f.turn(lang==='de'?'Ich habe Schulterschmerzen.':'I have shoulder pain.');await f.turn('Alex Musterer');await f.turn('alex@example.test');
    const ready=await f.turn('+12025550100');assert.equal(ready.ready,true,JSON.stringify({lang,ready,calls:f.calls.map(input=>({stage:input.currentStage,message:input.visitorMessage}))}));assert.ok(ready.summary.some(([,text])=>text===concern));assert.doesNotMatch(ready.message,/A few words|Ein paar Worte/u);
    await f.call('edit',{field:'phone'});const corrected=await f.turn('+12025550103');assert.equal(corrected.ready,true);assert.match(corrected.message,thanks(lang));assert.notEqual(corrected.message.split('\n')[0],ready.message.split('\n')[0]);assert.ok(corrected.summary.some(([,text])=>text==='+12025550103'));
  }
}));

test('bundled contacts are acknowledged once and a proxy is not addressed as the patient',()=>enabled(async()=>{
  for(const lang of ['en','de']){
    const f=fixture(lang);await start(f,lang);const result=await f.turn('Alex Musterer, alex@example.test, +12025550100');
    assert.match(result.message,thanks(lang));assert.match(result.message,lang==='de'?/E-Mail-Adresse und Telefonnummer/u:/email address and phone number/u);assert.equal((result.message.match(lang==='de'?/Vielen Dank|Danke/g:/thank you|Thanks|Thank you/g)||[]).length,1);
    const proxy=await f.turn(lang==='de'?'Die Anfrage ist für meine Mutter. Die Patientin heißt Mara Fiktiva, die E-Mail und Telefonnummer gehören mir.':'This request is for my mother; the patient is Mara Fiktiva and the email and phone are mine.');
    assert.doesNotMatch(proxy.message,/thank you, Mara|Danke, Mara|Dank, Mara/iu);
  }
}));
