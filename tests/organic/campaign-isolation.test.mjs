import test from 'node:test';
import assert from 'node:assert/strict';
import {AsyncLocalStorage} from 'node:async_hooks';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {EvidenceLog,BudgetLedger,jsonFile,knownUsageBound,patientActionSchema} from './support.mjs';
import {createSandbox,EndpointAdapter} from './sandbox.mjs';
import {sqliteChatStore} from '../../src/chat/store.mjs';
import {notifyPatient} from '../../src/chat/notify.mjs';

const root=resolve(fileURLToPath(new URL('../../',import.meta.url))),config=jsonFile(new URL('./config.example.json',import.meta.url));
test('parallel reservations share one cap before either request completes',()=>{
 const body={model:'gpt-6-luna',max_output_tokens:100,input:'hello'},probe=new BudgetLedger(config),bound=probe.reserve(body,'target').costBound;
 const ledger=new BudgetLedger({...config,budgetUsd:bound*1.5});const first=ledger.reserve(body,'target');
 assert.throws(()=>ledger.reserve(body,'simulator'),/spend_limit/);assert.equal(ledger.requests,1);
 ledger.settle(first,{usage:{input_tokens:2,output_tokens:1}});const second=ledger.reserve(body,'simulator');assert.equal(ledger.requests,2);assert.ok(second.costBound+ledger.guardUsd<ledger.config.budgetUsd);
});

test('complete disjoint usage reconciles the reservation without billing the same input twice',()=>{
 const rates={...config.ratesPerMillion['gpt-6-luna'],boundInput:0.1,boundWrite:0.125,boundOutput:0.5};
 const usage={input_tokens:20,output_tokens:10,input_tokens_details:{cached_tokens:5,cache_write_tokens:10}};
 assert.ok(Math.abs(knownUsageBound(usage,rates)-0.0000068)<1e-12);
 assert.throws(()=>knownUsageBound({...usage,input_tokens:14},rates),/invalid_usage_breakdown/);
 const ledger=new BudgetLedger({...config,knownUsagePriceBound:true,ratesPerMillion:{'gpt-6-luna':rates}});const reservation=ledger.reserve({model:'gpt-6-luna',max_output_tokens:100,input:'hello'},'target');
 ledger.settle(reservation,{usage});assert.ok(Math.abs(ledger.guardUsd-ledger.estimatedUsd*1.05)<1e-12);
});

test('patient schema follows real UI affordances without permitting typing into review or editing a choice field',()=>{
 const review=patientActionSchema({availableActions:[{action:'submit'},{action:'edit',fields:['email','availability']},{action:'choice',fields:{patient_status:['new','existing','unsure']}}]});
 assert.equal(review.type,'object');assert.ok(!review.anyOf);const branches=review.properties.decision.anyOf;
 assert.ok(!branches.some(branch=>branch.properties.action.enum.includes('message')));
 assert.deepEqual(branches.find(branch=>branch.properties.action.enum.includes('edit')).properties.field.enum,['email','availability']);
 const choice=branches.find(branch=>branch.properties.action.enum.includes('choice'));assert.deepEqual(choice.properties.field.enum,['patient_status']);assert.deepEqual(choice.properties.value.enum,['new','existing','unsure']);
 const composing=patientActionSchema({availableActions:[{action:'message'}]});assert.deepEqual(composing.properties.decision.anyOf.map(branch=>branch.properties.action.enum[0]),['stop','message']);
});

test('concurrent synthetic clients and injected failures remain scoped to their own sandbox records',async()=>{
 const context=new AsyncLocalStorage(),log=new EvidenceLog(join(root,'test-results','organic','campaign-isolation-validation')),original=log.event.bind(log);log.event=(type,data={})=>original(type,{...context.getStore(),...data});
 const ledger=new BudgetLedger(config,log),sandbox=await createSandbox({apiKey:'offline-no-model-call',targetModel:'gpt-6-luna',ledger,log,context,campaign:true});
 try{
  await sandbox.preflight();assert.ok(sandbox.db.prepare('PRAGMA database_list').all().every(row=>!row.file));
  const adapters=['de','en'].map((lang,i)=>{const a=new EndpointAdapter(sandbox,log,`parallel-${lang}`,lang);a.testHeaders={'X-Organic-Conversation-Id':a.id,'X-Forwarded-For':`192.0.2.${i+1}`};return a;});
  await Promise.all(adapters.map(a=>a.begin()));assert.notEqual(adapters[0].token,adapters[1].token);
  const replies=await Promise.all(adapters.map(a=>a.act({action:'message',message:a.language==='de'?'Hallo':'Hello'})));assert.equal(replies[0].language,'de');assert.equal(replies[1].language,'en');
  sandbox.db.exec("CREATE TEMP TRIGGER reject_only_one BEFORE INSERT ON requests WHEN NEW.email='rejected@organic.example.test' BEGIN SELECT RAISE(ABORT,'organic_sandbox_rejection'); END");
  const insert=sandbox.db.prepare('INSERT INTO requests(name,email,phone,intake,submission_key,notification_status) VALUES(?,?,?,?,?,?)');
  const intake=JSON.stringify({kind:'digital_reception',language:'en',first_name:'Synthetic',last_name:'Patient',description:'Synthetic fixture',review_confirmed:true});
  assert.throws(()=>insert.run('Rejected Synthetic','rejected@organic.example.test','+12025550100',intake,'reject','pending'),/organic_sandbox_rejection/);
  const failedId=insert.run('Failed Synthetic','failed@organic.example.test','+12025550101',intake,'failed','pending').lastInsertRowid;
  const normalId=insert.run('Normal Synthetic','normal@organic.example.test','+12025550102',intake,'normal','pending').lastInsertRowid;
  sandbox.faults.emailFailureFor=new Set(['failure']);const store=sqliteChatStore(sandbox.db),failed=await store.get(failedId),normal=await store.get(normalId);
  const statuses=await Promise.all([context.run({conversationId:'failure'},()=>notifyPatient(failed)),context.run({conversationId:'normal'},()=>notifyPatient(normal))]);
  assert.deepEqual(statuses,['failed','sent']);assert.deepEqual(sandbox.notifications.slice(-2).map(e=>[e.conversationId,e.result]),[['failure','failed'],['normal','sandbox_accepted']]);
  assert.equal(sandbox.records().length,2);assert.equal(ledger.requests,0);assert.ok(sandbox.notifications.every(e=>e.deliveredExternally===false));
 }finally{await sandbox.close();}
});
