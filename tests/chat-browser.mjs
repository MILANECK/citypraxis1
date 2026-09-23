// Run against the disposable tests/browser-fixture.mjs server; no production writes.
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/kovac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({channel:'chrome',headless:true}),failures=[];
const origin=process.env.QA_ORIGIN||'http://127.0.0.1:3001';
const page=await browser.newPage({viewport:{width:1440,height:950}});
page.on('pageerror',error=>failures.push(error.message));
const field=name=>page.locator(`#cp-chat [name="${name}"]`);
const go=()=>page.locator('#cp-chat button[type=submit]').click();
const choose=async(name,value)=>{await page.locator(`#cp-chat input[name="${name}"][value="${value}"] + span`).click();};
try{
  await page.goto(origin+'/?lang=en');await page.locator('.cookie-acknowledge').click();await page.locator('.chat-launch').click();await page.locator('[data-form=start]').waitFor();await field('consent').check();await go();await page.locator('[data-action=skip-intro]').click();
  await choose('request_type','appointment_request');await go();await choose('patient_status_claimed','new');await go();await choose('discipline','physiotherapy');await go();
  await field('problem_location_raw').fill('Right side of my neck towards my shoulder');await page.locator('[data-action=interpret-body]').click();await page.locator('[data-action=confirm]').click();
  await field('description').fill('I would like an appointment for this discomfort.');await go();await choose('referral_claimed','yes');await go();await choose('preferred_days','thursday');await choose('preferred_times','afternoon');await go();
  await field('first_name').fill('Browser');await field('last_name').fill('Test');await field('email').fill('browser@example.test');await field('phone').fill('12345');await go();await page.getByText('Please enter a valid phone number',{exact:false}).waitFor();
  await field('phone').fill('+43 699 12682157');await go();await choose('preferred_contact','email');await go();await page.locator('[data-form=review]').waitFor();
  await page.reload();await page.locator('.chat-launch').click();await page.locator('[data-form=review]').waitFor();assert.match(await page.locator('.chat-summary').innerText(),/Browser Test/);
  await page.screenshot({path:'test-results/chat-review-desktop.png'});await field('review').check();await go();await page.getByRole('heading',{name:'Your request has been received.'}).waitFor();assert.equal(await page.evaluate(()=>sessionStorage.getItem('citypraxis-reception-v1')),null);
  await page.goto(origin+'/admin?lang=en');await page.locator('#login-form [name=email]').fill('preview@example.test');await page.locator('#login-form [name=password]').fill('local-preview-only-2026');await page.locator('#login-form button[type=submit],#login-form .button').click();await page.locator('[data-view=requests]').click();await page.locator('.chat-handoff').first().waitFor();assert.match(await page.locator('.chat-handoff').first().innerText(),/Browser Test/);await page.screenshot({path:'test-results/chat-admin.png'});
  const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,deviceScaleFactor:1,hasTouch:true});mobile.on('pageerror',e=>failures.push(e.message));await mobile.goto(origin+'/?lang=de');await mobile.locator('.cookie-acknowledge').click();await mobile.locator('.chat-launch').click();await mobile.locator('[name=consent]').check();await mobile.locator('#cp-chat button[type=submit]').click();await mobile.locator('[data-action=skip-intro]').click();await mobile.screenshot({path:'test-results/chat-mobile.png'});
  const bounds=await mobile.locator('.chat-window').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=391);assert.ok(bounds.y>=0&&bounds.y+bounds.height<844);assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await mobile.getByRole('button',{name:'Chat schließen',exact:true}).click();assert.equal(await mobile.locator('.chat-launch').getAttribute('aria-expanded'),'false');await mobile.locator('.chat-launch').click();assert.equal(await mobile.locator('[data-form=step]').getAttribute('data-step'),'request_type');
  await mobile.emulateMedia({reducedMotion:'reduce'});assert.equal(await mobile.locator('.chat-window').evaluate(el=>getComputedStyle(el).transitionDuration),'0s');
  await mobile.evaluate(()=>{const key='citypraxis-reception-v1',draft=JSON.parse(sessionStorage.getItem(key));draft.expires=1;sessionStorage.setItem(key,JSON.stringify(draft));});await mobile.reload();await mobile.locator('.chat-launch').click();await mobile.locator('[data-form=start]').waitFor();assert.equal(await mobile.evaluate(()=>sessionStorage.getItem('citypraxis-reception-v1')),null);
  assert.deepEqual(failures,[]);console.log('Browser QA passed: confirmed interpretation, invalid phone, review, refresh, stored handoff, Admin, mobile, close/reopen, reduced motion.');
}finally{await browser.close();}
