// Run against tests/browser-fixture.mjs only; this edits its disposable database.
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('C:/Users/kovac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const origin=process.env.QA_ORIGIN||'http://127.0.0.1:3014';
assert.ok(['127.0.0.1','localhost'].includes(new URL(origin).hostname));
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(origin+'/admin?lang=de');
  await page.locator('#login-form [name=email]').fill('preview@example.test');
  await page.locator('#login-form [name=password]').fill('local-preview-only-2026');
  await page.locator('#login-form button.button').click();
  await page.locator('[data-view=pages]').click();
  const row=page.locator('tr').filter({has:page.locator('small', {hasText:'leistungen'})}).first();
  await row.locator('.page-overview-button').click();
  const frame=page.frameLocator('.editor-preview-viewport iframe');
  await frame.locator('[data-copy-key=title]').waitFor();
  await page.locator('#content-form [name=title]').fill('Test Therapien Überschrift');
  await frame.locator('[data-copy-key=title].admin-preview-highlight').filter({hasText:'Test Therapien Überschrift'}).waitFor();
  assert.equal(await frame.locator('[data-copy-key=title]').textContent(),'Test Therapien Überschrift');
  await frame.locator('[data-copy-key=title]').click();
  assert.equal(await page.locator('#content-form [name=title]').evaluate(element=>document.activeElement===element),true);
  await page.locator('#content-form button[value=draft]').click();
  const publicPage=await browser.newPage();
  await publicPage.goto(origin+'/leistungen?lang=de');
  assert.notEqual(await publicPage.locator('h1').textContent(),'Test Therapien Überschrift');
  await row.locator('.page-overview-button').click();
  await page.locator('#content-form button[value=publish]').click();
  await publicPage.reload();
  assert.equal(await publicPage.locator('h1').textContent(),'Test Therapien Überschrift');
  assert.deepEqual(errors,[]);
  console.log('Editorial preview and draft/publish browser flow passed.');
}finally{await browser.close();}
