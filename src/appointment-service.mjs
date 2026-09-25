import {createHash,randomUUID} from 'node:crypto';
import {requestPreference,validTherapistId,validateFormContact} from './appointment-preference.mjs';
import {ChatError} from './chat/validation.mjs';
import {clientAddress,makeLimiter} from './chat/security.mjs';
import {emailConfigured,notifyRequest,notifyPatient} from './chat/notify.mjs';

export function createAppointmentService({store,getTherapist,getSettings}){
  const limit=makeLimiter();
  return async(req,path,body,json)=>{
    if(path!=='/api/requests'||req.method!=='POST')return false;
    const en=body.language==='en';
    try{
      limit(clientAddress(req),12);
      const contact=validateFormContact(body);
      let therapist;
      if(body.therapistId){
        if(!validTherapistId(body.therapistId))throw new ChatError('therapist_unavailable');
        therapist=await getTherapist(body.therapistId);if(!therapist)throw new ChatError('therapist_unavailable');
      }
      const {value:preference,intake}=requestPreference(body,therapist,await getSettings());
      const key=body.submissionKey||randomUUID();
      if(typeof key!=='string'||! /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(key))throw new ChatError('invalid_request');
      intake.fingerprint=createHash('sha256').update(JSON.stringify({contact,intake})).digest('hex');
      intake.submitted_at=new Date().toISOString();
      const result=await store.save({...contact,preference,intake,submission_key:key,notification_status:emailConfigured()?'pending':'not_configured'});
      if(result.row.intake?.fingerprint!==intake.fingerprint)throw new ChatError('already_submitted',409);
      let patientReceipt='not_configured';
      if(result.created){await notifyRequest(result.row,store);patientReceipt=await notifyPatient(result.row);}
      json(result.created?201:200,{id:result.row.id,patientReceipt,message:en?'Your request has been saved. Our secretary will contact you by phone or email to arrange an appointment.':'Ihre Anfrage wurde gespeichert. Unser Sekretariat meldet sich telefonisch oder per E-Mail, um einen Termin zu vereinbaren.'});
    }catch(error){
      const code=error instanceof ChatError?error.code:'unavailable';
      const messages={invalid_email:['Bitte prüfen Sie Ihre E-Mail-Adresse.','Please check your email address.'],invalid_phone:['Bitte prüfen Sie Ihre Telefonnummer mit Vorwahl.','Please check your phone number and country code.'],invalid_choice:['Bitte wählen Sie die Beschwerden erneut aus.','Please select your concerns again.'],invalid_text:['Bitte prüfen Sie Ihre Angaben und die maximale Textlänge.','Please check your entries and the maximum text length.'],consent_required:['Bitte bestätigen Sie Ihr Einverständnis.','Please confirm your consent.'],therapist_unavailable:['Dieses Profil nimmt keine Terminanfragen entgegen. Bitte senden Sie eine allgemeine Anfrage. Unser Sekretariat hilft Ihnen gerne weiter.','This profile is not accepting appointment requests. Please send a general request, and our secretary will be happy to help.'],already_submitted:['Diese Anfrage wurde bereits gespeichert. Bitte warten Sie auf unsere Rückmeldung.','This request has already been saved. Please wait for us to contact you.'],rate_limit:['Bitte versuchen Sie es später erneut.','Please try again later.']};
      json(error instanceof ChatError?error.status:503,{error:(messages[code]||['Die Anfrage konnte nicht gespeichert werden. Bitte erneut versuchen.','Your request could not be saved. Please try again.'])[en?1:0]});
    }
    return true;
  };
}
