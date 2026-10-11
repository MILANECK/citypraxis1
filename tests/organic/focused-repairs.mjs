// Five adaptive, real-model conversations against the repaired local app.
// Prior campaign charges remain on the ledger; no production conversation is used.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadEnvFile} from 'node:process';
import {randomUUID} from 'node:crypto';
import {EvidenceLog,BudgetLedger,jsonFile,baseline,sha,HarnessStop,modelJson,patientActionSchema} from './support.mjs';
import {createSandbox,EndpointAdapter} from './sandbox.mjs';
import {validPatientAction} from './action-validation.mjs';

const root=resolve(fileURLToPath(new URL('../../',import.meta.url)));
const folder=join(root,'tests','organic');
const campaignPath=join(root,'test-results/organic/campaign-2026-10-10T12-33-18-163Z-514c8564/results.json');
const priorPath=process.argv[2]?resolve(process.argv[2]):campaignPath;
const campaign=jsonFile(campaignPath),prior=jsonFile(priorPath),config=jsonFile(join(folder,'config.example.json'));
if(prior.budget.unknownUsageCalls||prior.budget.reservedUsd)throw new HarnessStop('prior_usage_not_settled');
const priorSeconds=prior.metadata.cumulativeExecutionSeconds;
Object.assign(config,{
  budgetUsd:Math.min(campaign.budget.limits.usd,campaign.budget.conservativeGuardUsd+1),
  maxMinutes:Math.min(campaign.budget.limits.minutes,campaign.metadata.cumulativeExecutionSeconds/60+12),
  maxRequests:Math.min(campaign.budget.limits.requests,campaign.budget.requests+300),
  maxTotalTokens:Math.min(campaign.budget.limits.tokens,campaign.budget.tokenBudgetCharge+2200000),
  knownUsagePriceBound:true,maxPatientTurns:18,reportReserveSeconds:30
});
const runId=`focused-repairs-${new Date().toISOString().replace(/[:.]/gu,'-')}-${randomUUID().slice(0,8)}`;
const directory=join(root,'test-results','organic',runId),log=new EvidenceLog(directory);
const revision=baseline(root);
const originalEnv={...process.env};try{loadEnvFile(join(root,'.env'));}catch{}
const apiKey=process.env.OPENAI_API_KEY,targetModel=process.env.CHAT_CONVERSATION_MODEL||'gpt-6-luna';
process.env=originalEnv;
if(!apiKey||targetModel!=='gpt-6-luna')throw new HarnessStop('expected_target_configuration_missing');
const suffix=runId.slice(-8),email=n=>`patient${n}.01846975.${suffix}@organic.example.test`;
const cases=[
  {id:'FR-01',title:'German form choice and changing from chat to the form',language:'de',name:'Dr. Anna-Lena Musterfrau',email:email(1),phone:'+12025550101',wantsSubmit:false,
    goal:'Start by asking for an appointment in German. When offered the form first and chat second, choose the form with the exact natural phrase "Das erste bitte". Once you have the form link, change your mind and explicitly ask to prepare the request here in chat. Give your full name when asked. Once the bot asks for email/contact details, decide you prefer the form and say "Ich möchte keine Kontaktdaten im Chat nennen. Bitte schicken Sie mir den Link zum normalen Terminformular." Stop once it gives you the normal appointment-form link without asking you for more contact data. Do not provide email or phone, and do not submit.'},
  {id:'FR-02',title:'English bundled intake, full name, first visit and requested therapy',language:'en',name:'Dr. Anna-Lena Birkenhain',email:email(2),phone:'+12025550102',wantsSubmit:true,
    goal:'Ask for an appointment in English. When the bot offers form/chat, choose to continue here and supply your details together in one natural message: "I want to continue here. My full name is Dr. Anna-Lena Birkenhain. It is my first visit. My email is [email], my phone is [phone]. I would like physiotherapy for back discomfort, Thursday after 17:00." Replace brackets with your fixed persona values. When the actual summary appears, check your full title/name (without a trailing sentence dot), first-visit status, email, phone, physiotherapy request and Thursday after 17:00. If correct, submit the request. Do not voluntarily change these facts. If something is missing or wrong, clarify naturally once using available controls; stop if the misunderstanding continues.'},
  {id:'FR-03',title:'German recall of previous email and original availability',language:'de',name:'Alex Musterer',email:email(3),initialEmail:email(3),correctedEmail:`changed.${suffix}@organic.example.test`,phone:'+12025550103',wantsSubmit:true,
    goal:'Prepare a request in German, first visit, back discomfort with requested Physiotherapie. After the actual form/chat offer, choose chat and introduce yourself naturally with "Ich bin Alex Musterer" and your email/phone in that same message. State your new-patient status using "Es ist mein erster Besuch" together with the concern and "Donnerstags nach 17 Uhr" as your availability. Read the actual replies: a combined message is allowed when the bot invites details, but do not answer unseen questions blindly. At review, use the email edit button and enter your correctedEmail. Then use the email edit button again and say exactly "nimm die mail von vorher" to restore your initialEmail. At review use the availability edit button and enter "Freitag vormittags". Then edit availability again and say exactly "doch wieder wie zuerst, donnerstag" to restore the original Thursday after 17 Uhr, not just the word Thursday. Check the actual final summary and submit only if it has the original email, full Thursday preference and new-patient status. Do not rescue failed references by retyping the old email/time: stop and explain what stayed wrong. Complete these changes once, never repeat them after successful restoration.'},
  {id:'FR-04',title:'Switching DE/EN during intake and choosing a separate receipt language',language:'en',name:'Taylor Musterfrau',email:email(4),phone:'+12025550104',wantsSubmit:true,
    goal:'Start requesting an appointment in English and choose to continue here using "I want to continue". Give name and email when asked. Before giving the phone, say exactly "auf Deutsch bitte". Read the German reply. Then say "Bitte die E-Mail-Kopie auf Englisch; der Chat bleibt auf Deutsch." Read the reply. Then switch back with "can we continue in English please". After reading that actual reply, send one combined message: "Please send the receipt in German; we can keep chatting in English. My phone number is [phone]. I’m requesting physiotherapy for shoulder discomfort and prefer Friday afternoon." Replace [phone] with your persona number. Do not split this combined message into separate messages. Check that all your supplied facts remain in the summary, chat is English and the email-copy language is German. Submit only when correct. If asked for the same reason again, clarify once, but do not count that as having understood the combined message. Do not repeat language changes after completing them.'},
  {id:'FR-05',title:'Positive practice strengths, duration and privacy answers in DE/EN',language:'de',name:'Casey Musterer',email:email(5),phone:'+12025550105',wantsSubmit:false,
    goal:'You are only gathering information; do not request an appointment, provide contacts, or submit. Start with "Warum sollte ich meine Therapie gerade bei Citypraxis machen? Was sind Ihre Stärken gegenüber anderen Praxen?" Read the actual answer and ask one short German follow-up about a concrete strength it mentioned (for example CRAFTA or Saturday appointments), without asking for individual medical advice. Then switch with "can we continue in English please". Ask "What makes Citypraxis special and why should I choose you for my treatment?" Read the answer. Ask "How long is the first physiotherapy appointment with the team, and what does it cost? Please tell me here." Read the answer. Ask "What happens to my chat request and emails once a future appointment is arranged? Is deletion automatic?" Read the answer. Stop after receiving those answers, or after one normal clarification if the bot fails to answer. Do not ask for treatment guarantees or invent competitor facts.'}
];
const simulatorPrompt=readFileSync(join(folder,'simulator.txt'),'utf8')+'\nFollow your ordered personal goal only when the actual reply and visible controls make the next step possible. Read all previous actions to avoid repeating completed edits or language switches. A requested verbatim phrase is your own chosen wording, not permission to ignore the reply. Review patient status answers the question of whether you have already been treated here: "Nein – noch nicht" / "No — not yet" means NEW PATIENT/FIRST VISIT, not a failure. "Ja – bereits in Behandlung" means previously treated here. Do not change or reject a correct new-patient value. Never repair the receptionist with implementation instructions. Return only a final action JSON.';
const selectedCases=process.argv[3]?cases.filter(c=>c.id===process.argv[3]):cases;
if(!selectedCases.length)throw new HarnessStop('unknown_focused_case');
const result={runId,metadata:{startedAt:new Date().toISOString(),baseline:revision,targetModel,simulatorModel:config.simulatorModel,settings:{target:'Actual application Responses settings: reasoning none, max output 650, store false',simulator:'Adaptive next-action model; reasoning none, max output 1000, store false'},scope:'Exactly five local real-model conversations; no deployment and no large final campaign',review:'Actual transcripts will be reviewed by the testing agent; no paid judge'},priorAttempt:{runId:prior.runId,path:priorPath,budget:prior.budget},conversations:[],isolation:{verified:false},budget:{}};
log.save('baseline.json',revision);log.save('plans.json',cases);log.save('config.json',config);log.save('prior-attempt.json',result.priorAttempt);
let ledger,sandbox;
const esc=value=>String(value??'').replace(/[&<>"']/gu,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function saveReport(){
  if(ledger){result.budget=ledger.summary();result.incrementalBudget={requests:ledger.requests-campaign.budget.requests,estimatedUsd:ledger.estimatedUsd-campaign.budget.estimatedUsd,conservativeGuardUsd:ledger.guardUsd-campaign.budget.conservativeGuardUsd,unknownUsageCalls:ledger.unknownUsage,maximumAdditionalGuardUsd:config.budgetUsd-campaign.budget.conservativeGuardUsd};}
  log.save('results.json',result);
  const transcript=c=>c.transcript.map(t=>`<article class="${t.role}"><b>${esc(t.id)} · ${esc(t.role==='patient'?'Patient (original wording)':t.role==='assistant'?'Citypraxis':'Patient action')}</b><p>${esc(t.text)}</p>${t.summary?.length?`<table>${t.summary.map(([k,v])=>`<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</table>`:''}</article>`).join('');
  writeFileSync(join(directory,'report.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Five focused Citypraxis checks</title><style>body{font:16px/1.5 system-ui;max-width:1050px;margin:30px auto;padding:0 20px;color:#24303a}article{border:1px solid #ddd;padding:15px;margin:12px 0;border-radius:10px}.patient{background:#eef8fb}.action{background:#fff8e7}p{white-space:pre-wrap}table{border-collapse:collapse;width:100%}th,td{border-bottom:1px solid #ddd;padding:6px;text-align:left}pre{white-space:pre-wrap;font-size:13px}section{margin:35px 0}h1,h2{line-height:1.2}</style><h1>Five focused Citypraxis chatbot checks</h1><p>English report; German and English conversation text is preserved exactly. Actual changed local application, real model, adaptive simulated patients. No production database writes or external emails. This small sample does not establish performance for all phrasings or for production.</p><p>Run: ${esc(runId)} · Source SHA-256: ${esc(revision.sourceHash)}</p><p>Review status: ${esc(result.reviewStatus||'Pending transcript review')} · Additional estimated cost: $${(result.incrementalBudget?.estimatedUsd||0).toFixed(4)} · Additional conservative charge: $${(result.incrementalBudget?.conservativeGuardUsd||0).toFixed(4)} · Additional cap: $1.</p><p>Public content source: ${esc(result.metadata.factsSource?.description||'Pending')}.</p><details><summary>Isolation and cumulative spending evidence</summary><pre>${esc(JSON.stringify({isolation:result.isolation,priorBudget:prior.budget,incrementalBudget:result.incrementalBudget,budget:result.budget},null,2))}</pre></details>${result.conversations.map(c=>`<section><h2>${esc(c.id)}: ${esc(c.title)}</h2><p><b>${esc(c.verdict||'PENDING_REVIEW')}</b> · ${esc(c.review||c.stopReason||'In progress')}</p>${c.findings?.length?`<ul>${c.findings.map(f=>`<li>${esc(f)}</li>`).join('')}</ul>`:''}<p>Scenario objective: ${esc(c.persona.goal)}</p>${transcript(c)}<details><summary>Database and intercepted email evidence</summary><pre>${esc(JSON.stringify({records:c.records,emails:c.emails},null,2))}</pre></details></section>`).join('')}</html>`);
}
const actionText=a=>a.action==='message'?a.message:a.action==='edit'?`[Select edit ${a.field}]`:a.action==='choice'?`[Select ${a.field}: ${a.value}]`:a.action==='submit'?'[Review confirmation checked; select Send request]':`[Stop: ${a.stopReason}]`;
try{
  let content;
  const publicUrl='https://citypraxis-wien.onrender.com/api/content';
  try{
    const response=await fetch(publicUrl,{signal:AbortSignal.timeout(10000)});if(!response.ok)throw new Error(`http_${response.status}`);content=await response.json();
    if(!Array.isArray(content.settings)||!Array.isArray(content.pages))throw new Error('public_content_contract');
    result.metadata.factsSource={description:'Current read-only public /api/content response',url:publicUrl,fetchedAt:new Date().toISOString(),sha256:sha(JSON.stringify(content))};
  }catch(error){
    content=jsonFile(join(root,'test-results/organic/reviewed-2026-10-10/public-content.snapshot.json'));
    result.metadata.factsSource={description:'Preserved public content snapshot from 2026-10-10; current public fetch unavailable',error:error.name,url:publicUrl,sha256:sha(JSON.stringify(content))};
  }
  ledger=new BudgetLedger(config,log);
  Object.assign(ledger,{guardUsd:prior.budget.conservativeGuardUsd,estimatedUsd:prior.budget.estimatedUsd,usedTokens:prior.budget.tokenBudgetCharge,requests:prior.budget.requests,priorReportedTokens:prior.budget.reportedTokens,priorUnknownUsageCalls:prior.budget.unknownUsageCalls,priorElapsedMs:priorSeconds*1000});
  sandbox=await createSandbox({apiKey,targetModel,ledger,log,publishedContent:content,campaign:true});
  result.isolation=await sandbox.preflight();log.save('public-content.snapshot.json',content);log.save('facts.snapshot.json',sandbox.facts);
  console.log(JSON.stringify({event:'preflight',runId,directory,isolation:result.isolation,additionalCap:config.budgetUsd-prior.budget.conservativeGuardUsd,sourceHash:revision.sourceHash}));
  for(const [index,persona] of selectedCases.entries()){
    const adapter=new EndpointAdapter(sandbox,log,persona.id,persona.language);
    adapter.testHeaders={'X-Forwarded-For':`10.91.0.${index+1}`,'X-Organic-Conversation-Id':persona.id};
    const recordStart=sandbox.records().length,emailStart=sandbox.notifications.length;
    const conversation={id:persona.id,title:persona.title,persona,transcript:[],stopReason:null,verdict:'PENDING_REVIEW'};
    result.conversations.push(conversation);
    const append=(role,text,view={})=>{const turn={id:`${persona.id}-T${conversation.transcript.length+1}`,role,text,summary:view.summary||[],language:view.language||null,endpointEventId:adapter.calls.at(-1)?.eventId};conversation.transcript.push(turn);return turn;};
    try{
      await adapter.begin();let visible=adapter.visible();append('assistant',visible.message||'[Session ready; composer visible]',visible);
      for(let n=0;n<config.maxPatientTurns;n++){
        visible=adapter.visible();
        // Match the newly implemented, actual review controls (old harness predates this field).
        const choices=visible.availableActions.find(a=>a.action==='choice');if(choices)choices.fields.receipt_language=['de','en'];
        // Only the initial request is seeded. Every later action reads the real reply.
        const scenarioHint=persona.id==='FR-01'&&!conversation.transcript.some(t=>t.role==='patient'&&t.text.includes(persona.name))&&/Für Ihre Terminanfrage benötige|Vor- und Nachnamen/u.test(visible.message||'')&&!/Was ist Ihnen lieber/u.test(visible.message||'')?'Your goal requires the NAME step before you refuse contacts and switch back to the form. The actual reply now asks for your name; provide your full persona name first. Wait for the actual email question before requesting the form.':null;
        const decision=n===0?{decision:{action:'message',message:persona.id==='FR-05'?'Warum sollte ich meine Therapie gerade bei Citypraxis machen? Was sind Ihre Stärken gegenüber anderen Praxen?':persona.language==='de'?'Ich möchte einen Termin vereinbaren.':'I would like to request an appointment.',field:'',value:'',stopReason:''}}:await modelJson(sandbox.nativeFetch,ledger,log,{model:config.simulatorModel,prompt:simulatorPrompt,input:{persona,scenarioHint,conversation:conversation.transcript.map(({id,role,text,summary,language})=>({id,role,text,summary,language})),visible},schema:patientActionSchema(visible),role:'simulator',apiKey,maxOutput:1000});
        const action=decision.decision;
        if(!validPatientAction(action,visible,persona,[sandbox.facts.email]))throw new HarnessStop('invalid_patient_action');
        append(action.action==='message'?'patient':'action',actionText(action));
        if(action.action==='stop'){conversation.stopReason=action.stopReason;break;}
        const response=await adapter.act(action);visible=adapter.visible();append('assistant',visible.message||visible.status||JSON.stringify(response),visible);
        if(response.httpStatus>=400){conversation.stopReason=`Endpoint HTTP ${response.httpStatus}: ${response.code||'unknown error'}`;break;}
        if(response.received){conversation.stopReason='Request received by isolated local endpoint';break;}
        if(n===config.maxPatientTurns-1)conversation.stopReason='Patient action limit reached';
      }
    }catch(error){conversation.stopReason=error.code||error.message;conversation.harnessError=true;}
    conversation.records=sandbox.records().slice(recordStart);conversation.emails=sandbox.notifications.slice(emailStart);conversation.endpointCalls=adapter.calls;
    log.save(`${persona.id.toLowerCase()}.json`,conversation);saveReport();
    console.log(JSON.stringify({event:'case_complete',id:persona.id,turns:conversation.transcript.length,stopReason:conversation.stopReason,records:conversation.records.length,emails:conversation.emails.length,additionalCost:result.incrementalBudget.estimatedUsd}));
    if(ledger.unknownUsage||/spend_limit|time_limit|request_limit|token_limit/u.test(conversation.stopReason||''))break;
  }
  result.metadata.executionSeconds=(Date.now()-ledger.started)/1000;
  result.metadata.cumulativeExecutionSeconds=priorSeconds+result.metadata.executionSeconds;
  result.metadata.sourceUnchanged=baseline(root).sourceHash===revision.sourceHash;
  if(!result.metadata.sourceUnchanged)throw new HarnessStop('application_source_changed_during_run');
  result.reviewStatus='Pending transcript review';
}catch(error){result.runStop=error.code||error.message;console.error(JSON.stringify({event:'run_stop',code:result.runStop}));}
finally{
  result.metadata.finishedAt=new Date().toISOString();saveReport();
  if(sandbox)await sandbox.close();
  console.log(JSON.stringify({event:'finished',directory,conversations:result.conversations.length,incrementalBudget:result.incrementalBudget}));
}
