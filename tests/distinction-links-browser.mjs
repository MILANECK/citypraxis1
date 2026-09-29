import {createRequire} from 'node:module';
import assert from 'node:assert/strict';

const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/kovac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({channel:process.env.QA_BROWSER_CHANNEL||'chrome',headless:true});
const origin=process.env.QA_ORIGIN||'http://127.0.0.1:3001';
const destinations=[
  '/kontakt#oeffnungszeiten',
  '/termin?akut=1#akuttermin',
  '/ueber-uns#team',
  '/leistungen/logopaedie#logopaedie-crafta',
  '/leistungen/osteopathie#osteopathie-ausbildung',
  '/leistungen/physiotherapie#physiotherapie-sport',
  '/leistungen/crafta#therapy-overview',
  '/leistungen/physiotherapie#therapy-overview',
  '/leistungen/faszienbehandlungen#therapy-overview',
  '/leistungen/heilmassage#manuelle-lymphdrainage'
];
try{
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  for(const lang of ['de','en']){
    await page.goto(`${origin}/?lang=${lang}`);
    const links=page.locator('.home-distinction-benefits .home-distinction-link');
    assert.equal(await links.count(),10,`Expected ten benefit links in ${lang}`);
    const hrefs=await links.evaluateAll(nodes=>nodes.map(node=>node.getAttribute('href')));
    for(const [index,href] of hrefs.entries()){
      const url=new URL(href,origin);
      assert.equal(url.pathname+url.hash,destinations[index].replace('?akut=1',''),`Wrong destination for benefit ${index+1} in ${lang}`);
      assert.equal(url.searchParams.get('lang'),lang,`Language lost for benefit ${index+1}`);
      if(index===1)assert.equal(url.searchParams.get('akut'),'1');
      await page.goto(url.href);
      await page.waitForSelector('main h1');
      assert.ok(await page.locator(`#${url.hash.slice(1)}`).count(),`Missing target for benefit ${index+1} in ${lang}`);
      if(index===1)assert.ok(await page.locator('#booking-form input[name="acute"]').isChecked());
    }
  }
  await page.goto(`${origin}/?lang=en`);
  await page.locator('.home-distinction-link').last().click();
  await page.waitForURL('**/leistungen/heilmassage?lang=en#manuelle-lymphdrainage');
  await page.waitForFunction(()=>{
    const target=document.getElementById('manuelle-lymphdrainage');
    return target&&window.scrollY>0&&target.getBoundingClientRect().top<350;
  });
  await page.close();
  console.log('All ten benefit links reach their sections in German and English');
}finally{await browser.close();}
