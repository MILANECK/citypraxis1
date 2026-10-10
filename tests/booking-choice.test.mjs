import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createConversationService} from '../src/chat/conversation.mjs';
import {newSession} from '../src/chat/security.mjs';

const modelAnswer=(changes={})=>({kind:'appointment',input_language:'unclear',answer:'',related_pages:[],booking_intent:'request',booking_choice:'unspecified',needs_clarification:false,reason:null,availability:null,first_name:null,last_name:null,patient_status:null,...changes});
function fixture(reply=()=>modelAnswer()){
  const inputs=[];
  const service=createConversationService({fetcher:async(_,options)=>{
    const input=JSON.parse(JSON.parse(options.body).input);inputs.push(input);
    return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(reply(input))}]}]})};
  }});
  const turn=async(token,message,language='de')=>{
    let result;
    await service.handle({method:'POST',headers:{},socket:{remoteAddress:'test'}},'/api/chat/turn',{token,language,message,consent:true,turnKey:randomUUID()},(status,data)=>result={status,...data});
    assert.equal(result.status,200,message);
    return result;
  };
  return {turn,inputs};
}
async function enabled(run){
  const old={...process.env};process.env.OPENAI_API_KEY='fixture';process.env.CHAT_AI_ENABLED='true';
  try{await run();}finally{process.env=old;}
}
const assertChatIntake=(reply,language)=>{
  assert.equal(reply.language,language);
  assert.equal(reply.ready,false);
  assert.match(reply.message,language==='en'?/please send your full first and last name.*email address and phone number/s:/benötige ich bitte Ihren vollständigen Vor- und Nachnamen.*E-Mail-Adresse.*Telefonnummer/s);
  assert.doesNotMatch(reply.message,/Which would you prefer|Was ist Ihnen lieber|\]\(\/termin/);
};

test('the screenshot replies and natural variants choose chat in the visitor language',()=>enabled(async()=>{
  const {turn,inputs}=fixture();
  const choices={
    en:['I want to continue','I would like to continue here.',"I'd like to continue in the chat, please.",'Please prepare it here','Prepare','I prefer the chat','continue here',"Let's continue here"],
    de:['Vorbereiten','Ich möchte hier weitermachen.','Ich würde gerne im Chat fortfahren','Bitte hier vorbereiten','Ich möchte die Anfrage hier im Chat vorbereiten','Hier im Chat','Weiter','machen wir weiter'],
  };
  for(const [language,phrases] of Object.entries(choices))for(const phrase of phrases){
    const token=newSession();
    assert.match((await turn(token,'Ich möchte einen Termin.')).message,/Was ist Ihnen lieber/);
    assertChatIntake(await turn(token,phrase),language);
  }
  assert.equal(inputs.length,0,'Clear choices should not depend on model interpretation');
}));

test('choosing chat advances through contact details to the reason and review',()=>enabled(async()=>{
  const {turn,inputs}=fixture(()=>modelAnswer({reason:'Headaches'}));
  const token=newSession();
  await turn(token,'Ich möchte einen Termin.');
  assertChatIntake(await turn(token,'I want to continue'),'en');
  const contact=await turn(token,'Anna Novak, anna@example.test, +43 699 12682157');
  assert.equal(contact.ready,false);
  assert.match(contact.message,/What is the reason for your appointment request/);
  assert.doesNotMatch(contact.message,/Which would you prefer|first and last name|email address|phone number/);
  const review=await turn(token,'I have headaches');
  assert.equal(review.ready,true);
  for(const detail of ['Anna Novak','anna@example.test','+4369912682157','Headaches'])assert.ok(review.summary.some(([,value])=>value===detail),detail);
  assert.equal(inputs.length,1);
}));

test('a repeated continuation after choosing chat never reopens the form-or-chat offer',()=>enabled(async()=>{
  const {turn}=fixture();
  const token=newSession();await turn(token,'Ich möchte einen Termin.');
  assertChatIntake(await turn(token,'I want to continue'),'en');
  const repeated=await turn(token,'Vorbereiten');
  assert.equal(repeated.ready,false);
  assert.doesNotMatch(repeated.message,/Which would you prefer|Was ist Ihnen lieber|\]\(\/termin/);
  assert.match(repeated.message,/first and last name/);
}));

test('an intervening practice question does not discard the pending booking choice',()=>enabled(async()=>{
  const {turn,inputs}=fixture(()=>modelAnswer({kind:'practice_question',booking_intent:'unspecified',answer:'Our reception team arranges the first appointment.'}));
  const token=newSession();await turn(token,'I want an appointment','en');
  const information=await turn(token,'Who arranges the first appointment?','en');
  assert.match(information.message,/reception team arranges/);
  assert.doesNotMatch(information.message,/please send your full first and last name/);
  assertChatIntake(await turn(token,'continue here','en'),'en');
  assert.equal(inputs.length,1);
}));

test('a model-understood chat choice proceeds even when the reason is still unknown',()=>enabled(async()=>{
  const {turn,inputs}=fixture(()=>modelAnswer({booking_choice:'chat',answer:'I can help you with that.'}));
  const token=newSession();await turn(token,'I want an appointment','en');
  assertChatIntake(await turn(token,'Could you guide me through it yourself?','en'),'en');
  assert.equal(inputs.length,1);
  assert.equal(inputs[0].awaitingBookingChoice,true);
}));

test('natural form choices provide the link without starting assisted intake',()=>enabled(async()=>{
  const {turn,inputs}=fixture();
  for(const [language,phrase] of [['en','I want to use the form'],['en','I prefer the form'],['en','the form'],['de','Ich möchte das Formular nutzen'],['de','Das Formular bitte'],['de','Onlineformular']]){
    const token=newSession();await turn(token,'I want an appointment','en');
    const reply=await turn(token,phrase,'en');
    assert.equal(reply.language,language);
    assert.equal(reply.ready,false);
    assert.match(reply.message,new RegExp(`\\]\\(/termin\\?lang=${language}#booking-form\\)`));
    assert.doesNotMatch(reply.message,/first and last name|Vor- und Nachnamen|Which would you prefer|Was ist Ihnen lieber/);
  }
  assert.equal(inputs.length,0);
}));

test('negative and ambiguous choices do not start assisted intake',()=>enabled(async()=>{
  const {turn,inputs}=fixture(input=>modelAnswer(input.visitorMessage==='Maybe chat or the form?'
    ?{needs_clarification:true,answer:'Could you clarify?'}
    :{booking_intent:'defer',booking_choice:'decline',answer:'We can leave it for now.'}));
  for(const phrase of ["I don't want to continue",'Ich möchte nicht vorbereiten','Maybe chat or the form?']){
    const token=newSession();await turn(token,'I want an appointment','en');
    const reply=await turn(token,phrase,'en');
    assert.equal(reply.ready,false);
    assert.doesNotMatch(reply.message,/please send your full first and last name|benötige ich bitte Ihren vollständigen Vor- und Nachnamen/);
  }
  assert.equal(inputs.length,3);
}));

test('semantic chat choices handle indirect requests, preferences, typos and negated alternatives',()=>enabled(async()=>{
  const {turn,inputs}=fixture(input=>modelAnswer({kind:/appointment|Terminanfrage/u.test(input.visitorMessage)?'appointment':'practice_question',booking_intent:/appointment|Terminanfrage/u.test(input.visitorMessage)?'request':'unspecified',booking_choice:'chat'}));
  const choices={
    en:["I'd rather stay here",'Please walk me through it',"Let's do it together",'Could we prepare my appointment request together?',"No form, please; let's do it here",'yep plese help me with it','Together'],
    de:['Dann lieber mit Ihnen','Führen Sie mich bitte durch die Anfrage','Lassen Sie uns das gemeinsam machen','Könnten wir meine Terminanfrage zusammen vorbereiten?','Nein, kein Formular, lieber hier mit Ihnen','ja ich wils hir machen','Zusammen'],
  };
  for(const [language,phrases] of Object.entries(choices))for(const phrase of phrases){
    const token=newSession();await turn(token,language==='en'?'I want an appointment':'Ich möchte einen Termin',language);
    assertChatIntake(await turn(token,phrase,language),language);
  }
  assert.equal(inputs.length,14,'Unlisted constructions use contextual model interpretation');
  assert.ok(inputs.every(input=>input.awaitingBookingChoice===true));
}));

test('choosing chat while asking a practice question preserves the answer before intake',()=>enabled(async()=>{
  const {turn}=fixture(()=>modelAnswer({kind:'practice_question',booking_intent:'unspecified',booking_choice:'chat',answer:'The first physiotherapy visit is €130.'}));
  const token=newSession();await turn(token,'I want an appointment','en');
  const reply=await turn(token,"I'd rather stay here. What does the first visit cost?",'en');
  assertChatIntake(reply,'en');
  assert.match(reply.message,/^The first physiotherapy visit is €130\./);
}));

test('semantic form choices and postponements never collect contact details',()=>enabled(async()=>{
  let selected='form';
  const {turn,inputs}=fixture(()=>modelAnswer({booking_choice:selected}));
  for(const [language,phrase] of [['en',"I'll fill it in myself"],['en','Not in chat; send me the form'],['de','Lieber den Link'],['de','Ich fülle das selbst aus, schicken Sie mir bitte den Link']]){
    const token=newSession();await turn(token,language==='en'?'I want an appointment':'Ich möchte einen Termin',language);
    const reply=await turn(token,phrase,language);
    assert.match(reply.message,new RegExp(`\\]\\(/termin\\?lang=${language}#booking-form\\)`));
    assert.doesNotMatch(reply.message,/first and last name|Vor- und Nachnamen|Which would you prefer|Was ist Ihnen lieber/);
    assert.equal(reply.ready,false);
  }
  selected='decline';
  const token=newSession();await turn(token,'I want an appointment','en');
  const declined=await turn(token,"Let's leave both options for another day",'en');
  assert.doesNotMatch(declined.message,/first and last name|\]\(\/termin/);
  selected='unspecified';
  await turn(token,'I have another question','en');
  assert.equal(inputs.at(-1).awaitingBookingChoice,false);
}));

test('uncertainty is not confirmation even if the general intent is labelled request',()=>enabled(async()=>{
  const {turn}=fixture(()=>modelAnswer({booking_choice:'unspecified',answer:'Take your time.'}));
  const token=newSession();await turn(token,'I want an appointment','en');
  const uncertain=await turn(token,'Maybe later; I have not decided','en');
  assert.equal(uncertain.ready,false);
  assert.equal(uncertain.message,'Take your time.');
  assertChatIntake(await turn(token,'continue here','en'),'en');
}));

test('genuinely ambiguous choice asks about the choice and a correction moves forward',()=>enabled(async()=>{
  const {turn}=fixture(()=>modelAnswer({booking_choice:'chat',needs_clarification:true}));
  const token=newSession();await turn(token,'I want an appointment','en');
  const unclear=await turn(token,'Either might work for my appointment','en');
  assert.equal(unclear.message,'Would you prefer to continue here in chat or use the form?');
  assert.equal(unclear.ready,false);
  assert.equal(unclear.clarification,null);
  assertChatIntake(await turn(token,'continue here','en'),'en');
}));

test('a model booking choice outside an offered choice cannot start intake',()=>enabled(async()=>{
  const {turn,inputs}=fixture(()=>modelAnswer({kind:'practice_question',booking_intent:'unspecified',booking_choice:'chat',answer:'Our reception team can help.'}));
  const token=newSession();
  const reply=await turn(token,'Tell me about the practice','en');
  assert.equal(reply.ready,false);
  assert.doesNotMatch(reply.message,/first and last name|Vor- und Nachnamen/);
  await turn(token,'What else can you tell me?','en');
  assert.equal(inputs.at(-1).awaitingBookingChoice,false);
  assert.equal(inputs.at(-1).knownDetails.bookingApproved,false);
}));
