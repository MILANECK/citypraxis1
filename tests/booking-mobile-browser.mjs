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
  for(const width of [375,390]){
    const page=await browser.newPage({viewport:{width,height:844},reducedMotion:'reduce'});
    await page.route('**/api/requests',route=>route.fulfill({status:201,json:{id:99,patientReceipt:'sent',message:'Your request has been saved. Our secretary will contact you by phone or email to arrange an appointment.'}}));
    await page.goto(`${origin}/termin?lang=en`);
    await page.locator('#booking-form').waitFor();
    await page.locator('.cookie-acknowledge').click();
    const actions=await page.evaluate(()=>{
      const rect=selector=>{const {x,y,width,height}=document.querySelector(selector).getBoundingClientRect();return {x,y,width,height,centerX:x+width/2};};
      return {chat:rect('.chat-launch'),call:rect('.mobile-call'),book:rect('.mobile-appointment'),form:rect('#booking-form'),intro:rect('.booking-layout>div')};
    });
    for(const circle of [actions.chat,actions.call,actions.book])assert.equal(circle.width,58);
    assert.ok(Math.abs(actions.chat.y-actions.call.y)<1);
    assert.ok(Math.abs(actions.call.y-actions.book.y)<1);
    assert.ok(actions.chat.x+actions.chat.width<=actions.call.x);
    assert.ok(actions.call.x+actions.call.width<=actions.book.x);
    assert.ok(actions.form.y-actions.intro.y-actions.intro.height>=90);
    await page.evaluate(()=>{const form=document.querySelector('#booking-form');scrollTo(0,form.getBoundingClientRect().top+scrollY-250);});
    await page.screenshot({path:`test-results/booking-${width}-form-top.png`});
    await page.locator('#booking-form input[name=name]').fill('Test Patient');
    assert.equal(await page.locator('.mobile-booking').evaluate(el=>getComputedStyle(el).opacity),'0');
    await page.screenshot({path:`test-results/booking-${width}-folder.png`});
    await page.locator('#booking-form input[name=email]').fill('test@example.test');
    await page.locator('#booking-form input[name=phone]').fill('+43 699 12682157');
    await page.locator('#booking-form input[name=consent]').check();
    await page.locator('#booking-form').evaluate(form=>form.requestSubmit());
    await page.locator('#booking-form.request-confirmation .confirmation-logo').waitFor();
    await page.waitForTimeout(750);
    const confirmation=await page.locator('#booking-form').boundingBox();
    assert.ok(confirmation.y>=80,`confirmation top ${confirmation.y}`);
    assert.ok(confirmation.y+confirmation.height<=844,`confirmation bottom ${confirmation.y+confirmation.height}`);
    assert.equal(await page.locator('#booking-form.has-folder').count(),1);
    assert.equal(await page.locator('#booking-form .booking-folder-name').textContent(),'Test Patient');
    const successLayout=await page.evaluate(()=>{
      const rect=selector=>{const {x,y,width,height}=document.querySelector(selector).getBoundingClientRect();return {x,y,width,height};};
      return {chat:rect('.chat-launch'),call:rect('.mobile-call'),book:rect('.mobile-appointment'),home:rect('#booking-form>.button')};
    });
    for(const circle of [successLayout.chat,successLayout.call,successLayout.book])assert.equal(circle.width,58);
    assert.ok(Math.abs(successLayout.chat.y-successLayout.call.y)<1);
    assert.ok(Math.abs(successLayout.call.y-successLayout.book.y)<1);
    assert.ok(successLayout.chat.x+successLayout.chat.width<=successLayout.call.x);
    assert.ok(successLayout.chat.y>=successLayout.home.y+successLayout.home.height||successLayout.chat.y+successLayout.chat.height<=successLayout.home.y);
    await page.screenshot({path:`test-results/booking-${width}-confirmation.png`});
    await page.close();
    console.log(`${width}px booking layout passed`);
  }
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));db.close();}
