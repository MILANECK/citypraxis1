import test from 'node:test';
import assert from 'node:assert/strict';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {EvidenceLog,BudgetLedger,jsonFile,validJudgeEvidence,structuredOutput} from './support.mjs';
import {createSandbox,EndpointAdapter,localOrigin,safeEmail} from './sandbox.mjs';
import {BrowserAdapter} from './browser.mjs';

const root=resolve(fileURLToPath(new URL('../../',import.meta.url)));
const config=jsonFile(new URL('./config.example.json',import.meta.url));
const body={model:'gpt-6-luna',max_output_tokens:100,input:'hello'};
const usage={input_tokens:20,output_tokens:10};
const fresh=patch=>new BudgetLedger({...config,...patch},null);

test('structured agent parsing selects the final API message and rejects ambiguous outputs',()=>{
  const message=(phase,text)=>({type:'message',status:'completed',phase,content:[{type:'output_text',text}]});
  assert.deepEqual(structuredOutput({output:[message('commentary','{"draft":true}'),message('final_answer','{"action":"edit"}')]}),{action:'edit'});
  assert.deepEqual(structuredOutput({output:[message(null,'{"action":"message"}')]}),{action:'message'});
  assert.throws(()=>structuredOutput({output:[message(null,'{"one":1}'),message(null,'{"two":2}')]}),/ambiguous_structured_output/);
  assert.throws(()=>structuredOutput({output:[message('final_answer','{"broken":')]}));
});

test('budget admits only bounded requests and stops before overspend, excess tokens and time',()=>{
  assert.throws(()=>fresh({budgetUsd:0.000001}).reserve(body,'target'),/spend_limit/);
  assert.throws(()=>fresh({maxTotalTokens:10}).reserve(body,'target'),/token_limit/);
  assert.throws(()=>fresh({maxRequests:0}).reserve(body,'target'),/request_limit/);
  const expired=fresh();expired.started-=config.maxMinutes*60000;
  assert.throws(()=>expired.reserve(body,'target'),/time_limit/);
  assert.throws(()=>fresh().reserve({...body,model:'unpriced'},'target'),/unverified_model_pricing/);
  assert.throws(()=>fresh().reserve({...body,tools:[{type:'web_search'}]},'target'),/unsupported_unbounded_api_mode/);
  const ledger=fresh(),reservation=ledger.reserve(body,'simulator');ledger.settle(reservation,{usage});
  assert.equal(ledger.summary().reportedTokens,30);assert.equal(ledger.summary().roles.simulator.calls,1);
  assert.equal(ledger.reservedUsd,0);assert.throws(()=>ledger.settle(reservation,{usage}),/settled twice/);
  const cached=fresh();cached.settle(cached.reserve(body,'target'),{usage:{input_tokens:20,output_tokens:10,input_tokens_details:{cached_tokens:5,cache_write_tokens:10}}});
  assert.ok(Math.abs(cached.estimatedUsd-0.0000068)<1e-12,'Cache-write tokens must not also incur an uncached-input charge');
});

test('missing usage charges the reserved upper bound and stops rather than inventing zero',()=>{
  const ledger=fresh(),reservation=ledger.reserve(body,'judge');
  assert.throws(()=>ledger.settle(reservation,null,'timeout'),/usage_unknown_charged_upper_bound/);
  assert.equal(ledger.unknownUsage,1);assert.equal(ledger.guardUsd,reservation.costBound);
  assert.equal(ledger.usedTokens,reservation.tokenBound);assert.equal(ledger.calls[0].estimatedUsd,null);
});

test('remote endpoints and real recipients are rejected; judge cannot invent quoted evidence',()=>{
  assert.equal(localOrigin('http://127.0.0.1:5000'),'http://127.0.0.1:5000');
  for(const endpoint of ['https://citypraxis-wien.onrender.com','http://evil.invalid','http://127.0.0.1.evil.invalid','http://user:pass@localhost'])assert.throws(()=>localOrigin(endpoint),/endpoint_not_allowlisted/);
  assert.ok(safeEmail('patient@organic.example.test'));assert.ok(!safeEmail('patient@gmail.com'));
  const transcript=[{id:'T1',text:'Please show me the summary.'}],policy={rules:[{id:'P-CONSENT'}]};
  const judgement={firstDivergenceTurn:'T1',findings:[{sourceRuleId:'P-CONSENT',turnIds:['T1'],quote:'show me the summary'}],factualClaims:[]};
  assert.ok(validJudgeEvidence(judgement,transcript,policy));
  assert.ok(!validJudgeEvidence({...judgement,firstDivergenceTurn:'T99'},transcript,policy));
  assert.ok(!validJudgeEvidence({...judgement,findings:[{...judgement.findings[0],quote:'send it now'}]},transcript,policy));
});

test('actual server uses an isolated database/email sink and independent signed sessions',async()=>{
  const log=new EvidenceLog(join(root,'test-results','organic','harness-backend-validation')),ledger=fresh();
  const sandbox=await createSandbox({apiKey:'offline-no-model-call',targetModel:'gpt-6-luna',ledger,log});
  try{
    const isolation=await sandbox.preflight();assert.equal(isolation.externalEmails,0);assert.equal(sandbox.notifications.length,2);
    const de=new EndpointAdapter(sandbox,log,'offline-de','de'),en=new EndpointAdapter(sandbox,log,'offline-en','en');
    await de.begin();await en.begin();assert.notEqual(de.token,en.token);
    assert.match((await de.act({action:'message',message:'Hallo'})).message,/Wie kann ich Ihnen helfen/);
    assert.match((await en.act({action:'message',message:'Hello'})).message,/How can I help you/);
    const response=await de.request('/api/chat/finish',{token:de.token,language:'de',confirmed:true});
    assert.ok(response.httpStatus>=400);assert.equal(sandbox.records().length,0);assert.equal(sandbox.notifications.length,2);
    assert.equal(ledger.requests,0);
  }finally{await sandbox.close();}
});

test('real mobile UI adapter opens, exchanges a reply and restores its tab draft in both languages',async()=>{
  const log=new EvidenceLog(join(root,'test-results','organic','harness-browser-validation')),ledger=fresh();
  const sandbox=await createSandbox({apiKey:'offline-no-model-call',targetModel:'gpt-6-luna',ledger,log});
  try{
    await sandbox.preflight();
    for(const language of ['de','en']){
      const adapter=new BrowserAdapter(sandbox,log,`offline-browser-${language}`,language);
      try{
        await adapter.begin();
        const response=await adapter.act({action:'message',message:language==='de'?'Hallo':'Hello'});
        assert.equal(response.language,language);
        const view=await adapter.visible();assert.match(view.message,language==='de'?/Wie kann ich Ihnen helfen/:/How can I help you/);
        const refresh=await adapter.refresh();assert.equal(refresh.after.message,refresh.before.message);
        assert.equal(adapter.pageErrors.length,0);
      }finally{await adapter.close(log.directory);}
    }
    assert.equal(ledger.requests,0);assert.equal(sandbox.records().length,0);
  }finally{await sandbox.close();}
});
