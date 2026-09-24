// Run against the disposable browser fixture, never production.
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('C:/Users/kovac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
  const page=await browser.newPage();
  await page.goto('' + (process.env.QA_ORIGIN||'http://127.0.0.1:3011') + '/admin?lang=en');
  await page.locator('[name=email]').fill('preview@example.test');
  await page.locator('[name=password]').fill('local-preview-only-2026');
  await page.locator('#login-form button.button').click();
  await page.locator('[data-view=reviews]').click();
  const ids=[];
  for(let i=1;i<=3;i++){
    await page.locator('#new-content').click();
    ids.push(await page.locator('#content-form [name=id]').inputValue());
    assert.equal(await page.locator('#content-form [name=id]').isVisible(),false);
    await page.locator('#content-form [name=title]').fill('Review '+i);
    await page.locator('#content-form [name=body]').fill('Independent review '+i);
    await page.locator('[data-rating="5"]').click();
    await page.locator('[value=publish]').click();
    await page.locator('#editor-dialog').waitFor({state:'hidden'});
    await page.waitForFunction(n=>document.querySelectorAll('[data-edit]').length===n,i);
  }
  assert.equal(new Set(ids).size,3);
  assert.equal(await page.locator('#new-content').isDisabled(),true);
  await page.locator(`[data-edit="${ids[1]}"]`).click();
  await page.locator('#content-form [name=body]').fill('Edited second review');
  await page.locator('[value=publish]').click();
  await page.locator('#editor-dialog').waitFor({state:'hidden'});
  const publicPage=await browser.newPage();await publicPage.goto('' + (process.env.QA_ORIGIN||'http://127.0.0.1:3011') + '/?lang=en');
  await publicPage.locator('.review-card blockquote').first().waitFor();
  assert.deepEqual(await publicPage.locator('.review-card blockquote').allTextContents(),['Independent review 1','Edited second review','Independent review 3']);
  await page.locator(`[data-remove="${ids[2]}"]`).click();await page.locator('[data-confirm]').click();
  await page.waitForFunction(()=>document.querySelector('#new-content')?.disabled===false);
  console.log('Three independent reviews, edit isolation, display limit and deletion passed');
}finally{await browser.close();}
