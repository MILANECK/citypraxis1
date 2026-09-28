const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

const choices=(lang)=>({
  patient_status_claimed:[
    ['existing',lang==='en'?'Yes — treated here before':'Ja — bereits in Behandlung'],
    ['new',lang==='en'?'No — not yet':'Nein — noch nicht'],
    ['unsure',lang==='en'?"I'm not sure":"Ich bin nicht sicher"]
  ],
  preferred_contact:[
    ['email',lang==='en'?'Email':'E-Mail'],
    ['phone',lang==='en'?'Phone':'Telefon'],
    ['either',lang==='en'?'Either is fine':'Beides passt']
  ]
});

export function initBookingReview(form,{english=false}={}){
  const lang=english?'en':'de',tr=choices(lang),escape=escapeHtml;
  const consent=form.querySelector('input[name="consent"]')?.closest('.check-label');
  const submit=form.querySelector('button[type="submit"]');
  const notice=form.querySelector('.form-notice');
  if(!consent||!submit||!notice)return;

  const extra=document.createElement('div');
  extra.className='booking-extra-fields';
  extra.innerHTML=`
    <fieldset class="booking-question-fieldset">
      <legend>${lang==='en'?'Have you been treated at CityPraxis before?':'Waren Sie schon in der Citypraxis in Behandlung?'}</legend>
      <div class="booking-choice-options" role="radiogroup" aria-label="${lang==='en'?'Patient status':'Patientenstatus'}">
        ${tr.patient_status_claimed.map(([value,label])=>`<label class="booking-choice"><input type="radio" name="patient_status_claimed" value="${value}"${value==='unsure'?' checked':''}><span>${label}</span></label>`).join('')}
      </div>
    </fieldset>
    <fieldset class="booking-question-fieldset">
      <legend>${lang==='en'?'Preferred contact method':'Bevorzugter Kontakt'}</legend>
      <div class="booking-choice-options" role="radiogroup" aria-label="${lang==='en'?'Preferred contact':'Bevorzugter Kontakt'}">
        ${tr.preferred_contact.map(([value,label])=>`<label class="booking-choice"><input type="radio" name="preferred_contact" value="${value}"${value==='either'?' checked':''}><span>${label}</span></label>`).join('')}
      </div>
    </fieldset>
    <label class="booking-extra-label">${lang==='en'?'Your short description':'Ihre kurze Beschreibung'} <span>(${lang==='en'?'optional':'optional'})</span><textarea name="description" rows="2" maxlength="500" placeholder="${lang==='en'?'What would you like help with?':'Wobei dürfen wir Ihnen helfen?'}"></textarea></label>
    <label class="booking-extra-label">${lang==='en'?'Availability note':'Hinweis zur Verfügbarkeit'} <span>(${lang==='en'?'optional':'optional'})</span><textarea name="availability" rows="2" maxlength="200" placeholder="${lang==='en'?'Days or times that suit you, or “flexible”.':'Passende Tage oder Uhrzeiten, oder „flexibel“. '}"></textarea></label>`;
  consent.before(extra);

  const review=document.createElement('section');
  review.className='booking-review';
  review.setAttribute('aria-labelledby','booking-review-title');
  review.innerHTML=`<h3 id="booking-review-title">${lang==='en'?'Your request overview':'Übersicht Ihrer Anfrage'}</h3><p class="booking-review-hint">${lang==='en'?'Tap a row to edit it. Cancel keeps the current answer.':'Wählen Sie eine Zeile zum Ändern. Abbrechen behält die bisherige Angabe.'}</p><div class="booking-review-rows" aria-live="polite"></div>`;
  consent.before(review);

  const textFields={
    name:{label:lang==='en'?'Name':'Name',tag:'input',type:'text',max:100},
    email:{label:lang==='en'?'Email':'E-Mail',tag:'input',type:'email',max:200},
    phone:{label:lang==='en'?'Phone':'Telefon',tag:'input',type:'tel',max:40},
    description:{label:lang==='en'?'Your short description':'Ihre kurze Beschreibung',tag:'textarea',max:500},
    availability:{label:lang==='en'?'Availability note':'Hinweis zur Verfügbarkeit',tag:'textarea',max:200}
  };
  const noValue=lang==='en'?'Not specified':'Keine Angabe';
  const current=(field)=>{
    if(field==='concerns')return [...form.querySelectorAll('input[name="concern"]:checked')].map(input=>input.closest('label')?.innerText.trim()).filter(Boolean).join(', ')||noValue;
    if(['patient_status_claimed','preferred_contact'].includes(field)){
      const selected=form.querySelector(`input[name="${field}"]:checked`);
      return tr[field].find(([value])=>value===selected?.value)?.[1]||noValue;
    }
    return form.elements.namedItem(field)?.value?.trim()||noValue;
  };
  const rows=[
    {field:'name',...textFields.name},
    {field:'patient_status_claimed',label:lang==='en'?'Patient status (self-reported)':'Patientenstatus (eigene Angabe)',choices:tr.patient_status_claimed},
    {field:'email',...textFields.email},
    {field:'phone',...textFields.phone},
    {field:'preferred_contact',label:lang==='en'?'Preferred contact':'Bevorzugter Kontakt',choices:tr.preferred_contact},
    {field:'description',...textFields.description},
    {field:'availability',...textFields.availability}
  ];
  const update=()=>{
    review.querySelector('.booking-review-rows').innerHTML=rows.map(({field,label,choices:options})=>{
      const value=current(field);
      const editable=options?`<div class="booking-review-editor" data-editor="${field}" hidden><div class="booking-review-choices">${options.map(([id,title])=>`<button type="button" data-choice="${field}" data-value="${id}" aria-pressed="${String(form.querySelector(`input[name="${field}"]:checked`)?.value===id)}">${title}</button>`).join('')}</div><button type="button" class="booking-edit-cancel" data-cancel="${field}">${lang==='en'?'Cancel edit':'Änderung abbrechen'}</button></div>`:
        `<div class="booking-review-editor" data-editor="${field}" hidden><label class="sr-only" for="review-edit-${field}">${label}</label>${configEditor(field,value)}<div class="booking-review-actions"><button type="button" data-save="${field}">${lang==='en'?'Save':'Speichern'}</button><button type="button" class="booking-edit-cancel" data-cancel="${field}">${lang==='en'?'Cancel edit':'Änderung abbrechen'}</button></div></div>`;
      return `<div class="booking-review-row" data-row="${field}"><button type="button" class="booking-review-toggle" data-toggle="${field}" aria-expanded="false"><span><span class="booking-review-label">${label}</span><span class="booking-review-value">${escape(value)}</span></span><span class="booking-review-edit-label">${lang==='en'?'Edit':'Ändern'} ↗</span></button>${editable}</div>`;
    }).join('');
  };
  function configEditor(field,value){
    const config=textFields[field],safe=escape(value===noValue?'':value);
    return config.tag==='textarea'?`<textarea id="review-edit-${field}" rows="2" maxlength="${config.max}">${safe}</textarea>`:`<input id="review-edit-${field}" type="${config.type}" maxlength="${config.max}" value="${safe}">`;
  }
  update();

  form.addEventListener('input',event=>{if(event.target.matches('input[name="name"],input[name="email"],input[name="phone"],input[name="concern"],textarea[name="description"],textarea[name="availability"]'))update();});
  form.addEventListener('change',event=>{if(event.target.matches('input[name="patient_status_claimed"],input[name="preferred_contact"],input[name="concern"]'))update();});
  review.addEventListener('click',event=>{
    const toggle=event.target.closest('[data-toggle]');
    if(toggle){
      const field=toggle.dataset.toggle,row=toggle.closest('.booking-review-row'),editor=row.querySelector(`[data-editor="${field}"]`),isOpen=!editor.hidden;
      review.querySelectorAll('.booking-review-editor').forEach(item=>item.hidden=true);
      review.querySelectorAll('[data-toggle]').forEach(item=>item.setAttribute('aria-expanded','false'));
      editor.hidden=isOpen;toggle.setAttribute('aria-expanded',String(!isOpen));
      if(!isOpen&&!editor.querySelector('[data-choice]')){
        const source=form.elements.namedItem(field),input=editor.querySelector('input,textarea');input.value=source.value;
        requestAnimationFrame(()=>input.focus({preventScroll:true}));
      }
      return;
    }
    const cancel=event.target.closest('[data-cancel]');
    if(cancel){const row=cancel.closest('.booking-review-row');row.querySelector('.booking-review-editor').hidden=true;row.querySelector('[data-toggle]').setAttribute('aria-expanded','false');return;}
    const save=event.target.closest('[data-save]');
    if(save){
      const field=save.dataset.save,editor=save.closest('.booking-review-editor'),input=editor.querySelector('input,textarea'),source=form.elements.namedItem(field);
      source.value=input.value.trim();source.dispatchEvent(new Event('input',{bubbles:true}));source.dispatchEvent(new Event('change',{bubbles:true}));update();return;
    }
    const choice=event.target.closest('[data-choice]');
    if(choice){
      const input=form.querySelector(`input[name="${choice.dataset.choice}"][value="${choice.dataset.value}"]`);if(input){input.checked=true;input.dispatchEvent(new Event('change',{bubbles:true}));}return;
    }
  });
}
