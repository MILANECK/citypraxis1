import {parsePhoneNumberFromString} from 'libphonenumber-js/max';

export const recentCutoff=()=>new Date(Date.now()-24*60*60*1000).toISOString();
export const normalizedEmail=value=>String(value||'').trim().toLowerCase();
export function normalizedPhone(value){
  const raw=String(value||'').trim();
  if(!raw)return '';
  const parsed=parsePhoneNumberFromString(raw,{defaultCountry:'AT',extract:false});
  return parsed?.isValid()?parsed.number:'';
}
export function requestTime(value){
  const raw=String(value||'');
  return Date.parse(/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(raw)?raw.replace(' ','T')+'Z':raw);
}
export function matchingRecent(rows,contact,cutoff=recentCutoff()){
  const phone=normalizedPhone(contact.phone),email=normalizedEmail(contact.email),since=Date.parse(cutoff);
  return rows.filter(row=>row.status!=='closed'&&requestTime(row.created_at)>=since&&(
    phone&&normalizedPhone(row.phone)===phone||email&&normalizedEmail(row.email)===email
  )).sort((a,b)=>{
    const phoneA=phone&&normalizedPhone(a.phone)===phone,phoneB=phone&&normalizedPhone(b.phone)===phone;
    return Number(phoneB)-Number(phoneA)||requestTime(b.created_at)-requestTime(a.created_at);
  });
}
export function markPossibleDuplicates(rows,cutoff=recentCutoff()){
  const since=Date.parse(cutoff),groups=new Map();
  const recent=rows.filter(row=>row.status!=='closed'&&requestTime(row.created_at)>=since);
  const recentIds=new Set(recent.map(row=>String(row.id)));
  for(const row of recent){
    for(const key of [normalizedPhone(row.phone)&&`phone:${normalizedPhone(row.phone)}`,normalizedEmail(row.email)&&`email:${normalizedEmail(row.email)}`].filter(Boolean)){
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(row.id);
    }
  }
  return rows.map(row=>{
    const related=new Set();
    if(recentIds.has(String(row.id)))for(const key of [normalizedPhone(row.phone)&&`phone:${normalizedPhone(row.phone)}`,normalizedEmail(row.email)&&`email:${normalizedEmail(row.email)}`].filter(Boolean))for(const id of groups.get(key)||[])if(String(id)!==String(row.id))related.add(id);
    return {...row,possible_duplicate_ids:[...related]};
  });
}
