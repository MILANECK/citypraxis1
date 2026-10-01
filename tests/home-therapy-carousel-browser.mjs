import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/database.mjs';
import {createApp} from '../src/server.mjs';

const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/kovac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const db=openDatabase(':memory:');
const server=createApp(db);
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'no-preference'});
  await page.goto(`http://127.0.0.1:${server.address().port}/?lang=en`);
  await page.locator('.home-therapies .therapy-card').first().waitFor();
  assert.equal(await page.locator('.home-therapies .therapy-card').count(),5);
  await page.locator('.home-therapies').scrollIntoViewIfNeeded();
  const cards=page.locator('.home-therapies .therapy-card');
  assert.equal(await cards.first().evaluate(node=>getComputedStyle(node).opacity),'1');
  await cards.first().evaluate(node=>node.classList.add('home-reveal-ready','therapy-reveal'));
  const fallback=await cards.first().evaluate(node=>({opacity:getComputedStyle(node).opacity,height:node.getBoundingClientRect().height,layout:getComputedStyle(node.parentElement).display}));
  assert.equal(fallback.opacity,'1','Stale reveal classes must not hide the carousel on mobile');
  assert.ok(fallback.height>=310,'Mobile cards must keep a definite height');
  assert.equal(fallback.layout,'flex','The mobile carousel must use the stable flex layout');
  await page.locator('.therapy-carousel-dots button').nth(1).click();
  await page.waitForTimeout(700);
  assert.equal(await cards.nth(1).evaluate(node=>getComputedStyle(node).opacity),'1');
  assert.equal(await page.locator('.home-photo-caption').count(),0);
  console.log('Mobile therapy cards stay visible, carousel navigation works, and the team-photo caption is gone.');
}finally{
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
  db.close();
}
