import {createRequire} from 'node:module';
import assert from 'node:assert/strict';

const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/kovac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({channel:process.env.QA_BROWSER_CHANNEL||'chrome',headless:true});
const origin=process.env.QA_ORIGIN||'http://127.0.0.1:3001';
try{
  for(const lang of ['en','de']){
    const page=await browser.newPage({viewport:{width:1480,height:900}});
    await page.goto(`${origin}/?lang=${lang}`);
    await page.locator('.cookie-acknowledge').click();
    await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
    await page.waitForTimeout(1700);
    const layout=await page.locator('footer').evaluate(footer=>{
      const boxes=selector=>[...footer.querySelectorAll(selector)].map(node=>{
        const rect=node.getBoundingClientRect();
        return {x:rect.x,y:rect.y,right:rect.right};
      });
      return {heads:boxes('.footer-cell-head'),mains:boxes('.footer-cell-main'),tails:boxes('.footer-cell-tail'),bottom:boxes('.footer-bottom>*'),line:boxes('.footer-bottom')[0],overflow:document.documentElement.scrollWidth-innerWidth};
    });
    for(const row of [layout.heads,layout.mains,layout.tails]){
      assert.equal(row.length,4);
      assert.ok(row.every(item=>Math.abs(item.y-row[0].y)<2),`${lang}: all four footer cells in a row should align vertically`);
      assert.ok(row.every((item,index)=>Math.abs(item.x-layout.heads[index].x)<2),`${lang}: all footer rows should share column edges`);
    }
    assert.ok(layout.bottom.every((item,index)=>Math.abs(item.x-layout.heads[index].x)<2),`${lang}: bottom links should align with the four columns`);
    assert.ok(Math.abs(layout.line.x-layout.heads[0].x)<2,`${lang}: rule should begin at the first column`);
    assert.equal(layout.overflow,0,`${lang}: footer should not overflow the viewport`);
    await page.close();
  }
  for(const width of [1024,390]){
    const page=await browser.newPage({viewport:{width,height:900}});
    await page.goto(origin+'/?lang=en');
    await page.locator('.cookie-acknowledge').click();
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
    assert.equal(overflow,0,`${width}px: footer layout should not cause horizontal overflow`);
    await page.close();
  }
  console.log('Footer rows, columns, lower links, and responsive widths verified');
}finally{await browser.close();}
