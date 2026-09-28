import {summaryRows} from './chat-model.js';
export const defaultConcerns=[{title:'Kiefer',titleEn:'Jaw'},{title:'Kopf & Migräne',titleEn:'Headaches & migraine'},{title:'Tinnitus',titleEn:'Tinnitus'},{title:'Schwindel',titleEn:'Dizziness'},{title:'Unfall & OP',titleEn:'Injury & surgery'},{title:'Kindergesundheit',titleEn:"Children's health"},{title:'Logopädie',titleEn:'Speech therapy'},{title:'Massage',titleEn:'Massage'},{title:'Andere Beschwerden',titleEn:'Other concern',custom:true}];
const additionalConcerns=defaultConcerns.slice(5,8);
export function normalizeAppointmentConcerns(configured){
  const items=Array.isArray(configured)&&configured.length?configured:defaultConcerns;
  const concerns=items.map(item=>({...item}));
  for(const addition of additionalConcerns){
    if(!concerns.some(item=>item.title===addition.title||item.titleEn===addition.titleEn)){
      const firstCustom=concerns.findIndex(item=>item.custom===true);
      concerns.splice(firstCustom<0?concerns.length:firstCustom,0,{...addition});
    }
  }
  return concerns;
}
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
  const status={existing:['Ja — bereits in Behandlung','Yes — treated here before'],new:['Nein — noch nicht','No — not yet'],unsure:['Ich bin nicht sicher',"I'm not sure"]}[d.patient_status_claimed]||[];
  const contact={email:['E-Mail','Email'],phone:['Telefon','Phone'],either:['Beides passt','Either is fine']}[d.preferred_contact]||[];
  return [source,[en?'Name':'Name',row.name],[en?'Patient status (self-reported)':'Patientenstatus (eigene Angabe)',status[en?1:0]],[en?'Email':'E-Mail',row.email],[en?'Phone':'Telefon',row.phone],[en?'Preferred contact':'Bevorzugter Kontakt',contact[en?1:0]],[en?'Preferred therapist':'Gewünschte Betreuung',d.therapist?.name],[en?'Selected concerns':'Ausgewählte Beschwerden',(d.concerns||[]).map(c=>en?(c.titleEn||c.title):c.title).join(', ')],[en?'Other concern':'Andere Beschwerden',d.other_concern],[en?'Your short description':'Ihre kurze Beschreibung',d.description],[en?'Availability note':'Hinweis zur Verfügbarkeit',d.availability],[en?'Urgent request':'Akutanfrage',row.acute?(en?'Yes':'Ja'):(en?'No':'Nein')]].filter(([,v])=>typeof v==='string'&&v.trim());
}
