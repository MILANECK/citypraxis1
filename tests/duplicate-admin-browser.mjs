import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';

const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/kovac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const origin=process.env.QA_ORIGIN||'http://127.0.0.1:3001';
const browser=await chromium.launch({channel:process.env.QA_BROWSER_CHANNEL||'chrome',headless:true});
try{
  const ids=[];
  for(let i=0;i<2;i++){
    const response=await fetch(origin+'/api/requests',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({name:'Nora Example',email:'nora@example.test',phone:i?'0699 12682157':'+43 699 12682157',consent:true,language:'en',concerns:['Kiefer'],submissionKey:randomUUID()})});
    assert.equal(response.status,201);
    ids.push((await response.json()).id);
  }
  const page=await browser.newPage({viewport:{width:1366,height:900}});
  await page.goto(origin+'/admin?lang=en');
  await page.locator('#login-form [name=email]').fill('preview@example.test');
  await page.locator('#login-form [name=password]').fill('local-preview-only-2026');
  await page.locator('#login-form button').first().click();
  await page.locator('[data-view=requests]').click();
  for(const id of ids){
    const card=page.locator(`[data-request-id="${id}"]`);
    await card.waitFor();
    assert.equal(await card.locator('.request-repeat-badge').innerText(),'Possible duplicate');
    await card.locator('summary').click();
    assert.match(await card.locator('.request-repeat-note').innerText(),/Same phone or email as recent request/);
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  console.log('Admin duplicate indicators verified');
}finally{await browser.close();}
