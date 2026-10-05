import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {CONVERSATION_LIMIT,createConversationService,conversationFacts,composeReply,practiceHoursStatus} from '../src/chat/conversation.mjs';
import {childrenService} from '../src/therapy-catalog.mjs';
import {newSession} from '../src/chat/security.mjs';

const answer=(changes={})=>({kind:'appointment',answer:'',related_pages:[],booking_intent:'request',needs_clarification:false,reason:null,availability:null,first_name:null,last_name:null,patient_status:null,...changes});

test('answers include catalog links, preserve link follow-up context and reject invented destinations',async()=>{
  const old={...process.env};process.env.OPENAI_API_KEY='fixture';process.env.CHAT_AI_ENABLED='true';
  const facts=conversationFacts({services:[{id:'physiotherapie',title:'Physiotherapie',titleEn:'Physiotherapy'}],symptoms:[{id:'kopfschmerzen',title:'Kopfschmerzen',titleEn:'Headaches'}],team:[{id:'isabella-casny',title:'Isabella Casny'}]});
  let calls=0,value=answer({kind:'practice_question',booking_intent:'unspecified',answer:'Saturday appointments are from 08:30 to 12:30.'});
  const service=createConversationService({getFacts:async()=>facts,fetcher:async(_,options)=>{
    calls++;const request=JSON.parse(options.body),input=JSON.parse(request.input);
    assert.ok(request.text.format.schema.required.includes('related_pages'));
    assert.ok(request.text.format.schema.properties.related_pages.items.enum.includes('service:physiotherapie'));
    assert.ok(input.publishedFacts.sitePages.some(page=>page.id==='hours'&&page.url==='/kontakt#oeffnungszeiten'));
    return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}]})};
  }});
  const token=newSession();const turn=async message=>{let result;await service.handle({method:'POST',headers:{},socket:{remoteAddress:'test'}},'/api/chat/turn',{token,language:'en',message,consent:true,turnKey:randomUUID()},(status,data)=>result={status,...data});return result;};
  try{
    const hours=await turn('Are you open on Saturday?');
    assert.match(hours.message,/Saturday appointments are from/);
    assert.match(hours.message,/\[Opening hours\]\(\/kontakt\?lang=en#oeffnungszeiten\)/);
    const before=calls,where=await turn('Where?');
    assert.equal(calls,before);
    assert.match(where.message,/Opening hours/);
    assert.doesNotMatch(where.message,/Stubenbastei/);
    value=answer({kind:'practice_question',booking_intent:'unspecified',answer:'Our team offers physiotherapy.',related_pages:['service:physiotherapie']});
    assert.match((await turn('Tell me about physiotherapy')).message,/\[Physiotherapy\]\(\/leistungen\/physiotherapie\?lang=en\)/);
    value=answer({kind:'medical',booking_intent:'unspecified',answer:'Our team can assess your headaches in person.',reason:'Headaches',related_pages:['specialism:kopfschmerzen']});
    assert.match((await turn('I have headaches')).message,/\/schwerpunkte\/kopfschmerzen\?lang=en/);
    assert.doesNotMatch((await turn('Yes please')).message,/\]\(/);
    assert.doesNotMatch((await turn('Test Visitor')).message,/\]\(/);
    value=answer({kind:'practice_question',booking_intent:'unspecified',answer:'More details.',related_pages:['invented-page']});
    assert.equal((await turn('Tell me about treatments?')).status,503);
  }finally{process.env=old;}
});
test('headache concern survives price questions and appointment intake, with price links in context',async()=>{
  const old={...process.env};process.env.OPENAI_API_KEY='fixture';process.env.CHAT_AI_ENABLED='true';
  const inputs=[];
  const service=createConversationService({fetcher:async(_,options)=>{
    const input=JSON.parse(JSON.parse(options.body).input);inputs.push(input);
    let value=answer({kind:'practice_question',booking_intent:'unspecified',answer:'Our team can help.'});
    if(/headeaches/i.test(input.visitorMessage))value=answer({kind:'medical',booking_intent:'unspecified',answer:'A physiotherapist from our team can assess your headaches in person.'});
    if(/what is the price/i.test(input.visitorMessage))value=answer({kind:'practice_question',booking_intent:'unspecified',answer:'The first physiotherapy appointment is €130. A 45-minute follow-up is €110.'});
    if(/like to make an appointment/i.test(input.visitorMessage))value=answer({booking_intent:'request',answer:'Of course, I can prepare your request.'});
    if(/what did i tell you/i.test(input.visitorMessage))value=answer({kind:'practice_question',booking_intent:'unspecified',answer:`You mentioned ${input.knownDetails.reason}.`});
    return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}]})};
  }});
  const token=newSession();const turn=async message=>{let result;await service.handle({method:'POST',headers:{},socket:{remoteAddress:'test'}},'/api/chat/turn',{token,language:'en',message,consent:true,turnKey:randomUUID()},(status,data)=>result={status,...data});return result;};
  try{
    await turn('Hello');
    const concern=await turn('I have a headeaches and maybe you can help me');
    assert.match(concern.message,/assess your headaches/);
    assert.match(concern.message,/Would you like me to prepare/);
    const price=await turn('Im not sure, what is the price?');
    assert.match(price.message,/\/preise\?lang=en/);
    assert.doesNotMatch(price.message,/Would you like me to prepare/);
    assert.equal(inputs.at(-1).knownDetails.reason,'Headaches');
    const callsBeforeWhere=inputs.length;
    const where=await turn('Where?');
    assert.match(where.message,/find the prices here: \/preise\?lang=en/);
    assert.doesNotMatch(where.message,/Stubenbastei/);
    assert.equal(inputs.length,callsBeforeWhere);
    const booking=await turn('Ok I would like to make an appointment');
    assert.match(booking.message,/first and last name/);
    await turn('Test Visitor');await turn('test@example.test');
    const review=await turn('+43 699 12682157');
    assert.equal(review.ready,true);
    assert.ok(review.summary.some(([,value])=>value==='Headaches'));
    const recall=await turn('What did I tell you about the reason?');
    assert.match(recall.message,/Headaches/);
    assert.equal(inputs.at(-1).knownDetails.reason,'Headaches');
    assert.equal(inputs.at(-1).recentConversation.some(item=>/headeaches/i.test(item.text)),false);
  }finally{process.env=old;}
});
test('published Vienna hours distinguish open, closed and unknown periods',()=>{
  const hours={wednesday:'08:00–20:00',saturdayHours:'08:00–14:00',sunday:'Closed'};
  assert.equal(practiceHoursStatus(hours,new Date('2026-09-23T10:00:00Z')).open,true);
  assert.equal(practiceHoursStatus(hours,new Date('2026-09-23T21:00:00Z')).open,false);
  assert.equal(practiceHoursStatus(hours,new Date('2026-09-27T10:00:00Z')).open,false);
  assert.equal(practiceHoursStatus({},new Date('2026-09-23T10:00:00Z')).open,null);
});
test('unclear booking wording asks once and waits for a clear chat or form choice',async()=>{
  const old={...process.env};process.env.OPENAI_API_KEY='fixture';process.env.CHAT_AI_ENABLED='true';
  let calls=0;
  const service=createConversationService({fetcher:async(_,options)=>{
    calls++;
    const raw=JSON.parse(JSON.parse(options.body).input).visitorMessage;
    const value=raw.includes('termin neck')
      ?answer({input_language:'en',needs_clarification:true,reason:'neck pain',patient_status:'existing',first_name:'Deinen',last_name:'Praxis',answer:'You should try massage.'})
      :answer({kind:'practice_question',booking_intent:'unspecified',answer:'Our prices are on the website.'});
    return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}]})};
  }});
  const turn=async(token,message)=>{let result;await service.handle({method:'POST',headers:{},socket:{remoteAddress:'test'}},'/api/chat/turn',{token,language:'en',message,consent:true,turnKey:randomUUID()},(status,data)=>result={status,...data});return result;};
  try{
    const token=newSession();
    const unclear=await turn(token,'I need termin neck yesterday pain maybe massage');
    assert.equal(unclear.clarification,'booking');
    assert.match(unclear.message,/would you like to request an appointment/i);
    assert.doesNotMatch(unclear.message,/massage|first and last name|Deinen Praxis/i);
    const confirmed=await turn(token,'Yes, request an appointment');
    assert.match(confirmed.message,/appointment request form.*here in chat/s);
    assert.doesNotMatch(confirmed.message,/massage|Deinen Praxis/i);
    const chat=await turn(token,'continue here');
    assert.match(chat.message,/first and last name/i);
    assert.equal(calls,1);
    const corrected=newSession();await turn(corrected,'I need termin neck yesterday pain maybe massage');
    const no=await turn(corrected,'No, let me clarify');
    assert.match(no.message,/What would you like help with instead/i);
    const prices=await turn(corrected,'I meant the prices.');
    assert.match(prices.message,/prices are on the website/i);
    assert.doesNotMatch(prices.message,/would you like to request an appointment/i);
  }finally{process.env=old;}
});
test('clear typos and broken German stay on the existing booking path without invented names',async()=>{
  const old={...process.env};process.env.OPENAI_API_KEY='fixture';process.env.CHAT_AI_ENABLED='true';
  let calls=0;
  const service=createConversationService({fetcher:async()=>{calls++;throw Error('Clear booking requests should use deterministic routing');}});
  const turn=async(message,language='en')=>{let result;await service.handle({method:'POST',headers:{},socket:{remoteAddress:'test'}},'/api/chat/turn',{token:newSession(),language,message,consent:true,turnKey:randomUUID()},(status,data)=>result={status,...data});return result;};
  try{
    const typo=await turn('I want an apointment');
    assert.match(typo.message,/appointment request form.*here in chat/s);
    const broken=await turn('Halo ich mochte buchung im deinen praxis','en');
    assert.equal(broken.language,'de');
    assert.match(broken.message,/Formular für Terminanfragen.*hier im Chat/s);
    assert.doesNotMatch(broken.message,/deinen praxis|Vor- und Nachnamen erfahren/i);
    assert.equal(calls,0);
  }finally{process.env=old;}
});
test('symptoms, model guesses and treatment suggestions never approve intake or choose therapy',async()=>{
  const old={...process.env};process.env.OPENAI_API_KEY='fixture';process.env.CHAT_AI_ENABLED='true';
  const service=createConversationService({fetcher:async()=>({ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(answer({kind:'medical',booking_intent:'request',reason:'back pain',patient_status:'existing',first_name:'False',last_name:'Name',answer:'You should try massage.'}))}]}]})})});
  let result;
  try{
    await service.handle({method:'POST',headers:{},socket:{remoteAddress:'test'}},'/api/chat/turn',{token:newSession(),language:'en',message:'I have back pain',consent:true,turnKey:randomUUID()},(status,data)=>result={status,...data});
    assert.equal(result.ready,false);
    assert.match(result.message,/assess your concern/i);
    assert.match(result.message,/Would you like me to prepare an appointment request/i);
    assert.doesNotMatch(result.message,/massage|False Name|first and last name/i);
  }finally{process.env=old;}
});
test('a clear request inside a long message keeps verified contact data and ignores invented status',async()=>{
  const old={...process.env};process.env.OPENAI_API_KEY='fixture';process.env.CHAT_AI_ENABLED='true';
  const service=createConversationService({fetcher:async()=>({ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(answer({kind:'medical',input_language:'en',booking_intent:'unspecified',reason:'neck pain',patient_status:'existing',first_name:'False',last_name:'Name',answer:'One of our clinicians can assess this in person.'}))}]}]})})});
  const token=newSession();const turn=async message=>{let result;await service.handle({method:'POST',headers:{},socket:{remoteAddress:'test'}},'/api/chat/turn',{token,language:'en',message,consent:true,turnKey:randomUUID()},(status,data)=>result={status,...data});return result;};
  try{
    const first=await turn('Hello, I am Anna Novak. My neck hurts since yesterday and I am unsure what treatment I need. I would like an appointment at CityPraxis.');
    assert.equal(first.ready,false);
    assert.match(first.message,/email address and your phone number/i);
    assert.doesNotMatch(first.message,/False Name|which treatment/i);
    const review=await turn('anna@example.test +43 699 12682157');
    assert.equal(review.ready,true);
    assert.ok(review.summary.some(([,value])=>value==='Anna Novak'));
    assert.deepEqual(review.summary.find(([key])=>key==='Patient status (self-reported)'),['Patient status (self-reported)','I’m not sure']);
  }finally{process.env=old;}
});
test('invalid and conflicting contact details stay in validation rather than guessed intake',async()=>{
  const old={...process.env};process.env.OPENAI_API_KEY='fixture';process.env.CHAT_AI_ENABLED='true';
  const service=createConversationService({fetcher:async()=>({ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(answer({needs_clarification:true,answer:'I have your email.'}))}]}]})})});
  const token=newSession();const turn=async message=>{let result;await service.handle({method:'POST',headers:{},socket:{remoteAddress:'test'}},'/api/chat/turn',{token,language:'en',message,consent:true,turnKey:randomUUID()},(status,data)=>result={status,...data});return result;};
  try{
    await turn('I want an appointment');await turn('continue here');await turn('Anna Novak');
    const invalid=await turn('anna@');
    assert.equal(invalid.message,'Please enter a valid email address.');
    const conflict=await turn('anna@example.test or anna@other.test');
    assert.match(conflict.message,/Which one should we use/i);
    assert.equal(conflict.ready,false);
    const selected=await turn('anna@example.test');
    assert.match(selected.message,/phone number/i);
  }finally{process.env=old;}
});
test('a greeting stays welcoming and a direct appointment request offers both paths',async()=>{
  const old={...process.env};process.env.OPENAI_API_KEY='fixture';process.env.CHAT_AI_ENABLED='true';
  let calls=0;const service=createConversationService({fetcher:async()=>{calls++;throw Error('A simple greeting or appointment request should not require AI');}});
  const token=newSession();const turn=async(message,language='en')=>{let result;await service.handle({method:'POST',headers:{},socket:{remoteAddress:'test'}},'/api/chat/turn',{token,language,message,consent:true,turnKey:randomUUID()},(status,data)=>result={status,...data});return result;};
  try{
    assert.equal((await turn('hello')).message,'Hello! How can I help you?');
    const request=await turn('I want an appointment');
    assert.match(request.message,/\[appointment request form\].*here in chat/);
    assert.match(request.message,/first and last name.*email address.*phone number with country code/);
    assert.doesNotMatch(request.message,/What is the reason|confirmed/i);
    assert.equal((await turn('Hallo','de')).message,'Hallo! Wie kann ich Ihnen helfen?');
    assert.equal(calls,0);
  }finally{process.env=old;}
});
test('a booking how-to question offers the form and chat without starting intake',async()=>{
  const old={...process.env};process.env.OPENAI_API_KEY='fixture';process.env.CHAT_AI_ENABLED='true';
  let calls=0;const service=createConversationService({fetcher:async()=>{calls++;throw Error('Booking guidance should not require AI');}});
  const turn=async(token,message,language)=>{let result;await service.handle({method:'POST',headers:{},socket:{remoteAddress:'test'}},'/api/chat/turn',{token,language,message,consent:true,turnKey:randomUUID()},(status,data)=>result={status,...data});return result;};
  try{
    const english=newSession();
    const guidance=await turn(english,'how should I make the booking','en');
    assert.equal(guidance.ready,false);
    assert.match(guidance.message,/\[appointment request form\]\(\/termin\?lang=en#booking-form\)/);
    assert.match(guidance.message,/here in chat/);
    assert.doesNotMatch(guidance.message,/What is the reason for your appointment request\?/);
    assert.match((await turn(english,'continue here','en')).message,/first and last name.*email address.*phone number with country code/s);
    const formChoice=newSession();await turn(formChoice,'I want an appointment','en');
    const formReply=await turn(formChoice,'the form','en');
    assert.match(formReply.message,/\[appointment request form\]\(\/termin\?lang=en#booking-form\)/);
    assert.doesNotMatch(formReply.message,/first and last name|What is the reason/);
    assert.equal(formReply.ready,false);
    const german=newSession();
    const germanGuidance=await turn(german,'Wie kann ich einen Termin buchen?','de');
    assert.match(germanGuidance.message,/\[Formular für Terminanfragen\]\(\/termin\?lang=de#booking-form\)/);
    assert.match(germanGuidance.message,/hier im Chat/);
    assert.match((await turn(german,'im Chat','de')).message,/Vor- und Nachnamen.*E-Mail-Adresse.*Telefonnummer mit Ländervorwahl/s);
    const moreGuidance=await turn(newSession(),'wie stelle ich eine Terminanfrage','en');
    assert.equal(moreGuidance.language,'de');
    assert.match(moreGuidance.message,/\[Formular für Terminanfragen\]\(\/termin\?lang=de#booking-form\)/);
    assert.equal(calls,0);
  }finally{process.env=old;}
});
test('short German booking requests use already supplied details and reach review',async()=>{
  const old={...process.env};process.env.OPENAI_API_KEY='fixture';process.env.CHAT_AI_ENABLED='true';
  let calls=0;const service=createConversationService({fetcher:async()=>{
    calls++;
    const value=answer({kind:'medical',booking_intent:'unspecified',reason:'Schulterschmerzen',answer:'Unser Team kann Ihre Beschwerden persönlich besprechen.'});
    return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}]})};
  }});
  const turn=async(token,message,language='de')=>{let result;await service.handle({method:'POST',headers:{},socket:{remoteAddress:'test'}},'/api/chat/turn',{token,language,message,consent:true,turnKey:randomUUID()},(status,data)=>result={status,...data});return result;};
  try{
    for(const request of ['Ersttermin bitte buchen','Terminanfrage jetzt machen','bitte eine Terminanfrage','Termin buchen','ich möchte jetzt einen Termin buchen','Ich hätte gern einen Termin.','Können Sie mir einen Termin geben?']){
      const token=newSession();
      const first=await turn(token,'Mein Name ist Anna Novak, anna@example.test, +43 699 12682157. Ich habe Schulterschmerzen.');
      assert.equal(first.ready,false);
      const review=await turn(token,request);
      assert.equal(review.ready,true,request);
      for(const detail of ['Anna Novak','anna@example.test','+4369912682157','Schulterschmerzen'])assert.ok(review.summary.some(([,value])=>value.includes(detail)),`${request}: ${detail}`);
      assert.doesNotMatch(review.message,/Wobei dürfen wir Ihnen|Vor- und Nachnamen|E-Mail-Adresse|Telefonnummer/);
    }
    const withoutDetails=newSession();
    const beginning=await turn(withoutDetails,'Termin buchen');
    assert.equal(beginning.ready,false);
    assert.match(beginning.message,/Formular für Terminanfragen/);
    assert.match((await turn(withoutDetails,'Terminanfrage jetzt machen')).message,/Vor- und Nachnamen.*E-Mail-Adresse.*Telefonnummer mit Ländervorwahl/s);
    const germanOnEnglishSite=await turn(newSession(),'Terminanfrage jetzt machen','en');
    assert.equal(germanOnEnglishSite.language,'de');
    assert.match(germanOnEnglishSite.message,/Formular für Terminanfragen/);
    assert.equal(calls,7);
  }finally{process.env=old;}
});
test('common German and English booking wording starts intake or offers both paths',async()=>{
  const old={...process.env};process.env.OPENAI_API_KEY='fixture';process.env.CHAT_AI_ENABLED='true';
  let aiCalls=0;const service=createConversationService({fetcher:async()=>{aiCalls++;throw Error('Common booking wording should not need AI');}});
  const turn=async(message,siteLanguage)=>{let result;await service.handle({method:'POST',headers:{},socket:{remoteAddress:'test'}},'/api/chat/turn',{token:newSession(),language:siteLanguage,message,consent:true,turnKey:randomUUID()},(status,data)=>result={status,...data});return result;};
  try{
    const requests={
      de:['Ich möchte einen Termin.','Ich möchte ein buchung machen','Halo ich mochte gerne ein buchung machen','Halo , ich mochte gerne ein buchung machen','ich mochte gerne ein buchung machen','Hello ich mochte buchung im deinen praxis','Ich möchte eine Buchung in eurer Praxis','Ich hätte gern einen Termin.','Ich würde gerne einen Termin ausmachen.','Ich brauche einen Termin.','Können Sie mir bitte einen Termin geben?','Kann ich einen Termin vereinbaren?','Ich will eine Terminanfrage stellen.','Termin vereinbaren.','Bitte um einen Termin.','Ich möchte mich für einen Termin anmelden.','Bitte machen Sie mir eine Terminanfrage.'],
      en:["I'd like an appointment.",'I need an appointment.','Please submit an appointment request.','Could you help me book an appointment?','Can I request an appointment?','I want to make a booking.','Please book me an appointment.']
    };
    for(const [language,phrases] of Object.entries(requests))for(const phrase of phrases){
      const result=await turn(phrase,language==='de'?'en':'de');
      assert.equal(result.status,200,phrase);
      assert.equal(result.language,language,phrase);
      assert.match(result.message,language==='de'?/Formular für Terminanfragen.*hier im Chat/:/appointment request form.*here in chat/,phrase);
      assert.doesNotMatch(result.message,/^(?:Gerne|Of course)[,.!]/u,phrase);
      assert.doesNotMatch(result.message,/Vielen Dank, deinen praxis/i,phrase);
      assert.doesNotMatch(result.message,/Was ist der Anlass|What is the reason/,phrase);
      assert.equal(result.ready,false,phrase);
    }
    const methods={
      de:['Wie kann ich einen Termin vereinbaren?','Wie bekomme ich einen Termin?','Wie funktioniert die Terminanfrage?','Wo kann ich eine Terminanfrage stellen?','Kann ich die Terminanfrage über das Formular stellen?'],
      en:['How do I request an appointment?','Where can I book?','How does booking work?','Can I use your booking form?']
    };
    for(const [language,phrases] of Object.entries(methods))for(const phrase of phrases){
      const result=await turn(phrase,language==='de'?'en':'de');
      assert.equal(result.status,200,phrase);
      assert.equal(result.language,language,phrase);
      assert.match(result.message,language==='de'?/\[Formular für Terminanfragen\]\(\/termin\?lang=de#booking-form\)/:/\[appointment request form\]\(\/termin\?lang=en#booking-form\)/,phrase);
      assert.doesNotMatch(result.message,/^(?:Gerne|Of course)[,.!]/u,phrase);
      assert.match(result.message,language==='de'?/hier im Chat/:/here in chat/,phrase);
      assert.doesNotMatch(result.message,/Was ist der Anlass|What is the reason/);
    }
    assert.equal(aiCalls,0);
  }finally{process.env=old;}
});
test('German follow-ups avoid a repeated Gerne opener and keep team answers in the practice voice',async()=>{
  const old={...process.env};process.env.OPENAI_API_KEY='fixture';process.env.CHAT_AI_ENABLED='true';
  assert.deepEqual(conversationFacts({team:[{role:'Physiotherapeutin'},{role:'Logopädin'},{role:'Physiotherapeut',fictional:true}]}).publishedTeamCounts,{profiles:2,physiotherapists:1});
  const replies=[
    'Gerne, unser Team stellt seine Qualifikationen auf der Website vor.',
    'Gerne erkläre ich Ihnen, was CRAFTA bedeutet.',
    'Laut den vorliegenden Teamangaben sind acht Physiotherapeuten abgeführt.'
  ];
  const service=createConversationService({getFacts:async()=>conversationFacts({team:Array.from({length:8},(_,index)=>({title:`Beispiel ${index+1}`,role:'Physiotherapeutin'}))}),fetcher:async(_,options)=>{
    const payload=JSON.parse(options.body),input=JSON.parse(payload.input);
    assert.match(payload.instructions,/In unserem Team arbeiten/);
    assert.deepEqual(input.publishedFacts.publishedTeamCounts,{profiles:8,physiotherapists:8});
    return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(answer({kind:'practice_question',input_language:'de',booking_intent:'unspecified',answer:replies.shift()}))}]}]})};
  }});
  const token=newSession();const turn=async message=>{let result;await service.handle({method:'POST',headers:{},socket:{remoteAddress:'test'}},'/api/chat/turn',{token,language:'de',message,consent:true,turnKey:randomUUID()},(status,data)=>result={status,...data});return result;};
  try{
    assert.match((await turn('Welche Qualifikationen hat Ihr Team?')).message,/^Gerne, unser Team/);
    assert.match((await turn('Was ist CRAFTA?')).message,/^Ich erkläre Ihnen/);
    const team=await turn('Wie viele Physiotherapeuten gibt es?');
    assert.match(team.message,/^Zu unserem Team gehören acht Physiotherapeuten\./);
    assert.doesNotMatch(team.message,/Teamangaben|abgeführt/u);
  }finally{process.env=old;}
});
test('German im is never treated as the English name introduction Im',async()=>{
  const old={...process.env};process.env.OPENAI_API_KEY='fixture';process.env.CHAT_AI_ENABLED='true';
  const service=createConversationService({fetcher:async()=>({ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(answer({kind:'medical',input_language:'de',booking_intent:'unspecified',reason:'Schmerzen im Rücken',first_name:'unteren',last_name:'Rücken',answer:'Unser Team kann Ihr Anliegen persönlich besprechen.'}))}]}]})})});
  const token=newSession();const turn=async message=>{let result;await service.handle({method:'POST',headers:{},socket:{remoteAddress:'test'}},'/api/chat/turn',{token,language:'en',message,consent:true,turnKey:randomUUID()},(status,data)=>result={status,...data});return result;};
  try{
    const first=await turn('Ich habe Schmerzen im unteren Rücken.');
    assert.equal(first.language,'de');
    assert.doesNotMatch(first.message,/Vielen Dank, unteren Rücken/i);
    assert.match(first.message,/Möchten Sie, dass ich eine Terminanfrage/);
    const next=await turn('Ja bitte.');
    assert.match(next.message,/Vor- und Nachnamen/);
  }finally{process.env=old;}
});
test('imperfect booking fallback does not treat German refusals or information questions as requests',async()=>{
  const old={...process.env};process.env.OPENAI_API_KEY='fixture';process.env.CHAT_AI_ENABLED='true';
  let aiCalls=0;
  const service=createConversationService({fetcher:async()=>{aiCalls++;return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(answer({kind:'practice_question',input_language:'de',booking_intent:'unspecified',answer:'Gerne beantworte ich Ihre Frage.'}))}]}]})};}});
  try{
    for(const message of ['Ich möchte keine Buchung.','Ich möchte wissen, wie eine Buchung funktioniert.']){
      let result;await service.handle({method:'POST',headers:{},socket:{remoteAddress:'test'}},'/api/chat/turn',{token:newSession(),language:'en',message,consent:true,turnKey:randomUUID()},(status,data)=>result={status,...data});
      assert.equal(result.language,'de');
      assert.doesNotMatch(result.message,/Formular für Terminanfragen.*hier im Chat/);
    }
    assert.equal(aiCalls,2);
  }finally{process.env=old;}
});
test('a first-name greeting still requires a full name before the request can be sent',async()=>{
  const old={...process.env};process.env.OPENAI_API_KEY='fixture';process.env.CHAT_AI_ENABLED='true';
  let aiCalls=0;
  const service=createConversationService({fetcher:async()=>{
    aiCalls++;
    return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(answer({kind:'medical',booking_intent:'unspecified',reason:'Headaches',answer:'Our team can discuss your headaches in person.'}))}]}]})};
  }});
  const token=newSession();const turn=async(message,language='en')=>{let result;await service.handle({method:'POST',headers:{},socket:{remoteAddress:'test'}},'/api/chat/turn',{token,language,message,consent:true,turnKey:randomUUID()},(status,data)=>result={status,...data});return result;};
  try{
    assert.equal((await turn('Milan')).message,'Hello, Milan! How can I help you?');
    assert.equal(aiCalls,0);
    assert.match((await turn('I have headaches')).message,/appointment request/);
    assert.match((await turn('yes')).message,/first and last name/);
    const partial=await turn('Milan');
    assert.equal(partial.ready,false);
    assert.match(partial.message,/first and last name/);
    assert.equal(aiCalls,1);
    assert.match((await turn('Milan Kovac')).message,/email address/);
    await turn('milan@example.test');
    const review=await turn('+43 699 12682157');
    assert.equal(review.ready,true);
    assert.ok(review.summary.some(([,value])=>value==='Milan Kovac'));
    const germanToken=newSession();let german;
    await service.handle({method:'POST',headers:{},socket:{remoteAddress:'test'}},'/api/chat/turn',{token:germanToken,language:'en',message:'Ich heiße Mila',consent:true,turnKey:randomUUID()},(status,data)=>german={status,...data});
    assert.match(german.message,/Hallo, Mila!/);
    assert.equal(german.language,'de');
  }finally{process.env=old;}
});
test('chat follows clear German or English input independently of the website language',async()=>{
  const old={...process.env};process.env.OPENAI_API_KEY='fixture';process.env.CHAT_AI_ENABLED='true';
  const service=createConversationService({fetcher:async(_,options)=>{
    const raw=JSON.parse(JSON.parse(options.body).input).visitorMessage;
    const german=raw.startsWith('Mein Nacken');
    const value=answer({input_language:german?'de':'en',booking_intent:'unspecified',reason:german?'Nackenbeschwerden':'Neck concern',answer:german?'Unser Team kann Ihr Anliegen persönlich besprechen.':'Our team can discuss your concern in person.'});
    return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}]})};
  }});
  const turn=async(token,language,message)=>{let result;await service.handle({method:'POST',headers:{},socket:{remoteAddress:'test'}},'/api/chat/turn',{token,language,message,consent:true,turnKey:randomUUID()},(status,data)=>result={status,...data});return result;};
  try{
    const fromEnglish=newSession();
    const german=await turn(fromEnglish,'en','Mein Nacken tut weh.');
    assert.equal(german.language,'de');assert.match(german.message,/Möchten Sie, dass ich eine Terminanfrage/);
    const next=await turn(fromEnglish,'en','ja');
    assert.equal(next.language,'de');assert.match(next.message,/Vor- und Nachnamen/);assert.match(next.message,/E-Mail-Adresse/);assert.match(next.message,/Telefonnummer mit Ländervorwahl/);
    const fromGerman=newSession();
    const english=await turn(fromGerman,'de','My neck hurts.');
    assert.equal(english.language,'en');assert.match(english.message,/Would you like me to prepare an appointment request/);
    const greeting=await turn(newSession(),'en','Hallo');
    assert.equal(greeting.language,'de');assert.match(greeting.message,/Hallo! Wie kann ich Ihnen helfen/);
  }finally{process.env=old;}
});
test('mixed or unsupported messages ask for German or English before intake',async()=>{
  const old={...process.env};process.env.OPENAI_API_KEY='fixture';process.env.CHAT_AI_ENABLED='true';
  let calls=0;
  const service=createConversationService({fetcher:async(_,options)=>{
    calls++;const raw=JSON.parse(JSON.parse(options.body).input).visitorMessage;
    const value=answer({input_language:raw.startsWith('Dzień')?'other':'mixed',booking_intent:'unspecified',reason:null,availability:null,answer:''});
    return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}]})};
  }});
  const turn=async(token,message)=>{let result;await service.handle({method:'POST',headers:{},socket:{remoteAddress:'test'}},'/api/chat/turn',{token,language:'en',message,consent:true,turnKey:randomUUID()},(status,data)=>result={status,...data});return result;};
  try{
    const mixed=newSession();
    const question=await turn(mixed,'Hallo. What are your hours? Ahoj.');
    assert.match(question.message,/German or English/);assert.equal(question.language,'en');assert.equal(question.ready,false);
    const selected=await turn(mixed,'Deutsch bitte');
    assert.equal(selected.language,'de');assert.match(selected.message,/Bitte wiederholen Sie Ihre Frage/);assert.equal(calls,1);
    const resumed=await turn(mixed,'Hallo');assert.equal(resumed.language,'de');assert.match(resumed.message,/Hallo! Wie kann ich Ihnen helfen/);
    const unsupported=await turn(newSession(),'Dzień dobry, kiedy mogę przyjść?');
    assert.match(unsupported.message,/German or English/);assert.equal(unsupported.ready,false);
  }finally{process.env=old;}
});
test('a misspelled English request is answered and a correction escapes the language prompt',async()=>{
  const old={...process.env};process.env.OPENAI_API_KEY='fixture';process.env.CHAT_AI_ENABLED='true';
  let calls=0;
  const service=createConversationService({fetcher:async(_,options)=>{
    calls++;
    const input=JSON.parse(JSON.parse(options.body).input),raw=input.visitorMessage;
    let value;
    if(raw.startsWith('Hallo.'))value=answer({input_language:'mixed',booking_intent:'unspecified',answer:''});
    else{
      assert.equal(input.forcedLanguage,'en');
      value=answer({kind:'medical',input_language:'en',booking_intent:'unspecified',reason:'Elbow pain',answer:'I can explain the published prices. A physiotherapist can assess your elbow pain in person.'});
    }
    return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}]})};
  }});
  const turn=async(token,message)=>{let result;await service.handle({method:'POST',headers:{},socket:{remoteAddress:'test'}},'/api/chat/turn',{token,language:'en',message,consent:true,turnKey:randomUUID()},(status,data)=>result={status,...data});return result;};
  const request='Im dany Bodo , I have an elbow  pain , thinking about an appointment can you give me some pricing ?';
  try{
    for(const introduction of [request,`my ${request}`]){
      const directToken=newSession(),direct=await turn(directToken,introduction);
      assert.equal(direct.language,'en');
      assert.match(direct.message,/published prices/i);
      assert.doesNotMatch(direct.message,/Which language would you prefer|Vor- und Nachnamen|first and last name/i);
      const accepted=await turn(directToken,'yes please');
      assert.match(accepted.message,/email address and your phone number/i);
      assert.doesNotMatch(accepted.message,/first and last name/i);
      const review=await turn(directToken,'dany@example.test +43 699 12682157');
      assert.equal(review.ready,true);
      assert.ok(review.summary.some(([,value])=>value==='dany Bodo'));
    }
    const token=newSession();
    assert.match((await turn(token,'Hallo. What are your hours? Ahoj.')).message,/Which language would you prefer/);
    const corrected=await turn(token,`sorry, i wrote ${request}`);
    assert.equal(corrected.language,'en');
    assert.match(corrected.message,/published prices/i);
    assert.doesNotMatch(corrected.message,/Which language would you prefer/i);
    assert.equal(calls,6);
  }finally{process.env=old;}
});
test('a mistaken mixed-language model result cannot trap an English chat in repeated prompts',async()=>{
  const old={...process.env};process.env.OPENAI_API_KEY='fixture';process.env.CHAT_AI_ENABLED='true';
  const service=createConversationService({fetcher:async(_,options)=>{
    const input=JSON.parse(JSON.parse(options.body).input);
    assert.equal(input.forcedLanguage,'en');
    return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(answer({kind:'medical',input_language:'mixed',booking_intent:'unspecified',reason:'Elbow pain',answer:''}))}]}]})};
  }});
  const token=newSession();const turn=async message=>{let result;await service.handle({method:'POST',headers:{},socket:{remoteAddress:'test'}},'/api/chat/turn',{token,language:'en',message,consent:true,turnKey:randomUUID()},(status,data)=>result={status,...data});return result;};
  try{
    const first=await turn('Im dany Bodo , I have an elbow pain, can you give me some pricing?');
    assert.match(first.message,/Which treatment would you like a price for/i);
    assert.doesNotMatch(first.message,/Which language would you prefer/i);
    const followUp=await turn('Physiotherapy');
    assert.doesNotMatch(followUp.message,/Which language would you prefer/i);
  }finally{process.env=old;}
});
test('clearly German wording without umlauts stays German even if the model calls it mixed',async()=>{
  const old={...process.env};process.env.OPENAI_API_KEY='fixture';process.env.CHAT_AI_ENABLED='true';
  const service=createConversationService({fetcher:async(_,options)=>{
    const input=JSON.parse(JSON.parse(options.body).input);
    assert.equal(input.forcedLanguage,'de');
    return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(answer({kind:'practice_question',input_language:'mixed',booking_intent:'unspecified',answer:''}))}]}]})};
  }});
  let result;await service.handle({method:'POST',headers:{},socket:{remoteAddress:'test'}},'/api/chat/turn',{token:newSession(),language:'en',message:'Halo ich mochte gerne eine Auskunft wegen meiner Behandlung',consent:true,turnKey:randomUUID()},(status,data)=>result={status,...data});
  try{
    assert.equal(result.language,'de');
    assert.doesNotMatch(result.message,/Which language would you prefer|German or English/);
  }finally{process.env=old;}
});
test('mixed-language appointment details survive the language choice',async()=>{
  const old={...process.env};process.env.OPENAI_API_KEY='fixture';process.env.CHAT_AI_ENABLED='true';
  let calls=0;
  const service=createConversationService({fetcher:async(_,options)=>{
    calls++;const raw=JSON.parse(JSON.parse(options.body).input).visitorMessage;
    assert.match(raw,/Rückenschmerzen|appointment/i);
    return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(answer({kind:'appointment',input_language:'mixed',booking_intent:'request',reason:'Back pain',availability:'Wednesday afternoon',answer:''}))}]}]})};
  }});
  const token=newSession();const turn=async message=>{let result;await service.handle({method:'POST',headers:{},socket:{remoteAddress:'test'}},'/api/chat/turn',{token,language:'en',message,consent:true,turnKey:randomUUID()},(status,data)=>result={status,...data});return result;};
  try{
    const prompt=await turn('Hallo, I need an appointment wegen Rückenschmerzen. Wednesday afternoon would suit me.');
    assert.match(prompt.message,/German or English/);assert.equal(prompt.ready,false);
    const selected=await turn('English please.');
    assert.equal(selected.language,'en');assert.match(selected.message,/first and last name/);assert.equal(calls,1);
    await turn('Test Visitor');await turn('test@example.test');
    const review=await turn('+43 699 12682157');
    assert.equal(review.ready,true);
    assert.ok(review.summary.some(([,value])=>value==='Back pain'));
    assert.ok(review.summary.some(([,value])=>value==='Wednesday afternoon'));
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
test('availability questions in both languages do not silently approve booking intake',async()=>{
  const old={...process.env};process.env.OPENAI_API_KEY='fixture';process.env.CHAT_AI_ENABLED='true';
  const service=createConversationService({fetcher:async(_,options)=>{
    const raw=JSON.parse(JSON.parse(options.body).input).visitorMessage,german=/[äöüß]|\b(?:Ich|Haben|Termin)\b/iu.test(raw);
    const value=/Nackenschmerzen|neck pain/iu.test(raw)
      ?answer({kind:'medical',input_language:german?'de':'en',booking_intent:'unspecified',reason:german?'Nackenschmerzen':'Neck pain',answer:german?'Unser Team kann Ihr Anliegen persönlich besprechen.':'Our team can discuss your concern in person.'})
      :answer({kind:'practice_question',input_language:german?'de':'en',booking_intent:'request',answer:german?'Unser Empfangsteam kann einen passenden Termin mit Ihnen vereinbaren.':'Our reception team can arrange a suitable time with you.'});
    return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}]})};
  }});
  const turn=async(token,language,message)=>{let result;await service.handle({method:'POST',headers:{},socket:{remoteAddress:'test'}},'/api/chat/turn',{token,language,message,consent:true,turnKey:randomUUID()},(status,data)=>result={status,...data});return result;};
  try{
    for(const [language,concern,question,invitation] of [
      ['de','Ich habe Nackenschmerzen.','Haben Sie einen Termin frei?',/Möchten Sie, dass ich eine Terminanfrage/],
      ['en','I have neck pain.','Are any appointments available?',/Would you like me to prepare an appointment request/]
    ]){
      const token=newSession();await turn(token,language,concern);
      const response=await turn(token,language,question);
      assert.equal(response.ready,false);
      assert.match(response.message,invitation);
      assert.doesNotMatch(response.message,/Vor- und Nachnamen|first and last name/);
    }
  }finally{process.env=old;}
});
test('an affirmative appointment answer moves directly to the name',async()=>{
  const previous={...process.env};process.env.OPENAI_API_KEY='fixture';process.env.CHAT_AI_ENABLED='true';
  let calls=0;const service=createConversationService({getFacts:async()=>conversationFacts({}),fetcher:async()=>{calls++;return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(answer({booking_intent:'unspecified',reason:'Shoulder concern',answer:'Thank you. Our team can clarify the next step.'}))}]}]})};}});
  const token=newSession();const turn=async message=>{let result;await service.handle({method:'POST',headers:{},socket:{remoteAddress:'test'}},'/api/chat/turn',{token,language:'en',message,consent:true,turnKey:randomUUID()},(status,data)=>result={status,...data});return result;};
  try{assert.match((await turn('Shoulder concern')).message,/Would you like me to prepare/);const accepted=await turn('yes please');assert.equal(calls,1);assert.equal(accepted.message,'Perfect, thank you.\n\nTo prepare your appointment request, please send your full first and last name (with title, if applicable), email address and phone number with country code. You can send all three together in one message.');}finally{process.env=previous;}
});
test('contact details can arrive together, missing fields are requested separately, and a reason is mandatory',async()=>{
  const old={...process.env};process.env.OPENAI_API_KEY='fixture';process.env.CHAT_AI_ENABLED='true';
  const service=createConversationService({fetcher:async(_,options)=>{
    const raw=JSON.parse(JSON.parse(options.body).input).visitorMessage;
    const value=/headaches/i.test(raw)?answer({kind:'medical',booking_intent:'unspecified',reason:'Headaches',answer:'One of our physiotherapists can discuss your headaches in person.'}):answer({booking_intent:'unspecified',answer:'Okay.'});
    return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}]})};
  }});
  const turn=async(token,message)=>{let result;await service.handle({method:'POST',headers:{},socket:{remoteAddress:'test'}},'/api/chat/turn',{token,language:'en',message,consent:true,turnKey:randomUUID()},(status,data)=>result={status,...data});return result;};
  try{
    const complete=newSession();await turn(complete,'I have headaches');
    const prompt=await turn(complete,'yes');
    assert.match(prompt.message,/first and last name.*email address.*phone number with country code/s);
    const review=await turn(complete,'Anna Novak, anna@example.test, +43 699 12682157');
    assert.equal(review.ready,true);
    assert.ok(review.summary.some(([,value])=>value==='Anna Novak'));
    assert.ok(review.summary.some(([,value])=>value==='Headaches'));
    for(const [bundle,missing,reply] of [
      ['Anna Novak, anna@example.test','phone number','+43 699 12682157'],
      ['Anna Novak, +43 699 12682157','email address','anna@example.test'],
      ['anna@example.test, +43 699 12682157','first and last name','Anna Novak']
    ]){
      const token=newSession();await turn(token,'I have headaches');await turn(token,'yes');
      const partial=await turn(token,bundle);
      assert.equal(partial.ready,false);
      assert.match(partial.message,new RegExp(missing,'i'));
      assert.equal((await turn(token,reply)).ready,true);
    }
    const noReason=newSession();await turn(noReason,'I want an appointment');await turn(noReason,'continue here');
    const contacts=await turn(noReason,'My name is Anna Novak, anna@example.test, +43 699 12682157');
    assert.equal(contacts.ready,false);
    assert.match(contacts.message,/What is the reason for your appointment request/);
    let finish;await service.handle({method:'POST',headers:{},socket:{remoteAddress:'test'}},'/api/chat/finish',{token:noReason,confirmed:true},(status,data)=>finish={status,...data});
    assert.equal(finish.code,'invalid_request');
    const withReason=await turn(noReason,'I have headaches');
    assert.equal(withReason.ready,true);
  }finally{process.env=old;}
});

test('contacts supplied before the concern still lead directly to the final review',async()=>{
  const old={...process.env};process.env.OPENAI_API_KEY='fixture';process.env.CHAT_AI_ENABLED='true';
  const service=createConversationService({fetcher:async(_,options)=>{
    const raw=JSON.parse(JSON.parse(options.body).input).visitorMessage;
    const value=answer({kind:raw.includes('schulter schmerz')?'medical':'appointment',booking_intent:'request',reason:raw.includes('schulter schmerz')?'Schulterschmerzen':null,first_name:raw.includes('Anna Novak')?'Anna':null,last_name:raw.includes('Anna Novak')?'Novak':null,answer:raw.includes('schulter schmerz')?'Eine Physiotherapeutin oder ein Physiotherapeut aus unserem Team kann Ihre Beschwerden persönlich beurteilen.':'Gerne bereite ich Ihre Terminanfrage vor.'});
    return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}]})};
  }});
  const turn=async(token,message)=>{let result;await service.handle({method:'POST',headers:{},socket:{remoteAddress:'test'}},'/api/chat/turn',{token,language:'de',message,consent:true,turnKey:randomUUID()},(status,data)=>result={status,...data});return result;};
  try{
    for(const contacts of ['Name: Anna Novak\nE-Mail: anna@example.test\nTelefon: +43 699 12682157\nIch möchte einen Termin.','Anna Novak, anna@example.test, +43 699 12682157. Ich möchte einen Termin.']){
      const token=newSession();
      const first=await turn(token,contacts);
      assert.equal(first.ready,false);
      assert.match(first.message,/Formular für Terminanfragen/);
      assert.doesNotMatch(first.message,/Vor- und Nachnamen.*E-Mail-Adresse.*Telefonnummer/);
      const chosen=await turn(token,'im Chat');
      assert.match(chosen.message,/Was ist der Anlass für Ihre Terminanfrage/);
      const review=await turn(token,'schulter schmerz');
      assert.equal(review.ready,true);
      assert.ok(review.summary.some(([,value])=>value==='Anna Novak'));
      assert.ok(review.summary.some(([,value])=>value==='Schulterschmerzen'));
    }
    const allInOne=await turn(newSession(),'Anna Novak, anna@example.test, +43 699 12682157. Ich möchte einen Termin wegen schulter schmerz.');
    assert.equal(allInOne.ready,true);
    assert.ok(allInOne.summary.some(([,value])=>value==='Anna Novak'));
    assert.ok(allInOne.summary.some(([,value])=>value==='Schulterschmerzen'));
  }finally{process.env=old;}
});

test('a full name in the opening I am introduction is retained through appointment review',async()=>{
  const old={...process.env};process.env.OPENAI_API_KEY='fixture';process.env.CHAT_AI_ENABLED='true';
  const service=createConversationService({fetcher:async(_,options)=>{
    const raw=JSON.parse(JSON.parse(options.body).input).visitorMessage;
    const value=answer({kind:'medical',booking_intent:'request',reason:/shoulder/i.test(raw)?'Shoulder pain':null,answer:'A physiotherapist can assess your shoulder pain in person.'});
    return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}]})};
  }});
  const turn=async(token,message)=>{let result;await service.handle({method:'POST',headers:{},socket:{remoteAddress:'test'}},'/api/chat/turn',{token,language:'en',message,consent:true,turnKey:randomUUID()},(status,data)=>result={status,...data});return result;};
  try{
    for(const introduction of ["hello Im neils Schreiber , I have a shoulderpain , and would like an appointment", "Hello, I'm Neil Schreiber. My shoulder hurts and I would like an appointment."]){
      const token=newSession();
      const first=await turn(token,introduction);
      assert.equal(first.ready,false);
      assert.doesNotMatch(first.message,/full first and last name|first and last name, please/i);
      assert.match(first.message,/email address and your phone number/i);
      const review=await turn(token,'neils@example.test +43 699 12682157');
      assert.equal(review.ready,true);
      assert.ok(review.summary.some(([,value])=>value===(/neils Schreiber/i.test(introduction)?'neils Schreiber':'Neil Schreiber')));
    }
    const symptomOnly=await turn(newSession(),"I'm having shoulder pain and would like an appointment.");
    assert.match(symptomOnly.message,/first and last name/i);
  }finally{process.env=old;}
});
test('contact intake advances only after a detail is saved and never thanks for a missing field',async()=>{
  const old={...process.env};process.env.OPENAI_API_KEY='fixture';process.env.CHAT_AI_ENABLED='true';
  let calls=0;
  const service=createConversationService({fetcher:async(_,options)=>{
    calls++;const raw=JSON.parse(JSON.parse(options.body).input).visitorMessage;
    const value=raw==='Shoulder pain'?answer({reason:'Shoulder pain',booking_intent:'unspecified',answer:'Our team can assess your concern.'}):raw==='Anna'?answer({booking_intent:'defer',answer:'Thank you, I have your name.'}):raw==='anna@example.test?'?answer({booking_intent:'defer',answer:'Thank you, I have your email. Could you provide your email address?'}):raw==='12345'?answer({answer:'Got it, thanks for your number.'}):answer({kind:'off_topic',booking_intent:'defer',answer:'I can only help with CityPraxis matters.'});
    return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}]})};
  }});
  const token=newSession();const turn=async(message,session=token)=>{let result;await service.handle({method:'POST',headers:{},socket:{remoteAddress:'test'}},'/api/chat/turn',{token:session,language:'en',message,consent:true,turnKey:randomUUID()},(status,data)=>result={status,...data});return result;};
  try{
    await turn('Shoulder pain');await turn('yes please');
    const incompleteName=await turn('Anna');
    assert.equal(incompleteName.message,'Please send your first and last name.');
    const named=await turn('Anna Kovač');
    assert.match(named.message,/Anna Kovač/);
    assert.match(named.message,/email address/);
    assert.doesNotMatch(named.message,/first and last name, please/);
    const emailed=await turn('anna@example.test?');
    assert.match(emailed.message,/phone number/);
    assert.doesNotMatch(emailed.message,/provide your email address/i);
    const invalidPhone=await turn('12345');
    assert.equal(invalidPhone.message,'Please enter a valid phone number, including the country code.');
    const completed=await turn('+43 699 12682157?');
    assert.equal(completed.ready,true);
    assert.deepEqual(completed.summary.find(([key])=>key==='Phone'),['Phone','+4369912682157']);
    const local=newSession();await turn('I want an appointment',local);await turn('Shoulder pain',local);await turn('yes please',local);await turn('Anna Kovač',local);await turn('anna@example.test',local);
    const localNumber=await turn('699 12682157',local);
    assert.equal(localNumber.ready,true);
    assert.deepEqual(localNumber.summary.find(([key])=>key==='Phone'),['Phone','+4369912682157']);
    assert.equal(calls,4);
  }finally{process.env=old;}
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
    value=answer({kind:'practice_question',booking_intent:'unspecified',answer:'We are in Vienna.'});assert.equal((await turn('Where are you?')).message,value.answer+'\n\nFor more details, see [Contact & directions](/kontakt?lang=en) on our website.');
    value=answer({booking_intent:'request',answer:'We would be happy to help.'});assert.match((await turn('Yes, I want to request an appointment now')).message,/first and last name/);
  }finally{process.env=old;}
});
test('a short yes after declining and changing topics asks again before starting intake',async()=>{
  const old={...process.env};process.env.OPENAI_API_KEY='fixture';process.env.CHAT_AI_ENABLED='true';
  let calls=0;
  const service=createConversationService({fetcher:async(_,options)=>{
    calls++;const raw=JSON.parse(JSON.parse(options.body).input).visitorMessage;
    const value=raw==='Back stiffness'
      ?answer({kind:'medical',booking_intent:'unspecified',reason:'Back stiffness',answer:'One of our physiotherapists can assess this in person.'})
      :raw.startsWith('No, I do not want')
        ?answer({booking_intent:'defer',answer:'Of course. We can leave it for now.'})
        :raw.startsWith('I would like to prepare')
          ?answer({booking_intent:'request',answer:'Of course. I can prepare an appointment request.'})
        :answer({kind:'practice_question',booking_intent:'unspecified',answer:'Please pay in cash at the practice.'});
    return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}]})};
  }});
  const token=newSession();const turn=async message=>{let result;await service.handle({method:'POST',headers:{},socket:{remoteAddress:'test'}},'/api/chat/turn',{token,language:'en',message,consent:true,turnKey:randomUUID()},(status,data)=>result={status,...data});return result;};
  try{
    assert.match((await turn('Back stiffness')).message,/Would you like me to prepare/);
    await turn('No, I do not want an appointment. I only wanted information.');
    await turn('What payment methods do you accept?');
    await turn('Do I need a referral?');
    const clarification=await turn('Actually yes.');
    assert.equal(clarification.ready,false);
    assert.match(clarification.message,/Just to confirm: would you like to start a new appointment request now\?/);
    assert.doesNotMatch(clarification.message,/first and last name/);
    const tentative=await turn('Maybe.');
    assert.match(tentative.message,/I won’t start anything yet/);
    assert.doesNotMatch(tentative.message,/first and last name/);
    const confirmed=await turn('Yes');
    assert.match(confirmed.message,/first and last name/);
    assert.equal(confirmed.ready,false);
    assert.equal(calls,4);
    const newRequestSession=newSession();
    const anotherTurn=async message=>{let result;await service.handle({method:'POST',headers:{},socket:{remoteAddress:'test'}},'/api/chat/turn',{token:newRequestSession,language:'en',message,consent:true,turnKey:randomUUID()},(status,data)=>result={status,...data});return result;};
    await anotherTurn('Back stiffness');
    await anotherTurn('No, I do not want an appointment.');
    const explicit=await anotherTurn('I would like to prepare an appointment request now.');
    assert.match(explicit.message,/first and last name/);
    assert.equal(explicit.ready,false);
  }finally{process.env=old;}
});
test('German booking consent, uncertainty and decline follow the same safeguards as English',async()=>{
  const old={...process.env};process.env.OPENAI_API_KEY='fixture';process.env.CHAT_AI_ENABLED='true';
  let aiCalls=0;const service=createConversationService({fetcher:async(_,options)=>{
    aiCalls++;const raw=JSON.parse(JSON.parse(options.body).input).visitorMessage;
    const value=/Rückenschmerzen/iu.test(raw)
      ?answer({kind:'medical',input_language:'de',booking_intent:'unspecified',reason:'Rückenschmerzen',answer:'Unser Team kann Ihr Anliegen persönlich besprechen.'})
      :/keinen Termin/iu.test(raw)
        ?answer({kind:'practice_question',input_language:'de',booking_intent:'defer',answer:'Gerne beantworte ich zunächst Ihre Fragen.'})
        :answer({kind:'practice_question',input_language:/^Wie teuer/iu.test(raw)?'de':'en',booking_intent:'unspecified',answer:'Die Preise finden Sie auf unserer Website.',related_pages:[]});
    return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}]})};
  }});
  const turn=async(token,message,language='de')=>{let result;await service.handle({method:'POST',headers:{},socket:{remoteAddress:'test'}},'/api/chat/turn',{token,language,message,consent:true,turnKey:randomUUID()},(status,data)=>result={status,...data});return result;};
  try{
    const token=newSession();
    assert.match((await turn(token,'Ich habe Rückenschmerzen.')).message,/Möchten Sie, dass ich eine Terminanfrage/);
    const declined=await turn(token,'Nein, ich möchte keinen Termin.');
    assert.doesNotMatch(declined.message,/Vor- und Nachnamen/);
    await turn(token,'Wie teuer ist es, einen Termin zu buchen?');
    const clarification=await turn(token,'Ja.');
    assert.match(clarification.message,/Nur zur Sicherheit/);
    assert.doesNotMatch(clarification.message,/Vor- und Nachnamen/);
    assert.match((await turn(token,'Vielleicht.')).message,/noch nichts vor/);
    assert.match((await turn(token,'Ja bitte.')).message,/Vor- und Nachnamen/);
    const fresh=newSession();
    await turn(fresh,'Ich habe Rückenschmerzen.');
    assert.match((await turn(fresh,'Natürlich.')).message,/Vor- und Nachnamen/);
    assert.equal(aiCalls,4);
  }finally{process.env=old;}
});
test('conversational reception validates, reviews, edits and submits exactly once',async()=>{
  const old={...process.env};process.env.OPENAI_API_KEY='fixture';process.env.CHAT_AI_ENABLED='true';delete process.env.RESEND_API_KEY;
  let value=answer({reason:'Shoulder concern',first_name:'Test',last_name:'Visitor'}),calls=0,saved=[];
  const fetcher=async(url,options)=>{calls++;const payload=JSON.parse(options.body);assert.equal(payload.model,'gpt-6-luna');assert.equal(payload.store,false);assert.equal(payload.text.format.strict,true);return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}]})};};
  const store={recent:async()=>[],save:async row=>{saved.push(row);return {created:true,row:{...row,id:42}};}};
  const service=createConversationService({store,fetcher});const token=newSession();
  const call=async(route,body={},session=token)=>{let result;await service.handle({method:'POST',headers:{},socket:{remoteAddress:'test'}},`/api/chat/${route}`,{token:session,language:'en',...body},(status,data)=>result={status,...data});return result;};
  const turn=(message,extra={})=>call('turn',{message,consent:true,turnKey:randomUUID(),...extra});
  try{
    assert.equal((await call('turn',{message:'Hi',turnKey:randomUUID()})).code,'consent_required');assert.equal(calls,0);
    const key=randomUUID();const first=await turn('My name is Test Visitor. I want an appointment for a shoulder concern.',{turnKey:key});assert.match(first.message,/email address/);assert.equal(first.ready,false);
    assert.deepEqual(await turn('My name is Test Visitor. I want an appointment for a shoulder concern.',{turnKey:key}),first);assert.equal(calls,1);
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
  assert.equal(CONVERSATION_LIMIT,30);
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
    assert.equal((await call(newSession(),'I think this chat is very good.')).message,'Thank you.');
    value=answer({kind:'compliment',answer:'Das freut uns sehr!'});
    assert.equal((await call(newSession(),'Euer Team ist sehr freundlich.',{language:'de'})).message,'Danke.');
    const aiCallsBeforeEmergency=calls;assert.equal((await call(token,'I cannot breathe')).emergency,true);assert.equal(calls,aiCallsBeforeEmergency);
    const germanEmergency=await call(newSession(),'Ich habe Atemnot',{language:'en'});
    assert.equal(germanEmergency.emergency,true);assert.equal(germanEmergency.language,'de');assert.match(germanEmergency.message,/Dieser Chat ist kein Notfalldienst/);
    const englishEmergency=await call(newSession(),'I have chest pain',{language:'de'});
    assert.equal(englishEmergency.emergency,true);assert.equal(englishEmergency.language,'en');assert.match(englishEmergency.message,/This chat is not an emergency service/);
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
    const limited=newSession();for(let i=0;i<CONVERSATION_LIMIT;i++){const result=await call(limited,'Unrelated question');assert.equal(result.status,200);if(i===CONVERSATION_LIMIT-1)assert.equal(result.limitReached,true);}
    assert.equal((await call(limited,'One more')).code,'conversation_limit');
    assert.deepEqual(conversationFacts({prices:[{amount:null},{amount:''},{amount:'90',title:'Therapy'}]}).samplePrices,[{category:undefined,service:'Therapy',duration:undefined,euro:90,details:undefined}]);
  }finally{process.env=old;}
});
