import {createRequire} from 'node:module';
import assert from 'node:assert/strict';

const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/kovac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({channel:process.env.QA_BROWSER_CHANNEL||'chrome',headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await page.goto((process.env.QA_ORIGIN||'http://127.0.0.1:3001')+'/?lang=en');
  const first=page.locator('.home-distinction-benefits li').first();
  const scale=()=>first.evaluate(row=>Number.parseFloat(getComputedStyle(row,'::before').scale));
  assert.equal(await scale(),0);
  await first.scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>{
    const row=document.querySelector('.home-distinction-benefits li');
    const value=Number.parseFloat(getComputedStyle(row,'::before').scale);
    return value>.08&&value<.96;
  });
  const during=await scale();
  assert.ok(during>0&&during<1);
  await page.waitForFunction(()=>Number.parseFloat(getComputedStyle(document.querySelector('.home-distinction-benefits li'),'::before').scale)===1);
  assert.equal(await scale(),1);
  await page.close();
  console.log('Benefit dividers draw slowly from left to right');
}finally{await browser.close();}
