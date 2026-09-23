import {parsePhoneNumberFromString} from 'libphonenumber-js/max';
import {choices,needsAvailability,needsDiscipline,needsLocation,needsReferral,summaryText} from '../../public/chat-model.js';
export class ChatError extends Error{constructor(code,status=400){super(code);this.code=code;this.status=status;}}
export const error=code=>{throw new ChatError(code);};
export const emailValid=value=>typeof value==='string'&&value.length<=200&&/^[^\s@.][^\s@]*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/i.test(value)&&!value.includes('..');
export const nonsense=value=>/(.)\1{9,}|\b(?:buy crypto|click here|viagra|casino bonus|free bitcoin)\b|https?:\/\//iu.test(value)||!/[\p{L}\p{N}]/u.test(value);
export function text(value,max,{required=false}={}){
  if(value===undefined&&!required)return '';
  if(typeof value!=='string'||value.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))error('invalid_text');
  const clean=value.trim();if(required&&(!clean||nonsense(clean)))error('invalid_text');return clean;
}
export function name(value){const clean=text(value,48,{required:true});if(!/^[\p{L}\p{M}][\p{L}\p{M} .'’\-]*$/u.test(clean)||clean.length<2||/(.)\1{4,}/iu.test(clean))error('invalid_name');return clean;}
export function phone(value){const raw=text(value,40,{required:true}),parsed=parsePhoneNumberFromString(raw,{defaultCountry:'AT',extract:false});if(raw.replace(/\D/g,'').length<7||!parsed?.isValid())error('invalid_phone');return parsed.number;}
const option=(field,value)=>{if(typeof value!=='string'||!Object.hasOwn(choices[field],value))error('invalid_choice');return value;};
const options=(field,value)=>{if(!Array.isArray(value)||!value.length||value.length>12)error('invalid_choice');const unique=[...new Set(value.map(v=>option(field,v)))];if(unique.includes('flexible')&&unique.length>1)error('invalid_choice');return unique;};
export function normalizeIntake(input){
  if(!input||typeof input!=='object'||Array.isArray(input))error('invalid_request');
  if(input.consent!==true||input.review_confirmed!==true)error('consent_required');
  const d={version:1,language:input.language==='en'?'en':'de',first_name:name(input.first_name),last_name:name(input.last_name),email:text(input.email,200,{required:true}).toLowerCase(),phone:phone(input.phone),request_type:option('request_type',input.request_type),patient_status_claimed:option('patient_status_claimed',input.patient_status_claimed),preferred_contact:option('preferred_contact',input.preferred_contact)};
  if(!emailValid(d.email))error('invalid_email');
  d.description=text(input.description,650,{required:!['appointment_request','change_request','cancellation_request','therapist_change'].includes(d.request_type)});
  if(d.description&&nonsense(d.description))error('invalid_description');
  if(d.patient_status_claimed==='existing')d.previous_therapist=text(input.previous_therapist,100);
  d.preferred_therapist=text(input.preferred_therapist,100);
  if(needsDiscipline(d))d.discipline=option('discipline',input.discipline);
  if(needsLocation(d)){d.body_area=options('body_area',input.body_area);d.problem_location_raw=text(input.problem_location_raw,300);}
  if(needsReferral(d))d.referral_claimed=option('referral_claimed',input.referral_claimed);
  if(['change_request','cancellation_request'].includes(d.request_type))d.appointment_details=text(input.appointment_details,200);
  if(needsAvailability(d)){d.preferred_days=options('preferred_days',input.preferred_days);d.preferred_times=options('preferred_times',input.preferred_times);d.availability_notes=text(input.availability_notes,200);}
  if(d.preferred_contact!=='email')d.callback_time=option('callback_time',input.callback_time);
  d.initial_message_raw=text(input.initial_message_raw,650);
  d.consent=true;d.consent_version='digital-reception-2026-09';d.review_confirmed=true;d.ai_consent=input.ai_consent===true;
  // Provenance comes only from server-validated interpretation receipts, never browser claims.
  d.interpretations=[];d.summary_source='scripted';d.request_summary=summaryText(d,d.language);
  return d;
}
