const localized=(lang,de,en)=>lang==='en'?en:de;

function opening(value){
  return value.toLocaleLowerCase().match(/^(?:thank you|thanks|great|i[’']ve noted|vielen dank|danke|ich habe|ihre|alles klar)/u)?.[0]||value.toLocaleLowerCase().split(/[\s,!.]/u)[0];
}
function varied(options,history){
  const recent=history.filter(item=>item.role==='assistant').slice(-4).map(item=>item.text.trim());
  const score=value=>recent.reduce((total,previous,index)=>total+(opening(previous)===opening(value)?index+1:0)+(previous.startsWith(value)?10:0),0);
  return options.reduce((best,value)=>score(value)<score(best)?value:best,options[0]);
}

export function receivedContactFields(before,after){
  return [
    after.first_name&&after.last_name&&(before.first_name!==after.first_name||before.last_name!==after.last_name||before.contact_name!==after.contact_name)?'name':null,
    after.email&&after.email!==before.email?'email':null,
    after.phone&&after.phone!==before.phone?'phone':null
  ].filter(Boolean);
}

export function namedAcknowledgement(d,lang,history=[]){
  const addressed=d.contact_name||(!d.request_for?`${d.first_name} ${d.last_name}`:'');
  return varied(localized(lang,
    addressed?[`Vielen Dank, ${addressed}.`,`Danke, ${addressed}.`,'Ich habe den Namen notiert, vielen Dank.']:['Vielen Dank, ich habe den Namen notiert.','Danke für den Namen.'],
    addressed?[`Great, thank you, ${addressed}.`,`Thank you, ${addressed}.`,'Thanks, I’ve noted the name.']:['Thank you, I’ve noted the name.','Thanks for providing the name.']
  ),history);
}

export function contactAcknowledgement(stage,lang,history=[]){
  const options={
    email:localized(lang,
      ['Danke, ich habe Ihre E-Mail-Adresse.','Vielen Dank für Ihre E-Mail-Adresse.','Ihre E-Mail-Adresse habe ich notiert, danke.'],
      ['Thank you, I have your email.','Thanks for sharing your email address.','I’ve noted your email address, thank you.']),
    phone:localized(lang,
      ['Danke für Ihre Telefonnummer.','Vielen Dank, ich habe Ihre Telefonnummer notiert.','Ihre Telefonnummer habe ich übernommen, danke.'],
      ['Thanks for your phone number.','Thank you, I have your phone number.','I’ve noted your phone number, thank you.']),
    availability:localized(lang,
      ['Danke, das hilft uns weiter.','Vielen Dank, ich habe Ihre zeitlichen Wünsche notiert.','Ihre zeitlichen Wünsche habe ich aufgenommen, danke.'],
      ['Thank you, that helps.','Thanks, I’ve noted when you would prefer to come.','I’ve noted your availability, thank you.'])
  };
  return varied(options[stage]||localized(lang,['Danke.','Vielen Dank.'],['Thank you.','Thanks.']),history);
}

export function contactDetailsAcknowledgement(fields,d,lang,history=[]){
  if(fields.length===1)return fields[0]==='name'?namedAcknowledgement(d,lang,history):contactAcknowledgement(fields[0],lang,history);
  const details=fields.filter(field=>field!=='name').map(field=>localized(lang,field==='email'?'E-Mail-Adresse':'Telefonnummer',field==='email'?'email address':'phone number')).join(localized(lang,' und ',' and '));
  if(fields.includes('name'))return `${namedAcknowledgement(d,lang,history)} ${localized(lang,`Ihre ${details} habe ich ebenfalls notiert.`,`I’ve also noted your ${details}.`)}`;
  return varied(localized(lang,
    [`Danke für Ihre ${details}.`,`Vielen Dank, ich habe Ihre ${details} notiert.`,`Ihre ${details} habe ich übernommen, danke.`],
    [`Thank you for your ${details}.`,`Thanks, I’ve noted your ${details}.`,`I’ve noted your ${details}, thank you.`]
  ),history);
}

export function withContactAcknowledgement(answer,acknowledgement,d){
  let remaining=answer.trim().replace(/^Gerne[,!.]\s*/u,'');
  const first=remaining.match(/^.*?[.!](?:\s|$)/u)?.[0]?.trim();
  const addressed=d.contact_name||`${d.first_name} ${d.last_name}`;
  if(first&&(/^(?:Perfect,?\s*)?(?:thank you|thanks|danke|vielen dank)[.!]$/iu.test(first)
    ||[ `Great, thank you, ${addressed}.`,`Thank you, ${addressed}.`,`Vielen Dank, ${addressed}.`,`Danke, ${addressed}.` ].includes(first)))remaining=remaining.slice(first.length).trim();
  return [acknowledgement,remaining].filter(Boolean).join(' ');
}
