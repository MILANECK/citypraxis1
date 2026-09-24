export const childrenService={
  id:'kindergesundheit',
  title:'Kindergesundheit',
  titleEn:"Children's health",
  tag:'FÜR KINDER UND FAMILIEN',
  tagEn:'FOR CHILDREN AND FAMILIES',
  intro:'Kinder haben eigene Bedürfnisse. Wir begleiten Familien bei Fragen zu Bewegung, Kiefer, Sprache und Sprechen – mit Zeit für die individuelle Situation Ihres Kindes.',
  introEn:'Children have their own needs. We support families with questions about movement, the jaw, language and speech, taking time to understand each child’s situation.',
  body:'In der Citypraxis gibt es Angebote für Kinder in der Physiotherapie, Osteopathie und Logopädie. Welche Fachrichtung und welcher nächste Schritt passen, klären wir gemeinsam im Erstgespräch.\n\n## Ein guter Start\n\nErzählen Sie uns, was Sie beschäftigt. Wir besprechen vorhandene Befunde und ärztliche Verordnungen und helfen Ihnen, eine Terminanfrage für Ihr Kind vorzubereiten.\n\n## Gemeinsam abgestimmt\n\nUnsere Fachrichtungen können sich ergänzen. Die konkrete Betreuung richtet sich nach dem persönlichen Gespräch und der individuellen Untersuchung.',
  bodyEn:'CityPraxis offers care for children in physiotherapy, osteopathy and speech therapy. At the first appointment, we discuss which specialty and next step fit your child’s situation.\n\n## A thoughtful start\n\nTell us what concerns you. We can discuss existing reports and medical referrals and help you prepare an appointment request for your child.\n\n## Working together\n\nOur specialties can complement one another. The care plan follows a personal conversation and an individual assessment.',
  methods:'Physiotherapie für Kinder|Bewegung und körperliche Entwicklung werden individuell betrachtet.\nLogopädie für Kinder|Sprache, Sprechen und orofaziale Funktionen gehören zum Angebot.\nOsteopathie für Kinder|Das Vorgehen wird im persönlichen Gespräch abgestimmt.',
  methodsEn:'Physiotherapy for children|Movement and physical development are considered individually.\nSpeech therapy for children|The service covers language, speech and orofacial functions.\nOsteopathy for children|The approach is discussed during a personal consultation.',
  related:'physiotherapie,osteopathie,logopaedie',
  order:3
};

// Change only catalog fields that still have their original values; keep other Admin edits.
export function refineTherapyRecord(id,record){
  if(!record)return record;
  const next={...record};
  if(id==='physiotherapie'){
    if(typeof next.related==='string')next.related=next.related.split(',').map(value=>value.trim()).filter(value=>value&&value!=='rueckenfit').join(',');
    if(typeof next.body==='string')next.body=next.body.replace(/\n- 6\.\) Rückenfitkurs - in Gruppentherapie(?=\n|$)/u,'');
    if(typeof next.bodyEn==='string')next.bodyEn=next.bodyEn.replace(/\n- 6\.\) Back fitness course — group therapy(?=\n|$)/u,'');
  }
  if(id==='logopaedie'&&next.titleEn==='Speech & language therapy')next.titleEn='Speech therapy';
  if(id==='heilmassage'){
    if(next.title==='Massagen & Heilmassage')next.title='Massage';
    if(next.titleEn==='Massage & therapeutic massage')next.titleEn='Massage';
    if(next.order===3)next.order=4;
  }
  return next;
}
