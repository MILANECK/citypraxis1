import {name,text} from './validation.mjs';

const particles=/^(?:von|van|de|del|der|den|da|di|du|la|le|zu|zur)$/iu;
const titles=/^(?:dr\.?|prof\.?|mag\.?|dipl\.?-?ing\.?|di\.?|msc\.?|bsc\.?)$/iu;
const namePrefix=/^(?:my (?:full |first and last )?name is|ich heiße|ich heisse|mein (?:vollständiger |vollstaendiger |vor- und nach)?name ist|(?:full name|name|vor-\s*und\s+nachname)\s*[:=])\s*/iu;
export function fullName(raw,{explicit=false}={}){
  const clean=raw.trim().replace(/[.!?]+$/u,'').trim();
  explicit ||= namePrefix.test(clean);
  const parts=clean.replace(namePrefix,'').split(/\s+/u);
  if(parts.length<2||parts.length>6)return null;
  if(/^(?:thank|thanks|danke|vielen|yes|no|not|please|hello|hi|hey|ich|i|my|can|could|what|where|when|why|how|wie|was|wann|wo|warum|kann|guten|good|okay|ok|email|e-mail|mail|phone|telefon|flexible|flexibel|same|previous|auf|in)$/iu.test(parts[0]))return null;
  if(parts.some(part=>!/^[\p{L}\p{M}][\p{L}\p{M}.'’\-]*$/u.test(part)||/^(?:and|und|because|since|want|need|have|am|bin|möchte|habe|bitte|please)$/iu.test(part)))return null;
  if(!explicit&&parts.length>2&&parts.some(part=>!particles.test(part)&&!titles.test(part)&&part[0]!==part[0].toLocaleUpperCase()))return null;
  let surnameStart=parts.length-1;
  while(surnameStart>1&&particles.test(parts[surnameStart-1]))surnameStart--;
  if(parts.slice(0,surnameStart).every(part=>titles.test(part)))return null;
  try{return {first_name:name(parts.slice(0,surnameStart).join(' ')),last_name:name(parts.slice(surnameStart).join(' '))};}catch{return null;}
}
export function explicitFullName(raw){
  const cue=/(?:^|[^\p{L}\p{M}])(?:my (?:full |first and last )?name is|ich heiße|ich heisse|mein (?:vollständiger |vollstaendiger |vor- und nach)?name ist|(?:full name|name|vor-\s*und\s+nachname)\s*[:=])\s*([^,;!?\n]{2,150})/iu.exec(raw);
  if(!cue)return null;
  const candidate=nameSegment(cue[1]);
  return fullName(candidate,{explicit:true});
}
export function nameSegment(raw){
  // A sentence boundary ends the introduction regardless of the next pronoun.
  // Keep title/initial periods (Prof. Dr., Anna M.) inside the supplied name.
  let candidate=raw.split(/\s+(?:and|und)\s+(?=I\b|my\b|ich\b|meine?\b)|\s+(?=\S+@\S+|\+\d)/iu)[0];
  for(const boundary of candidate.matchAll(/[.!?](?=\s|$)/gu)){
    const preceding=candidate.slice(0,boundary.index).match(/[^\s.]+$/u)?.[0]||'';
    if(boundary[0]==='.'&&(titles.test(preceding)||/^[\p{L}]$/u.test(preceding)))continue;
    candidate=candidate.slice(0,boundary.index);break;
  }
  return candidate;
}
export function selfReportedPatientStatus(raw){
  if(/^\s*(?:if|wenn|suppose|angenommen)\b/iu.test(raw))return null;
  // A common transposition in an explicit self-report is not a guessed status.
  raw=raw.replace(/\b(my|mein(?:e|en|er)?)\s+frist\s+(visit|appointment|Besuch|Termin)\b/giu,'$1 first $2');
  if(/\b(?:(?:es|das|dies|dieses) (?:ist|wäre|waere) mein erste[rsn]? (?:besuch|termin)|ich (?:komme|bin) (?:hier |bei ihnen )?zum ersten mal)\b/iu.test(raw))return 'new';
  if(/(?:^|[,;])\s*(?:first visit|new patient|erstbesuch|ersttermin|zum ersten mal)(?=\s*[,;.]|\s*$)/iu.test(raw)||/\bbin (?:no|noch) (?:ned|net|nicht) bei euch (?:gwesn|gewesen)\b/iu.test(raw))return 'new';
  if(/\b(?:i(?:'m| am) not sure|ich bin (?:mir )?nicht sicher)\b.{0,70}\b(?:patient|treated|been here|behandlung|bei ihnen)\b/iu.test(raw))return 'unsure';
  if(/\b(?:i(?:'m| am) (?:a )?new patient|(?:this (?:is|would be)|it(?:'s| is)) my first (?:visit|appointment)|i (?:have never|haven't|have not) (?:been|had|received).{0,40}(?:here|your practice|citypraxis)|ich bin (?:ein(?:e)? )?neue?r? patient\w*|(?:mein|das ist mein) erste[rn]? termin|ich (?:war|bin|wurde).{0,30}(?:noch nicht|nie).{0,35}(?:bei ihnen|hier|behandelt)|ich (?:war|bin) (?:noch )?nie bei ihnen)\b/iu.test(raw))return 'new';
  if(/\b(?:i(?:'m| am) (?:an? )?(?:existing|returning) patient|i (?:have (?:already )?been|was) (?:treated|a patient).{0,35}(?:here|your practice|citypraxis)|i(?:'ve| have) been here before|ich bin (?:bereits |schon )?(?:bei ihnen in behandlung|bestandspatient\w*)|ich (?:war|bin|wurde).{0,25}(?:bereits|schon|früher).{0,35}(?:bei ihnen|hier|behandelt))\b/iu.test(raw))return 'existing';
  return null;
}
export function receiptLanguage(raw){
  const preference=/\b(?:email|e-mail|mail|receipt|copy|confirmation|bestätigung|bestaetigung|kopie)\b[^.;!?]{0,65}?\b(?:in|to|auf)\s+(english|german|englisch|deutsch)\b/iu.exec(raw)
    ||/\b(english|german|englische?|deutsche?)\b.{0,20}(?:mail|receipt|copy|bestätigung|kopie)/iu.exec(raw);
  if(!preference||/\b(?:not|nicht|keine?)\b.{0,15}\b(?:english|german|englisch|deutsch)/iu.test(preference[0]))return null;
  return /^(?:english|englisch)/iu.test(preference[1])?'en':'de';
}
export function contactPreference(raw){
  const changed=/\b(?:change|switch|ändern|umstellen)\b.{0,70}\b(?:to|auf)\s+(?:contact by |per |by )?(e-?mail|phone|telephone|Telefon)\b/iu.exec(raw);
  if(changed&&!/\b(?:don't|don’t|do not|nicht)\b/iu.test(changed[0]))return /^e-?mail$/iu.test(changed[1])?'email':'phone';
  const method=/(?:\b(?:e-?mail)\s+only\b|\b(?:only|prefer|rather|lieber|nur)\b.{0,45}\be-?mail\b)|\b(?:contact|notify|notified|reach|kontaktieren|benachrichtig\w*|erreichen)\b.{0,30}\b(?:by|via|per)?\s*e-?mail\b/iu.test(raw)?'email':/\b(?:prefer|rather|lieber|nur)\b.{0,45}\b(?:phone|telephone|call|telefon\w*|anruf)\b|\b(?:contact|notify|notified|reach|kontaktieren|benachrichtig\w*|erreichen)\b.{0,30}\b(?:by|via|per)?\s*(?:phone|telephone|call|telefon\w*)\b/iu.test(raw)?'phone':null;
  if(/\b(?:don't|do not|won't|will not|keine|nicht)\b.{0,45}\b(?:notif\w*|contact\w*|benachrichtig\w*|kontakt\w*)\b.{0,25}(?:e-?mail)/iu.test(raw))return 'phone';
  return method;
}
export function requestedTreatment(raw){
  if(!/\b(?:i(?:['’]d| would)? (?:like|want|need|request|am looking for)|i['’]m looking for|(?:she|he|the patient) (?:needs|wants|requests)|ich (?:möchte|moechte|will|brauche|hätte gerne|haette gerne|suche)|(?:sie|er|die Patientin|der Patient) (?:braucht|möchte|wünscht)|bitte (?:um )?eine?)\b/iu.test(raw))return null;
  if(/\b(?:not|don't|do not|kein\w*|nicht|instead of|statt)\b.{0,25}\b(?:physio\w*|osteopath\w*|massage|speech|logop\w*)/iu.test(raw))return null;
  return /\b(?:physiotherap\w*|physio|osteopath\w*|(?:therapeutic |heil)?massage|speech(?: and language)? therapy|logopädie|logopaedie)\b/iu.exec(raw)?.[0]||null;
}
export function existingAppointmentChange(raw){
  return /\b(?:my (?:existing |booked )?appointment|(?:meinen?|mein(?:en)? bestehenden|bereits vereinbarten) termin)\b/iu.test(raw)
    &&/\b(?:change|reschedul\w*|cancel\w*|move|verschieb\w*|änder\w*|aender\w*|absag\w*|stornier\w*)\b/iu.test(raw)
    &&!/^\s*(?:if|wenn|what if|was wenn)\b/iu.test(raw);
}
const referenceWords=/\b(?:same|previous(?:ly)?|prior|earlier|before|original|old (?:one|email|number|time)|first (?:choice|one|time|email|number)|again|as above|vorher\w*|vorhin|zuvor|frühere\w*|alte(?:n?|r?) (?:mail|e-mail|nummer|zeit)|ursprünglich\w*|urspruenglich\w*|zuerst|erste\w*|wie oben|wie gesagt)\b/iu;
export function fieldReference(raw,stage,draft,history={},snapshot){
  if(!referenceWords.test(raw)||/\b(?:what|why|how|was|warum|wieso)\b/iu.test(raw))return null;
  if(raw.includes('@')||/\+\d|\b(?:first visit|first appointment|erstbesuch|ersttermin)\b/iu.test(raw))return null;
  const field=/\b(?:e-?mail|mail|mailadresse)\b/iu.test(raw)?'email':/\b(?:phone|telephone|telefonnummer|nummer)\b/iu.test(raw)?'phone':/\b(?:availability|time|times|day|days|verfügbarkeit|verfuegbarkeit|zeiten?|tage?)\b/iu.test(raw)||stage==='availability'?'availability':['email','phone'].includes(stage)?stage:null;
  if(!field)return null;
  const values=[...(history[field]||[])];
  const previous=snapshot?.draft?.[field]||draft[field];
  if(previous&&values.at(-1)!==previous)values.push(previous);
  const first=/\b(?:original|first (?:choice|one|time|email|number)|ursprünglich\w*|urspruenglich\w*|zuerst|erste\w*)\b/iu.test(raw);
  // "Same as before" keeps the last stated detail. "The previous/old email"
  // rolls back the last change; it must not silently select the current value.
  const rollback=/\b(?:previous(?:ly)?|prior|earlier|old (?:one|email|number|time)|before (?:the |my )?(?:change|correction)|von vorher|von vorhin|vorherige\w*|frühere\w*|alte(?:n?|r?) (?:mail|e-mail|nummer|zeit))\b/iu.test(raw)
    ||/\b(?:email|e-mail|mail|number|phone|time)\b.{0,25}\b(?:from before|from earlier)\b/iu.test(raw);
  const value=first?values[0]:rollback?values.findLast(value=>value!==previous)||previous:values.at(-1);
  if(!value)return {field,value:null};
  // A day explicitly named in a reference must agree with the saved value.
  const days=[['monday','montag'],['tuesday','dienstag'],['wednesday','mittwoch'],['thursday','donnerstag'],['friday','freitag'],['saturday','samstag'],['sunday','sonntag']];
  const mentionsDay=(phrase,word)=>new RegExp(`\\b${word}s?\\b`,'iu').test(phrase);
  const mentioned=days.find(day=>day.some(word=>mentionsDay(raw,word)));
  if(field==='availability'&&mentioned&&!mentioned.some(word=>mentionsDay(value,word)))return {field,value:null};
  return {field,value:text(value,field==='availability'?200:200)};
}
export function rememberFields(state,previous,draft){
  state.fieldHistory ||= {};
  for(const field of ['email','phone','availability']){
    const values=state.fieldHistory[field] ||= [];
    if(previous[field]&&values.at(-1)!==previous[field])values.push(previous[field]);
    if(draft[field]&&values.at(-1)!==draft[field])values.push(draft[field]);
  }
}
