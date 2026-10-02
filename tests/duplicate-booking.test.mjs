import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {openDatabase} from '../src/database.mjs';
import {sqliteChatStore,supabaseChatStore} from '../src/chat/store.mjs';
import {createConversationService} from '../src/chat/conversation.mjs';
import {newSession} from '../src/chat/security.mjs';
import {matchingRecent,markPossibleDuplicates,normalizedEmail,normalizedPhone} from '../src/chat/recent-requests.mjs';

test('recent chatbot requests offer update, additional appointment or cancellation without duplicate mail',async()=>{
  const old={...process.env};
  Object.assign(process.env,{OPENAI_API_KEY:'fixture',CHAT_AI_ENABLED:'true',RESEND_API_KEY:'fixture',CHAT_NOTIFY_FROM:'Citypraxis <secretary@example.test>',CHAT_NOTIFY_TO:'secretary@example.test'});
  const db=openDatabase(':memory:'),store=sqliteChatStore(db),mails=[];
  const fetcher=async(url,options)=>{
    if(String(url).includes('/v1/responses')){
      const raw=JSON.parse(JSON.parse(options.body).input).visitorMessage;
      const reason=/elbow/i.test(raw)?'Elbow pain':/shoulder/i.test(raw)?'Shoulder pain':null;
      const value={kind:'appointment',input_language:'en',answer:'I can help prepare your request.',related_pages:[],booking_intent:'unspecified',needs_clarification:false,reason,availability:null,first_name:null,last_name:null,patient_status:null};
      return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}]})};
    }
    if(String(url).includes('resend.com/emails')){mails.push({key:options.headers['Idempotency-Key'],...JSON.parse(options.body)});return {ok:true,json:async()=>({id:randomUUID()})};}
    throw Error(`Unexpected network request: ${url}`);
  };
  const service=createConversationService({store,fetcher});
  const call=async(token,route,body={})=>{let result;await service.handle({method:'POST',headers:{},socket:{remoteAddress:'qa'}},`/api/chat/${route}`,{token,language:'en',...body},(status,data)=>result={status,...data});return result;};
  const turn=(token,message)=>call(token,'turn',{message,consent:true,turnKey:randomUUID()});
  const prepare=async(name,email,phone,reason='Elbow pain')=>{
    const token=newSession();
    await turn(token,'I want an appointment');
    await turn(token,reason);
    await turn(token,'yes');
    await turn(token,name);
    await turn(token,email);
    assert.equal((await turn(token,phone)).ready,true);
    return token;
  };
  const count=()=>db.prepare('SELECT count(*) AS n FROM requests').get().n;
  try{
    const first=await prepare('Nora Example','nora@example.test','+43 699 12682157');
    const saved=await call(first,'finish',{confirmed:true});
    assert.equal(saved.status,201);assert.equal(count(),1);assert.equal(mails.length,1);
    const originalCreated=(await store.get(saved.id)).created_at;
    assert.equal((await call(first,'finish',{confirmed:true})).id,saved.id);
    assert.equal(count(),1);assert.equal(mails.length,1);

    const update=await prepare('Nora Example',' NORA@EXAMPLE.TEST ','0699 12682157','Shoulder pain');
    const prompt=await call(update,'finish',{confirmed:true});
    assert.equal(prompt.requiresChoice,true);assert.equal(count(),1);assert.equal(mails.length,1);
    assert.equal((await call(update,'finish',{confirmed:true})).requiresChoice,true);
    const changed=await call(update,'finish',{confirmed:true,duplicateChoice:'update'});
    assert.equal(changed.updated,true);assert.equal(changed.id,saved.id);assert.equal(count(),1);
    assert.equal((await store.get(saved.id)).intake.description,'Shoulder pain');
    assert.ok(Date.parse((await store.get(saved.id)).updated_at)>Date.parse(originalCreated.replace(' ','T')+'Z'));
    assert.equal(mails.length,2);assert.match(mails[1].subject,/AKTUALISIERTE ANFRAGE/);
    assert.notEqual(mails[0].key,mails[1].key);
    assert.equal((await call(update,'finish',{confirmed:true,duplicateChoice:'update'})).id,saved.id);
    assert.equal(mails.length,2);

    const extra=await prepare('Nora Example','nora@example.test','+43 699 12682157');
    assert.equal((await call(extra,'finish',{confirmed:true})).requiresChoice,true);
    const additional=await call(extra,'finish',{confirmed:true,duplicateChoice:'new'});
    assert.equal(additional.additional,true);assert.notEqual(additional.id,saved.id);assert.equal(count(),2);
    assert.match(mails[2].subject,/ADDITIONAL REQUEST \/ ZUSÄTZLICHE ANFRAGE/);
    const marked=markPossibleDuplicates(db.prepare('SELECT * FROM requests').all());
    assert.deepEqual(marked.find(row=>row.id===saved.id).possible_duplicate_ids,[additional.id]);
    assert.deepEqual(marked.find(row=>row.id===additional.id).possible_duplicate_ids,[saved.id]);

    const cancel=await prepare('Nora Example','nora@example.test','+43 699 12682157');
    assert.equal((await call(cancel,'finish',{confirmed:true})).requiresChoice,true);
    const beforeMail=mails.length;
    assert.equal((await call(cancel,'finish',{confirmed:true,duplicateChoice:'cancel'})).cancelled,true);
    assert.equal((await call(cancel,'finish',{confirmed:true,duplicateChoice:'new'})).cancelled,true);
    assert.equal(count(),2);assert.equal(mails.length,beforeMail);

    const distinct=await prepare('Nora Example','other@example.test','+43 699 12682158');
    assert.equal((await call(distinct,'finish',{confirmed:true})).status,201);
    assert.equal(count(),3);

    db.prepare("UPDATE requests SET created_at=datetime('now','-25 hours') WHERE id=?").run(saved.id);
    db.prepare("UPDATE requests SET created_at=datetime('now','-25 hours') WHERE id=?").run(additional.id);
    const later=await prepare('Nora Example','nora@example.test','+43 699 12682157');
    assert.equal((await call(later,'finish',{confirmed:true})).status,201);
    assert.equal(count(),4);
  }finally{db.close();process.env=old;}
});

test('matching uses normalized contact details rather than name',()=>{
  assert.equal(normalizedPhone('0699 12682157'),normalizedPhone('+43 699 12682157'));
  assert.equal(normalizedPhone('0043 699 12682157'),normalizedPhone('+43 699 12682157'));
  assert.equal(normalizedEmail(' Nora@Example.Test '),'nora@example.test');
  const now=new Date().toISOString();
  const rows=[{id:1,name:'Same Name',phone:'+4369912682157',email:'nora@example.test',created_at:now,status:'new'}];
  assert.equal(matchingRecent(rows,{phone:'0699 12682157',email:'other@example.test'}).length,1);
  assert.equal(matchingRecent(rows,{phone:'+4369912682158',email:'NORA@EXAMPLE.TEST'}).length,1);
  assert.equal(matchingRecent(rows,{name:'Same Name',phone:'+4369912682158',email:'other@example.test'}).length,0);
  rows[0].created_at=new Date(Date.now()-25*60*60*1000).toISOString();
  assert.equal(matchingRecent(rows,{phone:'0699 12682157',email:'nora@example.test'}).length,0);
});

test('Supabase keeps the original request ID and updates its existing row',async()=>{
  const calls=[];
  const store=supabaseChatStore({rest:async(table,query,options={})=>{
    calls.push({table,query,options});
    if(options.method==='PATCH')return [{id:77,created_at:'2026-09-30T10:00:00Z',updated_at:options.body.updated_at,...options.body}];
    return [{id:77,created_at:'2026-09-30T10:00:00Z',email:'nora@example.test',phone:'+4369912682157',status:'new'}];
  }});
  assert.equal((await store.recent('2026-09-29T10:00:00Z'))[0].id,77);
  const changed=await store.update(77,{name:'Nora Example',email:'nora@example.test',phone:'+4369912682157',preference:'Termin anfragen',intake:{repeat_action:'updated'},notification_status:'pending'});
  assert.equal(changed.id,77);
  assert.equal(calls[1].table,'appointment_requests');
  assert.match(calls[1].query,/id=eq.77&status=neq.closed/);
  assert.equal(calls[1].options.body.intake.repeat_action,'updated');
  assert.equal('status' in calls[1].options.body,false);
});
