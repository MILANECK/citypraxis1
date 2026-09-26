import {randomUUID} from 'node:crypto';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {responseUsage,monthlyBudget,monthRange,createUsageTracker,sqliteUsageStore} from '../src/chat/usage.mjs';
import {createOpenAICostReporter} from '../src/chat/openai-costs.mjs';
import {createConversationService} from '../src/chat/conversation.mjs';
import {newSession} from '../src/chat/security.mjs';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const payload={id:'resp_test',model:'gpt-6-luna',usage:{input_tokens:1000,input_tokens_details:{cached_tokens:500},output_tokens:200}};

test('response token usage is recorded without creating a local cost estimate',()=>{
  const usage=responseUsage(payload);
  assert.deepEqual(usage,{model:'gpt-6-luna',input_tokens:1000,output_tokens:200,total_tokens:1200,cached_input_tokens:500});
  assert.equal('estimated_cost_usd' in usage,false);
  assert.equal(responseUsage({...payload,usage:{input_tokens:-1,output_tokens:1}}),null);
  assert.equal(responseUsage({}),null);
  assert.equal(monthlyBudget('0'),0);assert.equal(monthlyBudget('bad'),null);assert.equal(monthlyBudget(''),null);assert.equal(monthlyBudget(undefined),null);
});

test('monthly chat totals count only unique conversation markers in the UTC month',async()=>{
  const db=new DatabaseSync(':memory:'),store=sqliteUsageStore(db),tracker=createUsageTracker(store);
  try{
    tracker.conversation('session-a');tracker.conversation('session-a');tracker.response('session-a',payload);await flush();
    const summary=await tracker.summary();assert.equal(summary.conversations,1);assert.equal(summary.costAvailable,false);assert.equal(summary.cost,null);assert.equal(summary.remaining,null);
    const tokenRow=db.prepare("SELECT estimated_cost_usd,input_tokens FROM chat_ai_usage WHERE kind='usage'").get();assert.equal(tokenRow.estimated_cost_usd,null);assert.equal(tokenRow.input_tokens,1000);
    store.insert({event_id:'old',conversation_id:'old',kind:'conversation',created_at:'2025-12-31T23:59:59.999Z'});
    store.insert({event_id:'start',conversation_id:'start',kind:'conversation',created_at:'2026-01-01T00:00:00.000Z'});
    store.insert({event_id:'end',conversation_id:'end',kind:'conversation',created_at:'2026-02-01T00:00:00.000Z'});
    const jan=store.summary(monthRange(new Date('2026-01-31T23:59:59Z')));assert.equal(jan.conversations,1);
  }finally{db.close();}
});

test('OpenAI monthly Costs API totals only the selected project and caches the report',async()=>{
  const calls=[];
  const reporter=createOpenAICostReporter({apiKey:'server-secret',projectId:'proj_citypraxis',now:()=>new Date('2026-09-26T10:00:00Z'),fetcher:async(url,options)=>{
    calls.push({url:new URL(url),options});
    if(calls.length===1)return {ok:true,json:async()=>({data:[{results:[{project_id:'proj_citypraxis',line_item:'gpt-6-luna, input_tokens',amount:{currency:'usd',value:.12}},{project_id:'proj_citypraxis',line_item:'gpt-6-mini, input_tokens',amount:{currency:'usd',value:20}},{project_id:'proj_other',line_item:'gpt-6-luna, input_tokens',amount:{currency:'usd',value:99}}]}],has_more:true,next_page:'page-2'})};
    return {ok:true,json:async()=>({data:[{results:[{project_id:'proj_citypraxis',line_item:'gpt-6-luna, output_tokens',amount:{currency:'usd',value:.08}}]}],has_more:false,next_page:null})};
  }});
  const report=await reporter.monthly();
  assert.equal(report.available,true);assert.equal(report.cost,.2);assert.equal(calls.length,2);
  assert.deepEqual(calls[0].url.searchParams.getAll('group_by'),['project_id','line_item']);assert.equal(calls[0].url.searchParams.get('project_ids'),'proj_citypraxis');
  assert.equal(calls[0].url.searchParams.get('start_time'),String(Date.UTC(2026,8,1)/1000));assert.equal(calls[1].url.searchParams.get('page'),'page-2');
  assert.equal(calls[0].options.headers.Authorization,'Bearer server-secret');
  assert.deepEqual(await reporter.monthly(),report);assert.equal(calls.length,2);
});

test('missing or rejected OpenAI cost credentials never turn into zero cost',async()=>{
  assert.deepEqual(await createOpenAICostReporter({apiKey:'',projectId:'proj_x'}).monthly(),{available:false,reason:'not_configured'});
  assert.deepEqual(await createOpenAICostReporter({apiKey:'key',projectId:''}).monthly(),{available:false,reason:'project_not_configured'});
  assert.deepEqual(await createOpenAICostReporter({apiKey:'key',projectId:'proj_x',fetcher:async()=>({ok:false,status:403})}).monthly(),{available:false,reason:'permission'});
});

test('cost reporting failures never interrupt chatbot replies or produce estimated costs',async()=>{
  const old={...process.env};process.env.OPENAI_API_KEY='fixture';process.env.CHAT_AI_ENABLED='true';const rows=[];
  try{
    const tracker=createUsageTracker({insert:row=>rows.push(row),summary:()=>({conversations:1})},{openAICosts:{monthly:async()=>{throw Error('offline');}}});
    const service=createConversationService({usage:tracker});let result;
    await service.handle({method:'POST',headers:{},socket:{remoteAddress:'test'}},'/api/chat/turn',{token:newSession(),language:'en',message:'Hello!',consent:true,turnKey:randomUUID()},(status,data)=>result={status,...data});
    assert.equal(result.status,200);assert.equal(result.message,'Hello! How can I help you?');await flush();const summary=await tracker.summary();assert.equal(summary.costAvailable,false);assert.equal(summary.remaining,null);
    assert.equal(rows.some(row=>'estimated_cost_usd' in row),false);assert.equal(JSON.stringify(rows).includes('Hello!'),false);
  }finally{process.env=old;}
});
