import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/kovac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const rows=[{id:1,intake:{kind:'digital_reception'},status:'new'},{id:2,intake:{kind:'appointment_form'},status:'new'},{id:3,intake:JSON.stringify({kind:'appointment_form',therapist:{id:'fixture',name:'Fixture'}}),status:'closed'},{id:4,intake:null,status:'new'}].map(r=>({...r,name:'Fixture '+r.id,email:'fixture@example.test',created_at:new Date().toISOString(),notification_status:'sent'}));
 await page.route('**/api/admin/requests',route=>route.fulfill({json:rows}));
 await page.goto((process.env.QA_ORIGIN||'http://127.0.0.1:3124')+'/admin');
 await page.locator('#login-form [name=email]').fill('preview@example.test');await page.locator('#login-form [name=password]').fill('local-preview-only-2026');await page.locator('#login-form button').first().click();
 await page.locator('[data-view=requests]').click();
 const count=key=>page.locator(`[data-source-filter=${key}] b`).innerText();
 assert.equal(await count('all'),'4');assert.equal(await count('chatbot'),'1');assert.equal(await count('first_appointment'),'2');assert.equal(await count('therapist_profile'),'1');
 await page.locator('[data-source-filter=chatbot]').click();assert.equal(await page.locator('.request-card').count(),1);
 await page.locator('#request-filter').selectOption('closed');assert.equal(await page.locator('.request-card').count(),0);assert.equal(await count('therapist_profile'),'1');
 await page.locator('[data-source-filter=therapist_profile]').click();assert.equal(await page.locator('.request-card').count(),1);
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 console.log('Source counters, combined status filters, legacy intake and mobile layout passed');
}finally{await browser.close();}
