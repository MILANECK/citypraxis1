// One set of form controls is also the request summary: no duplicate editors.
export function initBookingReview(form,{english=false}={}){
  if(form.querySelector('.booking-preferences'))return;
  const consent=form.querySelector('input[name="consent"]')?.closest('.check-label');
  const contact=form.querySelector('.booking-contact-fields');
  if(!consent||!contact)return;
  const options=(name,items,selected)=>`<div class="booking-choice-options">${items.map(([value,label])=>`<label class="booking-choice"><input type="radio" name="${name}" value="${value}"${value===selected?' checked':''}><span>${label}</span></label>`).join('')}</div>`;
  const preferences=document.createElement('div');
  preferences.className='booking-preferences';
  preferences.innerHTML=`<fieldset class="booking-question-fieldset"><legend>${english?'Have you visited us before?':'Waren Sie schon bei uns?'}</legend>${options('patient_status_claimed',[
    ['new',english?'First visit':'Erster Besuch'],['existing',english?'Yes':'Ja'],['unsure',english?'Not sure':'Nicht sicher']
  ],'unsure')}</fieldset><fieldset class="booking-question-fieldset"><legend>${english?'How may we contact you?':'Wie dürfen wir Sie kontaktieren?'}</legend>${options('preferred_contact',[
    ['email',english?'Email':'E-Mail'],['phone',english?'Phone':'Telefon'],['either',english?'Either':'Beides']
  ],'either')}</fieldset>`;
  contact.after(preferences);
  const notes=document.createElement('details');
  notes.className='booking-optional';
  notes.innerHTML=`<summary><span>${english?'Add a note or availability':'Notiz oder Verfügbarkeit ergänzen'}<small class="booking-optional-status">Optional</small></span><span class="booking-optional-mark" aria-hidden="true">+</span></summary><div class="booking-optional-content"><label>${english?'A short note':'Eine kurze Notiz'}<textarea name="description" rows="1" maxlength="500"></textarea></label><label>${english?'When are you available?':'Wann haben Sie Zeit?'}<input name="availability" maxlength="200"></label><div class="booking-optional-actions"><button type="button" data-notes-done>${english?'Done':'Fertig'}</button></div></div>`;
  consent.before(notes);
  const controls=[...notes.querySelectorAll('input,textarea')];
  const updateStatus=()=>{
    notes.querySelector('.booking-optional-status').textContent=controls.some(field=>field.value.trim())?(english?'Note added':'Notiz ergänzt'):'Optional';
  };
  notes.addEventListener('toggle',updateStatus);
  notes.querySelector('[data-notes-done]').addEventListener('click',()=>{notes.open=false;notes.querySelector('summary').focus();});
}
