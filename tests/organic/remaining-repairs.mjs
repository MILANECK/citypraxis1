// Adaptive conversations that recheck the remaining confirmed failure families.
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
const authorization=jsonFile(join(root,'test-results/remaining-repairs-2026-10-11/authorization.json'));
const priorPath=process.argv[2]?resolve(process.argv[2]):resolve(root,authorization.source);
const campaign=jsonFile(campaignPath),prior=jsonFile(priorPath),config=jsonFile(join(folder,'config.example.json'));
if(prior.budget.unknownUsageCalls||prior.budget.reservedUsd)throw new HarnessStop('prior_usage_not_settled');
const priorSeconds=prior.metadata.cumulativeExecutionSeconds;
Object.assign(config,{
  budgetUsd:authorization.anchor.conservativeGuardUsd+authorization.additionalLimitUsd,
  maxMinutes:Infinity,
  maxRequests:authorization.anchor.requests+3000,
  maxTotalTokens:authorization.anchor.tokenBudgetCharge+40000000,
  knownUsagePriceBound:true,maxPatientTurns:24,reportReserveSeconds:30
});
const runId=`remaining-repairs-${new Date().toISOString().replace(/[:.]/gu,'-')}-${randomUUID().slice(0,8)}`;
const directory=join(root,'test-results','organic',runId),log=new EvidenceLog(directory);
const revision=baseline(root);
const originalEnv={...process.env};try{loadEnvFile(join(root,'.env'));}catch{}
const apiKey=process.env.OPENAI_API_KEY,targetModel=process.env.CHAT_CONVERSATION_MODEL||'gpt-6-luna';
process.env=originalEnv;
if(!apiKey||targetModel!=='gpt-6-luna')throw new HarnessStop('expected_target_configuration_missing');
const suffix=runId.slice(-8),email=n=>`patient${n}.01846975.${suffix}@organic.example.test`;
const cases=jsonFile(join(folder,'remaining-cases.json')).map((c,i)=>({...c,name:c.language==='de'?'Alex Musterer':'Taylor Birkenhain',email:email(i+1),phone:'+1202555'+String(100+i).padStart(4,'0')}));
const simulatorPrompt=readFileSync(join(folder,'simulator.txt'),'utf8')+'\nFollow your ordered personal goal only when the actual reply and visible controls make the next step possible. Read all previous actions to avoid repeating completed edits or language switches. Run each scenario probe ONCE. If the bot stores your instruction literally or omits an explicitly requested edit/identity, stop with the observed problem rather than trying extra edit buttons or manually rescuing the bot. A precise clarification about an ambiguous clock is allowed: answer with after/nach 17:00. Never repeat a completed scenario edit. When visible.availableActions includes submit and the summary is correct, you may use it immediately: the review checkbox/Send button are the request for your confirmation, and the bot does not need to ask an additional verbal submission question. A requested verbatim phrase is your own chosen wording, not permission to ignore the reply. Review patient status answers the question of whether you have already been treated here: "Nein – noch nicht" / "No — not yet" means NEW PATIENT/FIRST VISIT, not a failure. "Ja – bereits in Behandlung" means previously treated here. Do not change or reject a correct new-patient value. Never repair the receptionist with implementation instructions. For a proxy request, the Patient name row identifies the patient; Request sent by identifies you as sender. Read both rows. A visible duplicate control means the real app found a recent request: for these independent personas choose new, never update another case’s record. Return only a final action JSON.';
const selectedIds=process.argv[3]?.split(',');
const selectedCases=selectedIds?cases.filter(c=>selectedIds.includes(c.id)):cases;
if(!selectedCases.length)throw new HarnessStop('unknown_focused_case');
const result={runId,authorization,metadata:{startedAt:new Date().toISOString(),baseline:revision,targetModel,simulatorModel:config.simulatorModel,settings:{target:'Actual application Responses settings: reasoning none, max output 650, store false',simulator:'Adaptive next-action model; reasoning none, max output 1600, store false'},scope:`${selectedCases.length} adaptive conversations from remaining failure families, in DE/EN; no production writes`,review:'Actual transcripts will be reviewed by the testing agent; no paid judge'},priorAttempt:{runId:prior.runId,path:priorPath,budget:prior.budget},conversations:[],isolation:{verified:false},budget:{}};
log.save('baseline.json',revision);log.save('plans.json',cases);log.save('config.json',config);log.save('prior-attempt.json',result.priorAttempt);
let ledger,sandbox;
const esc=value=>String(value??'').replace(/[&<>"']/gu,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function saveReport(){
  if(ledger){result.budget=ledger.summary();result.incrementalBudget={requests:ledger.requests-authorization.anchor.requests,estimatedUsd:ledger.estimatedUsd-authorization.anchor.estimatedUsd,conservativeGuardUsd:ledger.guardUsd-authorization.anchor.conservativeGuardUsd,unknownUsageCalls:ledger.unknownUsage,maximumAdditionalGuardUsd:authorization.additionalLimitUsd};}
  log.save('results.json',result);
  const transcript=c=>c.transcript.map(t=>`<article class="${t.role}"><b>${esc(t.id)} · ${esc(t.role==='patient'?'Patient (original wording)':t.role==='assistant'?'Citypraxis':'Patient action')}</b><p>${esc(t.text)}</p>${t.summary?.length?`<table>${t.summary.map(([k,v])=>`<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</table>`:''}</article>`).join('');
  writeFileSync(join(directory,'report.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Remaining Citypraxis checks</title><style>body{font:16px/1.5 system-ui;max-width:1050px;margin:30px auto;padding:0 20px;color:#24303a}article{border:1px solid #ddd;padding:15px;margin:12px 0;border-radius:10px}.patient{background:#eef8fb}.action{background:#fff8e7}p{white-space:pre-wrap}table{border-collapse:collapse;width:100%}th,td{border-bottom:1px solid #ddd;padding:6px;text-align:left}pre{white-space:pre-wrap;font-size:13px}section{margin:35px 0}h1,h2{line-height:1.2}</style><h1>Remaining Citypraxis chatbot checks</h1><p>English report; German and English conversation text is preserved exactly. Actual changed local application, real model, adaptive simulated patients. No production database writes or external emails. This small sample does not establish performance for all phrasings or for production.</p><p>Run: ${esc(runId)} · Source SHA-256: ${esc(revision.sourceHash)}</p><p>Review status: ${esc(result.reviewStatus||'Pending transcript review')} · Additional estimated cost: $${(result.incrementalBudget?.estimatedUsd||0).toFixed(4)} · Additional conservative charge: $${(result.incrementalBudget?.conservativeGuardUsd||0).toFixed(4)} · Additional authorization cap: $6 across all runs in this series.</p><p>Public content source: ${esc(result.metadata.factsSource?.description||'Pending')}.</p><details><summary>Isolation and cumulative spending evidence</summary><pre>${esc(JSON.stringify({isolation:result.isolation,authorization,priorBudget:prior.budget,incrementalBudget:result.incrementalBudget,budget:result.budget},null,2))}</pre></details>${result.conversations.map(c=>`<section><h2>${esc(c.id)}: ${esc(c.title)}</h2><p><b>${esc(c.verdict||'PENDING_REVIEW')}</b> · ${esc(c.review||c.stopReason||'In progress')}</p>${c.findings?.length?`<ul>${c.findings.map(f=>`<li>${esc(f)}</li>`).join('')}</ul>`:''}<p>Scenario objective: ${esc(c.persona.goal)}</p>${transcript(c)}<details><summary>Database and intercepted email evidence</summary><pre>${esc(JSON.stringify({records:c.records,emails:c.emails},null,2))}</pre></details></section>`).join('')}</html>`);
}
const actionText=a=>a.action==='message'?a.message:a.action==='edit'?`[Select edit ${a.field}]`:a.action==='choice'?`[Select ${a.field}: ${a.value}]`:a.action==='duplicate'?`[Select recent-request option: ${a.value}]`:a.action==='submit'?'[Review confirmation checked; select Send request]':`[Stop: ${a.stopReason}]`;
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
        const scenarioHint=persona.id==='UNUSED-OLD-CASE'&&!conversation.transcript.some(t=>t.role==='patient'&&t.text.includes(persona.name))&&/Für Ihre Terminanfrage benötige|Vor- und Nachnamen/u.test(visible.message||'')&&!/Was ist Ihnen lieber/u.test(visible.message||'')?'Your goal requires the NAME step before you refuse contacts and switch back to the form. The actual reply now asks for your name; provide your full persona name first. Wait for the actual email question before requesting the form.':null;
        const decision=n===0&&!['information-only-process','published-fact-scope','privacy-and-strengths','team-benefit-follow-up','ambiguous-cancellation','existing-appointment-handoff'].includes(persona.family)?{decision:{action:'message',message:persona.language==='de'?'Ich möchte einen Termin vereinbaren.':'I would like to request an appointment.',field:'',value:'',stopReason:''}}:await modelJson(sandbox.nativeFetch,ledger,log,{model:config.simulatorModel,prompt:simulatorPrompt,input:{persona,scenarioHint,conversation:conversation.transcript.map(({id,role,text,summary,language})=>({id,role,text,summary,language})),visible},schema:patientActionSchema(visible),role:'simulator',apiKey,maxOutput:1600});
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
  result.authorization=authorization;result.reviewStatus='Pending transcript review';
}catch(error){result.runStop=error.code||error.message;console.error(JSON.stringify({event:'run_stop',code:result.runStop}));}
finally{
  result.metadata.finishedAt=new Date().toISOString();saveReport();
  if(sandbox)await sandbox.close();
  console.log(JSON.stringify({event:'finished',directory,conversations:result.conversations.length,incrementalBudget:result.incrementalBudget}));
}
