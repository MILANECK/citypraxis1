import {text,phone,emailValid,ChatError} from './chat/validation.mjs';
import {normalizeAppointmentConcerns} from '../public/request-summary.js';
export const validTherapistId=value=>typeof value==='string'&&/^[a-z0-9-]{1,100}$/.test(value);
export function requestPreference(body,therapist,settings={}){
  const language=body.language==='en'?'en':'de';
  const available=normalizeAppointmentConcerns(settings.appointmentConcerns);
  const incoming=body.concerns===undefined?(body.concern?[body.concern]:[]):body.concerns;
  if(!Array.isArray(incoming)||incoming.length>20)throw new ChatError('invalid_choice');
  const concerns=[];
  for(const value of incoming){
    if(typeof value!=='string'||value.length>100)throw new ChatError('invalid_choice');
    const found=available.find(c=>c.title===value||c.titleEn===value);
    if(!found)throw new ChatError('invalid_choice');
    if(!concerns.some(c=>c.title===found.title))concerns.push({title:found.title,titleEn:found.titleEn||found.title,custom:found.custom===true});
  }
  const symptoms=text(body.symptoms,220),preference=text(body.preference,300);
  const other=concerns.some(c=>c.custom)?symptoms:'';
  const intake={version:1,kind:'appointment_form',source:therapist?'therapist_profile':'first_appointment',language,concerns,other_concern:other,availability:preference,therapist:therapist?{id:therapist.id,name:text(therapist.title,120),role:therapist.role||''}:null,consent:true,consent_version:'appointment-email-2026-09'};
  // The old 300-character note remains a preview; complete answers live in intake.
  const note=[therapist?`WunschtherapeutIn: ${therapist.title.replace(/[\r\n]+/g,' ')}`:'',concerns.length?`Anliegen: ${concerns.map(c=>c.title).join(', ')}${other?` – ${other}`:''}`:'',preference].filter(Boolean).join('\n');
  return {value:note.length>300?note.slice(0,299)+'…':note,intake};
}
export function validateFormContact(body){
  if(body.consent!==true||body.website)throw new ChatError('consent_required');
  const name=text(body.name,100,{required:true}),email=text(body.email,200,{required:true}).toLowerCase();
  if(!emailValid(email))throw new ChatError('invalid_email');
  return {name,email,phone:phone(body.phone),acute:body.acute===true};
}
