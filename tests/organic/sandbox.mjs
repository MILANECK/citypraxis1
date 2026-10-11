import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {openDatabase,contentSnapshot,collections} from '../../src/database.mjs';
import {createApp} from '../../src/server.mjs';
import {conversationFacts} from '../../src/chat/conversation.mjs';
import {sqliteChatStore} from '../../src/chat/store.mjs';
import {notifyRequest,notifyPatient} from '../../src/chat/notify.mjs';
import {paidFetch,sha,HarnessStop} from './support.mjs';

export const safeEmail=value=>typeof value==='string'&&/^[^@\s]+@[^@\s]+\.(?:test|invalid)$/iu.test(value);
export const localOrigin=value=>{const url=new URL(value);if(url.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||url.username||url.password)throw new HarnessStop('endpoint_not_allowlisted');return url.origin;};

export async function createSandbox({apiKey,targetModel,ledger,log,publishedContent=null,context=null,campaign=false}){
  const oldEnv={...process.env},nativeFetch=globalThis.fetch;
  for(const key of Object.keys(process.env))if(/^(?:SUPABASE|RESEND|CHAT_NOTIFY|PATIENT_CONFIRMATION|OPENAI_ADMIN|OPENAI_PROJECT|RENDER|APP_ORIGIN|DB_PATH|TRUST_PROXY)/u.test(key))delete process.env[key];
  Object.assign(process.env,{OPENAI_API_KEY:apiKey,CHAT_AI_ENABLED:'true',CHAT_CONVERSATION_MODEL:targetModel,CHAT_SESSION_SECRET:randomUUID(),RESEND_API_KEY:'sandbox-intercept-only',CHAT_NOTIFY_FROM:'reception@organic.example.test',CHAT_NOTIFY_TO:'sink@organic.example.test',PATIENT_CONFIRMATION_FROM:'receipts@organic.example.test'});
  // Loopback load tests model independent clients through the documented proxy setting.
  // Per-session and per-client limits remain active. No production setting is changed.
  if(campaign)Object.assign(process.env,{TRUST_PROXY_HOPS:'1',CHAT_AI_DAILY_LIMIT:'2000'});
  const db=openDatabase(':memory:'),notifications=[],network=[],faults={emailFailure:false,dbFailure:false};
  if(publishedContent){
    assert.deepEqual(Object.keys(publishedContent).sort(),[...collections].sort(),'Only the public CMS content contract may seed sandbox facts');
    db.exec('DELETE FROM content');
    const insert=db.prepare('INSERT INTO content(collection,id,draft,published) VALUES(?,?,?,?)');
    for(const [collection,records] of Object.entries(publishedContent)){
      assert.ok(Array.isArray(records),'Public content collections must be arrays');
      for(const record of records){assert.equal(typeof record.id,'string');const value=JSON.stringify(record);insert.run(collection,record.id,value,value);}
    }
  }
  db.prepare('INSERT INTO users(email,name,password,role) VALUES(?,?,?,?)').run('staff@organic.example.test','Synthetic Reception','unused-sandbox-password','reception');
  const networkGuard=async(url,options={})=>{
    const href=String(url);network.push({at:new Date().toISOString(),url:href});
    if(href==='https://api.resend.com/emails'){
      const body=JSON.parse(options.body),to=Array.isArray(body.to)?body.to:[body.to];
      assert.ok(safeEmail(body.from)&&to.every(safeEmail),'Only synthetic email addresses may reach the sink');
      const failed=faults.emailFailure||faults.emailFailureFor?.has(context?.getStore()?.conversationId);
      const event=log.event('email_intercepted',{to,from:body.from,subject:body.subject,text:body.text,idempotencyKey:options.headers?.['Idempotency-Key']||null,deliveredExternally:false,result:failed?'failed':'sandbox_accepted'});
      notifications.push(event);
      return {ok:!failed,status:failed?503:200,json:async()=>({id:`sandbox-${notifications.length}`})};
    }
    if(href==='https://api.openai.com/v1/responses'){
      const body=JSON.parse(options.body);
      let payload;
      try{payload=await paidFetch(nativeFetch,ledger,log,body,'target',apiKey,options.signal);}catch(error){log.event('target_transport_stop',{code:error.code||error.name});throw error;}
      log.event('target_model_output',{responseId:payload.id,outputItems:payload.output});
      return {ok:true,status:200,json:async()=>payload};
    }
    log.event('outbound_blocked',{url:href});
    throw new HarnessStop('non_allowlisted_outbound_action');
  };
  globalThis.fetch=networkGuard;
  const server=createApp(db);
  if(context){
    const listeners=server.listeners('request');server.removeAllListeners('request');
    server.on('request',(req,res)=>context.run({conversationId:String(req.headers['x-organic-conversation-id']||'preflight')},()=>{for(const listener of listeners)listener.call(server,req,res);}));
  }
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=localOrigin(`http://127.0.0.1:${server.address().port}`);
  process.env.APP_ORIGIN=origin;
  const rawContent=contentSnapshot(db),facts=conversationFacts(rawContent);
  const records=()=>db.prepare('SELECT id,name,email,phone,submission_key,notification_status,intake FROM requests ORDER BY id').all().map(row=>({...row,intake:JSON.parse(row.intake||'null')}));
  let verified=false;
  async function preflight(){
    const databases=db.prepare('PRAGMA database_list').all();
    assert.ok(databases.every(database=>!database.file),'All attached databases must be memory-only');
    assert.equal(records().length,0);
    const health=await nativeFetch(`${origin}/api/health`).then(response=>response.json());assert.equal(health.backend,'sqlite');
    const id=db.prepare('INSERT INTO requests(name,email,phone,intake,submission_key,notification_status) VALUES(?,?,?,?,?,?)').run('Canary Synthetic','canary@organic.example.test','+12025550100',JSON.stringify({kind:'digital_reception',language:'en',first_name:'Canary',last_name:'Synthetic',description:'Synthetic isolation canary',review_confirmed:true}),`canary-${randomUUID()}`,'pending').lastInsertRowid;
    assert.equal(records().length,1);
    const store=sqliteChatStore(db),row=await store.get(id),before=notifications.length;
    assert.equal(await notifyRequest(row,store,networkGuard),'sent');
    assert.equal(await notifyPatient(row,networkGuard),'sent');
    assert.equal(notifications.length-before,2);
    db.prepare('DELETE FROM requests WHERE id=?').run(id);
    assert.equal(records().length,0);
    await assert.rejects(networkGuard('https://calendar.example.invalid/events'),/non_allowlisted_outbound_action/);
    verified=true;
    const result={verified,origin,database:'SQLite :memory:',databaseList:databases,health,requestsBeforeSmoke:records().length,canaryDatabaseWriteAndRemoval:true,canaryEmailIntercepts:2,externalEmails:0,calendarAndUnknownEgressBlocked:true,notificationStartIndex:notifications.length,supabaseCredentialsPresent:Boolean(process.env.SUPABASE_URL),runContactsOnly:true};
    log.event('isolation_gate',result);return result;
  }
  async function close(){await new Promise(resolve=>server.close(resolve));db.close();globalThis.fetch=nativeFetch;process.env=oldEnv;}
  return {origin,db,nativeFetch,facts,rawContent,records,notifications,network,faults,preflight,close,assertVerified:()=>assert.ok(verified,'Server-side isolation gate must pass before conversation tests')};
}

/** Typed repository endpoint adapter. No staging/production origin is accepted. */
export class EndpointAdapter{
  constructor(sandbox,log,conversationId,language){this.sandbox=sandbox;this.origin=localOrigin(sandbox.origin);this.log=log;this.id=conversationId;this.language=language;this.token=null;this.turnNumber=0;this.current={message:'',ready:false,summary:null};this.calls=[];}
  async request(path,body=null){
    if(!['/api/chat/session','/api/chat/turn','/api/chat/edit','/api/chat/cancel-edit','/api/chat/review-choice','/api/chat/finish'].includes(path))throw new HarnessStop('endpoint_route_not_allowlisted');
    const started=Date.now();
    const response=await this.sandbox.nativeFetch(this.origin+path,body?{method:'POST',headers:{...this.testHeaders,Origin:this.origin,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(35000)}:{headers:this.testHeaders});
    const data=await response.json();
    const redactedBody=body?{...body,token:body.token?`session-${sha(body.token).slice(0,12)}`:undefined}:null;
    const event=this.log.event('endpoint',{conversationId:this.id,path,request:redactedBody,status:response.status,response:path==='/api/chat/session'?{...data,token:`session-${sha(data.token||'').slice(0,12)}`}:data,elapsedMs:Date.now()-started,recordCount:this.sandbox.records().length,emailCount:this.sandbox.notifications.length});
    this.calls.push(event);
    if(path==='/api/chat/session'&&response.ok)this.token=data.token;
    this.current={...data,httpStatus:response.status};if(data.language)this.language=data.language;
    return this.current;
  }
  async begin(){this.sandbox.assertVerified();await this.request('/api/chat/session');return this.visible();}
  async act(action){
    const body={token:this.token,language:this.language};
    if(action.action==='message'){
      if(this.current.ready)throw new HarnessStop('simulator_typed_into_missing_composer');
      return this.request('/api/chat/turn',{...body,message:action.message,consent:true,turnKey:randomUUID(),turnNumber:this.turnNumber++});
    }
    if(action.action==='edit'){if(!this.current.ready)throw new HarnessStop('simulator_edit_without_review');return this.request('/api/chat/edit',{...body,field:action.field});}
    if(action.action==='choice'){if(!this.current.ready)throw new HarnessStop('simulator_choice_without_review');return this.request('/api/chat/review-choice',{...body,field:action.field,value:action.value});}
    if(action.action==='submit'){if(!this.current.ready)throw new HarnessStop('simulator_submit_without_review');return this.request('/api/chat/finish',{...body,confirmed:true});}
    throw new HarnessStop('invalid_adapter_action');
  }
  visible(){
    return {message:this.current.message||'',summary:this.current.summary||[],status:this.current.received?`[Observed endpoint result: HTTP ${this.current.httpStatus}; received=true; request id=${this.current.id}; language=${this.current.language}; patientReceipt=${this.current.patientReceipt}. No patient-visible success copy is measured by this backend adapter.]`:'',language:this.language,availableActions:this.current.received?[]:this.current.requiresChoice?[{action:'duplicate',values:['update','new','cancel']}]:this.current.ready?[{action:'submit',label:'I reviewed these details and want to send my appointment request'},{action:'edit',fields:['name','email','phone','reason','availability']},{action:'choice',fields:{patient_status:['new','existing','unsure'],preferred_contact:['email','phone','either']}}]:[{action:'message'}]};
  }
}
