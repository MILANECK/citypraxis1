import {requestRows,sourceLabel} from '../../public/request-summary.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const emailConfigured=()=>Boolean(process.env.RESEND_API_KEY&&process.env.CHAT_NOTIFY_FROM&&process.env.CHAT_NOTIFY_TO);
function patientReceiptSender(row){
  if(!process.env.RESEND_API_KEY||!row?.email)return null;
  const testRecipient=(process.env.CHAT_NOTIFY_TO||'').split(',').some(address=>address.trim().toLowerCase()===row.email.toLowerCase());
  const configured=process.env.PATIENT_CONFIRMATION_FROM?.trim();
  const sender=configured||(testRecipient?process.env.CHAT_NOTIFY_FROM:null);
  if(!sender||/@resend\.dev\b/i.test(sender)&&!testRecipient)return null;
  return sender;
}
export const patientReceiptConfigured=row=>Boolean(patientReceiptSender(row));
export function requestEmail(row){
  const source=sourceLabel(row.intake,'de'),rows=requestRows(row,'de');
  const base=process.env.RENDER_EXTERNAL_URL||process.env.APP_ORIGIN||'';
  let adminUrl='';try{const url=new URL(base);if(['http:','https:'].includes(url.protocol))adminUrl=url.origin+'/admin';}catch{}
  const subject=`Citypraxis · ${source}${row.acute?' · AKUT':''} · Anfrage #${row.id}`;
  const note='Dies ist eine Anfrage, keine Terminbestätigung. Das Sekretariat vereinbart den Termin telefonisch oder per E-Mail.';
  const text=[subject,'',...rows.map(([k,v])=>`${k}: ${v}`),'',note,adminUrl?`Im Admin öffnen: ${adminUrl}`:''].join('\n');
  const html=`<!doctype html><html lang="de"><body style="margin:0;background:#F6F4F1;font-family:Arial,sans-serif;color:#222344"><table role="presentation" style="width:100%;padding:28px 12px"><tr><td align="center"><table role="presentation" style="width:100%;max-width:620px;background:#ffffff;border-radius:18px;border-collapse:separate"><tr><td style="padding:28px 30px 20px;border-bottom:1px solid #e7e4df"><div style="font-size:22px;letter-spacing:-1px">CITY<strong>PRAXIS</strong></div><p style="color:#0085ac;font-size:12px;letter-spacing:1px;margin:20px 0 8px">${esc(source.toUpperCase())}${row.acute?' · AKUT':''}</p><h1 style="font-size:25px;margin:0">Neue Anfrage #${esc(row.id)}</h1></td></tr><tr><td style="padding:12px 30px 28px"><table role="presentation" style="width:100%;border-collapse:collapse">${rows.map(([k,v])=>`<tr><td style="padding:14px 0;border-bottom:1px solid #eceef0"><div style="font-size:11px;color:#606679;margin-bottom:5px">${esc(k)}</div><div style="font-size:15px;line-height:1.6;white-space:pre-wrap;overflow-wrap:anywhere">${esc(v)}</div></td></tr>`).join('')}</table><p style="font-size:12px;line-height:1.7;color:#606679;margin-top:24px">${note}</p>${adminUrl?`<a href="${esc(adminUrl)}" style="display:inline-block;background:#951b81;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-size:13px">Anfrage im Admin öffnen</a>`:''}</td></tr></table></td></tr></table></body></html>`;
  return {subject,text,html,...(row.email?{reply_to:row.email}:{})};
}
export function patientConfirmationEmail(row){
  const en=row.intake?.language==='en';
  const rows=requestRows(row,en?'en':'de').filter(([key])=>!['Source','Herkunft'].includes(key));
  const subject=en?'CityPraxis · We received your request':'Citypraxis · Wir haben Ihre Anfrage erhalten';
  const greeting=en?`Thank you for contacting CityPraxis, ${row.name}.`:`Vielen Dank für Ihre Anfrage bei der Citypraxis, ${row.name}.`;
  const note=en?'We have received the details below. This is not an appointment confirmation. Our reception team will contact you by phone or email as soon as possible to arrange the next step.':'Wir haben Ihre unten aufgeführten Angaben erhalten. Dies ist noch keine Terminbestätigung. Unser Sekretariat meldet sich so bald wie möglich telefonisch oder per E-Mail, um den nächsten Schritt zu vereinbaren.';
  const closing=en?'Thank you for contacting us.':'Vielen Dank, dass Sie sich an uns gewandt haben.';
  const text=[greeting,'',note,'',...rows.map(([key,value])=>`${key}: ${value}`),'',closing].join('\n');
  const html=`<!doctype html><html lang="${en?'en':'de'}"><body style="margin:0;background:#f6f4f1;font-family:Arial,sans-serif;color:#222344"><table role="presentation" style="width:100%;padding:28px 12px"><tr><td align="center"><table role="presentation" style="width:100%;max-width:620px;background:#fff;border-radius:18px;border-collapse:separate"><tr><td style="padding:28px 30px 20px;border-bottom:1px solid #e7e4df"><div style="font-size:22px;letter-spacing:-1px">CITY<strong>PRAXIS</strong></div><h1 style="font-size:25px;line-height:1.3;margin:22px 0 0">${esc(greeting)}</h1></td></tr><tr><td style="padding:20px 30px 30px"><p style="font-size:15px;line-height:1.7;margin:0 0 20px">${esc(note)}</p><table role="presentation" style="width:100%;border-collapse:collapse">${rows.map(([key,value])=>`<tr><td style="padding:12px 0;border-bottom:1px solid #eceef0"><div style="font-size:11px;color:#606679;margin-bottom:5px">${esc(key)}</div><div style="font-size:15px;line-height:1.6;white-space:pre-wrap;overflow-wrap:anywhere">${esc(value)}</div></td></tr>`).join('')}</table><p style="font-size:13px;line-height:1.7;color:#606679;margin:24px 0 0">${esc(closing)}</p></td></tr></table></td></tr></table></body></html>`;
  return {subject,text,html};
}
export async function notifyPatient(row,fetcher=fetch){
  const sender=patientReceiptSender(row);
  if(!sender)return 'not_configured';
  try{
    const response=await fetcher('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(6000),headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`citypraxis-patient-${row.submission_key}`},body:JSON.stringify({from:sender,to:[row.email],...patientConfirmationEmail(row)})});
    return response.ok?'sent':'failed';
  }catch{return 'failed';}
}
export async function notifyRequest(row,store,fetcher=fetch){
  if(!emailConfigured())return 'not_configured';
  if(row.notification_status==='sent')return 'sent';
  let status='failed';
  try{
    const response=await fetcher('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(6000),headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`citypraxis-request-${row.submission_key}`},body:JSON.stringify({from:process.env.CHAT_NOTIFY_FROM,to:process.env.CHAT_NOTIFY_TO.split(',').map(x=>x.trim()),...requestEmail(row)})});
    if(response.ok)status='sent';
  }catch{/* Delivery failure must never discard the stored request. */}
  try{await store.notification(row.id,status);}catch{/* The pending state remains visible for staff to retry. */}
  return status;
}
