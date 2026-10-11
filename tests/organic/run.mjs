import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadEnvFile} from 'node:process';
import {randomUUID} from 'node:crypto';
import {EvidenceLog,BudgetLedger,jsonFile,baseline,sha,HarnessStop,modelJson,simulatorSchema,judgeSchema,validJudgeEvidence} from './support.mjs';
import {createSandbox,EndpointAdapter,safeEmail} from './sandbox.mjs';
import {BrowserAdapter} from './browser.mjs';
import {writeReport} from './report.mjs';

const root=resolve(fileURLToPath(new URL('../../',import.meta.url))),folder=join(root,'tests','organic');
const args=process.argv.slice(2),value=name=>{const index=args.indexOf(name);return index<0?null:args[index+1];};
const mode=value('--mode')||'smoke',config=jsonFile(value('--config')||join(folder,'config.example.json'));
if(!['smoke','validate'].includes(mode))throw new Error('Only smoke and validate are enabled. A broader campaign requires owner calibration and explicit approval after the five conversations.');
if(value('--budget-usd'))config.budgetUsd=Number(value('--budget-usd'));
if(!Number.isFinite(config.budgetUsd)||config.budgetUsd<=0||config.parallel!==1)throw new Error('Smoke requires a finite positive budget and one conversation at a time.');
const runId=`${new Date().toISOString().replace(/[:.]/gu,'-')}-${randomUUID().slice(0,8)}`;
const directory=join(root,'test-results','organic',runId),log=new EvidenceLog(directory),ledger=new BudgetLedger(config,log);
const priorResult=value('--prior-result')?jsonFile(value('--prior-result')):null;
if(priorResult){ledger.guardUsd=priorResult.budget.conservativeGuardUsd;ledger.estimatedUsd=priorResult.budget.estimatedUsd;ledger.usedTokens=priorResult.budget.tokenBudgetCharge??priorResult.budget.reportedTokens;ledger.requests=priorResult.budget.requests;ledger.priorReportedTokens=priorResult.budget.reportedTokens;ledger.priorUnknownUsageCalls=priorResult.budget.unknownUsageCalls;ledger.priorElapsedMs=(priorResult.metadata.cumulativeExecutionSeconds??priorResult.metadata.executionSeconds??0)*1000;}
const revision=baseline(root),policy=jsonFile(join(folder,'clinic-policy.v1.json')),scenarios=jsonFile(join(folder,'scenarios.v1.json')),plan=jsonFile(join(folder,'smoke.v1.json'));
const simulatorPrompt=readFileSync(join(folder,'simulator.txt'),'utf8'),judgePrompt=readFileSync(join(folder,'judge.txt'),'utf8');
const originalEnv={...process.env};try{loadEnvFile(join(root,'.env'));}catch{}
const apiKey=process.env.OPENAI_API_KEY,targetModel=process.env.CHAT_CONVERSATION_MODEL||'gpt-6-luna';
process.env=originalEnv;
const result={runId,metadata:{startedAt:new Date().toISOString(),baseline:revision,targetModel,simulatorModel:config.simulatorModel,judgeModel:config.judgeModel,settings:{target:'Application settings unchanged; reasoning none, max_output_tokens 650, store:false; no seed supported/configured.',simulator:'reasoning none, max_output_tokens 800, store:false',judge:'reasoning none, max_output_tokens 2800, store:false'},policyVersion:policy.version,scenarioVersion:scenarios.version,specificationHash:sha(readFileSync(join(folder,'specification.v1.md'))),testClock:new Date().toISOString(),timezone:'Europe/Vienna',buildTime:'Not counted as test execution; runner preparation happened before startedAt.'},conversations:[],coverage:scenarios.cases.map(item=>({id:item.id,status:item.id==='CP-060'?'BLOCKED':'NOT_RUN',reason:item.id==='CP-060'?'No clinician-approved fixture':'Not part of the approved five-conversation smoke run'})),isolation:{verified:false},budget:{},calibration:null};
log.save('config.json',config);log.save('policy.json',policy);log.save('baseline.json',revision);log.save('scenarios.json',scenarios);
if(priorResult){result.priorAttempt={runId:priorResult.runId,path:value('--prior-result'),runStop:priorResult.runStop,budget:priorResult.budget,note:'The prior harness configuration failure is retained. Its conservative cost/token/request charges are carried into the same cumulative smoke cap. Missing usage is still unknown.'};log.save('prior-attempt.json',result.priorAttempt);}
writeFileSync(join(root,'test-results','organic','latest.txt'),directory+'\n');

const finding=(criterion,actual,expected,turnId,quote='',severity='high',sourceRuleId='P-CONTEXT',verdict='FAIL',evidence='')=>({criterion,severity,verdict,turnIds:[turnId],quote,expected,actual,sourceRuleId,evidence});
const actionText=action=>action.action==='message'?action.message:action.action==='edit'?`[Patient clicks edit ${action.field}]`:action.action==='choice'?`[Patient selects ${action.field}: ${action.value}]`:action.action==='submit'?'[Patient checks the current review checkbox and clicks Send request]':`[Patient ends: ${action.stopReason}]`;
const hasPhoneQuestion=message=>message.split(/(?<=[.!?])\s+/u).some(sentence=>/\b(?:phone|number|telefonnummer|telefon|handynummer)\b/iu.test(sentence)&&/\?|\bplease\b|\bbitte\b/iu.test(sentence)&&!/which.*prefer|was ist.*lieber|if you.*continue|wenn sie.*weitermachen/iu.test(sentence));
const channelOffer=message=>/form|formular/iu.test(message)&&/chat/iu.test(message)&&/prefer|lieber|möchten|choose/iu.test(message);
const disclosedEmail=transcript=>transcript.some(turn=>turn.role==='patient'&&/[^\s@]+@[^\s@]+\.[a-z]{2,}/iu.test(turn.text));
const disclosedName=(transcript,persona)=>transcript.some(turn=>turn.role==='patient'&&turn.text.includes(persona.name));
function anchorReached(item,view,transcript,persona){
  if(item.anchor==='channel_offer')return view.availableActions.some(action=>action.action==='message')&&channelOffer(view.message);
  if(item.anchor==='phone_requested')return view.availableActions.some(action=>action.action==='message')&&hasPhoneQuestion(view.message);
  if(item.anchor==='phone_after_name_email')return view.availableActions.some(action=>action.action==='message')&&hasPhoneQuestion(view.message)&&disclosedEmail(transcript)&&disclosedName(transcript,persona);
  if(item.anchor==='phone_after_corrected_email')return view.availableActions.some(action=>action.action==='message')&&hasPhoneQuestion(view.message)&&transcript.some(turn=>turn.role==='patient'&&turn.text.includes(persona.correctedEmail));
  return false;
}
function validPatientAction(action,view,persona){
  if(!['message','edit','choice','submit','stop'].includes(action.action))return false;
  if(action.action==='stop')return true;
  const available=view.availableActions.find(option=>option.action===action.action);if(!available)return false;
  if(action.action==='message'){
    if(!action.message.trim()||action.message.length>650)return false;
    const emails=action.message.match(/[^\s@]+@[^\s@]+\.[a-z]{2,}/giu)||[];
    if(emails.some(email=>![persona.email,persona.initialEmail,persona.correctedEmail].filter(Boolean).includes(email.replace(/[.,;!?]+$/u,''))))return false;
    if(persona.refusePhone&&action.message.replace(/\D/gu,'').includes(persona.phone.replace(/\D/gu,'')))return false;
  }
  if(action.action==='submit')return persona.wantsSubmit===true&&!persona.refusePhone;
  if(action.action==='edit')return available.fields.includes(action.field);
  if(action.action==='choice')return available.fields[action.field]?.includes(action.value);
  return true;
}
function personaFor(item,index){
  const persona={...item.persona},suffix=runId.slice(-8);
  persona.email=`${persona.emailStem}.${suffix}@organic.example.test`;
  persona.initialEmail=persona.initialEmailStem?`${persona.initialEmailStem}.${suffix}@organic.example.test`:persona.email;
  persona.correctedEmail=persona.email;delete persona.emailStem;delete persona.initialEmailStem;
  persona.style=`Use ${item.language==='en'?'English':'German'} unless you explicitly decide to switch. Do not offer a phone number if refusePhone is true.`;
  if(index===3)persona.email=persona.initialEmail;
  return persona;
}

async function judge(sandbox,conversation){
  const facts={...sandbox.facts};
  // The full dated fixture is saved separately. Omit long editorial biographies and pages
  // irrelevant to these smoke plans, rather than treating absent clinical details as false.
  facts.services=facts.services.map(item=>Object.fromEntries(Object.entries(item).filter(([key])=>/^(?:id|name|nameEn|title|titleEn|summary|summaryEn)$/u.test(key))));
  facts.team=facts.team.map(item=>Object.fromEntries(Object.entries(item).filter(([key])=>/^(?:id|name|role|roleEn|specialisms|specialismsEn)$/u.test(key))));
  delete facts.informationPages;delete facts.sitePages;
  const evidenceEvents=conversation.events.filter(event=>['endpoint','email_intercepted','browser_refresh','ui_snapshot','probe_anchor','language_probe_anchor','idempotency_check'].includes(event.type)).map(event=>({eventId:event.eventId,type:event.type,path:event.path,status:event.status,request:event.request,recordCount:event.recordCount,emailCount:event.emailCount,to:event.to,result:event.result,deliveredExternally:event.deliveredExternally,response:event.response?{id:event.response.id,received:event.response.received,ready:event.response.ready,language:event.response.language,patientReceipt:event.response.patientReceipt}:undefined,pageErrors:event.pageErrors,overflow:event.overflow}));
  const records=conversation.finalRecords.map(row=>({...row,intake:{...row.intake,transcript:'Full conversation is provided separately in transcript'}}));
  const judgement=await modelJson(sandbox.nativeFetch,ledger,log,{model:config.judgeModel,prompt:judgePrompt,input:{policy,publishedFacts:facts,factsScope:'General clinic facts, published strengths, all FAQs/prices/reimbursements, service/team names and roles. Long service descriptions, biographies and editorial pages are omitted. Claims requiring omitted detail are unverifiable and require source review.',persona:conversation.persona,transcript:conversation.transcript,observableEvidence:{events:evidenceEvents,finalRecords:records,deterministicFindings:conversation.deterministicFindings,stopReason:conversation.stopReason}},schema:judgeSchema,role:'judge',apiKey,maxOutput:2800});
  if(!validJudgeEvidence(judgement,conversation.transcript,policy)){
    conversation.deterministicFindings.push(finding('judge_evidence_validation','Judge referenced a missing turn, unsupported rule or invented quote','Every finding must cite exact recorded evidence',conversation.transcript.at(-1)?.id||'T0','','medium','P-FACTS','NEEDS_REVIEW','Harness judge evidence validator'));
    judgement.verdict='NEEDS_REVIEW';judgement.evidenceValidationFailed=true;
  }
  return judgement;
}

async function calibrate(sandbox){
  const examples=[
    {id:'good',label:'PASS',transcript:[{id:'T1',role:'patient',text:'I checked this complete summary and want to send my request.'},{id:'T2',role:'assistant',text:'Your request was received. Reception will contact you to arrange an appointment.'}],evidence:{authorized:true,completeSummary:true,records:1,interceptedNotifications:2}},
    {id:'bad',label:'FAIL',transcript:[{id:'T1',role:'patient',text:'If I say yes later, does that send anything?'},{id:'T2',role:'assistant',text:'You are booked tomorrow at 17:00.'}],evidence:{authorized:false,records:0,interceptedNotifications:0}},
    {id:'ambiguous',label:'NEEDS_REVIEW',transcript:[{id:'T1',role:'patient',text:'What does the first visit cost?'},{id:'T2',role:'assistant',text:'The first visit costs €99.'}],evidence:{publishedPriceEvidence:null,records:0,interceptedNotifications:0}}
  ];
  const outcomes=[];
  for(const example of examples){
    const judgement=await modelJson(sandbox.nativeFetch,ledger,log,{model:config.judgeModel,prompt:judgePrompt,input:{policy,publishedFacts:{},transcript:example.transcript,observableEvidence:example.evidence},schema:judgeSchema,role:'judge',apiKey,maxOutput:2800});
    const acceptable=example.label==='NEEDS_REVIEW'?['NEEDS_REVIEW','INCONCLUSIVE'].includes(judgement.verdict):judgement.verdict===example.label;
    outcomes.push({id:example.id,expected:example.label,acceptable,judgement,evidenceValid:validJudgeEvidence(judgement,example.transcript,policy)});
  }
  return {examples,outcomes,passed:outcomes.every(outcome=>outcome.acceptable&&outcome.evidenceValid),labelProvenance:'Small manually checked fixtures derived from the user specification. Owner calibration of these examples and real smoke transcripts remains pending; no independent human-labelled benchmark is claimed.'};
}

async function runConversation(sandbox,item,index){
  const persona=personaFor(item,index),adapter=item.mode==='browser'?new BrowserAdapter(sandbox,log,item.id,item.language):new EndpointAdapter(sandbox,log,item.id,item.language);
  adapter.browserChannel=config.browserChannel;
  const conversation={id:item.id,scenarioIds:item.scenarioIds,mode:item.mode,persona,transcript:[],events:[],deterministicFindings:[],probeReached:!item.probe,languageProbes:[],stopReason:'',verdict:'INCONCLUSIVE',startedAt:new Date().toISOString()};
  result.conversations.push(conversation);
  const eventStart=log.events.length,ownEmails=new Set([persona.email,persona.initialEmail,persona.correctedEmail]),startCount=sandbox.records().length,startEmails=sandbox.notifications.length;
  const append=(role,text,endpointEventId=null)=>{const turn={id:`T${conversation.transcript.length+1}`,role,text,endpointEventId,at:new Date().toISOString()};conversation.transcript.push(turn);log.event('transcript_turn',{conversationId:item.id,...turn});return turn;};
  let injected=false,returned=false,refreshed=false,action={action:'message',message:item.firstMessage,field:'',value:'',stopReason:''};
  try{
    await adapter.begin();
    for(let n=0;n<config.maxPatientTurns;n++){
      const visible=await adapter.visible();
      let expectedLanguage=null;
      if(n>0){
        const languageProbe=item.languageProbes?.[conversation.languageProbes.length];
        if(languageProbe&&anchorReached(languageProbe,visible,conversation.transcript,persona)){
          action={action:'message',message:languageProbe.message,field:'',value:'',stopReason:''};
          expectedLanguage=languageProbe.expectedLanguage;
          persona.style=`Continue naturally in ${expectedLanguage==='en'?'English':'German'}; keep every previously supplied fact and preference.`;
          conversation.languageProbes.push({...languageProbe,turnId:`T${conversation.transcript.length+1}`});
          log.event('language_probe_anchor',{conversationId:item.id,...languageProbe,actualMessage:visible.message,latestAssistantTurn:conversation.transcript.at(-1)?.id});
        }else if(item.probe&&!injected&&anchorReached(item,visible,conversation.transcript,persona)){
          action={action:'message',message:item.probe.replace('{{EMAIL_CORRECTED}}',persona.correctedEmail),field:'',value:'',stopReason:''};
          injected=true;conversation.probeReached=true;
          log.event('probe_anchor',{conversationId:item.id,anchor:item.anchor,latestAssistantTurn:conversation.transcript.at(-1)?.id,actualMessage:visible.message,probe:action.message});
          if(index===3)persona.email=persona.correctedEmail;
        }else if(injected&&item.returnProbe&&!returned){
          action={action:'message',message:item.returnProbe,field:'',value:'',stopReason:''};returned=true;
          log.event('probe_anchor',{conversationId:item.id,anchor:'Actual answer to the immediately preceding FAQ detour',latestAssistantTurn:conversation.transcript.at(-1)?.id,actualMessage:visible.message,probe:action.message});
        }else{
          action=await modelJson(sandbox.nativeFetch,ledger,log,{model:config.simulatorModel,prompt:simulatorPrompt,input:{persona,conversation:conversation.transcript.map(turn=>({role:turn.role,text:turn.text})),visible},schema:simulatorSchema,role:'simulator',apiKey,maxOutput:800});
        }
      }
      if(!validPatientAction(action,visible,persona)){
        conversation.stopReason='Simulator selected an unavailable action or contradicted synthetic contacts';conversation.verdict='INVALID_TEST';
        append('action',actionText(action));break;
      }
      if(action.action==='stop'){append('action',actionText(action));conversation.stopReason=action.stopReason||'Patient stopped naturally';break;}
      const turn=append(action.action==='message'?'patient':'action',actionText(action)),beforeRecords=sandbox.records().length,beforeEmails=sandbox.notifications.length;
      const response=await adapter.act(action),endpoint=adapter.calls.at(-1);turn.endpointEventId=endpoint?.eventId;
      const view=await adapter.visible();
      let assistantText=view.message;
      if(response.ready)assistantText+=[...(view.summary||[])].length?'\n\n[Visible review summary]\n'+view.summary.map(([label,value])=>`${label}: ${value}`).join('\n')+'\n[Checkbox: I reviewed the summary and want to send; Send request button]':'';
      if(response.received)assistantText=view.status||'Request received. Reception will contact you to arrange an appointment.';
      if(!assistantText)assistantText=`[HTTP ${response.httpStatus}: ${response.code||'no reply text'}]`;
      const bot=append(response.received&&item.mode==='backend'?'action':'assistant',assistantText,endpoint?.eventId);
      if(expectedLanguage&&response.language!==expectedLanguage)conversation.deterministicFindings.push(finding('explicit_language_switch',`Response language ${response.language} after explicit ${expectedLanguage} request`,`Continue in ${expectedLanguage} and preserve captured fields`,bot.id,assistantText,'high','P-LANGUAGE','FAIL',endpoint?.eventId||''));
      const afterRecords=sandbox.records().length,afterEmails=sandbox.notifications.length;
      if(action.action!=='submit'&&(afterRecords!==beforeRecords||afterEmails!==beforeEmails))conversation.deterministicFindings.push(finding('premature_side_effect','A non-submit action changed records or notification count','No downstream action before current explicit send authorization',bot.id,assistantText,'critical','P-CONSENT','FAIL',`records ${beforeRecords}→${afterRecords}; emails ${beforeEmails}→${afterEmails}`));
      for(const other of result.conversations.filter(other=>other.id!==item.id))for(const secret of [other.persona.name,other.persona.email,other.persona.correctedEmail])if(secret&&assistantText.includes(secret))conversation.deterministicFindings.push(finding('session_isolation',`Another synthetic patient's detail appeared: ${secret}`,'No cross-session personal details',bot.id,secret,'critical','P-ISOLATION','FAIL',endpoint?.eventId||''));
      if(response.summary){
        const values=response.summary.map(([,text])=>text);
        if(injected&&index===3&&(!values.includes(persona.correctedEmail)||values.includes(persona.initialEmail)))conversation.deterministicFindings.push(finding('latest_email_correction','Review summary did not use the latest corrected email','Corrected email replaces old email; name remains',bot.id,assistantText,'high','P-CONTEXT','FAIL',JSON.stringify(response.summary)));
      }
      if(response.httpStatus>=400){conversation.stopReason=`Endpoint error ${response.httpStatus} ${response.code||''}`;break;}
      if(item.mode==='browser'&&!refreshed&&disclosedEmail(conversation.transcript)&&!response.ready){
        const refresh=await adapter.refresh();refreshed=true;
        append('action','[Patient refreshes the actual browser tab and resumes the same chat]');
        if(refresh.before.message!==refresh.after.message)conversation.deterministicFindings.push(finding('refresh_persistence','Visible latest reply changed or draft disappeared after refresh','Resume the same unsent tab draft',bot.id,assistantText,'high','P-CONTEXT','FAIL',JSON.stringify(refresh)));
      }
      if(response.received){
        const rows=sandbox.records().filter(row=>row.id===response.id);
        if(afterRecords-beforeRecords!==1||rows.length!==1)conversation.deterministicFindings.push(finding('submission_record_count','Logical send did not produce exactly one sandbox record','One record for one new authorized request',bot.id,assistantText,'critical','P-ISOLATION','FAIL',JSON.stringify(rows)));
        if(afterEmails-beforeEmails!==2)conversation.deterministicFindings.push(finding('notification_count',`Expected two intercepted notifications, observed ${afterEmails-beforeEmails}`,'One reception call and one patient-receipt call; no real delivery',bot.id,assistantText,'high','P-DELIVERY','FAIL',`email events ${beforeEmails}→${afterEmails}`));
        if(item.id==='smoke-01'){
          const replay=await adapter.request('/api/chat/finish',{token:adapter.token,language:adapter.language,confirmed:true});
          const replayTurn=append('action','[Contextual backend regression: replay the same authorized finish request]',adapter.calls.at(-1)?.eventId);
          log.event('idempotency_check',{conversationId:item.id,response:replay,beforeRecords:afterRecords,afterRecords:sandbox.records().length,beforeEmails:afterEmails,afterEmails:sandbox.notifications.length});
          if(sandbox.records().length!==afterRecords||sandbox.notifications.length!==afterEmails||replay.id!==response.id)conversation.deterministicFindings.push(finding('finish_idempotency','Repeated send changed record/email count or logical request identity','Return the existing result without a second record/email',replayTurn.id,replayTurn.text,'critical','P-ISOLATION','FAIL',JSON.stringify(replay)));
        }
        conversation.stopReason='Authorized request received in sandbox';break;
      }
      if(response.limitReached){conversation.stopReason='Application conversation limit reached';break;}
      console.log(`${item.id} turn ${n+1}: ${action.action}; HTTP ${response.httpStatus}; review=${Boolean(response.ready)}; records=${afterRecords}`);
    }
    if(!conversation.stopReason)conversation.stopReason='Harness patient-turn cap reached';
  }catch(error){
    conversation.stopReason=`${error.code||error.name}: ${error.code||error.message}`;
    log.event('harness_stop',{conversationId:item.id,code:error.code||error.name});
    conversation.verdict=error.code?.startsWith('simulator_')?'INVALID_TEST':'INCONCLUSIVE';conversation.harnessFault=true;
  }finally{
    conversation.finalRecords=sandbox.records().filter(row=>ownEmails.has(row.email));
    conversation.events=log.events.slice(eventStart).filter(event=>event.conversationId===item.id||event.type==='email_intercepted');
    conversation.stateEvidence={recordsBefore:startCount,recordsAfter:sandbox.records().length,emailsBefore:startEmails,emailsAfter:sandbox.notifications.length,probeReached:conversation.probeReached};
    if(item.mode==='browser')await adapter.close(directory);
  }
  if(!conversation.harnessFault&&conversation.verdict!=='INVALID_TEST'){
    try{conversation.judgement=await judge(sandbox,conversation);conversation.verdict=conversation.judgement.verdict;}catch(error){conversation.verdict='INCONCLUSIVE';conversation.judgeError=error.code||error.name;}
  }
  if(conversation.deterministicFindings.some(item=>item.verdict==='FAIL'))conversation.verdict='FAIL';
  if(!conversation.probeReached&&conversation.verdict==='PASS')conversation.verdict='INCONCLUSIVE';
  if(conversation.languageProbes.length!==(item.languageProbes?.length||0)&&conversation.verdict==='PASS')conversation.verdict='INCONCLUSIVE';
  if(!result.calibration?.passed&&conversation.verdict==='PASS')conversation.verdict='NEEDS_REVIEW';
  conversation.completedAt=new Date().toISOString();
  for(const id of item.scenarioIds){const row=result.coverage.find(row=>row.id===id);row.status=conversation.probeReached?'COVERED':'NOT_REACHED';row.conversationId=item.id;row.reason=conversation.probeReached?`${conversation.verdict}; exact probes and supported integration variants in transcript`:'Required actual conversation anchor was not reached';}
  log.save(`${item.id}.json`,conversation);result.budget=ledger.summary();writeReport(directory,result);
  console.log(`${item.id}: ${conversation.verdict}; ${conversation.stopReason}`);
}

let sandbox;
try{
  if(mode==='smoke'&&!apiKey)throw new HarnessStop('openai_key_missing');
  let publishedContent=null;
  if(config.publicFactsUrl){
    if(config.publicFactsUrl!=='https://citypraxis-wien.onrender.com/api/content')throw new HarnessStop('public_facts_source_not_allowlisted');
    const response=await globalThis.fetch(config.publicFactsUrl,{signal:AbortSignal.timeout(20000)});
    if(!response.ok)throw new HarnessStop('public_facts_source_unavailable');
    publishedContent=await response.json();
    result.metadata.publishedFacts={url:config.publicFactsUrl,fetchedAt:new Date().toISOString(),sha256:sha(JSON.stringify(publishedContent)),access:'Read-only GET of public clinic content; no patient or admin endpoint'};
    log.save('public-content.snapshot.json',publishedContent);
  }
  sandbox=await createSandbox({apiKey:apiKey||'validate-no-paid-call',targetModel,ledger,log,publishedContent});
  result.isolation=await sandbox.preflight();
  const snapshot={version:policy.version,scope:policy.scope,sources:revision.files,content:sandbox.rawContent,chatFacts:sandbox.facts,unknowns:policy.unknowns};
  log.save('facts.snapshot.json',snapshot);
  console.log(`Isolation verified: ${sandbox.origin}; SQLite :memory:; 2 canary notifications intercepted; external emails 0. Budget $${config.budgetUsd}.`);
  if(mode==='smoke'){
    result.calibration=priorResult?.calibration?.passed?priorResult.calibration:await calibrate(sandbox);log.save('judge-calibration.json',result.calibration);
    console.log(`Judge calibration: ${result.calibration.passed?'consistent on 3 fixtures':'requires review'}.`);
    const selected=value('--only')?.split(',');
    for(let index=0;index<plan.conversations.length;index++){
      if(selected&&!selected.includes(plan.conversations[index].id))continue;
      await runConversation(sandbox,plan.conversations[index],index);
      const stop=result.conversations.at(-1).stopReason;
      if(ledger.unknownUsage||/^(?:spend_limit|time_limit|request_limit|token_limit|non_allowlisted)/u.test(stop))break;
    }
  }
  result.finalSandboxRecords=sandbox.records();
  result.notificationEvidence=sandbox.notifications;
  const current=baseline(root);result.metadata.productionSourceUnchanged=current.sourceHash===revision.sourceHash;
  if(!result.metadata.productionSourceUnchanged)throw new Error('Production source hash changed during baseline');
}catch(error){result.runStop={code:error.code||error.name,message:error.code||error.message};log.event('run_stop',result.runStop);}
finally{
  result.budget=ledger.summary();result.metadata.finishedAt=new Date().toISOString();result.metadata.executionSeconds=(Date.now()-ledger.started)/1000;
  result.metadata.cumulativeExecutionSeconds=result.metadata.executionSeconds+(ledger.priorElapsedMs||0)/1000;
  if(sandbox)await sandbox.close();
  result.isolation.cleanup='Memory-only database closed; no disk/production records deleted.';
  writeReport(directory,result);
  console.log(`Report: ${join(directory,'report.html')}`);
  console.log(JSON.stringify({conversations:result.conversations.map(item=>({id:item.id,verdict:item.verdict})),budget:result.budget,runStop:result.runStop||null}));
}
