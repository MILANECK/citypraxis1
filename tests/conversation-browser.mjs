import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/kovac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
await mkdir('test-results',{recursive:true});
try{
  for(const lang of ['en','de'])for(const mobile of [false,true]){
    const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},reducedMotion:mobile?'reduce':'no-preference'});
    await page.addInitScript(()=>sessionStorage.setItem('citypraxis-conversation-v2',JSON.stringify({token:'old-session',expires:Date.now()+1800000,started:true,messages:[{role:'assistant',text:'Old draft'}]})));
    const errors=[];page.on('pageerror',e=>errors.push(e.message));let submitted=0,sessions=0;
    const reviewSummary=lang==='en'?[['Name','Test Visitor'],['Patient status (self-reported)','I’m not sure'],['Request','Request an appointment'],['Email','test@example.test'],['Phone','+4369912682157'],['Preferred contact','Either is fine'],['Your short description','Synthetic test only'],['Availability note','Flexible']]:[['Name','Test Visitor'],['Patientenstatus (eigene Angabe)','Ich bin nicht sicher'],['Anfrage','Termin anfragen'],['E-Mail','test@example.test'],['Telefon','+4369912682157'],['Bevorzugter Kontakt','Beides passt'],['Ihre kurze Beschreibung','Synthetic test only'],['Hinweis zur Verfügbarkeit','Flexible']];
    await page.route('**/api/chat/session',route=>{sessions++;return route.fulfill({json:{token:'fixture',expires:Date.now()+1800000,aiAvailable:true}});});
    await page.route('**/api/chat/turn',async route=>{
      const body=route.request().postDataJSON();assert.equal(body.consent,true);
      await route.fulfill({json:{message:lang==='en'?'Please review your details.':'Bitte prüfen Sie Ihre Angaben.',ready:true,summary:reviewSummary,turnsRemaining:29}});
    });
    await page.route('**/api/chat/edit',route=>route.fulfill({json:{message:'What email address can our secretary use?',ready:false,turnsRemaining:15}}));
    await page.route('**/api/chat/review-choice',route=>{const {field,value}=route.request().postDataJSON();const key=field==='patient_status'?(lang==='en'?'Patient status (self-reported)':'Patientenstatus (eigene Angabe)'):(lang==='en'?'Preferred contact':'Bevorzugter Kontakt');const row=reviewSummary.find(([label])=>label===key);assert.ok(row);row[1]=field==='patient_status'?(value==='existing'?(lang==='en'?'Yes — treated here before':'Ja – bereits in Behandlung'):(lang==='en'?'No — not yet':'Nein – noch nicht')):(value==='phone'?(lang==='en'?'Phone':'Telefon'):(lang==='en'?'Email':'E-Mail'));return route.fulfill({json:{ready:true,summary:reviewSummary,turnsRemaining:29}});});
    await page.route('**/api/chat/finish',route=>{assert.equal(route.request().postDataJSON().confirmed,true);submitted++;return route.fulfill({status:201,json:{id:999,received:true}});});
    await page.goto((process.env.QA_ORIGIN||'http://127.0.0.1:3006')+'/?lang='+lang);
    await page.locator('.cookie-panel').waitFor();
    await page.locator('.chat-launch').click();
    await page.locator('.conversation-start').waitFor();
    assert.equal(await page.locator('.cookie-panel').isVisible(),true);
    await page.locator('.chat-close').click();
    await page.locator('.cookie-acknowledge').click();
    await page.locator('.chat-launch').click();await page.locator('.conversation-start').waitFor();
    assert.equal(await page.locator('.conversation-start input[type=checkbox]').count(),1);assert.equal(await page.locator('#conversation-input').isDisabled(),true);assert.equal(await page.locator('.conversation-locked button').isDisabled(),true);assert.equal(sessions,0);
    assert.equal(await page.locator('.conversation-unlock').evaluate(el=>getComputedStyle(el).borderTopColor),'rgb(183, 61, 104)');
    assert.equal(await page.locator('.conversation-unlock a[href*="datenschutz"]').count(),1);
    assert.doesNotMatch(await page.locator('.conversation-preview').innerText(),/This chat uses OpenAI|Dieser Chat nutzt OpenAI/);
    assert.match(await page.locator('.conversation-preview').innerText(),lang==='en'?/Welcome!/:/Herzlich willkommen!/);
    await page.screenshot({path:`test-results/conversation-${lang}-${mobile?'mobile':'desktop'}-welcome.png`});
    await page.locator('.conversation-start button').click();assert.equal(sessions,0);
    await page.locator('.conversation-start input').check();await page.locator('.conversation-start button').click();
    await page.locator('#conversation-input').fill('Synthetic test only, Test Visitor, test@example.test, +43 699 12682157, flexible');
    await page.locator('.conversation-compose button').click();
    if(!mobile){
      await page.locator('.is-typing').waitFor();
      assert.equal(await page.locator('.is-typing .sr-only').evaluate(el=>{const style=getComputedStyle(el);return style.position==='absolute'&&style.clip==='rect(0px, 0px, 0px, 0px)'&&el.getBoundingClientRect().width===1;}),true,'Screen-reader copy must not appear beside the animated reply');
    }
    await page.locator('.conversation-review').waitFor();
    assert.equal(await page.locator('.conversation-message.from-assistant p').last().textContent(),lang==='en'?'Please review your details.':'Bitte prüfen Sie Ihre Angaben.','Completed reply must contain the answer exactly once');
    assert.equal(await page.locator('.conversation-edit').count(),0);
    assert.equal(await page.locator('.conversation-summary-row.is-editable').count(),7);
    assert.equal(await page.locator('button[data-edit=reason] .conversation-row-action').isVisible(),true);
    assert.match(await page.locator('[data-review-choice-toggle=patient_status]').innerText(),lang==='en'?/treated at CityPraxis before/:/Citypraxis in Behandlung/);
    assert.match(await page.locator('[data-review-choice-toggle=preferred_contact]').innerText(),lang==='en'?/email \/ phone/:/E-Mail \/ Telefon/);
    const statusToggle=page.locator('[data-review-choice-toggle=patient_status]'),statusReveal=page.locator('#review-choices-patient_status');
    assert.equal(await statusReveal.evaluate(el=>el.inert),true);
    assert.ok((await statusReveal.boundingBox()).height<1);
    await statusToggle.click();assert.equal(await statusToggle.getAttribute('aria-expanded'),'true');assert.equal(await statusReveal.evaluate(el=>el.inert),false);assert.equal(await page.locator('[data-review-choice=patient_status]').count(),3);
    if(!mobile){await page.waitForTimeout(120);const mid=(await statusReveal.boundingBox()).height;await page.waitForTimeout(440);const full=(await statusReveal.boundingBox()).height;assert.ok(mid>0&&mid<full);await statusToggle.click();await page.waitForTimeout(120);const closing=(await statusReveal.boundingBox()).height;assert.ok(closing>0&&closing<full);await page.waitForTimeout(440);}else await statusToggle.click();
    assert.equal(await statusToggle.getAttribute('aria-expanded'),'false');assert.ok((await statusReveal.boundingBox()).height<1);
    await statusToggle.click();
    await page.locator('[data-review-choice=patient_status][data-value=existing]').click();await page.waitForFunction(expected=>document.querySelector('[data-review-choice-toggle=patient_status]')?.textContent.includes(expected),lang==='en'?'treated here before':'bereits in Behandlung');
    await page.locator('[data-review-choice-toggle=preferred_contact]').click();assert.equal(await page.locator('[data-review-choice=preferred_contact]').count(),3);
    if(mobile)await page.screenshot({path:`test-results/conversation-${lang}-mobile-contact-options.png`});
    await page.locator('[data-review-choice=preferred_contact][data-value=phone]').click();await page.waitForFunction(expected=>document.querySelector('[data-review-choice-toggle=preferred_contact] .conversation-summary-value')?.textContent===expected,lang==='en'?'Phone':'Telefon');
    assert.equal(submitted,0);await page.locator('[data-edit=email]').click();await page.locator('#conversation-input').fill('test@example.test');await page.locator('.conversation-compose button').click();await page.locator('.conversation-review').waitFor();
    const bounds=await page.locator('.chat-window').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=(mobile?390:1440));assert.ok(bounds.y>=0);
    assert.equal(await page.locator('.chat-scroll').evaluate(el=>el.scrollWidth<=el.clientWidth),true);
    await page.screenshot({path:`test-results/conversation-${lang}-${mobile?'mobile':'desktop'}-review.png`});
    await page.locator('.conversation-confirm input').check();await page.locator('.conversation-confirm button').click();await page.locator('.request-confirmation .confirmation-logo').waitFor();assert.equal(submitted,1);
    assert.equal(await page.locator('.request-confirmation .confirmation-logo img').count(),1);
    if(mobile)await page.screenshot({path:`test-results/conversation-${lang}-mobile-success.png`});
    assert.equal(await page.evaluate(()=>sessionStorage.getItem('citypraxis-conversation-v2')),null);assert.deepEqual(errors,[]);
    await page.close();console.log(`${lang} ${mobile?'mobile':'desktop'} passed`);
  }
}finally{await browser.close();}
