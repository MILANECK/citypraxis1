import {summaryRows} from './chat-model.js';
export const defaultConcerns=[{title:'Kiefer',titleEn:'Jaw'},{title:'Kopf & Migräne',titleEn:'Headaches & migraine'},{title:'Tinnitus',titleEn:'Tinnitus'},{title:'Schwindel',titleEn:'Dizziness'},{title:'Unfall & OP',titleEn:'Injury & surgery'},{title:'Andere Beschwerden',titleEn:'Other concern',custom:true}];
export function requestSource(intake){
  if(intake?.kind==='digital_reception')return 'chatbot';
  return intake?.therapist?.id?'therapist_profile':'first_appointment';
}
export function sourceLabel(intake,lang='de'){
  return {chatbot:['Chatbot','Chatbot'],therapist_profile:['Therapeutenprofil','Therapist profile'],first_appointment:['Ersttermin-Formular','First-appointment form']}[requestSource(intake)][lang==='en'?1:0];
}
export function requestRows(row,lang='de'){
  const en=lang==='en',d=row.intake||{},source=[en?'Source':'Herkunft',sourceLabel(d,lang)];
  if(d.kind==='digital_reception')return [source,...summaryRows(d,lang)];
  return [source,[en?'Name':'Name',row.name],[en?'Email':'E-Mail',row.email],[en?'Phone':'Telefon',row.phone],[en?'Preferred therapist':'Gewünschte Betreuung',d.therapist?.name],[en?'Selected concerns':'Ausgewählte Beschwerden',(d.concerns||[]).map(c=>en?(c.titleEn||c.title):c.title).join(', ')],[en?'Other concern':'Andere Beschwerden',d.other_concern],[en?'Best time to contact':'Gut erreichbar',d.availability],[en?'Urgent request':'Akutanfrage',row.acute?(en?'Yes':'Ja'):(en?'No':'Nein')]].filter(([,v])=>typeof v==='string'&&v.trim());
}
