import {createRequire} from 'node:module';
import assert from 'node:assert/strict';

const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/kovac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({channel:process.env.QA_BROWSER_CHANNEL||'chrome',headless:true});
const alignment=heading=>heading.evaluate(node=>{
  const text=node.firstChild,indices=[...text.textContent].map((letter,index)=>/\s/u.test(letter)?null:index).filter(index=>index!==null);
  return [...node.querySelectorAll('.therapy-wave-glyph')].reduce((worst,glyph,index)=>{
    const original=document.createRange(),copy=document.createRange();
    original.setStart(text,indices[index]);original.setEnd(text,indices[index]+1);
    copy.selectNodeContents(glyph);
    const before=original.getBoundingClientRect(),animated=copy.getBoundingClientRect(),motion=new DOMMatrixReadOnly(getComputedStyle(glyph).transform);
    return Math.max(worst,Math.abs(animated.x-motion.m41-before.x),Math.abs(animated.y-motion.m42-before.y));
  },0);
});
try{
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'no-preference'});
  await page.goto((process.env.QA_ORIGIN||'http://127.0.0.1:3001')+'/leistungen/heilmassage?lang=en');
  await page.locator('.cookie-acknowledge').click();
  await page.waitForTimeout(1800);
  const link=page.locator('.therapy-nav-group').first().locator('a[href^="#"]').nth(3);
  const target=await link.getAttribute('href');
  const originalTextWidth=await page.locator(target).locator('h2').evaluate(heading=>{const range=document.createRange();range.selectNodeContents(heading.firstChild);return range.getBoundingClientRect().width;});
  await link.click();
  await page.waitForTimeout(160);
  const early=await page.evaluate(()=>window.scrollY);
  await page.waitForTimeout(570);
  const middle=await page.evaluate(()=>window.scrollY);
  await page.waitForFunction(()=>[...document.querySelectorAll('.therapy-wave-glyph')].some(glyph=>Math.abs(new DOMMatrixReadOnly(getComputedStyle(glyph).transform).m42)>2));
  const wavePosition=await page.locator(target).locator('h2').evaluate(heading=>heading.getBoundingClientRect().top);
  assert.ok(wavePosition>150,'The letter wave should start while the section is still arriving');
  assert.ok(await page.locator('.therapy-wave-glyph').count()>10,'The heading should animate individual letters');
  assert.ok(await alignment(page.locator(target).locator('h2'))<.6,'The H2 wave letters should share the original text baseline');
  assert.equal(await page.locator(target).locator('h2').evaluate(heading=>getComputedStyle(heading).filter),'none','The selected heading should not remain blurred during the wave');
  await page.waitForTimeout(180);
  await page.screenshot({path:'test-results/therapy-wave-mid.png'});
  await page.waitForTimeout(1250);
  const final=await page.evaluate(()=>window.scrollY);
  const destination=await page.locator(target).evaluate(node=>node.getBoundingClientRect().top);
  assert.ok(early<middle&&middle<final,'The page should keep moving gradually toward the section');
  assert.ok(Math.abs(destination-125)<4,'The selected heading should settle below the header');
  const finalTextWidth=await page.locator(target).locator('h2').evaluate(heading=>{const range=document.createRange();range.selectNodeContents(heading.firstChild);return range.getBoundingClientRect().width;});
  assert.ok(Math.abs(finalTextWidth-originalTextWidth)<.5,'The heading should keep its exact text width after the wave');
  assert.equal(new URL(page.url()).hash,target);

  await page.evaluate(()=>window.scrollBy({top:-200,behavior:'instant'}));
  await page.waitForTimeout(40);
  const sticky=await page.locator('.therapy-quick-nav').evaluate(node=>({top:node.getBoundingClientRect().top,bottom:node.getBoundingClientRect().bottom,transform:getComputedStyle(node).transform}));
  assert.ok(Math.abs(sticky.top-120)<2,'The sidebar should stay anchored below the header');
  assert.ok(sticky.bottom<=868,'The sidebar should leave room below the viewport');
  assert.equal(sticky.transform,'none','The whole sidebar should not glide during scrolling');
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
  const introduction=await page.evaluate(()=>({menu:document.querySelector('.therapy-quick-nav').getBoundingClientRect().top,photo:document.querySelector('.service-intro').getBoundingClientRect().bottom}));
  assert.ok(introduction.menu>=introduction.photo-1,'The sidebar should stay below the introductory photo');

  await page.evaluate(()=>scrollTo({top:1700,behavior:'instant'}));
  await page.waitForTimeout(1300);
  const closingFrames=await page.evaluate(()=>new Promise(resolve=>{
    const group=document.querySelector('.therapy-nav-group'),next=group.nextElementSibling,frames=[];
    const sample=()=>{
      frames.push({open:group.open,top:next.getBoundingClientRect().top});
      if(!group.open)resolve(frames);
      else requestAnimationFrame(sample);
    };
    group.querySelector('summary').click();
    requestAnimationFrame(sample);
  }));
  const lastOpen=closingFrames.at(-2),firstClosed=closingFrames.at(-1);
  assert.ok(lastOpen?.open&&!firstClosed.open&&Math.abs(firstClosed.top-lastOpen.top)<3,'The menu should finish closing without a final pixel jump');
  const compact=await page.locator('.therapy-quick-nav').evaluate(node=>({top:node.getBoundingClientRect().top,transform:getComputedStyle(node).transform}));
  assert.ok(Math.abs(compact.top-120)<2,'Closing a category should not reposition the whole sidebar');
  assert.equal(compact.transform,'none');
  await page.screenshot({path:'test-results/therapy-nav-stable.png'});
  await page.setViewportSize({width:800,height:900});
  assert.equal(await page.locator('.therapy-quick-nav').evaluate(node=>getComputedStyle(node).position),'static');
  assert.equal(await page.locator('.therapy-quick-nav').evaluate(node=>getComputedStyle(node).transform),'none');
  await page.setViewportSize({width:1440,height:900});
  await page.waitForTimeout(1000);
  assert.equal(await page.locator('.therapy-quick-nav').evaluate(node=>getComputedStyle(node).position),'sticky');
  await page.locator('.therapy-nav-group').first().locator('summary').click();
  const overview=page.locator('.therapy-nav-group').first().locator('a[href="#therapy-overview"]');
  await overview.click();
  await page.waitForFunction(()=>document.querySelector('#therapy-overview h1 .therapy-wave-glyph'));
  assert.ok(await alignment(page.locator('#therapy-overview h1'))<.6,'The H1 wave letters should not jump when the original heading returns');

  const reduced=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  await reduced.goto((process.env.QA_ORIGIN||'http://127.0.0.1:3001')+'/leistungen/heilmassage?lang=en');
  const reducedLink=reduced.locator('.therapy-nav-group').first().locator('a[href^="#"]').nth(3);
  await reducedLink.click();
  const reducedTarget=await reducedLink.getAttribute('href');
  const reducedPosition=await reduced.locator(reducedTarget).evaluate(node=>node.getBoundingClientRect().top);
  assert.ok(reducedPosition>=100&&reducedPosition<=260,'Reduced-motion navigation should put the section below the header');
  assert.equal(await reduced.locator('.therapy-quick-nav').evaluate(node=>getComputedStyle(node).transform),'none');

  const short=await browser.newPage({viewport:{width:1024,height:650},reducedMotion:'reduce'});
  await short.goto((process.env.QA_ORIGIN||'http://127.0.0.1:3001')+'/leistungen/heilmassage?lang=en');
  await short.evaluate(()=>scrollTo({top:1700,behavior:'instant'}));
  const bounded=await short.locator('.therapy-quick-nav').evaluate(node=>{
    const box=node.getBoundingClientRect(),links=node.querySelector('.therapy-nav-sections'),booking=node.querySelector('.therapy-nav-booking');
    return {top:box.top,bottom:box.bottom,height:box.height,linksHeight:links.clientHeight,linksContent:links.scrollHeight,bookingBottom:booking.getBoundingClientRect().bottom};
  });
  assert.ok(Math.abs(bounded.top-120)<2&&bounded.bottom<=618,'The sticky card should keep clear top and bottom margins on short screens');
  assert.ok(bounded.linksContent>bounded.linksHeight&&bounded.bookingBottom<=bounded.bottom,'Long links should scroll inside while the appointment button stays visible');
  console.log('Therapy navigation movement and reduced-motion behavior verified');
}finally{await browser.close();}
