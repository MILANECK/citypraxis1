import {appendFileSync,readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
import {resolve,join,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

export const sha=value=>createHash('sha256').update(value).digest('hex');
export const jsonFile=path=>JSON.parse(readFileSync(path,'utf8'));
export const VERDICTS=['PASS','FAIL','NEEDS_REVIEW','INCONCLUSIVE','BLOCKED','INVALID_TEST','NOT_RUN'];
export class HarnessStop extends Error{constructor(code){super(code);this.code=code;}}
export function knownUsageBound(usage,r){
  const input=usage?.input_tokens,output=usage?.output_tokens,cached=usage?.input_tokens_details?.cached_tokens||0,writes=usage?.input_tokens_details?.cache_write_tokens||0;
  if(![input,output,cached,writes].every(n=>Number.isInteger(n)&&n>=0)||cached+writes>input)throw new HarnessStop('invalid_usage_breakdown');
  return ((input-cached-writes)*r.boundInput+cached*r.cached+writes*r.boundWrite+output*r.boundOutput)/1e6;
}
export class EvidenceLog{
  constructor(directory){this.directory=directory;mkdirSync(directory,{recursive:true});this.events=[];}
  event(type,data={}){const event={eventId:`E${this.events.length+1}`,at:new Date().toISOString(),type,...data};this.events.push(event);appendFileSync(join(this.directory,'events.jsonl'),JSON.stringify(event)+'\n');return event;}
  save(name,data){writeFileSync(join(this.directory,name),JSON.stringify(data,null,2)+'\n');}
}

export function baseline(root){
  const files=[];
  for(const folder of ['src','public']){
    const walk=directory=>{for(const item of readdirSync(directory,{withFileTypes:true})){const path=join(directory,item.name);if(item.isDirectory()){if(!['assets','uploads'].includes(item.name))walk(path);}else if(/\.(?:mjs|js|json|html|css)$/u.test(item.name))files.push(path);}};
    walk(join(root,folder));
  }
  const hashes=Object.fromEntries(files.sort().map(path=>[relative(root,path).replaceAll('\\','/'),sha(readFileSync(path))]));
  let head='unknown',dirty=[];try{head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();dirty=execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(Boolean);}catch{}
  return {head,dirty,sourceHash:sha(JSON.stringify(hashes)),files:hashes};
}

export class BudgetLedger{
  constructor(config,log){this.config=config;this.log=log;this.started=Date.now();this.requests=0;this.usedTokens=0;this.guardUsd=0;this.estimatedUsd=0;this.reservedUsd=0;this.reservedTokens=0;this.calls=[];this.unknownUsage=0;}
  reserve(body,role){
    const c=this.config,r=c.ratesPerMillion[body.model];
    if(!r)throw new HarnessStop('unverified_model_pricing');
    if(body.tools?.length||body.stream||body.background)throw new HarnessStop('unsupported_unbounded_api_mode');
    const bytes=Buffer.byteLength(JSON.stringify(body)),inputBound=bytes+4096,outputBound=body.max_output_tokens;
    if(!Number.isInteger(outputBound)||outputBound<1||bytes>c.maxRequestBytes)throw new HarnessStop('request_size_limit');
    const tokenBound=inputBound+outputBound,costBound=(inputBound*(r.boundInput+r.boundWrite)+outputBound*r.boundOutput)/1e6;
    const elapsed=Date.now()-this.started+(this.priorElapsedMs||0);
    if(elapsed>(c.maxMinutes*60-c.reportReserveSeconds)*1000)throw new HarnessStop('time_limit');
    if(this.requests>=c.maxRequests)throw new HarnessStop('request_limit');
    if(this.usedTokens+this.reservedTokens+tokenBound>c.maxTotalTokens)throw new HarnessStop('token_limit');
    if(this.guardUsd+this.reservedUsd+costBound>c.budgetUsd)throw new HarnessStop('spend_limit');
    this.requests++;this.reservedUsd+=costBound;this.reservedTokens+=tokenBound;
    return {role,model:body.model,started:Date.now(),costBound,tokenBound,outputBound,r,settled:false};
  }
  settle(reservation,payload,error=null){
    if(reservation.settled)throw new Error('Reservation settled twice');reservation.settled=true;
    this.reservedUsd-=reservation.costBound;this.reservedTokens-=reservation.tokenBound;
    const usage=payload?.usage,r=reservation.r;
    const known=Number.isInteger(usage?.input_tokens)&&Number.isInteger(usage?.output_tokens);
    let estimatedUsd=null,guardUsd=reservation.costBound,totalTokens=null;
    if(known){
      const input=usage.input_tokens,output=usage.output_tokens,cached=usage.input_tokens_details?.cached_tokens||0,writes=usage.input_tokens_details?.cache_write_tokens||0;
      totalTokens=input+output;
      estimatedUsd=(Math.max(0,input-cached-writes)*r.input+cached*r.cached+writes*r.cacheWrite+output*r.output)/1e6;
      guardUsd=this.config.knownUsagePriceBound?knownUsageBound(usage,r)*1.05:(input*(r.boundInput+r.boundWrite)+output*r.boundOutput)/1e6;
      this.estimatedUsd+=estimatedUsd;this.usedTokens+=totalTokens;
    }else{this.unknownUsage++;this.usedTokens+=reservation.tokenBound;}
    this.guardUsd+=guardUsd;
    const call={role:reservation.role,modelRequested:reservation.model,modelReturned:payload?.model||null,responseId:payload?.id||null,usage:usage||null,estimatedUsd,guardUsd,elapsedMs:Date.now()-reservation.started,error,providerError:payload?.error?{code:payload.error.code||null,param:payload.error.param||null,type:payload.error.type||null}:null};
    this.calls.push(call);this.log?.event('model_usage',call);
    if(!known)throw new HarnessStop('usage_unknown_charged_upper_bound');
    if(totalTokens>reservation.tokenBound||guardUsd>reservation.costBound)throw new HarnessStop('reservation_bound_exceeded');
    return call;
  }
  summary(){return {requests:this.requests,reportedTokens:(this.priorReportedTokens||0)+this.calls.reduce((sum,call)=>sum+(call.usage?call.usage.input_tokens+call.usage.output_tokens:0),0),tokenBudgetCharge:this.usedTokens,estimatedUsd:this.estimatedUsd,conservativeGuardUsd:this.guardUsd,unknownUsageCalls:this.unknownUsage+(this.priorUnknownUsageCalls||0),reservedUsd:this.reservedUsd,limits:{usd:this.config.budgetUsd,requests:this.config.maxRequests,tokens:this.config.maxTotalTokens,minutes:this.config.maxMinutes},roles:Object.fromEntries(['target','simulator','judge'].map(role=>[role,this.calls.filter(call=>call.role===role).reduce((s,call)=>({calls:s.calls+1,inputTokens:s.inputTokens+(call.usage?.input_tokens||0),outputTokens:s.outputTokens+(call.usage?.output_tokens||0),estimatedUsd:s.estimatedUsd+(call.estimatedUsd||0)}),{calls:0,inputTokens:0,outputTokens:0,estimatedUsd:0})])),billingNote:'Estimate from reported API tokens and sourced standard rates, not an invoice. Unknown usage is never recorded as zero; the guard charges its reservation bound. Reported tokens and conservative token-budget charges are separate. Cache writes use explicitly returned counts when available. Role subtotals describe this process; prior attempts are linked separately.'};}
}

export async function paidFetch(nativeFetch,ledger,log,body,role,apiKey,applicationSignal=null){
  const reservation=ledger.reserve(body,role);
  let payload;
  try{
    const signal=applicationSignal?AbortSignal.any([applicationSignal,AbortSignal.timeout(30000)]):AbortSignal.timeout(30000);
    const response=await nativeFetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify(body),signal});
    payload=await response.json();
    ledger.settle(reservation,payload,response.ok?null:`http_${response.status}`);
    if(!response.ok)throw new HarnessStop(`model_http_${response.status}`);
    if(payload.status!=='completed'){log.event('model_incomplete_response',{role,model:body.model,responseId:payload.id,status:payload.status,incompleteDetails:payload.incomplete_details||null,outputItems:payload.output||[]});throw new HarnessStop(`model_${payload.status||'incomplete'}`);}
    return payload;
  }catch(error){if(!reservation.settled){try{ledger.settle(reservation,payload,error.code||error.name);}catch{}}throw error;}
}
export async function modelJson(nativeFetch,ledger,log,{model,prompt,input,schema,role,apiKey,maxOutput=1000}){
  const body={model,store:false,reasoning:{effort:role==='judge'?'low':'none'},max_output_tokens:maxOutput,instructions:prompt,input:JSON.stringify(input),text:{format:{type:'json_schema',name:`organic_${role}`,strict:true,schema}}};
  const payload=await paidFetch(nativeFetch,ledger,log,body,role,apiKey);
  log.event('agent_output',{role,model,responseId:payload.id,outputItems:payload.output});
  try{return structuredOutput(payload);}catch{throw new HarnessStop(`${role}_invalid_json`);}
}
export function structuredOutput(payload){
  const messages=(payload.output||[]).filter(item=>item.type==='message'&&item.phase!=='commentary'&&item.status!=='incomplete');
  const finals=messages.filter(item=>item.phase==='final_answer');
  const candidates=finals.length?finals:messages;
  if(candidates.length!==1)throw new HarnessStop('ambiguous_structured_output');
  const output=(candidates[0].content||[]).filter(item=>item.type==='output_text').map(item=>item.text).join('');
  return JSON.parse(output);
}
export const simulatorSchema={type:'object',additionalProperties:false,properties:Object.fromEntries(['action','message','field','value','stopReason'].map(key=>[key,key==='action'?{type:'string',enum:['message','edit','choice','submit','stop']}:{type:'string'}])),required:['action','message','field','value','stopReason']};
export function patientActionSchema(visible){
  const branch=(action,field=[''],value=[''])=>({type:'object',additionalProperties:false,properties:{action:{type:'string',enum:[action]},message:action==='message'?{type:'string'}:{type:'string',enum:['']},field:{type:'string',enum:field},value:{type:'string',enum:value},stopReason:action==='stop'?{type:'string'}:{type:'string',enum:['']}},required:['action','message','field','value','stopReason']});
  const branches=[branch('stop')];
  for(const option of visible.availableActions){
    if(['message','submit'].includes(option.action))branches.push(branch(option.action));
    if(option.action==='duplicate')branches.push(branch('duplicate',[''],option.values));
    if(option.action==='edit'&&option.fields.length)branches.push(branch('edit',option.fields));
    if(option.action==='choice')for(const [field,values] of Object.entries(option.fields))branches.push(branch('choice',[field],values));
  }
  // Nested anyOf is supported; the root remains an object. This represents actual UI
  // affordances, not expected chatbot answers or automatic repair of patient text.
  return {type:'object',additionalProperties:false,properties:{decision:{anyOf:branches}},required:['decision']};
}
const findingProperties={criterion:{type:'string'},severity:{type:'string',enum:['critical','high','medium','low']},verdict:{type:'string',enum:VERDICTS.filter(value=>value!=='NOT_RUN')},turnIds:{type:'array',items:{type:'string'}},quote:{type:'string'},expected:{type:'string'},actual:{type:'string'},sourceRuleId:{type:'string'},evidence:{type:'string'}};
const claimProperties={quote:{type:'string'},turnId:{type:'string'},classification:{type:'string',enum:['supported','contradicted','unverifiable']},source:{type:'string'}};
export const judgeSchema={type:'object',additionalProperties:false,properties:{verdict:{type:'string',enum:VERDICTS.filter(value=>value!=='NOT_RUN')},outcome:{type:'string'},firstDivergenceTurn:{type:'string'},findings:{type:'array',maxItems:12,items:{type:'object',additionalProperties:false,properties:findingProperties,required:Object.keys(findingProperties)}},factualClaims:{type:'array',maxItems:12,items:{type:'object',additionalProperties:false,properties:claimProperties,required:Object.keys(claimProperties)}}},required:['verdict','outcome','firstDivergenceTurn','findings','factualClaims']};

export function validJudgeEvidence(judgement,transcript,policy){
  const turns=new Map(transcript.map(turn=>[turn.id,turn])),sources=new Set(policy.rules.map(rule=>rule.id));
  for(const finding of judgement.findings){
    if(!sources.has(finding.sourceRuleId)||!finding.turnIds.length||finding.turnIds.some(id=>!turns.has(id)))return false;
    if(finding.quote&&!finding.turnIds.some(id=>turns.get(id).text.includes(finding.quote)))return false;
  }
  for(const claim of judgement.factualClaims)if(!turns.has(claim.turnId)||!turns.get(claim.turnId).text.includes(claim.quote))return false;
  return !judgement.firstDivergenceTurn||turns.has(judgement.firstDivergenceTurn);
}
