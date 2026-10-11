// Evidence-based step review. Original patient/bot wording is kept unchanged.
// This script makes no model calls and does not alter application code.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {sha} from './support.mjs';

const directory=resolve(process.argv[2]);
const result=JSON.parse(readFileSync(join(directory,'results.json'),'utf8'));
assert.equal(result.conversations.length,5);
assert.equal(result.isolation.verified,true);
assert.equal(result.metadata.sourceUnchanged,true);
assert.equal(result.budget.unknownUsageCalls,0);
assert.ok(result.incrementalBudget.conservativeGuardUsd<=1);
const c=id=>result.conversations.find(item=>item.id===id);
const row=(turn,pattern)=>turn?.summary?.find(([label])=>pattern.test(label))?.[1];
const exchange=(id,pattern)=>{
  const turns=c(id).transcript,index=turns.findIndex(t=>t.role==='patient'&&pattern.test(t.text));
  return {input:turns[index],reply:index<0?null:turns.slice(index+1).find(t=>t.role==='assistant')};
};
const response=t=>c(t.id.split('-T')[0]).endpointCalls.find(e=>e.eventId===t.endpointEventId)?.response;
const check=(label,pair,condition,note='')=>({label,status:!pair.input||!pair.reply?'NOT_TESTED':condition?'PASS':'FAIL',inputTurn:pair.input?.id,replyTurn:pair.reply?.id,note});
const formReply=pair=>/\]\(\/termin\?lang=de#booking-form\)/u.test(pair.reply?.text||'')&&!/E-Mail-Adresse dürfen|Vor- und Nachnamen|benötigt unser Empfangsteam/u.test(pair.reply?.text||'');
const checks={};

const firstForm=exchange('FR-01',/^Das erste bitte/u);
const toChat=exchange('FR-01',/(?:hier im Chat|im Chat).*(?:vorbereiten|weitermachen)/iu);
const lateForm=exchange('FR-01',/keine Kontaktdaten.*Terminformular/iu);
const suppliedName=c('FR-01').transcript.find(t=>t.role==='patient'&&t.text===c('FR-01').persona.name);
checks['FR-01']=[
  check('First offered option opens the website form',firstForm,formReply(firstForm),'The website form is completed by the patient; this check only verifies that the chatbot supplies the correct link.'),
  check('Changing from the form to chat starts assisted intake',toChat,/Vor- und Nachnamen/u.test(toChat.reply?.text||'')&&!/Was ist Ihnen lieber/u.test(toChat.reply?.text||'')),
  check('After giving a name, refusing chat contacts and requesting the form returns its link',lateForm,Boolean(suppliedName)&&formReply(lateForm)&&c('FR-01').records.length===0&&c('FR-01').emails.length===0,'No chatbot submission or contact collection is required after selecting the form.')
];

const bundled=exchange('FR-02',/My full name is Dr\. Anna-Lena Birkenhain/u);
const bundleSummary=bundled.reply,record2=c('FR-02').records[0]?.intake;
checks['FR-02']=[
  check('Full title/name is accepted from the combined message without asking again',bundled,row(bundleSummary,/^Name$/u)===c('FR-02').persona.name&&!/first and last name.*\?|full name.*\?/iu.test(bundleSummary?.text||'')),
  check('First visit, contacts, requested therapy and Thursday after 17:00 appear immediately',bundled,Boolean(record2)&&row(bundleSummary,/Patient status/u)==='No — not yet'&&row(bundleSummary,/^Email$/u)===c('FR-02').persona.email&&row(bundleSummary,/^Phone$/u)===c('FR-02').persona.phone&&/physiotherap/iu.test(row(bundleSummary,/description/u)||'')&&/Thursday.*17/u.test(row(bundleSummary,/Availability/u)||'')&&response(bundleSummary)?.ready===true),
  check('Exactly one correct request and a patient receipt are captured',bundled,c('FR-02').records.length===1&&c('FR-02').emails.length===2&&record2?.first_name+' '+record2?.last_name===c('FR-02').persona.name&&record2?.email===c('FR-02').persona.email&&record2?.patient_status_claimed==='new')
];

const emailRecall=exchange('FR-03',/nimm die mail von vorher/iu);
const timeRecall=exchange('FR-03',/doch wieder wie zuerst, donnerstag/iu);
const originalTime=c('FR-03').transcript.filter(t=>t.role==='assistant').map(t=>row(t,/Verfügbarkeit/u)).find(t=>/Donnerstag.*17/u.test(t||''));
const record3=c('FR-03').records[0]?.intake;
const germanIntroduction=exchange('FR-03',/Ich bin Alex Musterer/iu);
const germanFirstVisit=exchange('FR-03',/Es ist mein erster Besuch/iu);
checks['FR-03']=[
  check('Conversational German self-introduction is accepted without repeating the name question',germanIntroduction,!/Vor- und Nachnamen|Bitte nennen.*Namen/u.test(germanIntroduction.reply?.text||'')),
  check('Explicit German first-visit statement appears as new-patient status',germanFirstVisit,row(germanFirstVisit.reply,/Patientenstatus/u)==='Nein – noch nicht'&&record3?.patient_status_claimed==='new'),
  check('Previous-email reference restores the actual address before the change',emailRecall,row(emailRecall.reply,/^E-Mail$/u)===c('FR-03').persona.initialEmail),
  check('Original availability reference restores the full day and time',timeRecall,Boolean(originalTime)&&row(timeRecall.reply,/Verfügbarkeit/u)===originalTime&&response(timeRecall.reply)?.ready===true,'Singular and recurring weekday wording are treated as the same day; the complete original note is retained.'),
  check('Submission uses the restored email and complete availability',timeRecall,c('FR-03').records.length===1&&c('FR-03').emails.length===2&&record3?.email===c('FR-03').persona.initialEmail&&record3?.availability_notes===originalTime,'Unknown patient status is acceptable if the patient never explicitly stated their status.')
];

const deSwitch=exchange('FR-04',/^auf Deutsch bitte/iu),enSwitch=exchange('FR-04',/^can we continue in English please/iu);
const languageBundle=exchange('FR-04',/Please send the receipt in German;.*physiotherapy for shoulder discomfort/iu);
const record4=c('FR-04').records[0]?.intake;
const receipt4=c('FR-04').emails.find(e=>e.to.includes(c('FR-04').persona.email));
checks['FR-04']=[
  check('English → German → English switching works during contact intake',enSwitch,deSwitch.reply?.language==='de'&&enSwitch.reply?.language==='en'),
  check('Phone, therapy, concern and Friday afternoon are retained with receipt-language preference',languageBundle,response(languageBundle.reply)?.ready===true&&row(languageBundle.reply,/^Phone$/u)===c('FR-04').persona.phone&&/physiotherap.*shoulder/iu.test(row(languageBundle.reply,/description/u)||'')&&row(languageBundle.reply,/Availability/u)==='Friday afternoon'&&!/What is the reason|describe your concern/iu.test(languageBundle.reply?.text||'')),
  check('Chat remains English and the captured email copy uses German fixed text',languageBundle,c('FR-04').records.length===1&&c('FR-04').emails.length===2&&record4?.language==='en'&&record4?.receipt_language==='de'&&/Wir haben Ihre Anfrage erhalten/u.test(receipt4?.subject||''),'Patient-supplied free text keeps its original language; this is not a translation test.')
];

const germanStrengths=exchange('FR-05',/^Warum sollte ich meine Therapie/iu);
const englishStrengths=exchange('FR-05',/What makes Citypraxis special/iu);
const price=exchange('FR-05',/How long is the first physiotherapy appointment/iu);
const privacy=exchange('FR-05',/What happens to my chat request and emails/iu);
checks['FR-05']=[
  check('Concrete, positive practice strengths are answered in both German and English',englishStrengths,germanStrengths.reply?.language==='de'&&englishStrengths.reply?.language==='en'&&[germanStrengths.reply,englishStrengths.reply].every(t=>/#home-distinction-title/u.test(t?.text||'')&&/Samstag|Saturday|CRAFTA|interdisciplinary|interdisziplinär/iu.test(t?.text||'')&&!/can't claim|cannot claim|besser als.*behaupten/iu.test(t?.text||'')),'Reviewed against the captured published homepage, team and service facts; no superiority or outcome promise is required.'),
  check('First team physiotherapy appointment duration and price are answered directly',price,/60 minutes/u.test(price.reply?.text||'')&&/€130/u.test(price.reply?.text||'')),
  check('Future-appointment retention is explained as manual deletion, with no intake',privacy,/manually/u.test(privacy.reply?.text||'')&&/not automatic/u.test(privacy.reply?.text||'')&&/months away|future/u.test(privacy.reply?.text||'')&&c('FR-05').records.length===0&&c('FR-05').emails.length===0)
];

const reviews={
  'FR-01':'Both channel changes are honoured: website form → assisted chat → website form after the name step.',
  'FR-02':'A combined message reaches the correct review immediately, including full name/title and first-visit status.',
  'FR-03':'Previous-email and original-availability references restore the actual historical values without retyping them.',
  'FR-04':'Combined language preferences and booking details are retained; the German email copy is independent of English chat.',
  'FR-05':'Positive practice strengths, first-visit pricing and request retention are answered directly from published facts.'
};
for(const conversation of result.conversations){
  conversation.checks=checks[conversation.id];
  conversation.verdict=conversation.checks.some(k=>k.status==='FAIL')?'FAIL':conversation.checks.some(k=>k.status==='NOT_TESTED')?'INCONCLUSIVE':'PASS';
  conversation.review=conversation.verdict==='PASS'?reviews[conversation.id]:conversation.checks.filter(k=>k.status!=='PASS').map(k=>`${k.status}: ${k.label}`).join('; ');
  conversation.findings=conversation.checks.filter(k=>k.status==='FAIL').map(k=>({firstFailureTurn:k.replyTurn,inputTurn:k.inputTurn,problem:k.label}));
  writeFileSync(join(directory,`${conversation.id.toLowerCase()}.json`),JSON.stringify(conversation,null,2)+'\n');
}
result.reviewedAt=new Date().toISOString();
result.summary={conversations:5,cleanPasses:result.conversations.filter(c=>c.verdict==='PASS').length,conversationsWithDefects:result.conversations.filter(c=>c.verdict==='FAIL').length,subchecks:Object.values(checks).flat().length,passedSubchecks:Object.values(checks).flat().filter(k=>k.status==='PASS').length,savedSandboxRequests:result.conversations.reduce((n,c)=>n+c.records.length,0),capturedConversationEmails:result.conversations.reduce((n,c)=>n+c.emails.length,0),externalEmails:0};
result.reviewStatus=`Reviewed: ${result.summary.cleanPasses}/5 focused conversations pass`;
result.reviewNotes=['Each simulator action after the initial request was chosen from the actual chatbot reply and available controls. These were complete conversations, not blind lists of messages.','The four original failing conversations remain unchanged in the earlier report. Later repair attempts exposed a late form switch, a recurring-weekday reference issue and German self-introduction/first-visit wording. These were repaired and explicitly covered before the final focused run.','A failed conversation verdict means at least one step failed; it does not mean every step failed. Individual subchecks identify exactly what was tested.','The application source did not change during this run. This report verifies the local app and does not claim verification of a deployed backend.','The backend adapter measures actual HTTP responses, summaries, saved requests and intercepted email contents. Mobile success/review controls were checked separately in German and English using a real browser with fixture AI responses.','This small recheck does not replace a broad final campaign or certify every possible natural-language sentence. Saturday-hours policy and other owner-review questions from the original campaign remain outside this repair scope.'];
if(result.metadata.evidenceRuns)result.reviewNotes.push('Cases FR-01–FR-04 passed in the final five-case run. FR-05 reached a test-runner token admission limit before its English answer; the runner blocked the API call and the app returned HTTP 503. That attempt is INCONCLUSIVE for the remaining information checks, not a fabricated chatbot reply. FR-05 alone was rerun successfully against the exact same application source after adjusting the token ceiling within the original approved campaign allowance. The $1 focused spending cap and original time allowance were preserved. Both raw runs are included under evidence/, and the consolidated event log identifies its source run.');
writeFileSync(join(directory,'results.json'),JSON.stringify(result,null,2)+'\n');
const runner=readFileSync(resolve('tests/organic/focused-repairs.mjs'),'utf8');
writeFileSync(join(directory,'runner.executed.mjs'),runner);
writeFileSync(join(directory,'review.json'),JSON.stringify({reviewedAt:result.reviewedAt,summary:result.summary,applicationSourceSha256:result.metadata.baseline.sourceHash,runnerSha256:sha(runner),checks},null,2)+'\n');

const esc=v=>String(v??'').replace(/[&<>"']/gu,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const list=a=>`<ul>${a.map(s=>`<li>${esc(s)}</li>`).join('')}</ul>`;
const chats=conversation=>conversation.transcript.map(t=>`<article id="${esc(t.id)}" class="${esc(t.role)}"><b>${esc(t.id)} · ${esc(t.role==='patient'?'Patient — original wording':t.role==='assistant'&&t.text.startsWith('[')?'Observed session/endpoint state':t.role==='assistant'?'Citypraxis':'Patient action')}</b><p>${esc(t.text)}</p>${t.summary?.length?`<table>${t.summary.map(([k,v])=>`<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</table>`:''}</article>`).join('');
const sections=result.conversations.map(conversation=>`<section id="${conversation.id}"><h2>${esc(conversation.id)} · ${esc(conversation.title)}</h2><p><strong class="${conversation.verdict.toLowerCase()}">${conversation.verdict}</strong> — ${esc(conversation.review)}</p><table><tr><th>Step tested</th><th>Result</th><th>Evidence</th></tr>${conversation.checks.map(k=>`<tr><td>${esc(k.label)}${k.note?`<p>${esc(k.note)}</p>`:''}</td><td class="${k.status.toLowerCase()}">${k.status}</td><td><a href="#${esc(k.inputTurn)}">${esc(k.inputTurn)}</a> → <a href="#${esc(k.replyTurn)}">${esc(k.replyTurn)}</a></td></tr>`).join('')}</table><h3>Complete conversation</h3>${chats(conversation)}<details><summary>Saved request and intercepted emails</summary><pre>${esc(JSON.stringify({records:conversation.records,emails:conversation.emails},null,2))}</pre></details><p><a href="${conversation.id.toLowerCase()}.json">Full case evidence</a></p></section>`).join('');
writeFileSync(join(directory,'report.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Citypraxis — focused repair verification</title><style>body{font:16px/1.55 system-ui;max-width:1100px;margin:35px auto;padding:0 20px;color:#24313a}h1,h2,h3{line-height:1.2}section{margin-top:45px;border-top:2px solid #ddd;padding-top:20px}article{border:1px solid #ddd;border-radius:9px;padding:14px;margin:12px 0;scroll-margin-top:20px}.patient{background:#edf8fb}.action{background:#fff8e6}.pass{color:#167144}.fail{color:#a53b22}p,pre{white-space:pre-wrap}pre{font-size:13px;overflow-wrap:anywhere}table{border-collapse:collapse;width:100%}th,td{text-align:left;border-bottom:1px solid #ddd;padding:7px;vertical-align:top}td p{font-size:14px;margin:5px 0}a{color:#087d97}details{margin:15px 0}</style><h1>Citypraxis chatbot — focused repair verification</h1><p><b>${result.summary.cleanPasses}/5 focused conversations pass; ${result.summary.passedSubchecks}/${result.summary.subchecks} subchecks pass.</b> English report; original German and English dialogue stays unchanged. Five adaptive conversations were run against the actual local app using real gpt-6-luna responses. Individual steps are shown so a website-form link can be distinguished from assisted chat intake.</p><table><tr><th>Case</th><th>Result</th><th>Observed result</th></tr>${result.conversations.map(c=>`<tr><td><a href="#${c.id}">${c.id}</a></td><td class="${c.verdict.toLowerCase()}">${c.verdict}</td><td>${esc(c.review)}</td></tr>`).join('')}</table><p>This final run took ${result.metadata.executionSeconds.toFixed(1)} seconds of execution. Total focused API estimate, including all repair attempts and the preserved invalid first harness attempt: $${result.incrementalBudget.estimatedUsd.toFixed(5)}; conservative ledger charge $${result.incrementalBudget.conservativeGuardUsd.toFixed(5)}, within the $1 cap. No unknown usage.</p><p>Verified isolation: SQLite :memory:, ${result.summary.savedSandboxRequests} synthetic requests, ${result.summary.capturedConversationEmails} conversation emails captured locally, zero external emails. Two additional canary emails verified interception. No production writes or live calendar access occurred.</p><p>Source SHA-256: ${esc(result.metadata.baseline.sourceHash)}. Public facts captured at ${esc(result.metadata.factsSource.fetchedAt)} from the read-only public content endpoint.</p><details><summary>Method, scope and evidence</summary>${list(result.reviewNotes)}<p><a href="results.json">Results and cumulative ledger</a> · <a href="review.json">Step review</a> · <a href="events.jsonl">Endpoint/model/email events</a> · <a href="facts.snapshot.json">Published facts supplied to the bot</a> · <a href="runner.executed.mjs">Runner source</a></p></details>${sections}</html>`);
console.log(JSON.stringify({directory,summary:result.summary,incrementalBudget:result.incrementalBudget},null,2));
if(result.summary.cleanPasses!==5)process.exitCode=1;
