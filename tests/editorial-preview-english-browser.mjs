// Run against tests/browser-fixture.mjs only.
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('C:/Users/kovac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const origin=process.env.QA_ORIGIN||'http://127.0.0.1:3014';
assert.ok(['127.0.0.1','localhost'].includes(new URL(origin).hostname));
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await page.goto(origin+'/admin?lang=en');
  await page.locator('#login-form [name=email]').fill('preview@example.test');
  await page.locator('#login-form [name=password]').fill('local-preview-only-2026');
  await page.locator('#login-form button.button').click();
  await page.locator('[data-view=pages]').click();
  await page.locator('tr').filter({has:page.locator('small',{hasText:'home'})}).first().locator('.page-overview-button').click();
  const frame=page.frameLocator('.editor-preview-viewport iframe');
  await frame.locator('[data-copy-key=therapiesHeading]').click();
  await page.waitForFunction(()=>document.activeElement===document.querySelector('#content-form [name=therapiesHeadingEn]'));
  const selected=page.locator('#content-form .editor-field-selected');
  assert.equal(await selected.count(),1);
  assert.equal(await selected.getAttribute('name'),'therapiesHeadingEn');
  assert.equal(await selected.evaluate(element=>getComputedStyle(element).outlineStyle),'solid');
  assert.equal(await selected.evaluate(element=>getComputedStyle(element).boxShadow),'none');
  assert.equal(await selected.evaluate(element=>element.selectionStart),0);
  assert.equal(await selected.evaluate(element=>element.selectionEnd),await selected.inputValue().then(value=>value.length));
  await page.waitForFunction(()=>{const rect=document.querySelector('#content-form [name=therapiesHeadingEn]').getBoundingClientRect();return rect.top>=0&&rect.bottom<=innerHeight;});
  assert.equal(await frame.locator('[data-copy-key=therapiesHeading].admin-preview-highlight').evaluate(element=>getComputedStyle(element).boxShadow),'none');
  await frame.locator('[data-copy-key=teamHeading]').click();
  await page.waitForFunction(()=>document.activeElement===document.querySelector('#content-form [name=teamHeadingEn]'));
  await frame.locator('[data-copy-key=therapiesHeading]').evaluate(element=>{
    const range=document.createRange();range.selectNodeContents(element);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);element.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));
  });
  await page.waitForFunction(()=>document.activeElement===document.querySelector('#content-form [name=therapiesHeadingEn]'));
  console.log('English preview selection is visible in the editor.');
}finally{await browser.close();}
