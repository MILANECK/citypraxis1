import {createHash} from 'node:crypto';
import {ChatError,normalizeIntake,name,phone,emailValid,text} from './validation.mjs';
import {newSession,sign,verify,clientAddress,makeLimiter} from './security.mjs';
import {interpret,aiEnabled,safetySignal} from './interpret.mjs';
import {defaults,label} from '../../public/chat-model.js';
import {emailConfigured,notifyRequest,notifyPatient} from './notify.mjs';

export function createChatService({store,getSettings=async()=>({}),fetcher=fetch}){
  const limit=makeLimiter();
  async function config(){
    const s=await getSettings();
    return {aiAvailable:aiEnabled(),emergencyDe:s.chatEmergency||defaults.emergencyDe,emergencyEn:s.chatEmergencyEn||defaults.emergencyEn,medicalDe:defaults.medicalDe,medicalEn:defaults.medicalEn};
  }
  async function handle(req,path,body,json){
    if(!path.startsWith('/api/chat/'))return false;
    try{
      const ip=clientAddress(req);limit(`all:${ip}`,180);
      if(path==='/api/chat/session'&&req.method==='GET'){
        limit(`session:${ip}`,25);const token=newSession();json(200,{token,expires:verify(token,'session').expires,...await config()});return true;
      }
      if(req.method!=='POST')throw new ChatError('not_found',404);
      const session=verify(body.token,'session');
      if(path==='/api/chat/interpret'){
        limit(`interpret:${session.id}`,20);limit(`interpret-ip:${ip}`,70);
        let allowAI=body.aiConsent===true&&aiEnabled();
        // Per-process circuit breaker bounds paid calls, including failed attempts.
        if(allowAI){try{limit('ai-budget',Math.max(1,Math.min(2000,Number(process.env.CHAT_AI_DAILY_LIMIT)||200)),86400000);}catch{allowAI=false;}}
        const raw=text(body.raw,650,{required:true});
        const result=await interpret({raw,context:body.context,aiConsent:allowAI},fetcher);
        const receipt=Object.keys(result.suggestions).length?sign({kind:'interpretation',sessionId:session.id,expires:session.expires,raw,context:body.context,suggestions:result.suggestions,source:result.source,confidence:result.confidence}):null;
        json(200,{...result,receipt});return true;
      }
      if(path==='/api/chat/contact'){
        limit(`contact:${session.id}`,25);
        const contact={first_name:name(body.first_name),last_name:name(body.last_name),phone:phone(body.phone),email:text(body.email,200,{required:true}).toLowerCase()};
        if(!emailValid(contact.email))throw new ChatError('invalid_email');
        json(200,contact);return true;
      }
      if(path==='/api/chat/submit'){
        limit(`submit:${session.id}`,10);limit(`submit-ip:${ip}`,15);
        if(body.website)throw new ChatError('invalid_request');
        const intake=normalizeIntake(body.data);
        const free=[intake.description,intake.problem_location_raw,intake.initial_message_raw,intake.availability_notes,intake.appointment_details].filter(Boolean).join('\n');
        if(safetySignal(free)==='emergency')throw new ChatError('emergency',400);
        if(body.receipts!==undefined&&(!Array.isArray(body.receipts)||body.receipts.length>12))throw new ChatError('invalid_request');
        for(const token of body.receipts||[]){
          const r=verify(token,'interpretation');if(r.sessionId!==session.id)throw new ChatError('invalid_receipt');
          const confirmed=Object.fromEntries(Object.entries(r.suggestions).filter(([k,v])=>JSON.stringify(intake[k])===JSON.stringify(v)));
          if(Object.keys(confirmed).length)intake.interpretations.push({raw:r.raw,context:r.context,values:confirmed,source:r.source,confidence:r.confidence,confirmed_by_visitor:true});
        }
        intake.kind='digital_reception';
        intake.fingerprint=createHash('sha256').update(JSON.stringify(intake)).digest('hex');
        intake.submitted_at=new Date().toISOString();
        const result=await store.save({name:`${intake.first_name} ${intake.last_name}`,email:intake.email,phone:intake.phone,preference:label('request_type',intake.request_type,'de'),intake,submission_key:session.id,notification_status:emailConfigured()?'pending':'not_configured'});
        if(result.row.intake?.fingerprint!==intake.fingerprint)throw new ChatError('already_submitted',409);
        let patientReceipt='not_configured';
        if(result.created){await notifyRequest(result.row,store,fetcher);patientReceipt=await notifyPatient(result.row,fetcher);}
        json(result.created?201:200,{id:result.row.id,received:true,duplicate:!result.created,patientReceipt});return true;
      }
      throw new ChatError('not_found',404);
    }catch(error){
      // Never log visitor text, contact details, tokens or upstream error bodies.
      const expected=error instanceof ChatError;
      if(!expected)console.error('Digital reception: storage or configuration unavailable');
      json(expected?error.status:503,{code:expected?error.code:'unavailable'});return true;
    }
  }
  async function retryNotification(id){
    if(!/^\d+$/.test(String(id)))throw new ChatError('invalid_request');
    limit('email-retry',30);
    const row=await store.get(id);if(!['digital_reception','appointment_form'].includes(row?.intake?.kind))throw new ChatError('not_found',404);
    return {status:await notifyRequest(row,store,fetcher)};
  }
  return {handle,retryNotification};
}
