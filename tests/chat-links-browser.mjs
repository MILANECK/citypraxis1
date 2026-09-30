import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/kovac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({channel:process.env.QA_BROWSER_CHANNEL||'chrome',headless:true});
try{
  for(const reducedMotion of ['reduce','no-preference'])for(const example of [
    {message:'Prices are listed at /preise?lang=en.',href:'/preise?lang=en',label:'/preise?lang=en'},
    {message:'Saturday appointments are from 08:30 to 12:30. [Opening hours](/kontakt?lang=en#oeffnungszeiten)',href:'/kontakt?lang=en#oeffnungszeiten',label:'Opening hours'},
    {message:'Our team offers physiotherapy. [Physiotherapy](/leistungen/physiotherapie?lang=en)',href:'/leistungen/physiotherapie?lang=en',label:'Physiotherapy'}
  ]){
    const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/api/chat/session',route=>route.fulfill({json:{token:'fixture',expires:Date.now()+1800000,aiAvailable:true}}));
    await page.route('**/api/chat/turn',route=>route.fulfill({json:{message:example.message+' <script>alert(1)</script>',language:'en',ready:false,summary:null,turnsRemaining:29}}));
    await page.goto((process.env.QA_ORIGIN||'http://127.0.0.1:3006')+'/?lang=en');
    await page.locator('.chat-launch').waitFor();
    assert.equal(await page.locator('#cp-chat').evaluate(root=>root.classList.contains('has-session')),false);
    assert.equal(await page.locator('.chat-launch').evaluate(button=>getComputedStyle(button).backgroundColor),'rgb(0, 133, 172)');
    assert.equal(await page.locator('.chat-active-icon').isVisible(),false);
    await page.locator('.chat-launch').evaluate(element=>element.click());
    await page.locator('.conversation-start input').evaluate(element=>element.click());
    await page.locator('.conversation-start button').click();
    await page.waitForFunction(()=>document.querySelector('#cp-chat')?.classList.contains('has-session'));
    assert.equal(await page.locator('#cp-chat').evaluate(root=>root.classList.contains('has-session')),true);
    assert.equal(await page.locator('.chat-active-icon').isVisible(),true);
    assert.equal(await page.locator('.chat-launch-icon').isVisible(),false);
    assert.equal(await page.locator('.chat-launch').evaluate(button=>getComputedStyle(button).animationName),reducedMotion==='reduce'?'none':'chat-launch-active');
    await page.locator('#conversation-input').fill('What is the price?');
    await page.locator('.conversation-compose button').click();
    const link=page.locator('.conversation-message.from-assistant').last().locator(`a[href="${example.href}"]`);
    await link.waitFor();
    assert.equal(await link.textContent(),example.label);
    assert.equal(await link.getAttribute('target'),'_blank');
    assert.equal(await page.locator('.conversation-message script').count(),0);
    assert.match(await page.locator('.conversation-message.from-assistant').last().textContent(),/<script>alert\(1\)<\/script>/);
    const [destination]=await Promise.all([page.waitForEvent('popup'),link.click()]);
    await destination.waitForURL('**'+example.href);
    assert.equal(await page.locator('.chat-launch').getAttribute('aria-expanded'),'true','The original conversation remains open');
    assert.equal(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('citypraxis-conversation-v2')).turnNumber),1);
    if(example.href.includes('#oeffnungszeiten'))await destination.waitForFunction(()=>{
      const rect=document.querySelector('#oeffnungszeiten')?.getBoundingClientRect();
      return rect&&rect.top>=0&&rect.bottom<innerHeight;
    });
    await destination.close();
    await page.goto((process.env.QA_ORIGIN||'http://127.0.0.1:3006')+'/kontakt?lang=en');
    assert.equal(await page.locator('#cp-chat').evaluate(root=>root.classList.contains('has-session')),true,'The running chat remains marked active on another page');
    await page.locator('.chat-launch').click();
    assert.equal(await page.locator('.conversation-message.from-assistant').last().locator(`a[href="${example.href}"]`).count(),1,'The conversation survives navigation');
    await page.locator('#conversation-input').fill('Can we continue?');
    await page.locator('.conversation-compose button').click();
    await page.waitForFunction(()=>JSON.parse(sessionStorage.getItem('citypraxis-conversation-v2'))?.turnNumber===2);
    assert.deepEqual(errors,[]);
    await page.close();
    console.log(`chat link ${example.href} ${reducedMotion} passed`);
  }
  const expired=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await expired.route('**/api/chat/session',route=>route.fulfill({json:{token:'fixture',expires:Date.now()+1800000,aiAvailable:true}}));
  await expired.route('**/api/chat/turn',route=>route.fulfill({status:401,json:{code:'session_expired'}}));
  await expired.goto((process.env.QA_ORIGIN||'http://127.0.0.1:3006')+'/?lang=en');
  await expired.locator('.chat-launch').click();
  await expired.locator('.conversation-start input').evaluate(element=>element.click());
  await expired.locator('.conversation-start button').click();
  await expired.locator('#conversation-input').fill('A message after server expiry');
  await expired.locator('.conversation-compose button').click();
  await expired.locator('.conversation-start').waitFor();
  assert.equal(await expired.locator('#cp-chat').evaluate(root=>root.classList.contains('has-session')),false);
  assert.equal(await expired.evaluate(()=>sessionStorage.getItem('citypraxis-conversation-v2')),null);
  assert.match(await expired.locator('.chat-status').textContent(),/session has expired/i);
  await expired.close();
}finally{await browser.close();}
