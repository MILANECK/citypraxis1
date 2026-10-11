import {createRequire} from 'node:module';
import {EndpointAdapter} from './sandbox.mjs';
import {HarnessStop,sha} from './support.mjs';

export function loadPlaywright(){
  const require=createRequire(import.meta.url);
  try{return require('playwright');}catch{}
  const configured=process.env.ORGANIC_PLAYWRIGHT_MODULE;
  if(configured)return require(configured);
  return require('C:/Users/kovac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
}
export class BrowserAdapter extends EndpointAdapter{
  async begin(){
    this.sandbox.assertVerified();
    const {chromium}=loadPlaywright();
    this.browser=await chromium.launch({channel:this.browserChannel||'chrome',headless:true});
    this.context=await this.browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',extraHTTPHeaders:this.testHeaders||{}});
    await this.context.tracing.start({screenshots:true,snapshots:true});
    this.page=await this.context.newPage();this.pageErrors=[];
    this.page.on('pageerror',error=>this.pageErrors.push(error.message));
    await this.context.route('**/*',route=>new URL(route.request().url()).origin===this.origin?route.continue():route.abort());
    this.page.on('response',response=>{
      const path=new URL(response.url()).pathname;
      if(!path.startsWith('/api/chat/'))return;
      this.capture=this.captureResponse(response,path);
    });
    await this.page.goto(`${this.origin}/?lang=${this.language}`);
    await this.page.locator('.cookie-acknowledge').click();
    await this.page.locator('.chat-launch').click();
    await this.page.locator('.conversation-start .conversation-consent-icon').click();
    const response=this.page.waitForResponse(response=>new URL(response.url()).pathname==='/api/chat/session');
    await this.page.locator('.conversation-start button').click();
    await response;await this.capture;
    return this.visible();
  }
  async captureResponse(response,path){
    const data=await response.json(),request=response.request().postDataJSON();
    const redacted=request?{...request,token:request.token?`session-${sha(request.token).slice(0,12)}`:undefined}:null;
    const event=this.log.event('endpoint',{conversationId:this.id,path,request:redacted,status:response.status(),response:path==='/api/chat/session'?{...data,token:`session-${sha(data.token||'').slice(0,12)}`}:data,recordCount:this.sandbox.records().length,emailCount:this.sandbox.notifications.length,transport:'real_browser'});
    this.calls.push(event);if(path==='/api/chat/session')this.token=data.token;
    this.current={...data,httpStatus:response.status()};if(data.language)this.language=data.language;
  }
  async act(action){
    let path;
    if(action.action==='message'){
      if(!await this.page.locator('#conversation-input').count())throw new HarnessStop('simulator_typed_into_missing_composer');
      await this.page.locator('#conversation-input').fill(action.message);path='/api/chat/turn';
    }else if(action.action==='edit')path='/api/chat/edit';
    else if(action.action==='choice')path='/api/chat/review-choice';
    else if(action.action==='submit')path='/api/chat/finish';
    else throw new HarnessStop('invalid_browser_action');
    const response=this.page.waitForResponse(response=>new URL(response.url()).pathname===path);
    if(action.action==='message')await this.page.locator('.conversation-compose button').click();
    if(action.action==='edit')await this.page.locator(`[data-edit="${action.field}"]`).click();
    if(action.action==='choice'){
      await this.page.locator(`[data-review-choice-toggle="${action.field}"]`).click();
      await this.page.locator(`[data-review-choice="${action.field}"][data-value="${action.value}"]`).click();
    }
    if(action.action==='submit'){
      await this.page.locator('.conversation-confirm input').check({force:true});
      await this.page.locator('.conversation-confirm button').click();
    }
    await response;await this.capture;
    await this.page.waitForFunction(()=>!document.querySelector('#cp-chat').hasAttribute('aria-busy'));
    const view=await this.visible();
    this.log.event('ui_snapshot',{conversationId:this.id,view,backendResponse:this.current,pageErrors:[...this.pageErrors],overflow:await this.page.locator('.chat-scroll').evaluate(node=>node.scrollWidth>node.clientWidth)});
    return this.current;
  }
  async visible(){
    const messages=await this.page.locator('.conversation-message.from-assistant p').allTextContents();
    const summary=await this.page.locator('.conversation-summary-row').evaluateAll(rows=>rows.map(row=>[row.querySelector('.conversation-summary-label')?.textContent.trim()||'',row.querySelector('.conversation-summary-value')?.textContent.trim()||'']));
    const received=await this.page.locator('.request-confirmation').count();
    const availableActions=[];
    if(await this.page.locator('#conversation-input').count())availableActions.push({action:'message'});
    const fields=await this.page.locator('[data-edit]').evaluateAll(nodes=>nodes.map(node=>node.dataset.edit));
    if(fields.length)availableActions.push({action:'edit',fields});
    if(await this.page.locator('[data-review-choice-toggle]').count())availableActions.push({action:'choice',fields:{patient_status:['new','existing','unsure'],preferred_contact:['email','phone','either']}});
    if(await this.page.locator('.conversation-confirm').count())availableActions.push({action:'submit',label:await this.page.locator('.conversation-confirm label').innerText()});
    if(await this.page.locator('[data-duplicate-choice]').count())availableActions.push({action:'duplicate',values:['update','new','cancel']});
    return {message:messages.at(-1)||'',summary,status:received?await this.page.locator('.request-confirmation').innerText():await this.page.locator('.chat-status').innerText(),language:this.language,availableActions};
  }
  async refresh(){
    const before=await this.visible();await this.page.reload();await this.page.locator('.chat-launch').click();
    const after=await this.visible();this.log.event('browser_refresh',{conversationId:this.id,before,after});
    return {before,after};
  }
  async discardDraft(){
    const before=await this.visible(),previousToken=this.token;
    let dialogSeen=false;this.page.once('dialog',async dialog=>{dialogSeen=dialog.type()==='confirm';await dialog.accept();});
    await this.page.locator('[data-reset]').click();
    const stored=await this.page.evaluate(()=>sessionStorage.getItem('citypraxis-conversation-v2'));
    const consentScreen=Boolean(await this.page.locator('.conversation-start').count());
    this.log.event('browser_integration',{conversationId:this.id,kind:'actual_draft_discard',dialogSeen,clientDraftCleared:stored===null,consentScreen,before,oldSession:sha(previousToken).slice(0,12)});
    if(!dialogSeen||stored!==null||!consentScreen)throw new HarnessStop('draft_discard_ui_not_verified');
    await this.page.locator('.conversation-start .conversation-consent-icon').click();
    const response=this.page.waitForResponse(r=>new URL(r.url()).pathname==='/api/chat/session');
    await this.page.locator('.conversation-start button').click();await response;await this.capture;
    const after=await this.visible(),differentSession=this.token!==previousToken;
    this.turnNumber=0;
    this.log.event('browser_integration',{conversationId:this.id,kind:'actual_new_session_after_discard',differentSession,newSession:sha(this.token).slice(0,12),after});
    if(!differentSession)throw new HarnessStop('draft_discard_reused_session');
    return {before,after,dialogSeen,clientDraftCleared:stored===null,differentSession};
  }
  async close(directory){
    if(!this.browser)return;
    await this.page.screenshot({path:`${directory}/${this.id}-mobile.png`,fullPage:false});
    await this.context.tracing.stop({path:`${directory}/${this.id}-trace.zip`});
    await this.browser.close();
  }
}
