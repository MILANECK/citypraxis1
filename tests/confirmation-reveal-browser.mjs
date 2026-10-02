import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/database.mjs';
import {createApp} from '../src/server.mjs';

const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/kovac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const db=openDatabase(':memory:');
const server=createApp(db);
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({channel:'chrome',headless:true});
await mkdir('test-results',{recursive:true});
try{
  for(const reducedMotion of [false,true]){
    const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:reducedMotion?'reduce':'no-preference'});
    await page.route('**/api/requests',route=>route.fulfill({status:201,json:{id:99,patientReceipt:'sent',message:'Your request has been saved.'}}));
    await page.goto(`${origin}/termin?lang=en`);
    await page.locator('.cookie-acknowledge').click();
    await page.locator('#booking-form input[name=name]').fill('Test Patient');
    await page.locator('#booking-form input[name=email]').fill('test@example.test');
    await page.locator('#booking-form input[name=phone]').fill('+43 699 12682157');
    await page.locator('#booking-form input[name=consent]').check();
    await page.locator('#booking-form').evaluate(form=>form.requestSubmit());
    const formLogo=page.locator('#booking-form.request-confirmation .confirmation-logo img');
    await formLogo.waitFor();
    await formLogo.evaluate(img=>img.decode());
    const expected=reducedMotion?'confirmation-reveal-still.svg':'confirmation-reveal.svg';
    assert.ok((await formLogo.evaluate(img=>img.currentSrc)).endsWith(`/assets/${expected}`));
    assert.equal(await page.locator('#booking-form .confirmation-word').count(),0);
    await page.waitForTimeout(reducedMotion?100:3300);
    await page.locator('#booking-form').screenshot({path:`test-results/confirmation-form-${reducedMotion?'still':'animated'}.png`});

    await page.locator('.chat-launch').click();
    await page.evaluate(async()=>{
      const content=document.querySelector('#cp-chat .chat-content');
      content.innerHTML='<div class="chat-success">✓</div><h3>Your request has been received.</h3><p>Our team will contact you.</p>';
      const {enhanceConfirmation}=await import('/confirmation.js?v=clean-reveal-1');
      await enhanceConfirmation(content);
    });
    const chatLogo=page.locator('#cp-chat .request-confirmation .confirmation-logo img');
    await chatLogo.evaluate(img=>img.decode());
    assert.ok((await chatLogo.evaluate(img=>img.currentSrc)).endsWith(`/assets/${expected}`));
    assert.equal(await page.locator('#cp-chat .confirmation-word').count(),0);
    await page.waitForTimeout(reducedMotion?100:3300);
    await page.locator('.chat-window').screenshot({path:`test-results/confirmation-chat-${reducedMotion?'still':'animated'}.png`});
    await page.close();
  }
  console.log('Booking form and chat confirmations use the new logo reveal');
}finally{
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
  db.close();
}
