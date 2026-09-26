import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createConversationService,conversationFacts,composeReply,practiceHoursStatus} from '../src/chat/conversation.mjs';
import {childrenService} from '../src/therapy-catalog.mjs';
import {newSession} from '../src/chat/security.mjs';

const answer=(changes={})=>({kind:'appointment',answer:'',booking_intent:'request',reason:null,availability:null,first_name:null,last_name:null,patient_status:null,...changes});
test('published Vienna hours distinguish open, closed and unknown periods',()=>{
  const hours={wednesday:'08:00–20:00',saturdayHours:'08:00–14:00',sunday:'Closed'};
  assert.equal(practiceHoursStatus(hours,new Date('2026-09-23T10:00:00Z')).open,true);
  assert.equal(practiceHoursStatus(hours,new Date('2026-09-23T21:00:00Z')).open,false);
  assert.equal(practiceHoursStatus(hours,new Date('2026-09-27T10:00:00Z')).open,false);
  assert.equal(practiceHoursStatus({},new Date('2026-09-23T10:00:00Z')).open,null);
});
test('a greeting stays welcoming and a direct appointment request starts with the concern',async()=>{
  const old={...process.env};process.env.OPENAI_API_KEY='fixture';process.env.CHAT_AI_ENABLED='true';
  let calls=0;const service=createConversationService({fetcher:async()=>{calls++;throw Error('A simple greeting or appointment request should not require AI');}});
  const token=newSession();const turn=async(message,language='en')=>{let result;await service.handle({method:'POST',headers:{},socket:{remoteAddress:'test'}},'/api/chat/turn',{token,language,message,consent:true,turnKey:randomUUID()},(status,data)=>result={status,...data});return result;};
  try{
    assert.equal((await turn('hello')).message,'Hello! How can I help you?');
    const request=await turn('I want an appointment');
    assert.match(request.message,/help you request an appointment at CityPraxis/);
    assert.match(request.message,/What would you like CityPraxis to help you with\?/);
    assert.doesNotMatch(request.message,/One sentence is enough|first and last name|confirmed/i);
    assert.equal((await turn('Hallo','de')).message,'Hallo! Wie kann ich Ihnen helfen?');
    assert.equal(calls,0);
  }finally{process.env=old;}
});
test('a short concern can receive a natural acknowledgement without a scripted thank-you',async()=>{
  const old={...process.env};process.env.OPENAI_API_KEY='fixture';process.env.CHAT_AI_ENABLED='true';
  const service=createConversationService({fetcher:async()=>({ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(answer({booking_intent:'unspecified',reason:'Tinnitus',answer:'I see. Our team can discuss tinnitus with you.'}))}]}]})})});
  const token=newSession();let result;
  try{
    await service.handle({method:'POST',headers:{},socket:{remoteAddress:'test'}},'/api/chat/turn',{token,language:'en',message:'I have tinnitus',consent:true,turnKey:randomUUID()},(status,data)=>result={status,...data});
    assert.match(result.message,/^I see\./);
    assert.match(result.message,/Would you like me to prepare an appointment request for our reception team/);
    assert.doesNotMatch(result.message,/Thank you|One sentence is enough/);
  }finally{process.env=old;}
});
test('asking about free appointment slots proactively reoffers a request after prior deferral',async()=>{
  const old={...process.env};process.env.OPENAI_API_KEY='fixture';process.env.CHAT_AI_ENABLED='true';
  const service=createConversationService({fetcher:async(_,options)=>{
    const raw=JSON.parse(JSON.parse(options.body).input).visitorMessage;
    const value=raw==='Not yet, just information'?answer({kind:'practice_question',booking_intent:'defer',answer:'Of course, we can answer your questions.'}):raw==='Tinnitus'?answer({kind:'practice_question',booking_intent:'unspecified',reason:'Tinnitus',answer:'Our team can discuss tinnitus with you.'}):answer({kind:'practice_question',booking_intent:'unspecified',answer:"I can't access the live calendar here, but I can help prepare an appointment request. Our reception team can contact you to arrange a suitable time."});
    return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}]})};
  }});
  const token=newSession();const turn=async message=>{let result;await service.handle({method:'POST',headers:{},socket:{remoteAddress:'test'}},'/api/chat/turn',{token,language:'en',message,consent:true,turnKey:randomUUID()},(status,data)=>result={status,...data});return result;};
  try{
    await turn('Not yet, just information');await turn('Tinnitus');
    const availability=await turn('Great, when do you have some free slots?');
    assert.match(availability.message,/I can.t access the live calendar here, but I can help prepare an appointment request/i);
    assert.match(availability.message,/Our reception team can contact you to arrange a suitable time/i);
    assert.equal((availability.message.match(/\b(?:can't|cannot|unable)\b/gi)||[]).length,1);
    assert.match(availability.message,/Would you like me to prepare an appointment request for our reception team/i);
    assert.equal(availability.ready,false);
    assert.doesNotMatch(availability.message,/first and last name/);
  }finally{process.env=old;}
});
test('an affirmative appointment answer moves directly to the name',async()=>{
  const previous={...process.env};process.env.OPENAI_API_KEY='fixture';process.env.CHAT_AI_ENABLED='true';
  let calls=0;const service=createConversationService({getFacts:async()=>conversationFacts({}),fetcher:async()=>{calls++;return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(answer({booking_intent:'unspecified',reason:'Shoulder concern',answer:'Thank you. Our team can clarify the next step.'}))}]}]})};}});
  const token=newSession();const turn=async message=>{let result;await service.handle({method:'POST',headers:{},socket:{remoteAddress:'test'}},'/api/chat/turn',{token,language:'en',message,consent:true,turnKey:randomUUID()},(status,data)=>result={status,...data});return result;};
  try{assert.match((await turn('Shoulder concern')).message,/Would you like me to prepare/);const accepted=await turn('yes please');assert.equal(calls,1);assert.equal(accepted.message,'Perfect, thank you.\n\nMay I have your first and last name, please?');}finally{process.env=previous;}
});
test('a refused contact detail is respected while supplied names and later details receive distinct acknowledgements',async()=>{
  const old={...process.env};process.env.OPENAI_API_KEY='fixture';process.env.CHAT_AI_ENABLED='true';
  let calls=0;
  const facts=conversationFacts({settings:[{address:'Stubenbastei 12/11',city:'1010 Wien',phone:'+43 699 12682157',email:'info@citypraxis.wien'}]});
  const service=createConversationService({getFacts:async()=>facts,fetcher:async(_,options)=>{
    calls++;const input=JSON.parse(JSON.parse(options.body).input),raw=input.visitorMessage;
    const value=raw.includes('shoulder')?answer({reason:'Shoulder concern',answer:'I see.'}):raw.includes('Michael Black')?answer({first_name:'Michael',last_name:'Black',answer:'Perfect, thank you.'}):raw.includes('price')?answer({kind:'practice_question',booking_intent:'unspecified',answer:'Our reception team can explain current prices.'}):raw==='Afternoons'?answer({availability:'Afternoons'}):answer({answer:'Perfect, thank you.'});
    return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}]})};
  }});
  const token=newSession();const turn=async(message,session=token)=>{let result;await service.handle({method:'POST',headers:{},socket:{remoteAddress:'test'}},'/api/chat/turn',{token:session,language:'en',message,consent:true,turnKey:randomUUID()},(status,data)=>result={status,...data});return result;};
  try{
    await turn('I want an appointment');
    assert.match((await turn('My shoulder hurts')).message,/first and last name/);
    const named=await turn('Michael Black');assert.match(named.message,/Great, thank you, Michael Black\./);assert.match(named.message,/email address/);
    const emailed=await turn('michael@example.test');assert.match(emailed.message,/Thank you, I have your email\./);assert.match(emailed.message,/phone number/);
    const beforeRefusal=calls;
    const refused=await turn('no I want to be notified via email thanx');assert.equal(calls,beforeRefusal);assert.match(refused.message,/does need your full name, email address and phone number/);assert.match(refused.message,/unable to complete it here/);assert.match(refused.message,/Stubenbastei 12\/11, 1010 Wien/);assert.match(refused.message,/\+43 699 12682157/);assert.match(refused.message,/info@citypraxis.wien/);assert.doesNotMatch(refused.message,/phone number, including|contact you by email instead/i);
    const price=await turn('What is the price?');assert.match(price.message,/explain current prices/);assert.doesNotMatch(price.message,/phone number, including/);
    const beforePhone=calls;
    const accepted=await turn('My number is +43 699/12682157');assert.equal(calls,beforePhone);assert.match(accepted.message,/Got it, thank you\./);assert.equal(accepted.ready,true);assert.match(accepted.message,/ready to review/);assert.deepEqual(accepted.summary.find(([key])=>key==='Phone'),['Phone','+4369912682157']);
    assert.doesNotMatch(`${named.message}\n${emailed.message}\n${accepted.message}`,/Perfect, thank you/);
    const another=newSession();await turn('I want an appointment',another);await turn('My shoulder hurts',another);await turn('Michael Black',another);
    const noEmail=await turn("I don't want to share my email",another);assert.match(noEmail.message,/does need your full name, email address and phone number/);assert.match(noEmail.message,/unable to complete it here/);assert.doesNotMatch(noEmail.message,/Which email address/);
    const allDetails=newSession();await turn('I want an appointment',allDetails);await turn('My shoulder hurts',allDetails);
    const noDetails=await turn("I don't want to share my contact details",allDetails);assert.match(noDetails.message,/unable to complete it here/);assert.doesNotMatch(noDetails.message,/first and last name, please/);
    const phonePreference=newSession();await turn('I want an appointment',phonePreference);await turn('My shoulder hurts',phonePreference);await turn('Michael Black',phonePreference);await turn('michael@example.test',phonePreference);
    const noEmailContact=await turn("I don't want notifications by email",phonePreference);assert.match(noEmailContact.message,/does need your full name, email address and phone number/);assert.match(noEmailContact.message,/unable to complete it here/);assert.doesNotMatch(noEmailContact.message,/phone number, including|won't ask you to provide an email/);
    const review=await turn('+43 699 12682157',phonePreference);assert.equal(review.ready,true);assert.deepEqual(review.summary.find(([key])=>key==='Preferred contact'),['Preferred contact','Phone']);
  }finally{process.env=old;}
});
test('mixed questions retain concerns, ask before intake, respect a decline and preserve complete answers',async()=>{
  const old={...process.env};process.env.OPENAI_API_KEY='fixture';process.env.CHAT_AI_ENABLED='true';
  const facts=conversationFacts({services:[childrenService],team:[{title:'Published Person',role:'Physiotherapist',specialties:'Jaw',fictional:false},{title:'Fictional Person',fictional:true}],symptoms:[{title:'Jaw',body:'Published jaw information'}],pages:[{id:'datenschutz',title:'Privacy',body:'Published privacy information'}]});
  let value=answer({kind:'practice_question',booking_intent:'unspecified',reason:'Jaw concern',answer:'Thank you for telling us. '+('Published pricing information. '.repeat(18))});
  const service=createConversationService({store:{save(){assert.fail('No submission expected');}},getFacts:async()=>facts,fetcher:async(_,options)=>{const payload=JSON.parse(options.body),input=JSON.parse(payload.input);assert.equal(input.publishedFacts.team.length,1);assert.equal(input.publishedFacts.services[0].title,"Children's health");assert.equal(input.publishedFacts.specialisms[0].title,'Jaw');assert.equal(input.publishedFacts.informationPages[0].id,'datenschutz');return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}]})};}});
  const token=newSession();const turn=async message=>{let result;await service.handle({method:'POST',headers:{},socket:{remoteAddress:'test'}},'/api/chat/turn',{token,language:'en',message,consent:true,turnKey:randomUUID()},(status,data)=>result={status,...data});return result;};
  try{
    const invitation=await turn('My jaw hurts, what are the prices?');assert.ok(invitation.message.includes("Published pricing information."));assert.equal((invitation.message.match(/Published pricing information/g)||[]).length,1);assert.match(invitation.message,/Would you like me to prepare/);assert.doesNotMatch(invitation.message,/first and last name/);assert.ok(invitation.message.length<=700);assert.ok(composeReply('A long sentence. '.repeat(100),'May I have your name?').length<=700);assert.equal(composeReply('Perfect, thank you. Perfect, thank you. May I have your name?','May I have your name?'),'Perfect, thank you.\n\nMay I have your name?');
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
    const review=await turn('+43 699 12682157');assert.equal(review.ready,true);assert.ok(!review.summary.some(([key])=>['Source','Herkunft'].includes(key)));assert.ok(review.summary.some(([,v])=>v==='test@example.test'));assert.ok(!review.summary.some(([key])=>key==='Availability note'));
    assert.equal((await call('review-choice',{field:'patient_status',value:'unknown'})).code,'invalid_request');
    const statusChoice=await call('review-choice',{field:'patient_status',value:'existing'});assert.equal(statusChoice.ready,true);assert.deepEqual(statusChoice.summary.find(([key])=>key==='Patient status (self-reported)'),['Patient status (self-reported)','Yes — treated here before']);
    const contactChoice=await call('review-choice',{field:'preferred_contact',value:'email'});assert.equal(contactChoice.ready,true);assert.deepEqual(contactChoice.summary.find(([key])=>key==='Preferred contact'),['Preferred contact','Email']);
    assert.match((await call('edit',{field:'availability'})).message,/days or times/);
    const withAvailability=await turn('Afternoons');assert.equal(withAvailability.ready,true);assert.deepEqual(withAvailability.summary.find(([key])=>key==='Availability note'),['Availability note','Afternoons']);
    assert.equal((await call('finish')).code,'consent_required');
    assert.match((await call('edit',{field:'email'})).message,/email address/);
    const unchangedEmail=await turn('test@example.test');assert.equal(unchangedEmail.ready,true);assert.deepEqual(unchangedEmail.summary.find(([key])=>key==='Email'),['Email','test@example.test']);
    assert.match((await call('edit',{field:'phone'})).message,/phone number/);
    const cancelled=await call('cancel-edit');assert.equal(cancelled.ready,true);assert.deepEqual(cancelled.summary.find(([key])=>key==='Phone'),['Phone','+4369912682157']);
    assert.equal((await call('cancel-edit')).code,'invalid_request');
    assert.match((await call('edit',{field:'phone'})).message,/phone number/);
    const unchangedPhone=await turn('+43 699 12682157');assert.equal(unchangedPhone.ready,true);assert.deepEqual(unchangedPhone.summary.find(([key])=>key==='Phone'),['Phone','+4369912682157']);
    assert.match((await call('edit',{field:'email'})).message,/email address/);
    assert.equal((await turn('corrected@example.test')).ready,true);
    assert.equal((await call('finish',{confirmed:true})).status,201);
    assert.equal((await call('finish',{confirmed:true})).duplicate,true);assert.equal(saved.length,1);assert.equal(saved[0].email,'corrected@example.test');assert.equal(saved[0].intake.patient_status_claimed,'existing');assert.equal(saved[0].intake.preferred_contact,'email');assert.equal(saved[0].intake.conversation_version,2);assert.ok(saved[0].intake.transcript.length>5);
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
    const token=newSession();
    const offTopic=(await call(token,'Write a recipe')).message;
    assert.match(offTopic,/^I’m happy to answer questions about CityPraxis, our treatments, our team, or appointments\. What would you like to know\?$/);
    assert.doesNotMatch(offTopic,/sorry|only help/i);
    value=answer({kind:'off_topic'});
    const offTopicGerman=await call(newSession(),'Schreib mir ein Rezept.',{language:'de'});
    assert.match(offTopicGerman.message,/Ich beantworte gern Ihre Fragen zur Citypraxis/);
    assert.match(offTopicGerman.message,/Was möchten Sie wissen\?/);
    value=answer({kind:'compliment',answer:'Thank you for saying that!'});
    assert.equal((await call(newSession(),'I think this chat is very good.')).message,'Thank you.\n\nWhat would you like CityPraxis to help you with?');
    value=answer({kind:'compliment',answer:'Das freut uns sehr!'});
    assert.equal((await call(newSession(),'Euer Team ist sehr freundlich.',{language:'de'})).message,'Danke.\n\nWobei dürfen wir Ihnen in der Citypraxis helfen?');
    const aiCallsBeforeEmergency=calls;assert.equal((await call(token,'I cannot breathe')).emergency,true);assert.equal(calls,aiCallsBeforeEmergency);
    value=answer({first_name:{bad:true}});assert.equal((await call(token,'A normal message')).code,'ai_unavailable');
    value=answer({kind:'medical'});const fallback=(await call(token,'What exercises should I do?')).message;assert.match(fallback,/One of our physiotherapists can assess this in person and recommend next steps\./);assert.doesNotMatch(fallback,/can't|cannot|unable|diagnos/i);
    value=answer({kind:'medical',answer:"I can't assess what may be causing this. Our reception team can clarify the next step."});assert.match((await call(token,'What could be causing this?')).message,/^I'm sorry, but I can't assess/);
    value=answer({kind:'medical',answer:'I see. We can’t assess breathing concerns or advise medically here.'});const gentle=(await call(token,'Can you assess this breathing concern?')).message;assert.match(gentle,/^I'm sorry, but I can't assess/);assert.doesNotMatch(gentle,/^I see/);
    value=answer({kind:'medical',booking_intent:'unspecified',reason:'Stiffness',answer:"I'm sorry you're experiencing stiffness. One of our physiotherapists can assess it in person and recommend the next step."});
    const vague=(await call(newSession(),'I feel stiff but can’t quite define what is wrong.')).message;
    assert.match(vague,/One of our physiotherapists can assess it in person and recommend the next step\./);assert.doesNotMatch(vague,/so stiff|can't|cannot|unable|diagnos/i);assert.match(vague,/Would you like me to prepare an appointment request/);
    value=answer({kind:'medical',answer:'Es tut mir leid, aber unser Team kann Ihre Beschwerden nicht zuverlässig beurteilen.'});
    const german=await call(newSession(),'Ich fühle mich steif und kann nicht genau sagen, was los ist.',{language:'de'});
    assert.match(german.message,/ich kann Ihre Beschwerden nicht zuverlässig beurteilen/);
    value=answer({kind:'off_topic'});waiting=true;const pending=call(token,'A question');await new Promise(r=>setImmediate(r));assert.equal((await call(token,'Another')).code,'busy');waiting=false;release();await pending;
    const limited=newSession();for(let i=0;i<16;i++){const result=await call(limited,'Unrelated question');assert.equal(result.status,200);if(i===15)assert.equal(result.limitReached,true);}
    assert.equal((await call(limited,'One more')).code,'conversation_limit');
    assert.deepEqual(conversationFacts({prices:[{amount:null},{amount:''},{amount:'90',title:'Therapy'}]}).samplePrices,[{category:undefined,service:'Therapy',duration:undefined,euro:90,details:undefined}]);
  }finally{process.env=old;}
});
