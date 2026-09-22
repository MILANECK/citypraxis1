const clean=(value,max)=>typeof value==='string'?value.trim().slice(0,max):'';
// Keep a server-verified name snapshot in the existing appointment notes. This
// remains readable if a profile is later renamed or removed and needs no SQL change.
export function requestPreference(body,therapist){
  const concern=clean(body.concern,100),symptoms=clean(body.symptoms,220),preference=clean(body.preference,300);
  const result=[therapist?`WunschtherapeutIn: ${clean(therapist.title,120).replace(/[\r\n]+/g,' ')}`:'',concern?`Anliegen: ${concern}${symptoms?` – ${symptoms}`:''}`:'',preference].filter(Boolean).join('\n');
  return result.length>300?{error:'Bitte kürzen Sie Ihre Angaben zu Anliegen und Erreichbarkeit etwas.'}:{value:result};
}
export const validTherapistId=value=>typeof value==='string'&&/^[a-z0-9-]{1,100}$/.test(value);
