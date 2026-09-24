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
    const errors=[];page.on('pageerror',e=>errors.push(e.message));let submitted=0,sessions=0;
    await page.route('**/api/chat/session',route=>{sessions++;return route.fulfill({json:{token:'fixture',expires:Date.now()+1800000,aiAvailable:true}});});
    await page.route('**/api/chat/turn',async route=>{
      const body=route.request().postDataJSON();assert.equal(body.consent,true);
      await route.fulfill({json:{message:lang==='en'?'Please review your details.':'Bitte prüfen Sie Ihre Angaben.',ready:true,summary:[['Name','Test Visitor'],['Email','test@example.test'],['Phone','+4369912682157'],['Concern','Synthetic test only'],['Availability','Flexible']],turnsRemaining:15}});
    });
    await page.route('**/api/chat/edit',route=>route.fulfill({json:{message:'What email address can our secretary use?',ready:false,turnsRemaining:15}}));
    await page.route('**/api/chat/finish',route=>{assert.equal(route.request().postDataJSON().confirmed,true);submitted++;return route.fulfill({status:201,json:{id:999,received:true}});});
    await page.goto((process.env.QA_ORIGIN||'http://127.0.0.1:3006')+'/?lang='+lang);
    await page.locator('.chat-launch').click();
    await page.locator('.conversation-start').waitFor();
    assert.equal(await page.locator('.cookie-panel').isVisible(),true);
    await page.locator('.chat-close').click();
    await page.locator('.cookie-acknowledge').click();
    await page.locator('.chat-launch').click();await page.locator('.conversation-start').waitFor();
    assert.equal(await page.locator('.conversation-start input[type=checkbox]').count(),1);assert.equal(await page.locator('#conversation-input').isDisabled(),true);assert.equal(await page.locator('.conversation-locked button').isDisabled(),true);assert.equal(sessions,0);
    await page.screenshot({path:`test-results/conversation-${lang}-${mobile?'mobile':'desktop'}-welcome.png`});
    await page.locator('.conversation-start button').click();assert.equal(sessions,0);
    await page.locator('.conversation-start input').check();await page.locator('.conversation-start button').click();
    await page.locator('#conversation-input').fill('Synthetic test only, Test Visitor, test@example.test, +43 699 12682157, flexible');
    await page.locator('.conversation-compose button').click();if(!mobile){await page.locator('.is-typing').waitFor();await page.waitForFunction(()=>Boolean(document.querySelector('.is-typing [aria-hidden]')?.textContent));}await page.locator('.conversation-review').waitFor();
    assert.equal(submitted,0);await page.locator('[data-edit=email]').click();await page.locator('#conversation-input').fill('test@example.test');await page.locator('.conversation-compose button').click();await page.locator('.conversation-review').waitFor();
    const bounds=await page.locator('.chat-window').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=(mobile?390:1440));assert.ok(bounds.y>=0);
    assert.equal(await page.locator('.chat-scroll').evaluate(el=>el.scrollWidth<=el.clientWidth),true);
    await page.screenshot({path:`test-results/conversation-${lang}-${mobile?'mobile':'desktop'}-review.png`});
    await page.locator('.conversation-confirm input').check();await page.locator('.conversation-confirm button').click();await page.locator('.chat-success').waitFor();assert.equal(submitted,1);
    assert.equal(await page.evaluate(()=>sessionStorage.getItem('citypraxis-conversation-v2')),null);assert.deepEqual(errors,[]);
    await page.close();console.log(`${lang} ${mobile?'mobile':'desktop'} passed`);
  }
}finally{await browser.close();}
