import {randomUUID} from 'node:crypto';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {estimateUsage,monthlyBudget,monthRange,createUsageTracker,sqliteUsageStore} from '../src/chat/usage.mjs';
import {createConversationService} from '../src/chat/conversation.mjs';
import {newSession} from '../src/chat/security.mjs';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const payload={id:'resp_test',model:'gpt-6-luna',usage:{input_tokens:1000,input_tokens_details:{cached_tokens:500},output_tokens:200}};
test('token pricing discounts cached input, handles snapshots, and flags unknown pricing',()=>{
  assert.ok(Math.abs(estimateUsage(payload).estimated_cost_usd-.000155)<1e-12);
  assert.equal(estimateUsage({...payload,model:'unknown'}).estimated_cost_usd,null);
  assert.equal(estimateUsage({...payload,service_tier:'priority'}).estimated_cost_usd,null);
  assert.equal(estimateUsage({usage:{input_tokens:-1,output_tokens:1}},'gpt-6-luna'),null);
  assert.equal(estimateUsage({}),null);
  assert.equal(monthlyBudget('0'),0);assert.equal(monthlyBudget('bad'),null);assert.equal(monthlyBudget(''),20);
});
test('monthly aggregation deduplicates conversations and responses and excludes next month',async()=>{
  const db=new DatabaseSync(':memory:'),store=sqliteUsageStore(db),tracker=createUsageTracker(store);
  try{
    tracker.conversation('session-a');tracker.conversation('session-a');tracker.response('session-a',payload);tracker.response('session-a',payload);await flush();
    const summary=await tracker.summary();assert.equal(summary.conversations,1);assert.ok(Math.abs(summary.cost-.000155)<1e-12);assert.equal(summary.incomplete,false);
    const row={conversation_id:'other',kind:'usage',estimated_cost_usd:5};
    store.insert({...row,event_id:'old',created_at:'2025-12-31T23:59:59.999Z'});
    store.insert({...row,event_id:'start',created_at:'2026-01-01T00:00:00.000Z'});
    store.insert({...row,event_id:'end',created_at:'2026-02-01T00:00:00.000Z'});
    assert.equal(store.summary(monthRange(new Date('2026-01-31T23:59:59Z'))).cost,5);
  }finally{db.close();}
});
test('remaining is clamped and analytics failures never reject chat messages',async()=>{
  const previous={...process.env};process.env.OPENAI_MONTHLY_BUDGET_USD='20';process.env.OPENAI_API_KEY='fixture';process.env.CHAT_AI_ENABLED='true';
  try{
    const tracker=createUsageTracker({insert(){throw Error('offline');},summary(){return {cost:21,conversations:1};}});
    const service=createConversationService({usage:tracker});let result;
    await service.handle({method:'POST',headers:{},socket:{remoteAddress:'test'}},'/api/chat/turn',{token:newSession(),language:'en',message:'hello',consent:true,turnKey:randomUUID()},(status,data)=>result={status,...data});
    assert.equal(result.status,200);await flush();const summary=await tracker.summary();assert.equal(summary.remaining,0);assert.equal(summary.exceeded,true);assert.equal(summary.incomplete,true);
    assert.deepEqual(await createUsageTracker({summary(){throw Error('offline');}}).summary(),{available:false});
  }finally{process.env=previous;}
});
test('billed tokens survive an incomplete OpenAI response without storing patient content',async()=>{
  const old={...process.env};process.env.OPENAI_API_KEY='fixture';process.env.CHAT_AI_ENABLED='true';const rows=[];
  try{
    const tracker=createUsageTracker({insert:row=>rows.push(row)});
    const service=createConversationService({usage:tracker,getFacts:async()=>({}),fetcher:async()=>({ok:true,json:async()=>({...payload,status:'incomplete',output:[]})})});
    await service.handle({method:'POST',headers:{},socket:{remoteAddress:'test'}},'/api/chat/turn',{token:newSession(),language:'en',message:'Can you tell me about osteopathy?',consent:true,turnKey:randomUUID()},()=>{});
    await flush();const usage=rows.find(row=>row.kind==='usage');assert.equal(usage.input_tokens,1000);assert.equal(JSON.stringify(rows).includes('osteopathy'),false);
  }finally{process.env=old;}
});
