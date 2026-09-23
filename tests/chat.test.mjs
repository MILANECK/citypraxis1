import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/database.mjs';
import {createApp} from '../src/server.mjs';
import {createSupabaseApp} from '../src/supabase-server.mjs';
import {normalizeIntake,phone,emailValid} from '../src/chat/validation.mjs';
import {scriptedInterpret,interpret,validateExtraction,safetySignal} from '../src/chat/interpret.mjs';
import {newSession,sign,verify,makeLimiter} from '../src/chat/security.mjs';
import {createChatService} from '../src/chat/service.mjs';
import {notifyRequest} from '../src/chat/notify.mjs';
import {nextStep} from '../public/chat-model.js';

const fixture=(changes={})=>({first_name:'Anna',last_name:'Müller',email:'anna@example.test',phone:'+43 699 12682157',request_type:'appointment_request',patient_status_claimed:'new',discipline:'physiotherapy',body_area:['neck','shoulder'],description:'Bitte um einen Termin wegen Nackenbeschwerden.',referral_claimed:'yes',preferred_days:['thursday'],preferred_times:['afternoon'],availability_notes:'',preferred_contact:'email',consent:true,review_confirmed:true,...changes});
async function setup(){const db=openDatabase(':memory:'),server=createApp(db);await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;return {db,server,origin,call:async(route,body,headers={})=>{const r=await fetch(origin+'/api/'+route,{method:body?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json',...headers},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};},close:async()=>{await new Promise(r=>server.close(r));db.close();}};}

test('guided flows, self-reported status, contact formats and minimal relevant fields',()=>{
  for(const status of ['new','existing','unsure'])for(const request_type of ['appointment_request','change_request','cancellation_request','referral_question','payment_question','therapist_change','administrative_question','other']){
    const d=normalizeIntake(fixture({patient_status_claimed:status,request_type}));assert.equal(d.patient_status_claimed,status);assert.equal(d.summary_source,'scripted');assert.equal(d.phone,'+4369912682157');
    if(request_type==='cancellation_request'){assert.equal(d.preferred_days,undefined);assert.equal(d.body_area,undefined);}
  }
  assert.equal(emailValid('invalid@'),false);assert.equal(emailValid('abc@example.com'),true);assert.equal(emailValid('a\n@test.com'),false);
  assert.equal(phone('0699 12682157'),'+4369912682157');assert.equal(phone('+44 20 7946 0018'),'+442079460018');assert.throws(()=>phone('12345'));
  assert.throws(()=>normalizeIntake(fixture({email:'bad'})));assert.throws(()=>normalizeIntake(fixture({consent:false})));assert.throws(()=>normalizeIntake(fixture({description:'x'.repeat(700)})));assert.throws(()=>normalizeIntake(fixture({body_area:['diagnosis']})));
  assert.equal(nextStep({request_type:'cancellation_request',patient_status_claimed:'existing'}),'previous_therapist');
  assert.equal(nextStep({...fixture(),description:'',phone:''}),'contact');
});

test('free text, ambiguity, off-topic, medical boundary and emergency path',()=>{
  assert.deepEqual(scriptedInterpret('Right side of my neck towards my shoulder','body_area').suggestions.body_area,['neck','shoulder']);
  assert.equal(scriptedInterpret('where my leg joins my body','body_area').confidence,.65);
  assert.equal(scriptedInterpret('How do I make tomato soup?','body_area').relevant,false);
  assert.equal(scriptedInterpret('xxxxxxxxxxxxxxxx','body_area').relevant,false);
  assert.equal(safetySignal('I cannot breathe'),'emergency');assert.equal(safetySignal('Welche Medikamente soll ich nehmen?'),'medical');
  const s=scriptedInterpret("I'm already a patient. My name is Anna Müller, I need an appointment for my neck on Thursday afternoon.",'initial').suggestions;
  assert.equal(s.patient_status_claimed,'existing');assert.equal(s.first_name,'Anna');assert.equal(s.last_name,'Müller');assert.equal(s.request_type,'appointment_request');assert.deepEqual(s.preferred_days,['thursday']);assert.deepEqual(s.preferred_times,['afternoon']);
});

test('AI is opt-in; unavailable/invalid/injected output falls back safely',async()=>{
  const old={key:process.env.OPENAI_API_KEY,enabled:process.env.CHAT_AI_ENABLED};process.env.OPENAI_API_KEY='test-secret';process.env.CHAT_AI_ENABLED='true';
  const req={raw:'The hinge below my thigh','context':'body_area',aiConsent:true};let calls=0;
  const good={relevant:true,confidence:.7,emergency:false,medical_advice:false,request_type:null,patient_status_claimed:null,body_area:['knee'],preferred_days:[],preferred_times:[]};
  const fake=value=>async(_url,options)=>{calls++;const payload=JSON.parse(options.body);assert.equal(payload.store,false);assert.equal(payload.text.format.strict,true);return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:value}]}]})};};
  try{
    assert.equal((await interpret({...req,aiConsent:false},fake(JSON.stringify(good)))).source,'scripted');assert.equal(calls,0);
    assert.equal((await interpret(req,fake(JSON.stringify(good)))).source,'ai');
    assert.equal((await interpret(req,fake('not JSON'))).ai_unavailable,true);
    assert.equal((await interpret(req,async()=>{throw new Error('timeout');})).ai_unavailable,true);
    assert.equal((await interpret(req,fake(JSON.stringify({...good,medical_advice:'false'})))).source,'scripted');
    assert.throws(()=>validateExtraction({...good,body_area:['arthritis']}));assert.throws(()=>validateExtraction({...good,reply:'Take medicine'}));
  }finally{if(old.key===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=old.key;if(old.enabled===undefined)delete process.env.CHAT_AI_ENABLED;else process.env.CHAT_AI_ENABLED=old.enabled;}
});

test('submission is persisted once; failed validation never writes; receipts bind session',async()=>{
  const app=await setup();try{
    const session=(await app.call('chat/session')).data,token=session.token;
    assert.equal((await app.call('admin/requests')).status,401);
    assert.equal((await app.call('chat/submit',{token,data:fixture({email:'bad'})})).status,400);
    const parsed=await app.call('chat/interpret',{token,raw:'neck and shoulder',context:'body_area'});assert.ok(parsed.data.receipt);
    const body={token,data:fixture(),receipts:[parsed.data.receipt]};
    const results=await Promise.all([app.call('chat/submit',body),app.call('chat/submit',body)]);assert.deepEqual(results.map(r=>r.status).sort(),[200,201]);assert.equal(results[0].data.id,results[1].data.id);
    const rows=app.db.prepare('SELECT * FROM requests').all();assert.equal(rows.length,1);const intake=JSON.parse(rows[0].intake);assert.equal(intake.interpretations[0].source,'scripted');assert.equal(rows[0].status,'new');
    assert.equal((await app.call('chat/submit',{...body,data:fixture({description:'different'})})).status,409);
    const other=(await app.call('chat/session')).data;
    assert.equal((await app.call('chat/submit',{...body,token:other.token})).status,400);
    assert.equal((await app.call('chat/submit',{token:other.token,data:fixture({description:'I cannot breathe'})})).data.code,'emergency');
    assert.equal((await app.call('chat/contact',{token,...fixture(),phone:'1'})).data.code,'invalid_phone');
    assert.equal((await app.call('chat/interpret',{token,context:'initial',raw:'a'.repeat(651)})).status,400);
    assert.equal((await app.call('chat/submit',{token,data:fixture()},{Origin:'https://evil.example'})).status,403);
    const expired=sign({kind:'session',id:'expired',expires:0});assert.equal((await app.call('chat/contact',{token:expired,...fixture()})).status,401);
    assert.equal((await fetch(app.origin+'/.env')).status,404);
    for(const path of ['/chat-widget.js','/chat-model.js','/chat.css']){const source=await (await fetch(app.origin+path)).text();assert.doesNotMatch(source,/SUPABASE_SECRET_KEY|sk-proj-|Bearer /);}
  }finally{await app.close();}
});

test('database failures return retryable errors and email failure preserves requests',async()=>{
  const service=createChatService({store:{save:async()=>{throw new Error('private data must not leak');}}}),req={method:'POST',headers:{},socket:{remoteAddress:'local'}};
  let result;await service.handle(req,'/api/chat/submit',{token:newSession(),data:fixture()},(status,data)=>result={status,data});assert.deepEqual(result,{status:503,data:{code:'unavailable'}});
  const saved={...process.env};Object.assign(process.env,{RESEND_API_KEY:'test',CHAT_NOTIFY_FROM:'from@example.test',CHAT_NOTIFY_TO:'to@example.test'});
  let delivery;try{assert.equal(await notifyRequest({id:1,submission_key:'fixture'}, {notification:async(_id,status)=>delivery=status},async()=>{throw new Error('offline');}),'failed');assert.equal(delivery,'failed');}finally{for(const key of ['RESEND_API_KEY','CHAT_NOTIFY_FROM','CHAT_NOTIFY_TO']){if(saved[key]===undefined)delete process.env[key];else process.env[key]=saved[key];}}
});

test('sessions reject tampering and rate limits bound resource use',()=>{
  assert.throws(()=>verify(newSession()+'tampered','session'));assert.throws(()=>verify(sign({kind:'session',expires:0}),'session'));
  const limit=makeLimiter();limit('a',1);assert.throws(()=>limit('a',1));
});

test('Supabase route persists structured intake, deduplicates and masks storage failures',async()=>{
  const originalFetch=global.fetch,keys=['SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','SUPABASE_SECRET_KEY','APP_ORIGIN'],env=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
  delete process.env.APP_ORIGIN;Object.assign(process.env,{SUPABASE_URL:'https://supabase.example',SUPABASE_PUBLISHABLE_KEY:'test-key',SUPABASE_SECRET_KEY:'test-secret'});
  const rows=[];let fail=false;
  global.fetch=async(url,options={})=>{
    const parsed=new URL(url);
    if(parsed.pathname==='/rest/v1/content')return Response.json([{published:{chatEmergency:'Configured emergency wording'}}]);
    if(parsed.pathname==='/rest/v1/appointment_requests'){
      if(fail)return Response.json({message:'Internal database error with private data'},{status:500});
      if(options.method==='POST'){
        assert.match(options.headers.Prefer,/ignore-duplicates/);assert.equal(parsed.searchParams.get('on_conflict'),'submission_key');
        const d=JSON.parse(options.body);if(rows.some(r=>r.submission_key===d.submission_key))return Response.json([]);const row={id:rows.length+1,...d,status:'new'};rows.push(row);return Response.json([row]);
      }
      return Response.json(rows.filter(r=>'eq.'+r.submission_key===parsed.searchParams.get('submission_key')));
    }
    throw new Error('Unexpected mock path');
  };
  const server=createSupabaseApp();await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
  const call=async(route,body)=>{const r=await originalFetch(origin+'/api/'+route,{method:body?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};};
  try{
    const session=(await call('chat/session')).data;assert.equal(session.emergencyDe,'Configured emergency wording');
    const body={token:session.token,data:fixture({request_type:'cancellation_request',patient_status_claimed:'existing',previous_therapist:'Self-reported name',appointment_details:'Thursday morning'})};
    assert.equal((await call('chat/submit',body)).status,201);assert.equal((await call('chat/submit',body)).status,200);assert.equal(rows.length,1);assert.equal(rows[0].intake.patient_status_claimed,'existing');assert.equal(rows[0].intake.preferred_days,undefined);assert.equal(rows[0].intake.appointment_details,'Thursday morning');
    assert.equal((await call('admin/requests')).status,401);const second=(await call('chat/session')).data;fail=true;const failed=await call('chat/submit',{token:second.token,data:fixture()});assert.equal(failed.status,503);assert.deepEqual(failed.data,{code:'unavailable'});
  }finally{await new Promise(r=>server.close(r));global.fetch=originalFetch;for(const key of keys)if(env[key]===undefined)delete process.env[key];else process.env[key]=env[key];}
});
