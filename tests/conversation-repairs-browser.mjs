// Focused offline browser regression: real HTTP/session/review/storage paths,
// SQLite memory only, deterministic model responses, and intercepted emails.
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/database.mjs';
import {createApp} from '../src/server.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.QA_PLAYWRIGHT_MODULE||'C:/Users/kovac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const oldEnv={...process.env},oldFetch=globalThis.fetch;
for(const key of Object.keys(process.env))if(/SUPABASE|OPENAI|RESEND|CHAT_NOTIFY|PATIENT_CONFIRMATION|APP_ORIGIN/u.test(key))delete process.env[key];
Object.assign(process.env,{CHAT_AI_ENABLED:'true',OPENAI_API_KEY:'offline-fixture',RESEND_API_KEY:'offline-fixture',CHAT_NOTIFY_FROM:'reception@example.test',CHAT_NOTIFY_TO:'office@example.test',PATIENT_CONFIRMATION_FROM:'reception@example.test'});
const outgoing=[];
globalThis.fetch=async(url,options)=>{
  outgoing.push({url,body:JSON.parse(options.body)});
  if(url==='https://api.resend.com/emails')return new Response('{}',{status:503});
  assert.equal(url,'https://api.openai.com/v1/responses','Unexpected server egress is blocked');
  const input=JSON.parse(JSON.parse(options.body).input),de=input.language==='de';
  const answer={kind:'appointment',input_language:'unclear',answer:de?'Ich habe Ihr Anliegen notiert.':'I’ve noted your concern.',related_pages:[],booking_intent:'unspecified',booking_choice:'unspecified',needs_clarification:false,reason:/shoulder pain|schulterschmerzen/iu.test(input.visitorMessage)?input.visitorMessage:null,availability:null,first_name:null,last_name:null,patient_status:null};
  const message=(phase,text)=>({type:'message',role:'assistant',status:'completed',phase,content:[{type:'output_text',text}]});
  return new Response(JSON.stringify({status:'completed',output:[message('commentary','Checking the request.'),message('final_answer',JSON.stringify(answer))]}),{status:200,headers:{'Content-Type':'application/json'}});
};
const db=openDatabase(':memory:'),server=createApp(db);
assert.ok(db.prepare('PRAGMA database_list').all().every(row=>!row.file));
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
let browser;
try{
  await mkdir('test-results/chatbot-repairs-2026-10-11',{recursive:true});
  browser=await chromium.launch({channel:process.env.QA_BROWSER_CHANNEL||'chrome',headless:true});
  for(const language of ['de','en']){
    const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
    await page.goto(`${origin}/?lang=${language}`);
    await page.locator('.cookie-acknowledge').click();await page.locator('.chat-launch').click();
    await page.locator('.conversation-start .chat-check').click();assert.equal(await page.locator('.conversation-start input').isChecked(),true);await page.locator('.conversation-start button').click();
    await page.locator('#conversation-input:not(:disabled)').waitFor();
    const turn=async message=>{
      const before=await page.locator('.conversation-message.from-assistant').count();
      await page.locator('#conversation-input').fill(message);await page.locator('.conversation-compose button').click();
      await page.waitForFunction(count=>document.querySelectorAll('.conversation-message.from-assistant:not(.is-pending)').length>count,before);
      await page.waitForFunction(()=>!document.querySelector('#cp-chat').hasAttribute('aria-busy'));
    };
    const de=language==='de',other=de?'en':'de';
    await turn(de?'Ich möchte einen Termin':'I want an appointment');await turn(de?'Vorbereiten':'I want to continue');
    await turn(de?'Mein vollständiger Name ist Dr. Anna-Lena Musterfrau.':'My full name is Dr. Anna-Lena Birkenhain.');
    await turn(`anna2026.${language}@example.test`);
    await turn(de?'Bitte die E-Mail-Kopie auf Englisch; der Chat bleibt auf Deutsch.':'Please send the email copy in German; keep the chat in English.');
    await turn(de?'in English please':'auf Deutsch bitte');
    await turn(de?'auf Deutsch bitte':'can we continue in english pls');
    await turn(de?'+1 202 555 0100':'+1 202 555 0101');await turn(de?'Schulterschmerzen':'Shoulder pain');
    await page.locator('.conversation-review').waitFor();
    assert.match(await page.locator('.conversation-summary-row').first().innerText(),de?/Dr\. Anna-Lena Musterfrau/u:/Dr\. Anna-Lena Birkenhain/u);
    await page.locator('[data-review-choice-toggle=receipt_language]').click();
    assert.equal(await page.locator('[data-review-choice=receipt_language]').count(),2);
    await page.locator(`[data-review-choice=receipt_language][data-value=${language}]`).click();
    await page.waitForFunction(()=>!document.querySelector('#cp-chat').hasAttribute('aria-busy'));
    await page.locator('[data-review-choice-toggle=receipt_language]').click();
    await page.locator(`[data-review-choice=receipt_language][data-value=${other}]`).click();
    await page.waitForFunction(()=>!document.querySelector('#cp-chat').hasAttribute('aria-busy'));
    await page.locator('[data-edit=availability]').click();await turn(de?'Donnerstag nach 17 Uhr':'Thursday after 17:00');
    await page.locator('[data-edit=availability]').click();await turn(de?'Freitag vormittags':'Friday morning');
    await page.locator('[data-edit=availability]').click();await turn(de?'doch wieder wie zuerst, Donnerstag':'Actually, back to the first choice, Thursday');
    assert.match(await page.locator('[data-edit=availability]').innerText(),/17/u);
    await page.locator('[data-edit=email]').click();await turn(de?'Bitte die E-Mail von vorher':'Use the same email as before please');
    assert.match(await page.locator('[data-edit=email]').innerText(),new RegExp(`anna2026\\.${language}@example\\.test`));
    assert.equal(await page.locator('.chat-scroll').evaluate(el=>el.scrollWidth<=el.clientWidth),true);
    await page.screenshot({path:`test-results/chatbot-repairs-2026-10-11/review-${language}.png`});
    const before=db.prepare('SELECT COUNT(*) AS n FROM requests').get().n;
    await page.locator('.conversation-confirm input').check();await page.locator('.conversation-confirm button').click();
    await page.locator('.request-confirmation').waitFor();
    const success=await page.locator('.request-confirmation').innerText();
    assert.match(success,de?/E-Mail-Kopie konnte nicht versendet/u:/email copy could not be sent/u);
    assert.match(success,de?/Bitte senden Sie die Anfrage nicht erneut/u:/Please do not submit the request again/u);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM requests').get().n,before+1);
    const row=db.prepare('SELECT intake FROM requests ORDER BY id DESC LIMIT 1').get(),intake=JSON.parse(row.intake);
    assert.equal(intake.receipt_language,other);assert.equal(intake.language,language);assert.match(intake.availability_notes,/17/u);
    const patientEmail=outgoing.filter(item=>item.url==='https://api.resend.com/emails'&&item.body.to.includes(`anna2026.${language}@example.test`)).at(-1);
    assert.match(patientEmail.body.html,new RegExp(`lang="${other}"`));
    assert.deepEqual(errors,[]);
    await page.screenshot({path:`test-results/chatbot-repairs-2026-10-11/received-email-failed-${language}.png`});
    await context.close();console.log(`${language}: real mobile HTTP/review/receipt flow passed; memory storage and emails intercepted`);
  }
  console.log('Focused browser regression completed. Paid calls: 0. External emails: 0. Production writes: 0.');
}finally{
  if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));db.close();globalThis.fetch=oldFetch;process.env=oldEnv;
}
