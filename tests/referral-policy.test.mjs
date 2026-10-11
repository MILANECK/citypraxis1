import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {focusedReferralReply} from '../src/referral-policy.mjs';
import {applyReferralContent} from '../src/referral-content.mjs';
import {conversationFacts,createConversationService} from '../src/chat/conversation.mjs';
import {newSession} from '../src/chat/security.mjs';
import {openDatabase,contentSnapshot} from '../src/database.mjs';
import {editorialPage} from '../public/page-copy.js';

test('owner policy replaces stale referral facts without changing the input content',()=>{
 const stale={faqs:[{id:'verordnung',body:'All treatments need a referral.'}],services:[{id:'heilmassage',title:'Massage',body:'Please get a required referral.'}]};
 const before=structuredClone(stale),facts=conversationFacts(stale);
 assert.deepEqual(facts.referralPolicy.required,['physiotherapie','osteopathie','logopaedie']);
 assert.deepEqual(facts.referralPolicy.optional,['heilmassage']);assert.equal(facts.referralPolicy.collectInChat,false);
 assert.match(facts.faqs[0].bodyEn,/massage, a referral is optional and not required/u);
 assert.match(editorialPage('ablauf-wahltherapie',{},'de').step1Body,/Logopädie/u);assert.match(editorialPage('ablauf-wahltherapie',{},'en').step1BodyEn,/massage it is optional/u);
 assert.deepEqual(stale,before);
});

test('focused referral answers cover required therapies, optional massage, document handoff and definitions bilingually',()=>{
 for(const [raw,lang,required] of [
  ['Brauche ich eine Verordnung für Physiotherapie?','de',true],['Ist für Osteopathie eine Zuweisung erforderlich?','de',true],['Brauche ich eine Überweisung für Logopädie?','de',true],['Brauche ich eine Verordnung für Heilmassage?','de',false],
  ['Do I need a referral for physiotherapy?','en',true],['Does osteopathy require a prescription?','en',true],['Do I need a referral for speech and language therapy?','en',true],['Do I need a referral for therapeutic massage?','en',false]
 ]){
  const response=focusedReferralReply(raw,lang);assert.equal(response.language,lang);
  assert.match(response.answer,required?/required|erforderlich/u:/optional/u);
  assert.match(response.answer,/first appointment|Ersttermin/u);assert.match(response.answer,/do not send|nicht hier im Chat/u);
 }
 assert.match(focusedReferralReply('Was bedeutet Verordnung?','de').answer,/Anordnung der Therapie/u);
 assert.match(focusedReferralReply('What is a medical referral?','en').answer,/doctor’s instruction/u);
 assert.match(focusedReferralReply('Kann ich meine Verordnung hier hochladen?','de').answer,/keine Verordnungsdokumente/u);
 assert.match(focusedReferralReply('Can I send you my referral?','en').answer,/do not collect/u);
 assert.match(focusedReferralReply('Ich habe eine Verordnung.','de').answer,/Danke/u);
 assert.match(focusedReferralReply('Und Logopädie?','de',[{role:'assistant',text:'Für Physiotherapie ist eine Verordnung erforderlich.'}]).answer,/Logopädie.*erforderlich/u);
 assert.equal(focusedReferralReply('Und Logopädie?','en',[{role:'assistant',text:'Physiotherapy requires a referral.'}]).language,'de');
 for(const raw of ['What does physiotherapy cost and do I need a referral?','Do I need a referral and how much is it?','How do I get a prescription for medication?','Who can issue my referral?','Can you write prescriptions?','I need an appointment and have a referral.','Do I need a referral? My email is patient@example.test.','Is my referral still valid?'])assert.equal(focusedReferralReply(raw,'en'),null,raw);
});

test('content patch preserves unrelated text, publication state and repeated application',()=>{
 const page={id:'ablauf-wahltherapie',image:'/original.jpg',body:'Unchanged intro.\n\n## Verordnungsschein\n\nOld rule including massage.\n\n## Bezahlung\n\nUnchanged payment.',bodyEn:'Unchanged intro.\n\n## Medical referral\n\nOld rule.\n\n## Payment\n\nUnchanged payment.'};
 const changed=applyReferralContent('pages',page.id,page);
 assert.match(changed.body,/Logopädie/u);assert.match(changed.body,/Heilmassage.*optional/u);assert.match(changed.body,/## Bezahlung\n\nUnchanged payment\.$/u);assert.match(changed.bodyEn,/## Payment\n\nUnchanged payment\.$/u);assert.equal(changed.image,page.image);
 assert.deepEqual(applyReferralContent('pages',page.id,changed),changed);assert.equal(applyReferralContent('pages',page.id,null),null);
 const massage=applyReferralContent('services','heilmassage',{body:'Der Arztbesuch wird nicht ersetzt! Wir ersuchen Sie daher im Idealfall auch bei dem Wunsch einer reinen Massage vorher Ihren Arzt für eine Verordnung zur Heilmassage aufzusuchen.\n\nAndere Methoden.',bodyEn:'A visit to the doctor is not replaced! Ideally, therefore, we ask you to consult your doctor for a therapeutic massage referral beforehand, even if you simply want a massage.\n\nOther methods.'});
 assert.match(massage.body,/Arztbesuch wird nicht ersetzt!/u);assert.match(massage.body,/Andere Methoden/u);assert.doesNotMatch(massage.body,/im Idealfall/u);assert.doesNotMatch(massage.bodyEn,/Ideally/u);assert.match(massage.bodyEn,/optional and not required/u);
});

test('SQLite referral migration preserves later edits and does not publish an unpublished entry',()=>{
 const folder=mkdtempSync(join(tmpdir(),'citypraxis-referral-')),file=join(folder,'sandbox.sqlite');let db;
 try{
  db=openDatabase(file);const snapshot=contentSnapshot(db);
  assert.match(snapshot.faqs.find(row=>row.id==='verordnung').body,/Logopädie/u);
  assert.match(snapshot.services.find(row=>row.id==='heilmassage').bodyEn,/optional and not required/u);
  assert.doesNotMatch(snapshot.pages.find(row=>row.id==='ablauf-wahltherapie').body,/10 x Heilmassage/u);
  db.prepare("UPDATE content SET published=NULL WHERE collection='services' AND id='logopaedie'").run();
  db.prepare('DELETE FROM migrations WHERE version=14').run();db.close();db=openDatabase(file);
  assert.equal(db.prepare("SELECT published FROM content WHERE collection='services' AND id='logopaedie'").get().published,null);
  const faq=db.prepare("SELECT draft FROM content WHERE collection='faqs' AND id='verordnung'").get();const edit={...JSON.parse(faq.draft),body:'Later owner edit'};
  db.prepare("UPDATE content SET draft=? WHERE collection='faqs' AND id='verordnung'").run(JSON.stringify(edit));db.close();db=openDatabase(file);
  assert.equal(JSON.parse(db.prepare("SELECT draft FROM content WHERE collection='faqs' AND id='verordnung'").get().draft).body,'Later owner edit');
 }finally{db?.close();rmSync(folder,{recursive:true,force:true});}
});

test('actual conversation handler answers referral detours without AI, storage, email or lost contacts',async()=>{
 const old={...process.env};process.env.CHAT_AI_ENABLED='true';process.env.OPENAI_API_KEY='fixture';let aiCalls=0,saves=0;
 try{
  for(const lang of ['de','en']){
   const token=newSession();const service=createConversationService({store:{save(){saves++;assert.fail('No referral query may submit');}},getFacts:async()=>conversationFacts(),fetcher:async()=>{aiCalls++;assert.fail('Focused referral answers must not need a paid API call');}});
   const turn=async message=>{let result;await service.handle({method:'POST',headers:{},socket:{remoteAddress:'referral-test'}},'/api/chat/turn',{token,language:lang,message,consent:true,turnKey:randomUUID()},(status,data)=>result={status,...data});return result;};
   const info=await turn(lang==='de'?'Brauche ich eine Verordnung für Heilmassage?':'Do I need a referral for therapeutic massage?');
   assert.equal(info.status,200);assert.match(info.message,/optional/u);assert.match(info.message,new RegExp(`/ablauf-wahltherapie\\?lang=${lang}`));assert.equal(info.ready,false);
   await turn(lang==='de'?'Ich möchte einen Termin':'I want an appointment');await turn(lang==='de'?'Hier im Chat bitte':'Here in chat please');await turn('Alex Musterer');await turn('alex@example.test');
   const detour=await turn(lang==='de'?'Brauche ich eine Überweisung für Logopädie?':'Do I need a referral for speech therapy?');
   assert.equal(detour.status,200);assert.match(detour.message,/first appointment|Ersttermin/u);assert.match(detour.message,/do not send|nicht hier im Chat/u);assert.match(detour.message,/phone number|Telefonnummer/u);assert.doesNotMatch(detour.message,/first and last name|Vor- und Nachnamen/u);
   const back=await turn('+12025550100');assert.equal(back.status,200);assert.equal(back.ready,false);assert.doesNotMatch(back.message,/email address|E-Mail-Adresse/u);
  }
  assert.equal(aiCalls,0);assert.equal(saves,0);
 }finally{process.env=old;}
});
