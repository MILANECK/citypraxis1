import {createRequire} from 'node:module';
import assert from 'node:assert/strict';

const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/kovac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({channel:process.env.QA_BROWSER_CHANNEL||'chrome',headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'no-preference'});
  await page.goto((process.env.QA_ORIGIN||'http://127.0.0.1:3001')+'/?lang=en');
  for(const number of [4,5,7,8,9]){
    const item=page.locator('.home-distinction-benefits li').nth(number-1);
    await item.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1250);
    await page.mouse.move(0,0);
    await page.waitForTimeout(500);
    const measure=()=>item.evaluate(row=>{
      const cell=row.querySelector('.home-distinction-number');
      const range=document.createRange();range.selectNodeContents(cell);
      const glyph=range.getBoundingClientRect(),box=row.getBoundingClientRect();
      const style=getComputedStyle(cell);
      return {glyphX:glyph.x+glyph.width/2-box.x,glyphY:glyph.y+glyph.height/2-box.y,rowHeight:box.height,textX:row.querySelector('.home-distinction-benefit-text').getBoundingClientRect().x-box.x,fontSize:style.fontSize,scale:new DOMMatrixReadOnly(style.transform).a};
    });
    const before=await measure();
    await item.hover();
    await page.waitForTimeout(200);
    const middle=await measure();
    await page.waitForTimeout(340);
    const after=await measure();
    for(const stage of [middle,after]){
      assert.ok(Math.abs(stage.glyphX-before.glyphX)<1,`Number ${number} moved horizontally`);
      assert.ok(Math.abs(stage.glyphY-before.glyphY)<1,`Number ${number} moved vertically`);
      assert.ok(Math.abs(stage.rowHeight-before.rowHeight)<.5,`Row ${number} changed height`);
      assert.equal(stage.fontSize,before.fontSize,`Number ${number} triggered font layout`);
    }
    assert.ok(after.scale>1.6,`Number ${number} did not scale smoothly`);
    assert.ok(after.textX-before.textX>6,`Text ${number} did not move right`);
  }
  await page.close();
  console.log('Two-line distinction numbers stay fixed during hover');
}finally{await browser.close();}
