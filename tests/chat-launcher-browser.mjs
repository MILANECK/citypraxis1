import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/kovac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const origin=process.env.QA_ORIGIN||'http://127.0.0.1:3001';
const browser=await chromium.launch({channel:'chrome',headless:true});

try{
  const page=await browser.newPage({viewport:{width:1366,height:900}});
  await page.route('**/api/chat/session',route=>route.fulfill({json:{token:'browser-test-session',expires:Date.now()+3_600_000,aiAvailable:true}}));
  await page.goto(origin+'/?lang=en');
  const launcher=page.locator('.chat-launch');
  await launcher.waitFor();
  assert.equal(await launcher.evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(34, 35, 68)');
  assert.match(await page.locator('.chat-launch-icon img').getAttribute('src'),/chat-animated\.svg/);
  assert.equal(await page.locator('.chat-active-icon').evaluate(el=>getComputedStyle(el).display),'none');

  await launcher.click();
  await page.locator('.conversation-consent-icon').click();
  await page.locator('.conversation-start button[type=submit]').click();
  await page.waitForFunction(()=>document.querySelector('#cp-chat')?.classList.contains('has-session'));
  assert.match(await launcher.evaluate(el=>getComputedStyle(el).backgroundImage),/linear-gradient/);
  assert.equal(await page.locator('.chat-active-icon').evaluate(el=>getComputedStyle(el).display),'block');
  assert.equal(await page.locator('.chat-active-icon').evaluate(el=>getComputedStyle(el).animationName),'none');
  assert.deepEqual(await page.locator('.chat-writing-line').evaluateAll(els=>els.map(el=>getComputedStyle(el).animationName)),['chat-line-write','chat-line-write','chat-line-write']);
  await page.locator('#conversation-input').fill('Hello');
  assert.deepEqual(await page.locator('.chat-writing-line').evaluateAll(els=>els.map(el=>getComputedStyle(el).animationName)),['none','none','none']);
  await page.locator('#conversation-input').fill('');
  assert.deepEqual(await page.locator('.chat-writing-line').evaluateAll(els=>els.map(el=>getComputedStyle(el).animationName)),['chat-line-write','chat-line-write','chat-line-write']);

  await page.goto(origin+'/preise?lang=en');
  await page.waitForFunction(()=>document.querySelector('#cp-chat')?.classList.contains('resumed-session'));
  assert.equal(await page.locator('.chat-launch span').textContent(),'Continue chat');
  assert.ok(await launcher.evaluate(el=>el.getBoundingClientRect().width)>170);
  await launcher.click();
  assert.ok(await page.locator('.conversation-thread').textContent());

  await page.locator('.chat-close').click();
  assert.equal(await launcher.evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(34, 35, 68)');
  assert.equal(await page.locator('.chat-launch-icon').evaluate(el=>getComputedStyle(el).display),'block');
  await page.reload();
  await page.waitForFunction(()=>document.querySelector('#cp-chat')?.classList.contains('resumed-session'));
  assert.equal(await launcher.evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(220, 238, 245)');
  assert.equal(await page.locator('.chat-active-icon').evaluate(el=>getComputedStyle(el).display),'block');
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.locator('.chat-launch span').evaluate(el=>getComputedStyle(el).display),'block');
  assert.ok(await launcher.evaluate(el=>{const bounds=el.getBoundingClientRect();return bounds.left>=0&&bounds.right<=innerWidth;}));
  console.log('Original idle launcher, animated lines, typing pause, page-to-page continuation, close and resumed session verified.');
}finally{
  await browser.close();
}
