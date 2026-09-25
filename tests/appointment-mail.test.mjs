import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {openDatabase,contentSnapshot} from '../src/database.mjs';
import {createApp} from '../src/server.mjs';
import {sqliteChatStore} from '../src/chat/store.mjs';
import {createChatService} from '../src/chat/service.mjs';
import {requestEmail,patientConfirmationEmail,patientReceiptConfigured,notifyPatient,notifyRequest} from '../src/chat/notify.mjs';
import {requestPreference} from '../src/appointment-preference.mjs';
import {defaultConcerns,sourceLabel} from '../public/request-summary.js';
import {renderChatIntake} from '../public/admin-chat.js';

test('all selected concerns and full notes survive the legacy preview limit',()=>{
  const body={concerns:[...defaultConcerns.map(c=>c.title),'Kiefer'],symptoms:'s'.repeat(220),preference:'p'.repeat(300),language:'en'};
  const result=requestPreference(body,null);
  assert.equal(result.intake.concerns.length,defaultConcerns.length);
  assert.equal(result.intake.other_concern.length,220);
  assert.equal(result.intake.availability.length,300);
  assert.equal(result.value.length,300);
  assert.equal(result.intake.therapist,null);
  assert.equal(result.intake.source,'first_appointment');
  assert.equal(requestPreference({...body,concerns:['Kiefer']}).intake.other_concern,'');
  assert.throws(()=>requestPreference({...body,concerns:['Unpublished option']}));
  assert.throws(()=>requestPreference({...body,preference:'p'.repeat(301)}));
  const edited={appointmentConcerns:[{title:'Neue Kategorie',titleEn:'New category',custom:true}]};
  assert.equal(requestPreference({concerns:['New category'],symptoms:'My brief note'},null,edited).intake.other_concern,'My brief note');
  assert.throws(()=>requestPreference({concerns:['Kiefer']},null,edited));
  const additional=requestPreference({concerns:["Children's health",'Speech therapy']},null,edited).intake.concerns;
  assert.deepEqual(additional.map(item=>item.title),['Kindergesundheit','Logopädie']);
  const ordered=requestPreference({concerns:['Other concern',"Children's health",'Speech therapy']},null).intake.concerns;
  assert.deepEqual(ordered.map(item=>item.title),['Andere Beschwerden','Kindergesundheit','Logopädie']);
});

test('email and Admin render the same complete information and escape visitor markup',()=>{
  const {intake}=requestPreference({concerns:['Kiefer','Tinnitus','Andere Beschwerden'],symptoms:'<img src=x onerror=alert(1)>',preference:'Afternoons\nafter 2 pm'}, {id:'profile-id',title:'Dr Test & Sample',role:'Therapy'});
  const row={id:7,name:'QA <b>Name</b>',email:'qa@example.test',phone:'+4369912682157',intake,acute:true,notification_status:'failed'};
  const mail=requestEmail(row),admin=renderChatIntake(row,'en');
  assert.match(mail.subject,/Therapeutenprofil · AKUT/);
  assert.doesNotMatch(mail.subject,/Kiefer|img|QA/);
  for(const word of ['Kiefer','Tinnitus','Andere Beschwerden','Dr Test & Sample','Afternoons\nafter 2 pm'])assert.ok(mail.text.includes(word));
  assert.match(mail.html,/&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(mail.html,/<img src=x/);
  assert.equal(mail.reply_to,row.email);
  assert.match(admin,/Therapist profile/);
  assert.match(admin,/Jaw, Tinnitus, Other concern/);
  assert.match(admin,/&lt;img/);
  assert.match(admin,/data-retry-notification="7"/);
  assert.match(renderChatIntake({...row,notification_status:'not_configured'},'en'),/Send email/);
  assert.doesNotMatch(renderChatIntake({...row,notification_status:'sent'},'en'),/data-retry-notification/);
});

test('patient copy contains submitted details without admin links and works for the shared test inbox',async()=>{
  const keys=['RESEND_API_KEY','CHAT_NOTIFY_FROM','CHAT_NOTIFY_TO','PATIENT_CONFIRMATION_FROM'];
  const env=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
  Object.assign(process.env,{RESEND_API_KEY:'test-key',CHAT_NOTIFY_FROM:'Citypraxis <onboarding@resend.dev>',CHAT_NOTIFY_TO:'kovac.design@gmail.com'});
  delete process.env.PATIENT_CONFIRMATION_FROM;
  const {intake}=requestPreference({concerns:['Tinnitus','Andere Beschwerden'],symptoms:'<script>alert(1)</script>',language:'en'});
  const row={id:18,submission_key:'patient-copy-18',name:'Test Patient',email:'kovac.design@gmail.com',phone:'+4369912682157',intake};
  const mail=patientConfirmationEmail(row);
  assert.match(mail.text,/Thank you for contacting CityPraxis, Test Patient/);
  assert.match(mail.text,/Tinnitus/);
  assert.match(mail.text,/not an appointment confirmation/);
  assert.doesNotMatch(mail.text,/Admin|Im Admin/);
  assert.match(mail.html,/&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(mail.html,/<script>/);
  const sent=[];
  const fetcher=async(_url,options)=>{sent.push({headers:options.headers,mail:JSON.parse(options.body)});return Response.json({id:'mock-id'});};
  try{
    assert.equal(patientReceiptConfigured(row),true);
    assert.equal(await notifyPatient(row,fetcher),'sent');
    assert.equal(sent.length,1);
    assert.deepEqual(sent[0].mail.to,[row.email]);
    assert.equal(sent[0].mail.from,process.env.CHAT_NOTIFY_FROM);
    assert.equal(sent[0].headers['Idempotency-Key'],'citypraxis-patient-patient-copy-18');
    const other={...row,email:'other@example.test'};
    assert.equal(patientReceiptConfigured(other),false);
    assert.equal(await notifyPatient(other,fetcher),'not_configured');
    assert.equal(sent.length,1);
    process.env.PATIENT_CONFIRMATION_FROM='Citypraxis <hello@verified.example>';
    assert.equal(patientReceiptConfigured(other),true);
    assert.equal(await notifyPatient(other,fetcher),'sent');
    assert.deepEqual(sent[1].mail.to,[other.email]);
    assert.equal(sent[1].mail.from,process.env.PATIENT_CONFIRMATION_FROM);
  }finally{for(const key of keys)if(env[key]===undefined)delete process.env[key];else process.env[key]=env[key];}
});

test('first appointment, therapist and chatbot notify once after storage; failure and retry preserve the request',async()=>{
  const originalFetch=global.fetch,keys=['RESEND_API_KEY','CHAT_NOTIFY_FROM','CHAT_NOTIFY_TO','PATIENT_CONFIRMATION_FROM','APP_ORIGIN'],env=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
  Object.assign(process.env,{RESEND_API_KEY:'fake-test-key',CHAT_NOTIFY_FROM:'Citypraxis <onboarding@resend.dev>',CHAT_NOTIFY_TO:'kovac.design@gmail.com'});delete process.env.APP_ORIGIN;delete process.env.PATIENT_CONFIRMATION_FROM;
  const db=openDatabase(':memory:'),outbox=[];
  let failEmail=false;
  global.fetch=async(url,options)=>{
    if(String(url)==='https://api.resend.com/emails'){
      // Provider sees only requests that have already been safely persisted.
      const row=db.prepare('SELECT * FROM requests ORDER BY id DESC').get();assert.ok(row);
      const mail=JSON.parse(options.body);outbox.push(mail);
      assert.deepEqual(mail.to,['kovac.design@gmail.com']);
      assert.match(options.headers['Idempotency-Key'],/^citypraxis-(?:request|patient)-/);
      return Response.json(failEmail?{message:'Simulated delivery failure'}:{id:'mock-id'},{status:failEmail?503:200});
    }
    return originalFetch(url,options);
  };
  const server=createApp(db);
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
  const call=async(route,body)=>{const r=await originalFetch(origin+'/api/'+route,{method:body?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};};
  const body={name:'Notification Test',email:'qa@example.test',phone:'+4369912682157',consent:true,language:'en',concerns:['Kiefer','Tinnitus','Andere Beschwerden'],symptoms:'Brief other concern',preference:'Afternoons',submissionKey:randomUUID()};
  const store=sqliteChatStore(db);
  try{
    const first=await call('requests',body);assert.equal(first.status,201);assert.match(first.data.message,/secretary.*phone or email/);
    assert.equal((await store.get(first.data.id)).notification_status,'sent');
    assert.equal(sourceLabel((await store.get(first.data.id)).intake,'en'),'First-appointment form');
    assert.match(outbox[0].subject,/Ersttermin-Formular/);assert.match(outbox[0].text,/Kiefer, Tinnitus, Andere Beschwerden/);assert.match(outbox[0].text,/Brief other concern/);
    assert.equal((await call('requests',body)).status,200);assert.equal(outbox.length,1);
    assert.equal((await call('requests',{...body,preference:'Changed after sending'})).status,409);assert.equal(outbox.length,1);
    const profile=contentSnapshot(db).team[0];
    const therapist=await call('requests',{...body,submissionKey:randomUUID(),therapistId:profile.id,therapistName:'Forged name',source:'chatbot',acute:true});
    assert.equal(therapist.status,201);assert.match(outbox[1].subject,/Therapeutenprofil · AKUT/);assert.ok(outbox[1].text.includes(profile.title));assert.doesNotMatch(outbox[1].text,/Forged name/);
    assert.equal((await store.get(therapist.data.id)).acute,1);
    const session=(await call('chat/session')).data;
    const chat=await call('chat/submit',{token:session.token,data:{first_name:'Chat',last_name:'Tester',email:'chat@example.test',phone:'+4369912682157',request_type:'appointment_request',patient_status_claimed:'new',discipline:'physiotherapy',body_area:['neck','shoulder'],description:'A short test request',referral_claimed:'yes',preferred_days:['thursday'],preferred_times:['afternoon'],preferred_contact:'email',consent:true,review_confirmed:true}});
    assert.equal(chat.status,201);assert.match(outbox[2].subject,/Chatbot/);assert.match(outbox[2].text,/Nacken, Schulter/);assert.match(outbox[2].text,/A short test request/);
    failEmail=true;const failed=await call('requests',{...body,submissionKey:randomUUID()});assert.equal(failed.status,201);
    assert.equal((await store.get(failed.data.id)).notification_status,'failed');
    failEmail=false;const service=createChatService({store});assert.equal((await service.retryNotification(failed.data.id)).status,'sent');assert.equal(outbox.length,5);
    assert.equal((await service.retryNotification(failed.data.id)).status,'sent');assert.equal(outbox.length,5);
    delete process.env.RESEND_API_KEY;
    const pending=await call('requests',{...body,submissionKey:randomUUID()});assert.equal(pending.status,201);assert.equal((await store.get(pending.data.id)).notification_status,'not_configured');assert.equal(outbox.length,5);
    process.env.RESEND_API_KEY='fake-test-key';assert.equal((await service.retryNotification(pending.data.id)).status,'sent');assert.equal(outbox.length,6);
    const sharedBody={...body,email:'kovac.design@gmail.com',submissionKey:randomUUID()};
    const sharedInbox=await call('requests',sharedBody);
    assert.equal(sharedInbox.status,201);assert.equal(sharedInbox.data.patientReceipt,'sent');
    assert.equal(outbox.length,8);assert.match(outbox[6].subject,/Ersttermin-Formular/);assert.match(outbox[7].subject,/We received your request/);
    assert.equal((await call('requests',sharedBody)).status,200);assert.equal(outbox.length,8);
    const savedCount=db.prepare('SELECT count(*) AS n FROM requests').get().n;
    assert.equal((await call('requests',{...body,concerns:['Injected category']})).status,400);
    assert.equal(db.prepare('SELECT count(*) AS n FROM requests').get().n,savedCount);
    const brokenStore={notification:async()=>{throw Error('Storage unavailable');}};
    assert.equal(await notifyRequest({...await store.get(pending.data.id),notification_status:'pending'},brokenStore,async()=>Response.json({id:'accepted'})),'sent');
  }finally{await new Promise(r=>server.close(r));db.close();global.fetch=originalFetch;for(const key of keys)if(env[key]===undefined)delete process.env[key];else process.env[key]=env[key];}
});
