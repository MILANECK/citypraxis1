import {fullName,nameSegment,receiptLanguage,contactPreference} from './conversation-details.mjs';

const weekdays=[['Monday','Montag'],['Tuesday','Dienstag'],['Wednesday','Mittwoch'],['Thursday','Donnerstag'],['Friday','Freitag'],['Saturday','Samstag'],['Sunday','Sonntag']];
const dayPattern=/\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag)s?\b/giu;
const correctionCue=/\b(?:no sorry|no[,]? (?:sorry|I mean)|actually|ach nein|nein[,]? (?:ich meine|ich meinte)|(?:I |ich )?(?:mean|meant|meine|meinte))\b/iu;
const changeCue=/\b(?:chang\w*|correct\w*|replace|edit|änder\w*|aender\w*|geändert|geaendert|korrigier\w*)\b/iu;
const temporalCue=/\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag)s?\b|\b(?:flexib\w*|anytime|any time|no preference|keine Präferenz|egal|morning|afternoon|evening|mornings|afternoons|evenings|vormittag\w*|nachmittag\w*|abend\w*|tomorrow|next week|next month|morgen|nächste Woche|nächsten Monat|after|before|nach|vor|ab|between|zwischen)\b|\d\s*(?::\d\d|Uhr|am\b|pm\b)/iu;

export function pauseRequested(raw){
  return /\b(?:pause|wait (?:a moment|please)|need a (?:break|moment)|stop (?:for now|a moment)|hold on|einen Moment|kurz warten|bitte warten|brauche (?:eine Pause|einen Moment))\b/iu.test(raw)
    ||/\b(?:don['’]t|do not|not ready to|noch nicht|nicht jetzt)\s+(?:send|submit|senden|absenden)\b/iu.test(raw);
}
export function resumeRequested(raw){
  return /\b(?:ready to (?:continue|resume)|we can (?:continue|resume)|let['’]s (?:continue|resume)|resume (?:now|please)|wir können weitermachen|weiter(?:machen)?|fortfahren|fortsetzen)\b/iu.test(raw)
    &&!/\b(?:not|nicht|don['’]t|do not)\b/iu.test(raw);
}
export function asksMissingDetails(raw){
  return /\b(?:what (?:else |information )?(?:do you (?:still )?need|is (?:still )?missing)|what(?:'s| is) (?:still )?missing|what else should I (?:provide|send)|was (?:braucht|benötigt|fehlt)|welche (?:Angaben|Informationen).{0,30}(?:fehlen|brauchen|benötigen))\b/iu.test(raw);
}
export function asksDraftSummary(raw){
  return /\b(?:summari[sz]e|summary|zusammenfassen|Zusammenfassung)\b|\b(?:fass\w*|fassen Sie)\b.{0,250}\bzusammen\b/iu.test(raw)&&!/\b(?:privacy|Datenschutz|retention|policy|Löschfrist)\b/iu.test(raw);
}
export function informationOnly(raw){
  return /\b(?:only (?:want |need )?(?:information|info)|just (?:want |need )?(?:information|info)|nur (?:Information(?:en)?|Info|informieren)|noch keine (?:Anfrage|Buchung))\b/iu.test(raw);
}
export function mentionsExistingAppointment(raw){
  return !/^\s*(?:if|when|what if|wenn|falls|angenommen)\b/iu.test(raw)
    &&/\b(?:I have an? (?:existing|booked) appointment|my (?:existing|booked) appointment|ich habe (?:schon|bereits) (?:einen )?Termin|meinen? (?:bestehenden|gebuchten) Termin)\b/iu.test(raw);
}
export function ambiguousCancellation(raw){
  const phrase=raw.trim().replace(/^(?:yes|ja|okay|ok)[,\s]+(?:and |und )?/iu,'');
  return /^(?:please )?(?:cancel|stop) (?:that|it)(?: please)?[.!?\s]*$/iu.test(phrase)
    ||/^(?:bitte )?(?:das|diesen?) (?:bitte )?(?:absagen|stornieren|abbrechen)[.!?\s]*$/iu.test(phrase);
}
export function requestedEdits(raw){
  if(!changeCue.test(raw)||raw.includes('?')&&/^\s*(?:how|why|wie|warum)\b/iu.test(raw))return [];
  const fields=[];
  const preference=Boolean(contactPreference(raw)),receipt=Boolean(receiptLanguage(raw));
  if(/\b(?:phone|telephone|number|Telefonnummer|Rufnummer|Handynummer)\b/iu.test(raw)&&!/\+\d|\b0\d{6}/u.test(raw)&&(!preference||/\b(?:phone number|telephone number|Telefonnummer|Rufnummer|Handynummer)\b/iu.test(raw)))fields.push('phone');
  if(/\b(?:e-?mail|mailadresse)\b/iu.test(raw)&&!raw.includes('@')&&(!(preference||receipt)||/\b(?:e-?mail address|E-Mail-Adresse|Mailadresse)\b/iu.test(raw)))fields.push('email');
  if(/\b(?:name|surname|Vorname|Nachname|Namen)\b/iu.test(raw)&&!fullName(raw))fields.push('name');
  if(/\b(?:availability|preferred day|day|time|Tag|Uhrzeit|Verfügbarkeit)\b/iu.test(raw)&&!days(raw).length&&!/\d/.test(raw))fields.push('availability');
  return fields;
}
const days=raw=>[...raw.matchAll(dayPattern)];
const strip=raw=>raw.trim().replace(/[.!?]+$/u,'').trim();
function canonicalDay(raw,lang){const found=weekdays.find(pair=>pair.some(day=>new RegExp(`^${day}s?$`,'iu').test(raw)));return found?.[lang==='de'?1:0]||raw;}

// Interpret only explicit timing content. Relative edits use the saved snapshot;
// instructions and unsupported guesses never become an availability note.
export function availabilityUpdate(raw,previous='',lang='en',{stage=false}={}){
  const original=strip(raw),mentions=days(original),oldDays=days(previous);
  const clear=/\b(?:forget|remove|delete|clear|vergessen|vergiss|entfernen|löschen|streichen)\b/iu.test(original)
    &&(mentions.length||/\b(?:availability|day|time|Verfügbarkeit|Tag|Uhrzeit)\b/iu.test(original));
  if(clear)return {clear:true};
  let phrase=original;
  const cue=correctionCue.exec(phrase);
  if(cue&&mentions.length>1){
    const last=mentions.findLast(day=>day.index>cue.index);
    if(last)phrase=phrase.slice(last.index).replace(/\b(?:I mean|I meant|meinte ich|ich meinte)\b/giu,'').replace(/\s+/gu,' ').trim();
  }
  const instead=/\b(?:instead of|rather than|statt)\b/iu.exec(phrase);
  if(instead&&mentions.length>1){
    const replacement=mentions.find(day=>day.index<instead.index);
    if(replacement){
      const day=canonicalDay(replacement[0],lang),old=oldDays[0];
      const sameTime=/\b(?:same time|time (?:stays|remains)|Uhrzeit bleibt|gleiche Uhrzeit)\b/iu.test(original);
      const suffix=sameTime&&old?previous.slice(old.index+old[0].length).trim():phrase.slice(0,instead.index).slice(replacement.index+replacement[0].length).trim();
      return suffix?{value:`${day} ${suffix}`}:{value:day};
    }
  }
  const sameDay=/\b(?:same day|gleiche[rmn]? Tag)\b/iu.test(phrase);
  if(sameDay){
    if(oldDays.length!==1)return {unresolved:true};
    const time=/(?:\b(?:after|before|from|nach|vor|ab)\s+\d{1,2}(?::\d{2})?(?:\s*(?:Uhr|am|pm))?)/iu.exec(phrase)?.[0];
    if(!time)return {unresolved:true};
    const cleanTime=lang==='de'&&!/Uhr\b/iu.test(time)?`${time} Uhr`:time;
    return {value:`${canonicalDay(oldDays[0][0],lang)} ${cleanTime}`};
  }
  if(/\b(?:same (?:time|day)|gleiche[rmn]? (?:Tag|Uhrzeit)|ändert? das|change that|you decide|Sie entscheiden)\b/iu.test(phrase))return {unresolved:true};
  if(temporalCue.test(phrase)&&!raw.includes('?')&&(/@|\b(?:e-?mail|phone|telephone|Telefonnummer|Name|physiotherap\w*|Physiotherapie|pain|discomfort|Schmerzen|Beschwerden)\b/iu.test(raw)||changeCue.test(raw)))return {needsModel:true};
  if(raw.includes('?')||requestedEdits(raw).length||pauseRequested(raw)||!temporalCue.test(phrase))return stage?{unresolved:true}:null;
  // Clock words without an AM/PM qualifier remain uncertain rather than being
  // silently converted to an afternoon hour. Ask once for an explicit time.
  if(/\b(?:after|before|nach|vor|ab)\s+(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|eins|zwei|drei|vier|fünf|fuenf|sechs|sieben|acht|neun|zehn|elf|zwölf)\b/iu.test(phrase))return {unresolved:true,clock:true,day:days(phrase).at(-1)?.[0]||null};
  return {value:phrase.slice(0,200)};
}

export function proxyDetails(raw,draft){
  const relation=/\b(?:for my|für meine[nr]?|um meine[nr]?)\s+(mother|father|husband|wife|partner|child|son|daughter|Mutter|Mama|Vater|Papa|Mann|Ehemann|Frau|Ehefrau|Partner\w*|Kind|Sohn|Tochter)\b/iu.exec(raw);
  const cue=/(?:\b(?:the patient is|(?:the )?patient['’]s name is|(?:die )?Patientin heißt|(?:der )?Patient heißt|(?:die |der )?Patient(?:in)? ist|(?:my |mein(?:e|en)? )?(?:husband|wife|mother|father|Mutter|Vater|Mann|Frau) (?:is|heißt))\s+)([^,;!?\n]{2,100})/iu.exec(raw);
  const pronoun=(relation||draft.request_for)?/\b(?:he is|she is|his name is|her name is|er heißt|sie heißt|er ist|sie ist)\s+([^,;!?\n]{2,100})/iu.exec(raw):null;
  const candidate=(cue||pronoun)?nameSegment((cue||pronoun)[1]).split(/\s+(?:and|und)\s+/iu)[0]:null;
  const patient=candidate?fullName(candidate,{explicit:true}):null;
  if(!relation&&!patient)return null;
  const contactName=draft.contact_name||[draft.first_name,draft.last_name].filter(Boolean).join(' ');
  const ownContacts=/\b(?:email|e-mail|mail|phone|Telefonnummer|Telefon)\b.{0,50}\b(?:mine|my own|mir|meine)\b/iu.test(raw);
  return {patient,contact_name:contactName||null,request_for:relation?.[1]||draft.request_for||'another person',contact_details_owner:ownContacts?'sender':draft.contact_details_owner||null};
}
