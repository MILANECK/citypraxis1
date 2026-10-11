// Practice policy confirmed by Isa and supplied by the owner on 11 October 2026.
export const referralPolicy={
  version:'2026-10-11',
  source:'Owner-supplied practice confirmation, 11 October 2026',
  required:['physiotherapie','osteopathie','logopaedie'],
  optional:['heilmassage'],
  bringTo:'first appointment at the practice',
  collectInChat:false,
  body:'Für Physiotherapie, Osteopathie und Logopädie ist eine ärztliche Verordnung/Zuweisung/Überweisung erforderlich. Für Heilmassage ist eine Verordnung optional und nicht erforderlich. Bitte bringen Sie Ihre Verordnung zum Ersttermin vor Ort mit, sofern Sie eine haben.',
  bodyEn:'A medical referral/prescription is required for physiotherapy, osteopathy and speech and language therapy. For therapeutic massage, a referral is optional and not required. Please bring your referral with you to your first appointment at the practice if you have one.'
};

export const referralChatReminder=language=>language==='en'
  ?'Please bring your referral to your first appointment; please do not send it here in chat.'
  :'Bitte bringen Sie Ihre Verordnung zum Ersttermin mit; bitte senden Sie sie nicht hier im Chat.';

const referralWords=/(?<![\p{L}\p{N}_])(?:verordnung(?:sschein|en)?|zuweisung|überweisung|ueberweisung|referrals?|prescriptions?)(?![\p{L}\p{N}_])/iu;
const otherTopics=/(?<![\p{L}\p{N}_])(?:prices?|costs?|fees?|insurance|reimbursement|refund|payment|pay|cash|hours|open|closed|duration|lasts?|long|therapists?|team|qualifications?|address|location|privacy|book|booking|request|appointment request|cancel\w*|reschedul\w*|preis\w*|kosten|gebühren|krankenkasse|rückerstattung|erstattung|zahlung|bezahlen|öffnungszeit\w*|offen|geschlossen|dauer|dauert|therapeut(?:en|innen|in)?|qualifikation\w*|adresse|datenschutz|terminanfrage|vereinbaren|buchen|absag\w*|verschieb\w*|medication|medicine|drugs?|medikament\w*|befund|diagnos\w*|symptoms?|symptom\w*|pain|schmerzen|exercises?|übungen)(?![\p{L}\p{N}_])/iu;

// Only focused administrative questions use this fixed answer. Mixed questions,
// patient details and booking requests still go through normal interpretation.
export function focusedReferralReply(raw,language,history=[]){
  if(raw.length>350||otherTopics.test(raw)||/@|\+\d/u.test(raw)||/\b(?:my name|ich heiße|mein name|i (?:want|would like)|ich (?:möchte|will)|how much|approval|approve\w*|valid\w*|expir\w*|bewilligung\w*|gültig\w*)\b/iu.test(raw)||/\b(?:need|want|would like|möchte|will|brauche)\b.{0,45}\b(?:appointment|termin)\b/iu.test(raw))return null;
  const previous=history.filter(item=>item.role==='assistant').at(-1)?.text||'';
  const followUp=/^(?:and|what about|how about|und|auch)\b/iu.test(raw.trim())&&referralWords.test(previous);
  if(!referralWords.test(raw)&&!followUp)return null;
  const de=/(?<![\p{L}\p{N}_])(?:verordnung(?:sschein|en)?|zuweisung|überweisung|ueberweisung|brauche|benötige|muss|mitbringen|logopädie|logopaedie|und|auch)(?![\p{L}\p{N}_])/iu.test(raw);
  const en=/\b(?:referrals?|prescriptions?|need|bring|require|what about|how about)\b/iu.test(raw);
  // Substantive language mixing is handled by the normal language gate.
  if(de&&en)return null;
  const lang=de?'de':en?'en':language;
  const massage=/\b(?:massage|heilmassage|therapeutic massage)\b/iu.test(raw);
  const physio=/\b(?:physiotherap\w*|physio)\b/iu.test(raw);
  const osteo=/\bosteopath\w*\b/iu.test(raw);
  const speech=/\b(?:logopädie|logopaedie|speech(?: and language)? therapy|speech therapy)\b/iu.test(raw);
  const definition=/\b(?:was (?:ist|bedeutet)|was meinst|was meinen|what (?:is|does)|what do you mean)\b/iu.test(raw);
  const owns=/\b(?:habe|hab|besitze|have|got)\b/iu.test(raw)&&!/\b(?:nicht|kein\w*|not|don't|do not)\b/iu.test(raw);
  const transfer=/\b(?:upload\w*|send|submit|attach|senden|schicken|hochladen)\b/iu.test(raw);
  const requirement=/\b(?:need\w*|require\w*|mandatory|compulsory|necessary|obligatory|brauche|braucht|benötige|benötigt|muss|erforderlich|notwendig|verpflichtend)\b/iu.test(raw);
  const bringing=/\b(?:bring|mitbringen|mitnehmen)\b/iu.test(raw);
  if(!definition&&!owns&&!transfer&&!requirement&&!bringing&&!followUp)return null;
  let answer;
  if(transfer)answer=lang==='en'?'Please bring your referral to your first appointment at the practice. I do not collect referral documents here in chat.':'Bitte bringen Sie Ihre Verordnung zum Ersttermin vor Ort mit. Ich nehme hier im Chat keine Verordnungsdokumente entgegen.';
  else if(owns&&!raw.includes('?'))answer=lang==='en'?`Thank you. ${referralChatReminder(lang)}`:`Danke. ${referralChatReminder(lang)}`;
  else{
    const names=[];
    if(physio)names.push(lang==='en'?'physiotherapy':'Physiotherapie');
    if(osteo)names.push(lang==='en'?'osteopathy':'Osteopathie');
    if(speech)names.push(lang==='en'?'speech and language therapy':'Logopädie');
    const required=names.length?names.join(lang==='en'?' and ':' und '):lang==='en'?'physiotherapy, osteopathy and speech therapy':'Physiotherapie, Osteopathie und Logopädie';
    const requirement=massage&&!names.length
      ?lang==='en'?'For therapeutic massage, a referral is optional, not required. If you have one, please bring it to your first appointment. Please do not send it here in chat.':'Für Heilmassage ist eine Verordnung optional und nicht erforderlich. Wenn Sie eine haben, bringen Sie sie bitte zum Ersttermin mit. Bitte senden Sie sie nicht hier im Chat.'
      :lang==='en'?`A medical referral is required for ${required}.${massage||!names.length?' For therapeutic massage it is optional.':''} ${referralChatReminder(lang)}`:`Für ${required} ist eine ärztliche Verordnung erforderlich.${massage||!names.length?' Für Heilmassage ist sie optional.':''} ${referralChatReminder(lang)}`;
    answer=definition?(lang==='en'?'A medical referral is your doctor’s instruction for therapy. ':'Eine ärztliche Verordnung ist die Anordnung der Therapie durch Ihren Arzt oder Ihre Ärztin. ')+requirement:requirement;
  }
  return {answer,language:lang};
}
