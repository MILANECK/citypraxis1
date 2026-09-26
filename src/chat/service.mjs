import {ChatError} from './validation.mjs';
import {newSession,verify,clientAddress,makeLimiter} from './security.mjs';
import {aiEnabled} from './safety.mjs';
import {defaults} from '../../public/chat-model.js';
import {notifyRequest} from './notify.mjs';

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
