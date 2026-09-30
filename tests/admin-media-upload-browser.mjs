import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/kovac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  await page.goto((process.env.QA_ORIGIN||'http://127.0.0.1:3124')+'/admin');
  await page.locator('#login-form [name=email]').fill('preview@example.test');
  await page.locator('#login-form [name=password]').fill('local-preview-only-2026');
  await page.locator('#login-form button').first().click();
  await page.locator('[data-view=media]').click();
  const cards=page.locator('.media-card');
  await cards.first().waitFor();
  const before=await cards.count();
  assert.equal(await page.locator('#upload-form [name=alt]').count(),0);
  await page.locator('#upload-form input[type=file]').setInputFiles('public/assets/wordmark-white.png');
  await page.locator('#upload-form button').click();
  await page.waitForFunction(count=>document.querySelectorAll('.media-card').length===count+1,before);
  assert.equal(await cards.first().locator('.media-thumb img').getAttribute('alt'),'wordmark-white.png');
  console.log('Media upload works without a separate description field');
}finally{await browser.close();}
