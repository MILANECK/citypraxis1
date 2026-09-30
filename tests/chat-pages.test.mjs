import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chatPages,relatedPageLinks} from '../src/chat/pages.mjs';
import {conversationFacts,composeReply} from '../src/chat/conversation.mjs';

const content={services:[{id:'physiotherapie',title:'Physiotherapie',titleEn:'Physiotherapy'}],symptoms:[{id:'kopfschmerzen',title:'Kopfschmerzen',titleEn:'Headaches'}],team:[{id:'isabella-casny',title:'Isabella Casny'},{id:'fictional',title:'Not published',fictional:true}]};
const facts=conversationFacts(content);

test('catalog includes published details and omits fictional profiles',()=>{
  assert.equal(facts.sitePages.find(page=>page.id==='service:physiotherapie').url,'/leistungen/physiotherapie');
  assert.equal(facts.sitePages.find(page=>page.id==='specialism:kopfschmerzen').url,'/schwerpunkte/kopfschmerzen');
  assert.equal(facts.sitePages.find(page=>page.id==='person:isabella-casny').url,'/team/isabella-casny');
  assert.ok(!facts.sitePages.some(page=>page.id==='person:fictional'));
  assert.ok(chatPages().every(page=>page.url.startsWith('/')&&!page.url.startsWith('//')));
});

test('administrative questions always receive the relevant localized destination',()=>{
  for(const [raw,path,lang] of [
    ['What are your opening hours?','/kontakt?lang=en#oeffnungszeiten','en'],
    ['Seid ihr am Samstag geöffnet?','/kontakt?lang=de#oeffnungszeiten','de'],
    ['What does it cost, what are the prices?','/preise?lang=en','en'],
    ['How does reimbursement work?','/preise?lang=en','en'],
    ['Do I need a referral?','/ablauf-wahltherapie?lang=en','en'],
    ['Where are you?','/kontakt?lang=en','en'],
    ['Wie ist die Anfahrt?','/kontakt?lang=de','de'],
    ['What happens to my personal data?','/datenschutz?lang=en#digitaler-empfang','en'],
    ['Welche Therapien gibt es?','/leistungen?lang=de','de'],
    ['Tell me about the team','/ueber-uns?lang=en#team','en']
  ])assert.ok(relatedPageLinks(raw,[],facts,lang).includes(`](${path})`),raw);
});

test('specific catalog choices are localized, deduplicated and bounded',()=>{
  assert.equal(relatedPageLinks('Tell me about physiotherapy treatments',['service:physiotherapie','service:physiotherapie','made-up'],facts,'en'),'For more details, see [Physiotherapy](/leistungen/physiotherapie?lang=en) on our website.');
  assert.equal(relatedPageLinks('I have headaches',['specialism:kopfschmerzen'],facts,'en'),'For more details, see [Headaches](/schwerpunkte/kopfschmerzen?lang=en) on our website.');
  assert.equal(relatedPageLinks('Tell me about Isabella Casny from your team',['person:isabella-casny'],facts,'en'),'For more details, see [Isabella Casny](/team/isabella-casny?lang=en) on our website.');
  assert.equal(relatedPageLinks('Open the booking form',['booking'],facts,'en'),'For more details, see [Appointment request](/termin?lang=en#booking-form) on our website.');
  assert.equal(relatedPageLinks('Wie sind die Öffnungszeiten?',[],facts,'de'),'Weitere Informationen finden Sie auf unserer Website unter [Öffnungszeiten](/kontakt?lang=de#oeffnungszeiten).');
  assert.equal(relatedPageLinks('Hello',[],facts,'en'),'');
});

test('long replies reserve space for complete clickable links and the next intake question',()=>{
  const links=relatedPageLinks('opening hours, prices, referral',[],facts,'en');
  const followUp='Would you like me to prepare an appointment request for our reception team?';
  const reply=composeReply(Array.from({length:50},(_,i)=>`This is sentence ${i}.`).join(' '),followUp,links);
  assert.ok(reply.length<=700);
  assert.ok(reply.includes(links));
  assert.ok(reply.endsWith(followUp));
});
