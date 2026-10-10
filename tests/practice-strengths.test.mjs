import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {editorialPage} from '../public/page-copy.js';
import {conversationFacts,createConversationService} from '../src/chat/conversation.mjs';
import {newSession} from '../src/chat/security.mjs';

const modelAnswer=(changes={})=>({kind:'practice_question',input_language:'unclear',answer:'',related_pages:[],booking_intent:'unspecified',booking_choice:'unspecified',needs_clarification:false,reason:null,availability:null,first_name:null,last_name:null,patient_status:null,...changes});
async function enabled(run){
  const old={...process.env};process.env.OPENAI_API_KEY='fixture';process.env.CHAT_AI_ENABLED='true';
  try{await run();}finally{process.env=old;}
}
function fixture(content,reply){
  const inputs=[];
  const service=createConversationService({getFacts:async()=>conversationFacts(content),fetcher:async(_,options)=>{
    const request=JSON.parse(options.body),input=JSON.parse(request.input);inputs.push(input);
    const value=reply(input,request);
    return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}]})};
  }});
  const turn=async(token,message,language='en')=>{
    let result;await service.handle({method:'POST',headers:{},socket:{remoteAddress:'test'}},'/api/chat/turn',{token,language,message,consent:true,turnKey:randomUUID()},(status,data)=>result={status,...data});
    assert.equal(result.status,200,message);return result;
  };
  return {turn,inputs};
}

test('chat strengths match the visible homepage defaults in both languages',()=>{
  const facts=conversationFacts({});
  for(const lang of ['de','en']){
    const home=editorialPage('home',{},lang),suffix=lang==='en'?'En':'';
    assert.equal(facts.practiceStrengths['heading'+suffix],home.distinctionHeading);
    assert.deepEqual(facts.practiceStrengths['items'+suffix],home.distinctionItems.split('\n').map(item=>item.trim()).filter(Boolean));
  }
  assert.match(facts.practiceStrengths.itemsEn.join(' '),/Saturday appointments from 08:30 to 12:30/);
  assert.match(facts.practiceStrengths.itemsEn.join(' '),/CRAFTA®/);
});

test('published homepage edits replace defaults and unfilled translations use the same site fallback',()=>{
  const record={id:'home',distinctionHeading:'Unsere Stärken',distinctionHeadingEn:'Our strengths',distinctionItems:'  Individuelle Betreuung  \n\nZentrale Lage',distinctionItemsEn:'  Personal care \n\nCentral location '};
  const facts=conversationFacts({pages:[record]});
  assert.deepEqual(facts.practiceStrengths,{heading:'Unsere Stärken',headingEn:'Our strengths',items:['Individuelle Betreuung','Zentrale Lage'],itemsEn:['Personal care','Central location']});
  assert.equal(facts.sitePages.find(page=>page.id==='strengths').titleEn,'Our strengths');
  assert.deepEqual(conversationFacts({pages:[{...record,distinctionItemsEn:''}]}).practiceStrengths.itemsEn,['Individuelle Betreuung','Zentrale Lage']);
  const empty=conversationFacts({pages:[{id:'home',distinctionItems:'',distinctionItemsEn:''}]});
  assert.deepEqual(empty.practiceStrengths.items,[]);
  assert.deepEqual(empty.practiceStrengths.itemsEn,[]);
  assert.equal(empty.sitePages.some(page=>page.id==='strengths'),false);
});

test('screenshot questions receive current strengths and a direct link without starting appointment intake',()=>enabled(async()=>{
  const content={pages:[{id:'home',distinctionHeadingEn:'Our strengths',distinctionItems:'CRAFTA® Ausbildung\nSamstagstermine',distinctionItemsEn:'CRAFTA® training\nSaturday appointments'}]};
  const {turn,inputs}=fixture(content,(input,request)=>{
    assert.deepEqual(input.publishedFacts.practiceStrengths.items,['CRAFTA® training','Saturday appointments']);
    assert.ok(request.text.format.schema.properties.related_pages.items.enum.includes('strengths'));
    return modelAnswer({input_language:'en',answer:'Our strengths include CRAFTA® training and Saturday appointments, giving you an additional option outside the working week.',related_pages:['team','therapies','specializations']});
  });
  for(const message of ['Why are you better , why should I choose you for my treatment ?', 'I would like to ask about your treatments and , why you are better as your competition ?']){
    const reply=await turn(newSession(),message);
    assert.match(reply.message,/CRAFTA® training and Saturday appointments/);
    assert.match(reply.message,/\[Our strengths\]\(\/\?lang=en#home-distinction-title\)/);
    assert.doesNotMatch(reply.message,/first and last name|prepare an appointment request|Which would you prefer/);
    assert.equal(reply.ready,false);
    assert.ok(reply.message.length<=700);
  }
  assert.equal(inputs.length,2);
}));

test('German answers use published German strengths and link labels',()=>enabled(async()=>{
  const content={pages:[{id:'home',distinctionHeading:'Unsere Stärken',distinctionHeadingEn:'Our strengths',distinctionItems:'Sportphysiotherapie',distinctionItemsEn:'Sports physiotherapy'}]};
  const {turn}=fixture(content,input=>{
    assert.deepEqual(input.publishedFacts.practiceStrengths.items,['Sportphysiotherapie']);
    return modelAnswer({input_language:'de',answer:'Zu unseren Stärken gehört die Sportphysiotherapie.',related_pages:['strengths']});
  });
  const reply=await turn(newSession(),'Was zeichnet die Citypraxis aus?','de');
  assert.match(reply.message,/Sportphysiotherapie/);
  assert.match(reply.message,/\[Unsere Stärken\]\(\/\?lang=de#home-distinction-title\)/);
}));

test('a genuinely unclear follow-up uses helpful wording, then accepts a clear practice question',()=>enabled(async()=>{
  const {turn}=fixture({},input=>input.visitorMessage==='So ?'
    ?modelAnswer({needs_clarification:true,answer:'Could you rephrase what you need?'})
    :modelAnswer({input_language:'en',answer:'We offer Saturday appointments and specialist CRAFTA® training.',related_pages:['strengths']}));
  const token=newSession();
  await turn(token,'Hello');
  const unclear=await turn(token,'So ?');
  assert.equal(unclear.message,'How can I help you? Please tell me a little more.');
  assert.doesNotMatch(unclear.message,/what you need|misunderstood|appointment/);
  const clear=await turn(token,'What makes Citypraxis special?');
  assert.match(clear.message,/Saturday appointments/);
  assert.match(clear.message,/#home-distinction-title/);
  assert.doesNotMatch(clear.message,/tell me a little more|first and last name/);
}));

test('a model-classified appointment turn cannot append intake without a request or stated concern',()=>enabled(async()=>{
  const {turn}=fixture({},()=>modelAnswer({kind:'appointment',answer:'How can I help you?'}));
  const token=newSession();await turn(token,'Hello');
  const reply=await turn(token,'So ?');
  assert.equal(reply.message,'How can I help you?');
  assert.equal(reply.ready,false);
}));
