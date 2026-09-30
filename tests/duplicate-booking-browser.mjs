import {createRequire} from 'node:module';
import assert from 'node:assert/strict';

const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/kovac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({channel:process.env.QA_BROWSER_CHANNEL||'chrome',headless:true});
try{
  for(const choice of ['update','new','cancel']){
    const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
    const summary=[['Name','Nora Example'],['Email','nora@example.test'],['Phone','+4369912682157'],['Your short description','Elbow pain']];
    const finishes=[];
    await page.route('**/api/chat/session',route=>route.fulfill({json:{token:'fixture',expires:Date.now()+1800000,aiAvailable:true}}));
    await page.route('**/api/chat/turn',route=>route.fulfill({json:{message:'Please review.',ready:true,summary,turnsRemaining:29,language:'en'}}));
    await page.route('**/api/chat/finish',route=>{
      const body=route.request().postDataJSON();finishes.push(body);
      return route.fulfill({json:body.duplicateChoice?(choice==='cancel'?{cancelled:true}:{id:42,received:true,updated:choice==='update',additional:choice==='new'}):{requiresChoice:true,language:'en'}});
    });
    await page.goto((process.env.QA_ORIGIN||'http://127.0.0.1:3001')+'/?lang=en');
    await page.locator('.chat-launch').click();
    await page.locator('.conversation-start input').check({force:true});
    await page.locator('.conversation-start button').click();
    await page.locator('#conversation-input').fill('Synthetic booking test');
    await page.locator('.conversation-compose button').click();
    await page.locator('.conversation-confirm input').check();
    await page.locator('.conversation-confirm button').click();
    await page.locator('.conversation-duplicate').waitFor();
    assert.match(await page.locator('.conversation-duplicate').innerText(),/Is this a new booking request/);
    assert.equal(await page.locator('[data-duplicate-choice="new"]').innerText(),'New booking request');
    assert.equal(await page.locator('[data-duplicate-choice]').count(),3);
    assert.equal(await page.locator('.chat-scroll').evaluate(node=>node.scrollWidth<=node.clientWidth),true);
    await page.locator(`[data-duplicate-choice="${choice}"]`).click();
    await page.waitForTimeout(500);
    assert.equal(await page.locator('.chat-status').innerText(),'',`Status for ${choice}: ${await page.locator('.chat-content').innerText()}`);
    await page.getByText(choice==='cancel'?'Request cancelled.':'Your request has been received.').waitFor({timeout:3000});
    assert.equal(finishes.length,2);
    assert.equal(finishes[1].duplicateChoice,choice);
    assert.equal(await page.evaluate(()=>sessionStorage.getItem('citypraxis-conversation-v2')),null);
    await page.close();
  }
  console.log('Duplicate choice UI verified on mobile');
}finally{await browser.close();}
