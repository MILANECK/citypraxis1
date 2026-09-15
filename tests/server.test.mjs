import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase,passwordHash,contentSnapshot } from '../src/database.mjs';
import { createApp } from '../src/server.mjs';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('staff authorization, draft isolation, revisions, request handling and sessions',async()=>{
  const db=openDatabase(':memory:');
  const add=db.prepare('INSERT INTO users(email,name,password,role) VALUES(?,?,?,?)');
  for(const role of ['owner','editor','reception'])add.run(role+'@test.local',role,passwordHash('test-password-strong'),role);
  const server=createApp(db);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const call=async(path,method='GET',body,session={},extra={})=>{const res=await fetch(origin+'/api/'+path,{method,headers:{Origin:origin,'Content-Type':'application/json',Cookie:session.cookie||'','X-CSRF-Token':session.csrf||'',...extra},...(body?{body:JSON.stringify(body)}:{})});return {status:res.status,data:await res.json(),cookie:res.headers.get('set-cookie')?.split(';')[0]};};
  const login=async role=>{const r=await call('login','POST',{email:role+'@test.local',password:'test-password-strong'});assert.equal(r.status,200);const me=await call('me','GET',null,{cookie:r.cookie});return {cookie:r.cookie,csrf:me.data.csrf};};
  try{
    assert.equal((await call('admin/requests')).status,401);
    const owner=await login('owner'),editor=await login('editor'),reception=await login('reception');
    assert.equal((await call('admin/requests','GET',null,editor)).status,403);
    assert.equal((await call('admin/content','GET',null,reception)).status,403);
    assert.equal((await call('admin/users','GET',null,editor)).status,403);
    assert.equal((await call('admin/content/faqs/test','PUT',{data:{title:'test'}},{cookie:owner.cookie})).status,403);
    assert.equal((await call('admin/content/faqs/test','PUT',{data:{title:'test'}},owner,{Origin:'http://evil.example'})).status,403);
    const original=(await call('content')).data.pages.find(p=>p.id==='home');
    const draft={...original,title:'PRIVATE DRAFT'};
    assert.equal((await call('admin/content/pages/home','PUT',{data:draft},editor)).status,200);
    assert.equal((await call('content')).data.pages.find(p=>p.id==='home').title,original.title);
    assert.equal((await call('admin/content','GET',null,editor)).data.pages.find(p=>p.id==='home').title,'PRIVATE DRAFT');
    assert.equal((await call('admin/content/pages/home','PUT',{data:draft,publish:true},editor)).status,200);
    assert.equal((await call('content')).data.pages.find(p=>p.id==='home').title,'PRIVATE DRAFT');
    assert.ok((await call('admin/revisions?collection=pages&id=home','GET',null,editor)).data.length>=2);
    assert.equal((await call('admin/content/pages/home','DELETE',{},owner)).status,400);
    assert.equal((await call('admin/content/faqs/test','PUT',{data:{title:'Example'},publish:true},owner)).status,200);
    await call('admin/content/faqs/test','PATCH',{},owner);
    assert.equal((await call('content')).data.faqs.some(f=>f.id==='test'),false);
    assert.equal((await call('requests','POST',{name:'Test',email:'invalid',consent:true})).status,400);
    const request=await call('requests','POST',{name:'Test person',email:'patient@test.local',consent:true,preference:'Afternoon'});
    assert.equal(request.status,201);
    assert.equal((await call('admin/requests','PUT',{id:request.data.id,status:'confirmed'},reception)).status,200);
    assert.equal((await call('admin/requests','GET',null,reception)).data[0].status,'confirmed');
    assert.equal((await call('admin/requests','DELETE',{id:request.data.id},reception)).status,403);
    assert.equal((await call('admin/media','POST',{data:'data:image/png;base64,YmFk',alt:'fake'},owner)).status,400);
    assert.equal((await call('admin/users','PUT',{id:1,active:false},owner)).status,400);
    assert.equal((await call('logout','POST',{},owner)).status,200);
    assert.equal((await call('me','GET',null,owner)).status,401);
    assert.equal((await fetch(origin+'/admin')).status,200);
    assert.equal((await fetch(origin+'/assets/wordmark-black.png')).status,200);
  }finally{await new Promise(resolve=>server.close(resolve));db.close();}
});
test('SQLite migrations are repeatable and published content survives reopen',()=>{
  const folder=mkdtempSync(join(tmpdir(),'citypraxis-test-')),file=join(folder,'test.sqlite');
  try{let db=openDatabase(file);const total=contentSnapshot(db).services.length;db.prepare("UPDATE content SET draft=?,published=? WHERE collection='faqs' AND id='verordnung'").run('{"id":"verordnung","title":"Persistent"}','{"id":"verordnung","title":"Persistent"}');db.close();db=openDatabase(file);assert.equal(contentSnapshot(db).services.length,total);assert.equal(contentSnapshot(db).faqs.find(f=>f.id==='verordnung').title,'Persistent');db.close();}finally{rmSync(folder,{recursive:true,force:true});}
});
