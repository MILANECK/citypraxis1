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
      return {heads:boxes('.footer-cell-head'),mains:boxes('.footer-cell-main'),tails:boxes('.footer-cell-tail'),bottom:boxes('.footer-bottom>*'),links:boxes('.footer-bottom-links>*'),line:boxes('.footer-bottom')[0],overflow:document.documentElement.scrollWidth-innerWidth};
    });
    for(const row of [layout.heads,layout.mains,layout.tails]){
      assert.equal(row.length,4);
      assert.ok(row.every(item=>Math.abs(item.y-row[0].y)<2),`${lang}: all four footer cells in a row should align vertically`);
      assert.ok(row.every((item,index)=>Math.abs(item.x-layout.heads[index].x)<2),`${lang}: all footer rows should share column edges`);
    }
    assert.equal(layout.bottom.length,2);
    assert.equal(layout.links.length,4);
    assert.ok(Math.abs(layout.bottom[0].x-layout.heads[0].x)<2,`${lang}: copyright should align with the logo`);
    assert.ok(Math.abs(layout.links[0].x-layout.heads[2].x)<2,`${lang}: legal links should begin below contact details`);
    assert.ok(Math.abs(layout.links[3].right-layout.heads[3].right)<2,`${lang}: practice login should end at the final column edge`);
    assert.ok(layout.links.every(link=>Math.abs(link.y-layout.links[0].y)<2),`${lang}: footer links should share one baseline`);
    const linkGaps=layout.links.slice(1).map((link,index)=>link.x-layout.links[index].right);
    assert.ok(Math.max(...linkGaps)-Math.min(...linkGaps)<2,`${lang}: footer links should have even spacing`);
    const faqStart=await page.locator('.home-faq .faq-list summary').last().evaluate(node=>node.getBoundingClientRect().x);
    assert.ok(Math.abs(layout.heads[1].x-faqStart)<3,`${lang}: Visit us should begin directly below the FAQ questions`);
    assert.ok(Math.abs(layout.line.x-layout.heads[0].x)<2,`${lang}: rule should begin at the first column`);
    assert.equal(layout.overflow,0,`${lang}: footer should not overflow the viewport`);
    await page.close();
  }
  for(const [width,lang] of [[1024,'en'],[390,'en'],[390,'de']]){
    const page=await browser.newPage({viewport:{width,height:900}});
    await page.goto(`${origin}/?lang=${lang}`);
    await page.locator('.cookie-acknowledge').click();
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
    assert.equal(overflow,0,`${width}px: footer layout should not cause horizontal overflow`);
    if(width===390){
      const linkTops=await page.locator('.footer-bottom').evaluate(node=>[...node.querySelectorAll('a,button')].map(item=>item.getBoundingClientRect().y));
      assert.equal(linkTops.length,4,`${lang}: expected all footer links`);
      assert.ok(linkTops.every(y=>Math.abs(y-linkTops[0])<1),`${lang}: mobile footer links should share one line`);
    }
    await page.close();
  }
  console.log('Footer rows, columns, lower links, and responsive widths verified');
}finally{await browser.close();}
