import {createRequire} from 'node:module';
import assert from 'node:assert/strict';

const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/kovac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({channel:process.env.QA_BROWSER_CHANNEL||'chrome',headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'no-preference'});
  await page.goto((process.env.QA_ORIGIN||'http://127.0.0.1:3001')+'/ueber-uns?lang=en');
  await page.locator('.cookie-acknowledge').click();
  const card=page.locator('.team-person').filter({has:page.locator('h3:text("Isabella Casny")')});
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(2500);
  const photo=card.locator('.team-photo');
  const read=()=>photo.evaluate(el=>({top:el.getBoundingClientRect().top,scale:new DOMMatrixReadOnly(getComputedStyle(el).transform).a}));
  const before=await read();
  await photo.hover();
  await page.waitForTimeout(750);
  const hovered=await read();
  assert.ok(hovered.scale>1.03,'The portrait should retain its hover zoom');
  assert.ok(Math.abs(hovered.top-before.top)<.15,'The portrait should not rise while zooming');
  await page.mouse.move(2,2);
  await page.waitForTimeout(750);
  const settled=await read();
  assert.ok(Math.abs(settled.top-before.top)<.15,'The portrait should not jump when hover ends');
  console.log('Team portrait zoom stays aligned with the card throughout hover and release');
}finally{await browser.close();}
