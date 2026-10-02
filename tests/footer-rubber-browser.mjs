import {createRequire} from 'node:module';
import assert from 'node:assert/strict';

const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/kovac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({channel:process.env.QA_BROWSER_CHANNEL||'chrome',headless:true});
const origin=process.env.QA_ORIGIN||'http://127.0.0.1:3001';
const offset=page=>page.locator('.home-footer-watermark').evaluate(node=>new DOMMatrixReadOnly(getComputedStyle(node).transform).m42);
try{
  const desktop=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'no-preference'});
  await desktop.goto(origin+'/?lang=en');
  await desktop.locator('.cookie-acknowledge').click();
  await desktop.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
  await desktop.locator('.footer-bottom').hover();
  const bottom=await desktop.evaluate(()=>scrollY);
  await desktop.mouse.wheel(0,120);
  await desktop.waitForTimeout(100);
  const moved=await offset(desktop);
  assert.ok(moved>2&&moved<=18,`The footer wordmark should stretch down slightly at the page end (${moved}px)`);
  assert.ok(Math.abs(await desktop.evaluate(()=>scrollY)-bottom)<2,'The page itself should stay at the bottom');
  await desktop.waitForTimeout(1600);
  assert.ok(Math.abs(await offset(desktop))<.3,'The wordmark should settle back after scrolling stops');

  await desktop.setViewportSize({width:390,height:844});
  await desktop.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
  await desktop.locator('.footer-bottom').hover();
  await desktop.mouse.wheel(0,120);
  await desktop.waitForTimeout(100);
  assert.equal(await offset(desktop),0,'The effect should stay off on mobile');

  const reduced=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  await reduced.goto(origin+'/?lang=en');
  await reduced.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
  await reduced.locator('.footer-bottom').hover();
  await reduced.mouse.wheel(0,120);
  await reduced.waitForTimeout(100);
  assert.equal(await offset(reduced),0,'The effect should respect reduced-motion preferences');
  console.log('Footer wordmark rubber movement, return, mobile and reduced motion verified');
}finally{await browser.close();}
