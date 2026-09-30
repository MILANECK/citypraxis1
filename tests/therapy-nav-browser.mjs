import {createRequire} from 'node:module';
import assert from 'node:assert/strict';

const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/kovac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({channel:process.env.QA_BROWSER_CHANNEL||'chrome',headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'no-preference'});
  await page.goto((process.env.QA_ORIGIN||'http://127.0.0.1:3001')+'/leistungen/heilmassage?lang=en');
  const link=page.locator('.therapy-nav-group').first().locator('a[href^="#"]').nth(3);
  await link.click();
  const target=await link.getAttribute('href');
  await page.waitForTimeout(160);
  const early=await page.evaluate(()=>window.scrollY);
  await page.waitForTimeout(570);
  const middle=await page.evaluate(()=>window.scrollY);
  await page.waitForTimeout(1250);
  const final=await page.evaluate(()=>window.scrollY);
  const destination=await page.locator(target).evaluate(node=>node.getBoundingClientRect().top);
  assert.ok(early<middle&&middle<final,'The page should keep moving gradually toward the section');
  assert.ok(Math.abs(destination-125)<4,'The selected heading should settle below the header');
  assert.equal(new URL(page.url()).hash,target);

  await page.evaluate(()=>window.scrollBy(0,200));
  const lag=await page.locator('.therapy-quick-nav').evaluate(node=>new DOMMatrixReadOnly(getComputedStyle(node).transform).m42);
  assert.ok(lag>0,'The sidebar should follow the page scroll with a small delay');
  await page.waitForTimeout(850);
  const settled=await page.locator('.therapy-quick-nav').evaluate(node=>new DOMMatrixReadOnly(getComputedStyle(node).transform).m42);
  assert.ok(Math.abs(settled)<1,'The sidebar should settle back into its sticky position');

  const reduced=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  await reduced.goto((process.env.QA_ORIGIN||'http://127.0.0.1:3001')+'/leistungen/heilmassage?lang=en');
  const reducedLink=reduced.locator('.therapy-nav-group').first().locator('a[href^="#"]').nth(3);
  await reducedLink.click();
  const reducedTarget=await reducedLink.getAttribute('href');
  const reducedPosition=await reduced.locator(reducedTarget).evaluate(node=>node.getBoundingClientRect().top);
  assert.ok(reducedPosition>=100&&reducedPosition<=260,'Reduced-motion navigation should put the section below the header');
  assert.equal(await reduced.locator('.therapy-quick-nav').evaluate(node=>getComputedStyle(node).transform),'none');
  console.log('Therapy navigation movement and reduced-motion behavior verified');
}finally{await browser.close();}
