import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createConversationService,conversationFacts,composeReply,practiceHoursStatus} from '../src/chat/conversation.mjs';
import {newSession} from '../src/chat/security.mjs';

const answer=(changes={})=>({kind:'appointment',answer:'',booking_intent:'request',reason:null,availability:null,first_name:null,last_name:null,patient_status:null,...changes});
test('published Vienna hours distinguish open, closed and unknown periods',()=>{
  const hours={wednesday:'08:00–20:00',saturdayHours:'08:00–14:00',sunday:'Closed'};
  assert.equal(practiceHoursStatus(hours,new Date('2026-09-23T10:00:00Z')).open,true);
  assert.equal(practiceHoursStatus(hours,new Date('2026-09-23T21:00:00Z')).open,false);
  assert.equal(practiceHoursStatus(hours,new Date('2026-09-27T10:00:00Z')).open,false);
  assert.equal(practiceHoursStatus({},new Date('2026-09-23T10:00:00Z')).open,null);
});
test('mixed questions retain concerns, ask before intake, respect a decline and preserve complete answers',async()=>{
  const old={...process.env};process.env.OPENAI_API_KEY='fixture';process.env.CHAT_AI_ENABLED='true';
  const facts=conversationFacts({team:[{title:'Published Person',role:'Physiotherapist',specialties:'Jaw',fictional:false},{title:'Fictional Person',fictional:true}],symptoms:[{title:'Jaw',body:'Published jaw information'}],pages:[{id:'datenschutz',title:'Privacy',body:'Published privacy information'}]});
  let value=answer({kind:'practice_question',booking_intent:'unspecified',reason:'Jaw concern',answer:'Thank you for telling us. '+('Published pricing information. '.repeat(18))});
  const service=createConversationService({store:{save(){assert.fail('No submission expected');}},getFacts:async()=>facts,fetcher:async(_,options)=>{const payload=JSON.parse(options.body),input=JSON.parse(payload.input);assert.equal(input.publishedFacts.team.length,1);assert.equal(input.publishedFacts.specialisms[0].title,'Jaw');assert.equal(input.publishedFacts.informationPages[0].id,'datenschutz');return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}]})};}});
  const token=newSession();const turn=async message=>{let result;await service.handle({method:'POST',headers:{},socket:{remoteAddress:'test'}},'/api/chat/turn',{token,language:'en',message,consent:true,turnKey:randomUUID()},(status,data)=>result={status,...data});return result;};
  try{
    const invitation=await turn('My jaw hurts, what are the prices?');assert.ok(invitation.message.includes("Published pricing information."));assert.equal((invitation.message.match(/Published pricing information/g)||[]).length,1);assert.match(invitation.message,/Would you like us to prepare/);assert.doesNotMatch(invitation.message,/first and last name/);assert.ok(invitation.message.length<=700);assert.ok(composeReply('A long sentence. '.repeat(100),'May I have your name?').length<=700);assert.equal(composeReply('Perfect, thank you. Perfect, thank you. May I have your name?','May I have your name?'),'Perfect, thank you.\n\nMay I have your name?');
    value=answer({booking_intent:'defer',answer:'Of course. We are happy to answer your questions.'});const declined=await turn('Not yet, just information');assert.equal(declined.message,value.answer);
    value=answer({kind:'practice_question',booking_intent:'unspecified',answer:'We are in Vienna.'});assert.equal((await turn('Where are you?')).message,value.answer);
    value=answer({booking_intent:'request',answer:'We would be happy to help.'});assert.match((await turn('Yes, I want to request an appointment now')).message,/first and last name/);
  }finally{process.env=old;}
});
test('conversational reception validates, reviews, edits and submits exactly once',async()=>{
  const old={...process.env};process.env.OPENAI_API_KEY='fixture';process.env.CHAT_AI_ENABLED='true';delete process.env.RESEND_API_KEY;
  let value=answer({reason:'Shoulder concern',first_name:'Test',last_name:'Visitor'}),calls=0,saved=[];
  const fetcher=async(url,options)=>{calls++;const payload=JSON.parse(options.body);assert.equal(payload.model,'gpt-6-luna');assert.equal(payload.store,false);assert.equal(payload.text.format.strict,true);return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}]})};};
  const store={save:async row=>{saved.push(row);return {created:true,row:{...row,id:42}};}};
  const service=createConversationService({store,fetcher});const token=newSession();
  const call=async(route,body={},session=token)=>{let result;await service.handle({method:'POST',headers:{},socket:{remoteAddress:'test'}},`/api/chat/${route}`,{token:session,language:'en',...body},(status,data)=>result={status,...data});return result;};
  const turn=(message,extra={})=>call('turn',{message,consent:true,turnKey:randomUUID(),...extra});
  try{
    assert.equal((await call('turn',{message:'Hi',turnKey:randomUUID()})).code,'consent_required');assert.equal(calls,0);
    const key=randomUUID();const first=await turn('My name is Test Visitor. Shoulder concern.',{turnKey:key});assert.match(first.message,/email address/);assert.equal(first.ready,false);
    assert.deepEqual(await turn('My name is Test Visitor. Shoulder concern.',{turnKey:key}),first);assert.equal(calls,1);
    assert.equal((await turn('Changed',{turnKey:key})).code,'invalid_request');
    assert.equal((await call('finish',{confirmed:true})).code,'invalid_request');assert.equal(saved.length,0);
    assert.match((await turn('test@example.test')).message,/phone number/);
    assert.match((await turn('+43 699 12682157')).message,/days or times/);
    value=answer({availability:'Afternoons'});const review=await turn('Afternoons');assert.equal(review.ready,true);assert.ok(!review.summary.some(([key])=>['Source','Herkunft'].includes(key)));assert.ok(review.summary.some(([,v])=>v==='test@example.test'));
    assert.equal((await call('finish')).code,'consent_required');
    assert.match((await call('edit',{field:'email'})).message,/email address/);
    assert.equal((await turn('corrected@example.test')).ready,true);
    assert.equal((await call('finish',{confirmed:true})).status,201);
    assert.equal((await call('finish',{confirmed:true})).duplicate,true);assert.equal(saved.length,1);assert.equal(saved[0].email,'corrected@example.test');assert.equal(saved[0].intake.conversation_version,2);assert.ok(saved[0].intake.transcript.length>5);
    assert.equal((await turn('Again')).code,'already_submitted');
    assert.equal((await call('turn',{message:'Resume',turnNumber:2,consent:true,turnKey:randomUUID()},newSession())).code,'session_expired');
  }finally{process.env=old;}
});

test('AI errors, malformed output, boundaries, limits and concurrent requests are safe',async()=>{
  const old={...process.env};process.env.OPENAI_API_KEY='fixture';process.env.CHAT_AI_ENABLED='true';
  let value=answer({kind:'off_topic'}),release,waiting=false,calls=0;
  const service=createConversationService({store:{save(){assert.fail('Must not save');}},fetcher:async()=>{calls++;if(waiting)await new Promise(r=>release=r);return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}]})};}});
  const call=async(token,message,extra={})=>{let result;await service.handle({method:'POST',headers:{},socket:{remoteAddress:'test'}},'/api/chat/turn',{token,message,language:'en',consent:true,turnKey:randomUUID(),...extra},(status,data)=>result={status,...data});return result;};
  try{
    const token=newSession();assert.match((await call(token,'Write a recipe')).message,/only help with CityPraxis/);
    assert.equal((await call(token,'I cannot breathe')).emergency,true);assert.equal(calls,1);
    value=answer({first_name:{bad:true}});assert.equal((await call(token,'A normal message')).code,'ai_unavailable');
    value=answer({kind:'medical'});assert.match((await call(token,'What exercises should I do?')).message,/cannot assess/);
    value=answer({kind:'off_topic'});waiting=true;const pending=call(token,'A question');await new Promise(r=>setImmediate(r));assert.equal((await call(token,'Another')).code,'busy');waiting=false;release();await pending;
    const limited=newSession();for(let i=0;i<16;i++){const result=await call(limited,'Unrelated question');assert.equal(result.status,200);if(i===15)assert.equal(result.limitReached,true);}
    assert.equal((await call(limited,'One more')).code,'conversation_limit');
    assert.deepEqual(conversationFacts({prices:[{amount:null},{amount:''},{amount:'90',title:'Therapy'}]}).samplePrices,[{category:undefined,service:'Therapy',duration:undefined,euro:90,details:undefined}]);
  }finally{process.env=old;}
});
