import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/kovac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const origin=process.env.QA_ORIGIN||'http://127.0.0.1:3124';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
const page=await browser.newPage({viewport:{width:1280,height:900}});
let sample={available:true,cost:3.2,budget:20,remaining:16.8,conversations:284,tracking_since:'2026-09-26T00:00:00Z'};
await page.route('**/api/admin/ai-usage',route=>route.fulfill({json:sample}));
await page.goto(origin+'/admin');
await page.locator('#login-form [name=email]').fill('preview@example.test');
await page.locator('#login-form [name=password]').fill('local-preview-only-2026');
await page.locator('#login-form button').first().click();
const card=page.locator('#ai-usage-panel');await card.getByText('284',{exact:true}).waitFor();
assert.equal(await card.locator('[role=progressbar]').getAttribute('aria-valuenow'),'16');
assert.equal(await card.locator('.ai-usage-meter rect').evaluate(rect=>Number(rect.getAttribute('width'))),16);
await mkdir('test-results',{recursive:true});await card.screenshot({path:'test-results/ai-usage-desktop.png'});
await page.setViewportSize({width:390,height:844});await card.screenshot({path:'test-results/ai-usage-mobile.png'});
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
sample={...sample,cost:21,budget:20,remaining:0,exceeded:true,incomplete:true};await page.reload();await card.getByText('Monatsbudget überschritten.',{exact:true}).waitFor();assert.equal(await card.locator('.over').count(),1);
sample={available:false};await page.reload();await card.getByText(/Nutzungsdaten sind derzeit nicht verfügbar/).waitFor();assert.equal(await card.locator('[role=progressbar]').count(),0);
console.log('Desktop/mobile layout, progress, exceeded and unavailable states passed');
}finally{await browser.close();}
