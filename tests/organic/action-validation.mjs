// Known public clinic contacts may be referenced in patient questions. They are
// not new patient identities. Unknown addresses remain outside the fixed fixture.
export function validPatientAction(a,v,p,publicEmails=[]){
 if(a.action==='stop')return true;
 const option=v.availableActions.find(o=>o.action===a.action);if(!option)return false;
 if(a.action==='message'){
  if(!a.message.trim()||a.message.length>650)return false;
  const allowed=[p.email,p.initialEmail,p.correctedEmail,...publicEmails].filter(Boolean);
  if((a.message.match(/[^\s@]+@[^\s@]+\.[a-z]{2,}/giu)||[]).some(e=>!allowed.includes(e.replace(/[.,;!?]+$/u,''))))return false;
  if(p.refusePhone&&a.message.replace(/\D/gu,'').includes(p.phone.replace(/\D/gu,'')))return false;
 }
 if(a.action==='edit'&&!option.fields.includes(a.field))return false;
 if(a.action==='choice'&&!option.fields[a.field]?.includes(a.value))return false;
 if(a.action==='submit'&&(!p.wantsSubmit||p.refusePhone))return false;
 return true;
}
