import test from 'node:test';
import assert from 'node:assert/strict';
import {BudgetLedger,jsonFile} from './support.mjs';
import {additionalAllowance} from './extension.mjs';
import {EvidenceLog} from './support.mjs';
import {BrowserAdapter} from './browser.mjs';
import {createSandbox} from './sandbox.mjs';
import {resolve} from 'node:path';
const base=jsonFile(new URL('./config.example.json',import.meta.url));
function setup(){const config={...base},ledger=new BudgetLedger(config);Object.assign(ledger,{requests:1890,usedTokens:11874509,estimatedUsd:4.58746315,guardUsd:4.8168363075,priorElapsedMs:2365646});return {config,ledger,resumed:{runId:'prior',metadata:{finishedAt:'2026-10-10'}}};}
test('additional allowance adds exactly the new cap without resetting old spend/time/usage',()=>{
 const {config,ledger,resumed}=setup();const a=additionalAllowance(config,ledger,resumed,{usd:5,minutes:40});
 assert.ok(Math.abs(config.budgetUsd-9.8168363075)<1e-12);assert.equal(config.maxMinutes,2365646/60000+40);assert.equal(ledger.requests,1890);assert.equal(ledger.estimatedUsd,4.58746315);assert.equal(a.startGuardUsd,4.8168363075);
});
test('an extension requires a completed predecessor and stays within explicit allowance',()=>{
 const {config,ledger,resumed}=setup();assert.throws(()=>additionalAllowance(config,ledger,null,{usd:5,minutes:40}),/completed_prior/);
 assert.throws(()=>additionalAllowance(config,ledger,resumed,{usd:6,minutes:40}),/owner_allowance/);assert.throws(()=>additionalAllowance(config,ledger,resumed,{usd:5,minutes:41}),/owner_allowance/);
});
test('resuming the added series does not grant the additional money or time twice',()=>{
 const {config,ledger,resumed}=setup();const a=additionalAllowance(config,ledger,resumed,{usd:5,minutes:40});ledger.guardUsd+=1;ledger.priorElapsedMs+=600000;
 const again=additionalAllowance(config,ledger,{metadata:{activeAdditionalAllowance:a}});assert.deepEqual(again,a);assert.equal(config.budgetUsd,a.startGuardUsd+5);assert.equal(config.maxMinutes,a.startExecutionSeconds/60+40);
});
test('new requests are refused when the incremental allowance is exhausted',()=>{
 const {config,ledger,resumed}=setup();const a=additionalAllowance(config,ledger,resumed,{usd:5,minutes:40});ledger.guardUsd=a.cumulativeUsdLimit;
 assert.throws(()=>ledger.reserve({model:'gpt-6-luna',max_output_tokens:100,input:'hello'},'target'),/spend_limit/);assert.equal(ledger.requests,1890);
 ledger.guardUsd=a.startGuardUsd;ledger.priorElapsedMs=(a.cumulativeMinutesLimit*60+1)*1000;assert.throws(()=>ledger.reserve({model:'gpt-6-luna',max_output_tokens:100,input:'hello'},'target'),/time_limit/);
});
test('actual Start again UI clears client draft and starts a different consented session without model calls',async()=>{
 const log=new EvidenceLog(resolve('test-results/organic/discard-validation')),ledger=new BudgetLedger(base,log),sandbox=await createSandbox({apiKey:'offline-no-model-call',targetModel:'gpt-6-luna',ledger,log,campaign:true});
 const adapter=new BrowserAdapter(sandbox,log,'discard-validation','en');adapter.browserChannel='chrome';adapter.testHeaders={'X-Organic-Conversation-Id':adapter.id,'X-Forwarded-For':'192.0.2.1'};
 try{await sandbox.preflight();await adapter.begin();await adapter.act({action:'message',message:'Hello'});const beforeRecords=sandbox.records().length,beforeEmails=sandbox.notifications.length;
  const evidence=await adapter.discardDraft();assert.equal(evidence.differentSession,true);assert.equal(evidence.clientDraftCleared,true);assert.equal(ledger.requests,0);assert.equal(sandbox.records().length,beforeRecords);assert.equal(sandbox.notifications.length,beforeEmails);
 }finally{await adapter.close(resolve('test-results/organic/discard-validation'));await sandbox.close();}
});
