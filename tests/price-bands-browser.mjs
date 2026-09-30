import {createRequire} from 'node:module';
import assert from 'node:assert/strict';

const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/kovac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({channel:process.env.QA_BROWSER_CHANNEL||'chrome',headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:600},reducedMotion:'no-preference'});
  await page.goto((process.env.QA_ORIGIN||'http://127.0.0.1:3001')+'/preise?lang=en');
  const first=page.locator('#price-panel-0 .reimbursement-table');
  const bands=first.locator('tbody tr:nth-child(even)');
  assert.ok(await bands.count()>1,'The price list should have multiple bands');
  assert.equal(await bands.first().evaluate(row=>row.classList.contains('is-visible')),false);
  await first.evaluate(table=>scrollTo({top:scrollY+table.getBoundingClientRect().top-innerHeight*.8,behavior:'instant'}));
  await page.waitForFunction(()=>[...document.querySelectorAll('#price-panel-0 tbody tr.price-band-reveal')].every(row=>row.classList.contains('is-visible')));
  assert.ok(await bands.last().evaluate(row=>row.getBoundingClientRect().top>innerHeight),'Bands below the viewport should begin with the visible table');
  await page.waitForTimeout(2900);
  assert.equal(await bands.last().evaluate(row=>getComputedStyle(row).backgroundSize),'100% 100%','The sequence should finish without further scrolling');

  await page.locator('[data-price-tab]').nth(1).click();
  await page.locator('#price-panel-1 .reimbursement-table').evaluate(table=>scrollTo({top:scrollY+table.getBoundingClientRect().top-innerHeight*.8,behavior:'instant'}));
  await page.waitForFunction(()=>[...document.querySelectorAll('#price-panel-1 tbody tr.price-band-reveal')].every(row=>row.classList.contains('is-visible')));
  assert.equal(await page.locator('#price-panel-1').evaluate(panel=>panel.hidden),false,'Switching categories should reveal that table');

  const reimbursement=page.locator('.reimbursement-table:not(.price-table)');
  await reimbursement.evaluate(table=>scrollTo({top:scrollY+table.getBoundingClientRect().top-innerHeight*.8,behavior:'instant'}));
  await page.waitForFunction(()=>[...document.querySelectorAll('.reimbursement-table:not(.price-table) tbody tr.price-band-reveal')].every(row=>row.classList.contains('is-visible')));
  console.log('Price bands run per table without scroll-controlled progress');
}finally{await browser.close();}
