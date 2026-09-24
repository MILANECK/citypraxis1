import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import vm from 'node:vm';
import {openDatabase,contentSnapshot} from '../src/database.mjs';
import originals from '../src/original-content.json' with {type:'json'};

function client(search='',saved=null){
 const stored=new Map(saved?[['citypraxis-language',saved]]:[]);
 const context={URL,URLSearchParams,location:{href:'http://localhost/termin'+search+'#form',search,origin:'http://localhost'},localStorage:{getItem:k=>stored.get(k),setItem:(k,v)=>stored.set(k,v)},document:{documentElement:{},addEventListener:()=>{}},window:{}};
 vm.createContext(context);
 vm.runInContext(readFileSync('public/i18n.js','utf8'),context);
 context.I18n=context.window.I18n;
 vm.runInContext(readFileSync('public/ui-translations.js','utf8'),context);
 return context;
}
test('language selection, navigation and UI translation keep form values separate',()=>{
 const en=client('?akut=1&preview=1&lang=en');
 assert.equal(en.document.documentElement.lang,'en');
 assert.equal(en.I18n.translate('Ersttermin buchen ↗'),'Book your first appointment ↗');
 assert.equal(en.I18n.translate('E-Mail oder Passwort nicht korrekt.'),'Incorrect email or password.');
 assert.equal(en.I18n.translate('5 von 5 Sternen'),'5 out of 5 stars');
 assert.match(en.I18n.toggle(),/akut=1&preview=1&lang=de#form/);
 assert.equal(client('', 'en').I18n.language,'en');
 assert.equal(client('?lang=de','en').I18n.language,'de');
 const original={pages:[{title:'Deutsch',titleEn:'English',body:'Original',bodyEn:'',image:'/assets/hero.jpg'}]};
 const translated=en.I18n.localizeContent(original);
 assert.equal(translated.pages[0].title,'English');
 assert.equal(translated.pages[0].body,'Original');
 assert.equal(translated.pages[0].image,original.pages[0].image);
 assert.equal(original.pages[0].title,'Deutsch');
 assert.equal(client('?lang=de').I18n.localizeContent(original),original);
});
test('English migration preserves original clinical text and publication state; does not overwrite edits on reopen',()=>{
 const dir=mkdtempSync(join(tmpdir(),'citypraxis-en-')),file=join(dir,'test.sqlite');
 let db;
 try{
  db=openDatabase(file);
  const content=contentSnapshot(db);
  for(const item of originals.filter(item=>item.collection!=='prices'&&item.id!=='rueckenfit')){
   const row=content[item.collection].find(r=>r.id===item.id);
   if(item.data.body&&item.id!=='physiotherapie')assert.equal(row.body,item.data.body);
   assert.ok(row.titleEn,`${item.collection}/${item.id} needs an English title`);
   if(item.data.body)assert.ok(row.bodyEn,`${item.id} needs an English body`);
  }
  const speech=content.services.find(r=>r.id==='logopaedie');
  assert.equal((speech.body.match(/^- /gm)||[]).length,(speech.bodyEn.match(/^- /gm)||[]).length);
  const crafta=content.services.find(r=>r.id==='crafta');
  assert.equal((crafta.body.match(/^### /gm)||[]).length,(crafta.bodyEn.match(/^### /gm)||[]).length);
  assert.equal(content.pages.some(p=>p.id==='impressum'),true);
  assert.equal(content.pages.some(p=>p.id==='datenschutz'),true);
  const original=db.prepare("SELECT * FROM content WHERE collection='pages' AND id='home'").get();
  const draft=JSON.parse(original.draft);draft.titleEn='Edited English title';
  db.prepare("UPDATE content SET draft=? WHERE collection='pages' AND id='home'").run(JSON.stringify(draft));
  db.close();db=openDatabase(file);
  const reopened=db.prepare("SELECT * FROM content WHERE collection='pages' AND id='home'").get();
  assert.equal(JSON.parse(reopened.draft).titleEn,'Edited English title');
  assert.equal(JSON.parse(reopened.draft).title,JSON.parse(original.draft).title);
  assert.equal(reopened.published,original.published);
 }finally{db?.close();rmSync(dir,{recursive:true,force:true});}
});
