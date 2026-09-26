import {randomUUID} from 'node:crypto';

export function responseUsage(payload,requestedModel){
  const u=payload?.usage;if(!u)return null;
  const input=u.input_tokens,output=u.output_tokens,cached=u.input_tokens_details?.cached_tokens??0;
  if(![input,output,cached].every(n=>Number.isSafeInteger(n)&&n>=0)||cached>input)return null;
  return {model:payload.model||requestedModel,input_tokens:input,output_tokens:output,total_tokens:Number.isSafeInteger(u.total_tokens)&&u.total_tokens>=0?u.total_tokens:input+output,cached_input_tokens:cached};
}
export function monthlyBudget(value=process.env.OPENAI_MONTHLY_BUDGET_USD){
  if(value===undefined||value==='')return 20;
  const n=Number(value);return Number.isFinite(n)&&n>=0?n:null;
}
export function monthRange(now=new Date()){
  return {start:new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1)).toISOString(),end:new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()+1,1)).toISOString()};
}
export function createUsageTracker(store,{openAICosts}={}){
  let loggingFailed=false;
  const write=row=>{Promise.resolve().then(()=>store.insert(row)).catch(()=>{loggingFailed=true;});};
  return {
    conversation(id){write({event_id:`chat:${id}`,conversation_id:id,kind:'conversation',created_at:new Date().toISOString()});},
    response(id,payload,model){try{const usage=responseUsage(payload,model);if(usage)write({event_id:payload.id?`response:${payload.id}`:`response:${randomUUID()}`,conversation_id:id,kind:'usage',created_at:new Date().toISOString(),...usage});else loggingFailed=true;}catch{loggingFailed=true;}},
    async summary(){try{
      const range=monthRange(),data=await store.summary(range),budget=monthlyBudget();let report={available:false,reason:'not_configured'};
      try{if(openAICosts)report=await openAICosts.monthly();}catch{report={available:false,reason:'upstream'};}
      const costAvailable=report.available===true,cost=costAvailable?Number(report.cost):null;
      return {available:true,conversations:Number(data.conversations)||0,tracking_since:data.tracking_since||null,month:range.start,budget,costAvailable,cost,
        remaining:costAvailable&&budget!==null?Math.max(0,budget-cost):null,exceeded:costAvailable&&budget!==null&&cost>budget,reportedAt:costAvailable?report.reportedAt:null,costReason:costAvailable?null:report.reason,
        trackingIncomplete:loggingFailed};
    }catch{return {available:false};}}
  };
}
export function supabaseUsageStore(client){
  return {
    insert:row=>client.rest('chat_ai_usage','?on_conflict=event_id',{method:'POST',body:row,prefer:'resolution=ignore-duplicates,return=minimal',signal:AbortSignal.timeout(2500)}),
    summary:({start,end})=>client.rest('rpc/citypraxis_ai_usage','',{method:'POST',body:{month_start:start,month_end:end},signal:AbortSignal.timeout(4000)})
  };
}
export function sqliteUsageStore(db){
  db.exec(`CREATE TABLE IF NOT EXISTS chat_ai_usage(event_id TEXT PRIMARY KEY,conversation_id TEXT NOT NULL,kind TEXT NOT NULL,created_at TEXT NOT NULL,model TEXT,input_tokens INTEGER,output_tokens INTEGER,total_tokens INTEGER,cached_input_tokens INTEGER,estimated_cost_usd REAL);
    CREATE INDEX IF NOT EXISTS chat_ai_usage_created ON chat_ai_usage(created_at);`);
  return {
    insert(row){const keys=Object.keys(row);db.prepare(`INSERT OR IGNORE INTO chat_ai_usage (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})`).run(...Object.values(row));},
    summary({start,end}){return db.prepare(`SELECT COUNT(*) AS conversations,(SELECT MIN(created_at) FROM chat_ai_usage WHERE kind='conversation' AND created_at>=? AND created_at<?) AS tracking_since FROM chat_ai_usage WHERE kind='conversation' AND created_at>=? AND created_at<?`).get(start,end,start,end);}
  };
}
