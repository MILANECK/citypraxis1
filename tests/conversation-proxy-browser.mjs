// Actual mobile review controls, with memory storage and blocked external egress.
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/database.mjs';
import {createApp} from '../src/server.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.QA_PLAYWRIGHT_MODULE||'C:/Users/kovac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const oldEnv={...process.env},oldFetch=globalThis.fetch;
for(const key of Object.keys(process.env))if(/SUPABASE|OPENAI|RESEND|CHAT_NOTIFY|PATIENT_CONFIRMATION|APP_ORIGIN/u.test(key))delete process.env[key];
Object.assign(process.env,{CHAT_AI_ENABLED:'true',OPENAI_API_KEY:'offline-fixture',RESEND_API_KEY:'offline-fixture',CHAT_NOTIFY_FROM:'reception@example.test',CHAT_NOTIFY_TO:'office@example.test',PATIENT_CONFIRMATION_FROM:'receipts@example.test'});
const emails=[];
globalThis.fetch=async(url,options)=>{
  if(url==='https://api.resend.com/emails'){emails.push(JSON.parse(options.body));return new Response('{}',{status:200});}
  assert.equal(url,'https://api.openai.com/v1/responses','Unexpected egress');
  const input=JSON.parse(JSON.parse(options.body).input);
  const answer={kind:'appointment',input_language:'unclear',answer:'',related_pages:[],booking_intent:'unspecified',booking_choice:'unspecified',needs_clarification:false,reason:/shoulder pain|Schulterschmerzen/iu.test(input.visitorMessage)?input.visitorMessage:null,availability:null,first_name:null,last_name:null,patient_status:null};
  return new Response(JSON.stringify({status:'completed',output:[{type:'message',role:'assistant',status:'completed',phase:'final_answer',content:[{type:'output_text',text:JSON.stringify(answer)}]}]}),{status:200});
};
const db=openDatabase(':memory:'),server=createApp(db);
assert.ok(db.prepare('PRAGMA database_list').all().every(row=>!row.file));
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
let browser;
try{
  await mkdir('test-results/remaining-repairs-2026-10-11',{recursive:true});
  browser=await chromium.launch({channel:process.env.QA_BROWSER_CHANNEL||'chrome',headless:true});
  for(const language of ['de','en']){
    const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
    await page.goto(`${origin}/?lang=${language}`);await page.locator('.cookie-acknowledge').click();await page.locator('.chat-launch').click();
    await page.locator('.conversation-start .chat-check').click();await page.locator('.conversation-start button').click();await page.locator('#conversation-input:not(:disabled)').waitFor();
    const turn=async message=>{
      const before=await page.locator('.conversation-message.from-assistant').count();
      await page.locator('#conversation-input').fill(message);await page.locator('.conversation-compose button').click();
      await page.waitForFunction(n=>document.querySelectorAll('.conversation-message.from-assistant:not(.is-pending)').length>n,before);
      await page.waitForFunction(()=>!document.querySelector('#cp-chat').hasAttribute('aria-busy'));
    };
    const de=language==='de',email=`sender.${language}@example.test`,phone=de?'+12025550100':'+12025550101';
    await turn(de?'Ich möchte einen Termin':'I want an appointment');await turn(de?'Vorbereiten':'Here in chat, please');
    await turn('Alex Musterer');await turn(email);
    await turn(de?'Ist info@citypraxis.wien Ihre E-Mail und erreiche ich Ihren Empfang unter +43 699 12682157?':'Is info@citypraxis.wien your email and can I reach reception at +43 699 12682157?');
    assert.equal(await page.locator('.conversation-review').count(),0);
    await turn(phone);
    await turn(de?'Die Anfrage ist für meine Mutter. Die Patientin heißt Mara Fiktiva, E-Mail und Telefonnummer gehören mir. Sie hat Schulterschmerzen.':'This request is for my mother. The patient is Mara Fiktiva, email and phone are mine. She has shoulder pain.');
    if(!await page.locator('.conversation-review').count())throw new Error(`Proxy review missing: ${await page.locator('.conversation-thread').innerText()}`);
    await page.locator('.conversation-review').waitFor();
    assert.match(await page.locator('.conversation-review').innerText(),/Alex Musterer/u);
    assert.match(await page.locator('[data-edit=name]').innerText(),/Mara Fiktiva/u);
    assert.match(await page.locator('[data-edit=name]').innerText(),de?/Name der Patientin/u:/Patient name/u);
    assert.match(await page.locator('[data-edit=email]').innerText(),new RegExp(email.replace(/\./gu,'\\.')));
    assert.ok((await page.locator('[data-edit=phone]').innerText()).includes(phone));
    await page.locator('[data-edit=name]').click();await turn('Mara Musterfrau');
    assert.match(await page.locator('[data-edit=name]').innerText(),/Mara Musterfrau/u);
    assert.match(await page.locator('.conversation-review').innerText(),/Alex Musterer/u);
    await page.screenshot({path:`test-results/remaining-repairs-2026-10-11/proxy-${language}.png`});
    await page.locator('.conversation-confirm input').check();await page.locator('.conversation-confirm button').click();await page.locator('.request-confirmation').waitFor();
    const saved=db.prepare('SELECT name,email,phone,intake FROM requests ORDER BY id DESC LIMIT 1').get();
    assert.equal(saved.name,'Mara Musterfrau');assert.equal(saved.email,email);assert.equal(saved.phone,phone);assert.equal(JSON.parse(saved.intake).contact_name,'Alex Musterer');
    assert.match(emails.at(-1).text,/Alex Musterer/u);assert.deepEqual(errors,[]);
    await context.close();console.log(`${language}: proxy patient label/edit, sender identity, contact question and saved request passed`);
  }
  console.log('Paid calls: 0. External email deliveries: 0. Production writes: 0.');
}finally{
  if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));db.close();globalThis.fetch=oldFetch;process.env=oldEnv;
}
