import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {openDatabase,passwordHash} from '../src/database.mjs';
import {createApp} from '../src/server.mjs';

const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/kovac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const db=openDatabase(':memory:');
db.prepare('INSERT INTO users(email,name,password,role) VALUES(?,?,?,?)').run('preview@example.test','Preview Admin',passwordHash('local-preview-only-2026'),'owner');
const server=createApp(db);
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
  const page=await browser.newPage({viewport:{width:1366,height:900},reducedMotion:'reduce'});
  await page.goto(`${origin}/admin`);
  await page.locator('#login-form [name=email]').fill('preview@example.test');
  await page.locator('#login-form [name=password]').fill('local-preview-only-2026');
  await page.locator('#login-form button').first().click();
  await page.locator('[data-view=team]').click();
  const orderRows=page.locator('.team-order-row');
  const before=await orderRows.evaluateAll(rows=>rows.map(row=>row.dataset.teamOrderId));
  assert.ok(before.length>2);
  const expected=[...before];[expected[1],expected[2]]=[expected[2],expected[1]];
  await page.locator(`.team-order-row[data-team-order-id="${expected[1]}"] [data-team-shift="-1"]`).click();
  await page.waitForFunction(ids=>JSON.stringify([...document.querySelectorAll('.team-order-row')].map(row=>row.dataset.teamOrderId))===JSON.stringify(ids),expected);
  const published=await page.evaluate(async()=> (await (await fetch('/api/content')).json()).team.map(person=>person.id));
  assert.deepEqual(published,expected);

  for(const width of [1366,390]){
    await page.setViewportSize({width,height:900});
    for(const language of ['de','en']){
      await page.goto(`${origin}/ueber-uns?lang=${language}`);
      await page.locator('.team-directory .team-person').first().waitFor({state:'attached'});
      const rendered=await page.locator('.team-directory .team-person').evaluateAll(cards=>cards.map(card=>card.dataset.teamId));
      assert.deepEqual(rendered,published,`${language} team order at ${width}px must match admin`);

      await page.goto(`${origin}/?lang=${language}`);
      await page.locator('.footer-top a.footer-action').first().waitFor();
      const homeTeamOrder=await page.locator('.home-team-roster a').evaluateAll(links=>links.map(link=>decodeURIComponent(new URL(link.href).pathname.split('/').pop())));
      assert.deepEqual(homeTeamOrder,published,`${language} landing-page team order at ${width}px must match admin`);
      const footerActions=await page.locator('.footer-top a.footer-action').evaluateAll(links=>links.map(link=>({weight:getComputedStyle(link).fontWeight,size:getComputedStyle(link).fontSize,arrow:link.querySelector('.arrow-symbol')?.getBoundingClientRect().width})));
      assert.equal(footerActions.length,2);
      assert.deepEqual(footerActions[0],footerActions[1],`${language} footer link styles at ${width}px`);
      assert.equal(await page.locator('.footer-top a.footer-action[href*="#oeffnungszeiten"]').count(),1);
    }
  }
  console.log('Admin team order is identical in DE/EN on desktop/mobile; footer links share text and arrow styles.');
}finally{
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
  db.close();
}
