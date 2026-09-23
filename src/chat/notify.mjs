export const emailConfigured=()=>Boolean(process.env.RESEND_API_KEY&&process.env.CHAT_NOTIFY_FROM&&process.env.CHAT_NOTIFY_TO);
export async function notifyRequest(row,store,fetcher=fetch){
  if(!emailConfigured())return 'not_configured';
  if(row.notification_status==='sent')return 'sent';
  let status='failed';
  try{
    const origin=process.env.APP_ORIGIN||process.env.RENDER_EXTERNAL_URL||'';
    // No health details in email; the full handoff stays behind the staff login.
    const response=await fetcher('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(6000),headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`citypraxis-chat-${row.submission_key}`},body:JSON.stringify({from:process.env.CHAT_NOTIFY_FROM,to:process.env.CHAT_NOTIFY_TO.split(',').map(x=>x.trim()),subject:`Citypraxis · Neue Anfrage #${row.id}`,text:`Eine neue Anfrage vom digitalen Empfang wurde gespeichert.\nBitte im geschützten Admin-Bereich prüfen: ${origin}/admin\n\nDies ist keine Terminbestätigung.`})});
    if(response.ok)status='sent';
  }catch{/* Delivery failure must never discard the stored request. */}
  try{await store.notification(row.id,status);}catch{/* The pending state remains visible for staff to retry. */}
  return status;
}
