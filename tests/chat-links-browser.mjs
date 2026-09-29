import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/kovac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({channel:process.env.QA_BROWSER_CHANNEL||'chrome',headless:true});
try{
  for(const reducedMotion of ['reduce','no-preference']){
    const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/api/chat/session',route=>route.fulfill({json:{token:'fixture',expires:Date.now()+1800000,aiAvailable:true}}));
    await page.route('**/api/chat/turn',route=>route.fulfill({json:{message:'Prices are listed at /preise?lang=en. <script>alert(1)</script>',language:'en',ready:false,summary:null,turnsRemaining:29}}));
    await page.goto((process.env.QA_ORIGIN||'http://127.0.0.1:3006')+'/?lang=en');
    await page.locator('.chat-launch').waitFor();
    await page.locator('.chat-launch').evaluate(element=>element.click());
    await page.locator('.conversation-start input').evaluate(element=>element.click());
    await page.locator('.conversation-start button').click();
    await page.locator('#conversation-input').fill('What is the price?');
    await page.locator('.conversation-compose button').click();
    await page.locator('.conversation-message.from-assistant').last().locator('a[href="/preise?lang=en"]').waitFor();
    assert.equal(await page.locator('.conversation-message.from-assistant').last().locator('a[href="/preise?lang=en"]').textContent(),'/preise?lang=en');
    assert.equal(await page.locator('.conversation-message script').count(),0);
    assert.match(await page.locator('.conversation-message.from-assistant').last().textContent(),/<script>alert\(1\)<\/script>/);
    await page.locator('.conversation-message.from-assistant').last().locator('a[href="/preise?lang=en"]').click();
    await page.waitForURL('**/preise?lang=en');
    assert.deepEqual(errors,[]);
    await page.close();
    console.log(`chat link ${reducedMotion} passed`);
  }
}finally{await browser.close();}
