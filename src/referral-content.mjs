import {referralPolicy} from './referral-policy.mjs';

export const referralContentTargets=[['pages','ablauf-wahltherapie'],['faqs','verordnung'],['faqs','ersttermin'],...['physiotherapie','osteopathie','logopaedie','heilmassage'].map(id=>['services',id])];
const append=(body,copy)=>body?.includes(copy)?body:[body?.trim(),copy].filter(Boolean).join('\n\n');
function section(body,heading,copy){
  const source=String(body||'');
  const headers=[...source.matchAll(/^##\s+[^\n]+/gmu)];
  const index=headers.findIndex(match=>heading.test(match[0]));
  if(index<0)return append(source,copy);
  const start=headers[index].index,end=headers[index+1]?.index??source.length;
  return [source.slice(0,start).trimEnd(),copy,source.slice(end).trimStart()].filter(Boolean).join('\n\n');
}

// A one-time content migration: patch referral text while preserving other edits,
// media, pricing, reimbursement wording and draft/publication state.
export function applyReferralContent(collection,id,record){
  if(!record||!referralContentTargets.some(([c,i])=>c===collection&&i===id))return record;
  const updated={...record};
  const first={de:'Bitte bringen Sie Ihre Verordnung zum Ersttermin vor Ort mit.',en:'Please bring your referral with you to your first appointment at the practice.'};
  if(collection==='faqs'&&id==='verordnung')Object.assign(updated,{body:referralPolicy.body,bodyEn:referralPolicy.bodyEn});
  else if(collection==='faqs'){
    updated.body=append(String(record.body||'').replace('Bringen Sie Ihre Verordnung und vorhandene relevante Befunde mit.','Bringen Sie vorhandene relevante Befunde mit.'),referralPolicy.body);
    updated.bodyEn=append(record.bodyEn,referralPolicy.bodyEn);
  }else if(collection==='pages'){
    updated.body=section(record.body,/Verordnungsschein|Ärztliche Verordnung/u,'## Verordnungsschein\n\n'+referralPolicy.body);
    updated.bodyEn=section(record.bodyEn,/Medical referral/u,'## Medical referral\n\n'+referralPolicy.bodyEn);
    updated.step1Body=referralPolicy.body;updated.step1BodyEn=referralPolicy.bodyEn;
  }else if(id==='heilmassage'){
    const de='Für Heilmassage ist eine ärztliche Verordnung optional und nicht erforderlich. Wenn Sie eine haben, bringen Sie sie bitte zum Ersttermin vor Ort mit.';
    const en='For therapeutic massage, a medical referral is optional and not required. If you have one, please bring it with you to your first appointment at the practice.';
    updated.body=append(String(record.body||'').replace(/Wir ersuchen Sie daher[^.!]*Verordnung zur Heilmassage[^.!]*[.!]/u,'').replace('Bitte klären Sie die erforderliche Verordnung vor Ihrem ersten Termin.','').trim(),de);
    updated.bodyEn=append(String(record.bodyEn||'').replace(/Ideally, therefore,[^.!]*therapeutic massage referral[^.!]*[.!]/u,'').trim(),en);
  }else{
    const names={physiotherapie:['Physiotherapie','physiotherapy'],osteopathie:['Osteopathie','osteopathy'],logopaedie:['Logopädie','speech and language therapy']}[id];
    updated.body=section(record.body,/Verordnungspflicht Osteopathie|Ärztliche Verordnung/u,`## Ärztliche Verordnung\n\nFür ${names[0]} ist eine ärztliche Verordnung/Zuweisung/Überweisung erforderlich. ${first.de}`);
    updated.bodyEn=section(record.bodyEn,/Referral requirement for osteopathy|Medical referral/u,`## Medical referral\n\nA medical referral/prescription is required for ${names[1]}. ${first.en}`);
  }
  return updated;
}
