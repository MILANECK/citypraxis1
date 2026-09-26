// Shared, non-secret vocabulary and workflow used by the widget and Node API.
export const choices={
  request_type:{appointment_request:['Termin anfragen','Request an appointment'],change_request:['Terminänderung anfragen','Request an appointment change'],cancellation_request:['Absage anfragen','Request a cancellation'],referral_question:['Frage zur Verordnung','Referral / prescription question'],payment_question:['Zahlung / Rechnung','Payment / invoice question'],therapist_change:['TherapeutIn wechseln','Change therapist'],administrative_question:['Organisatorische Frage','Administrative question'],other:['Anderes Anliegen','Other']},
  patient_status_claimed:{existing:['Ja – bereits in Behandlung','Yes — treated here before'],new:['Nein – noch nicht','No — not yet'],unsure:['Ich bin nicht sicher','I’m not sure']},
  discipline:{physiotherapy:['Physiotherapie','Physiotherapy'],osteopathy:['Osteopathie','Osteopathy'],speech:['Logopädie','Speech & language therapy'],massage:['Heilmassage','Therapeutic massage'],unsure:['Ich bin nicht sicher','I’m not sure']},
  body_area:{head_jaw:['Kopf / Kiefer','Head / jaw'],neck:['Nacken','Neck'],shoulder:['Schulter','Shoulder'],arm_elbow:['Arm / Ellbogen','Arm / elbow'],hand_wrist:['Hand / Handgelenk','Hand / wrist'],upper_back:['Oberer Rücken','Upper back'],lower_back:['Unterer Rücken','Lower back'],hip:['Hüfte','Hip'],knee:['Knie','Knee'],foot_ankle:['Fuß / Sprunggelenk','Foot / ankle'],multiple:['Mehrere Bereiche','Multiple areas'],other:['Andere Stelle','Other'],unsure:['Möchte ich persönlich besprechen','I’d rather discuss this personally']},
  referral_claimed:{yes:['Ja','Yes'],no:['Nein','No'],unsure:['Ich bin nicht sicher','I’m not sure']},
  preferred_days:{monday:['Montag','Monday'],tuesday:['Dienstag','Tuesday'],wednesday:['Mittwoch','Wednesday'],thursday:['Donnerstag','Thursday'],friday:['Freitag','Friday'],flexible:['Flexibel','Flexible']},
  preferred_times:{morning:['Vormittag','Morning'],midday:['Mittags','Midday'],afternoon:['Nachmittag','Afternoon'],evening:['Abends','Evening'],flexible:['Flexibel','Flexible']},
  preferred_contact:{phone:['Telefon','Phone'],email:['E-Mail','Email'],either:['Beides passt','Either is fine']},
  callback_time:{morning:['Vormittag','Morning'],afternoon:['Nachmittag','Afternoon'],opening_hours:['Während der Öffnungszeiten','During opening hours']}
};
export const label=(field,value,lang='de')=>choices[field]?.[value]?.[lang==='en'?1:0]||value||'—';
export const labels=(field,values,lang)=>Array.isArray(values)?values.map(value=>label(field,value,lang)).join(', '):label(field,values,lang);
export const needsAvailability=d=>['appointment_request','change_request','therapist_change'].includes(d.request_type);
export const needsDiscipline=d=>['appointment_request','therapist_change'].includes(d.request_type);
export const needsLocation=d=>needsDiscipline(d)&&['physiotherapy','osteopathy','unsure'].includes(d.discipline);
export const needsReferral=d=>d.request_type==='referral_question'||(needsDiscipline(d)&&d.discipline==='physiotherapy');
export function summaryRows(d,lang='de'){
  const en=lang==='en',rows=[
    [en?'Name':'Name',[d.first_name,d.last_name].filter(Boolean).join(' ')],
    [en?'Patient status (self-reported)':'Patientenstatus (eigene Angabe)',label('patient_status_claimed',d.patient_status_claimed,lang)],
    [en?'Request':'Anfrage',label('request_type',d.request_type,lang)],
    [en?'Email':'E-Mail',d.email],[en?'Phone':'Telefon',d.phone],
    [en?'Preferred contact':'Bevorzugter Kontakt',label('preferred_contact',d.preferred_contact,lang)],
    [en?'Good time to call':'Rückrufzeit',d.preferred_contact!=='email'&&d.callback_time&&label('callback_time',d.callback_time,lang)],
    [en?'Previous therapist (self-reported)':'Bisherige Betreuung (eigene Angabe)',d.patient_status_claimed==='existing'&&d.previous_therapist],
    [en?'Preferred therapist':'Gewünschte Betreuung',d.preferred_therapist],
    [en?'Therapy':'Fachrichtung',needsDiscipline(d)&&d.discipline&&label('discipline',d.discipline,lang)],
    [en?'Problem area (your description)':'Beschwerdebereich (Ihre Angabe)',needsLocation(d)&&d.body_area?.length&&labels('body_area',d.body_area,lang)],
    [en?'Location in your own words':'Ort in eigenen Worten',needsLocation(d)&&d.problem_location_raw],
    [en?'Your short description':'Ihre kurze Beschreibung',d.description],
    [en?'Referral (self-reported)':'Verordnung (eigene Angabe)',needsReferral(d)&&d.referral_claimed&&label('referral_claimed',d.referral_claimed,lang)],
    [en?'Appointment concerned (self-reported)':'Betroffener Termin (eigene Angabe)',d.appointment_details],
    [en?'Preferred days':'Bevorzugte Tage',d.preferred_days?.length&&labels('preferred_days',d.preferred_days,lang)],
    [en?'Preferred times':'Bevorzugte Zeiten',d.preferred_times?.length&&labels('preferred_times',d.preferred_times,lang)],
    [en?'Availability note':'Hinweis zur Verfügbarkeit',d.availability_notes]
  ];return rows.filter(([,value])=>typeof value==='string'&&value.trim());
}
export const summaryText=(d,lang='de')=>summaryRows(d,lang).map(([key,value])=>`${key}: ${value}`).join('\n');
export const defaults={
  emergencyDe:'Dieser Chat ist nicht für Notfälle geeignet und wird nicht laufend überwacht. Bei unmittelbarer Gefahr rufen Sie in Österreich 144 oder 112 an. Außerhalb Österreichs wenden Sie sich an den örtlichen Notruf. Warten Sie nicht auf eine Antwort der Praxis.',
  emergencyEn:'This chat is not for emergencies and is not continuously monitored. For immediate danger in Austria, call 144 or 112. Elsewhere, contact your local emergency services. Do not wait for the practice to reply.',
  medicalDe:'Ich helfe bei Terminwünschen und organisatorischen Anliegen, kann aber keine medizinische Beratung geben. Ich kann Ihre Frage an das Citypraxis-Team weiterleiten.',
  medicalEn:'I can help with appointments and administrative requests, but I cannot provide medical advice. I can include your question in the message for the Citypraxis team.'
};
