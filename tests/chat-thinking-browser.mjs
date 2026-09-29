import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/kovac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({channel:process.env.QA_BROWSER_CHANNEL||'chrome',headless:true});
try{
  for(const width of [390,1440]){
    const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    let pending;
    await page.route('**/api/chat/session',route=>route.fulfill({json:{token:'fixture',expires:Date.now()+1800000,aiAvailable:true}}));
    await page.route('**/api/chat/turn',route=>{pending=route;});
    await page.goto((process.env.QA_ORIGIN||'http://127.0.0.1:3001')+'/?lang=en');
    await page.locator('.chat-launch').evaluate(el=>el.click());
    await page.locator('.conversation-consent-icon').click();
    await page.locator('.conversation-start button').click();
    await page.locator('#conversation-input').fill('What is the price?');
    await page.locator('.conversation-compose button').click();
    const placeholder=page.locator('.conversation-thread>.is-pending');
    await placeholder.waitFor();
    assert.equal(await placeholder.locator('.chat-thinking-dots i').count(),3);
    assert.equal(await page.locator('.chat-status .chat-thinking').count(),0);
    assert.equal(await placeholder.evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)');
    assert.equal(await placeholder.evaluate(el=>el.previousElementSibling.querySelector('p').textContent),'What is the price?');
    assert.equal(await page.locator('#conversation-input').inputValue(),'');
    assert.equal(await page.locator('.from-visitor').count(),1);
    await pending.fulfill({status:503,json:{code:'ai_unavailable'}});
    await placeholder.waitFor({state:'detached'});
    assert.equal(await page.locator('.from-visitor').count(),0);
    assert.equal(await page.locator('#conversation-input').inputValue(),'What is the price?');
    assert.equal(await page.locator('#conversation-input').evaluate(el=>el.readOnly),false);
    await page.locator('.conversation-compose button').click();
    await placeholder.waitFor();
    await pending.fulfill({json:{message:'The prices are on our website at /preise.',language:'en',ready:false,summary:null,turnsRemaining:29}});
    await placeholder.waitFor({state:'detached'});
    await page.locator('.conversation-message.from-assistant').last().locator('a').waitFor();
    assert.equal(await page.locator('.from-visitor').count(),1);
    assert.equal(await page.locator('.conversation-thread>.conversation-message').count(),3);
    assert.equal(await page.locator('.chat-thinking').count(),0);
    assert.deepEqual(errors,[]);
    console.log(`Thinking placement, error recovery and reply replacement passed at ${width}px`);
    await page.close();
  }
}finally{await browser.close();}
