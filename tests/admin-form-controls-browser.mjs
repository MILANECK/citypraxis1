import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/kovac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const origin=process.env.QA_ORIGIN||'http://127.0.0.1:3001';
const browser=await chromium.launch({channel:'chrome',headless:true});

try{
  const page=await browser.newPage({viewport:{width:1366,height:900}});
  await page.goto(origin+'/termin?lang=en');
  const button=page.locator('#booking-form>button[type=submit]');
  await button.waitFor();
  assert.equal(await button.evaluate(el=>getComputedStyle(el).backgroundImage),'none');
  assert.equal(await button.evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(0, 133, 172)');
  const choice=page.locator('#booking-form .booking-choice').first();
  await choice.waitFor();
  assert.equal(await choice.locator('span').evaluate(el=>getComputedStyle(el).backgroundImage),'none');
  await choice.hover();
  await page.waitForTimeout(300);
  assert.equal(await choice.locator('span').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(220, 238, 245)');
  await choice.locator('span').click();
  await page.waitForTimeout(300);
  assert.equal(await choice.locator('span').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(0, 133, 172)');

  await page.goto(origin+'/admin');
  await page.locator('#login-form [name=email]').fill('preview@example.test');
  await page.locator('#login-form [name=password]').fill('local-preview-only-2026');
  await page.locator('#login-form button').first().click();
  await page.waitForFunction(()=>Boolean(document.querySelector('[data-view="pages"]')?.title));
  assert.equal(await page.locator('.local-badge').count(),0);
  assert.match(await page.locator('[data-view="pages"]').getAttribute('title'),/page/i);
  for(const section of ['overview','requests','media','team','users']){
    await page.locator(`[data-view="${section}"]`).click();
    await page.waitForFunction(()=>[...document.querySelectorAll('#admin-app button,#admin-app a,#admin-app summary,#admin-app select,#admin-app input:not([type="hidden"])')].every(el=>Boolean(el.title)));
  }
  await page.locator('[data-view=pages]').click();
  await page.locator('[data-edit="home"]').click();
  await page.waitForFunction(()=>Boolean(document.querySelector('#content-form button[value="publish"]')?.title));
  assert.match(await page.locator('#content-form button[value="publish"]').getAttribute('title'),/public/i);
  await page.locator('#revisions>summary').click();
  const restore=page.locator('[data-restore]').first();
  await restore.waitFor();
  await page.waitForFunction(()=>Boolean(document.querySelector('[data-restore]')?.title));
  assert.match(await restore.getAttribute('title'),/only/i);
  const revisionId=await restore.getAttribute('data-restore');
  page.once('dialog',dialog=>dialog.accept());
  await page.locator(`[data-delete-revision="${revisionId}"]`).click();
  await page.waitForFunction(id=>!document.querySelector(`[data-restore="${id}"]`),revisionId);
  assert.equal(await page.locator(`[data-delete-revision="${revisionId}"]`).count(),0);
  const advanced=page.locator('.hero-advanced-settings');
  assert.equal(await advanced.evaluate(el=>el.open),false);
  await advanced.locator('summary').click();
  for(const name of ['heroHeight','heroPosition','heroMobilePosition','heroOverlay']){
    assert.equal(await advanced.locator(`[name="${name}"]`).count(),1);
  }
  await page.route('**/api/admin/content/pages/home',route=>route.fulfill({status:401,json:{error:'Bitte anmelden.'}}));
  await page.locator('#content-form button[value=publish]').click();
  const notice=page.locator('.editor-auth-notice');
  await notice.waitFor({state:'visible'});
  assert.match(await notice.innerText(),/Please sign in|Bitte anmelden/);
  assert.equal(await notice.locator('xpath=preceding-sibling::button[1]').getAttribute('value'),'publish');
  assert.equal(await page.locator('.editor-message').innerText(),'');
  console.log('Form colors, admin tooltips, hero settings and signed-out Publish notice verified.');
}finally{
  await browser.close();
}
