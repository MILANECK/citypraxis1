import {createRequire} from 'node:module';
import assert from 'node:assert/strict';

const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/kovac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({channel:process.env.QA_BROWSER_CHANNEL||'chrome',headless:true});
const origin=process.env.QA_ORIGIN||'http://127.0.0.1:3001';
try{
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'no-preference'});
  await page.goto(origin+'/kontakt?lang=en');
  await page.locator('.cookie-acknowledge').click();
  const details=page.locator('.map-details details');
  await details.locator('summary').click();
  await page.waitForTimeout(900);
  assert.ok(await details.evaluate(node=>node.open));
  await details.locator('.map-details-copy').click();
  assert.ok(await details.evaluate(node=>node.open),'Clicking inside the map card should leave it open');
  await page.locator('.contact-grid .info-card h2').click();
  await page.waitForTimeout(900);
  assert.ok(!await details.evaluate(node=>node.open),'Clicking outside the map card should close it');
  await details.locator('summary').click();
  await page.locator('.contact-grid .info-card h2').click();
  await page.waitForTimeout(1700);
  assert.ok(!await details.evaluate(node=>node.open),'An outside click during opening should also close it');

  const top=page.locator('.back-to-top');
  await top.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.screenshot({path:'test-results/back-to-top-desktop.png'});
  const start=await page.evaluate(()=>scrollY);
  assert.ok(start>500);
  await top.click();
  await page.waitForTimeout(250);
  const early=await page.evaluate(()=>scrollY);
  await page.waitForTimeout(400);
  const middle=await page.evaluate(()=>scrollY);
  assert.ok(start>early&&early>middle&&middle>0,'The return should animate upward gradually');
  await page.waitForTimeout(2200);
  assert.ok(await page.evaluate(()=>scrollY)<2,'The return should end at the top');

  const mobile=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await mobile.goto(origin+'/kontakt?lang=en');
  await mobile.locator('.cookie-acknowledge').click();
  const mobileDetails=mobile.locator('.map-details details');
  await mobileDetails.locator('summary').click();
  assert.ok(await mobileDetails.evaluate(node=>node.open));
  await mobile.locator('.contact-grid .info-card h2').click();
  assert.ok(!await mobileDetails.evaluate(node=>node.open));
  const mobileTop=mobile.locator('.back-to-top');
  await mobileTop.scrollIntoViewIfNeeded();
  await mobile.waitForTimeout(400);
  await mobile.screenshot({path:'test-results/back-to-top-mobile.png'});
  await mobileTop.click();
  assert.ok(await mobile.evaluate(()=>scrollY)<2,'Reduced motion should return immediately');
  console.log('Map outside-click and back-to-top behavior verified');
}finally{await browser.close();}
