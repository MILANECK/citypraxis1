import {parsePhoneNumberFromString} from 'libphonenumber-js/max';
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
