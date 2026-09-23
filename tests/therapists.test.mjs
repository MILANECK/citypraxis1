import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase,contentSnapshot } from '../src/database.mjs';
import { createApp } from '../src/server.mjs';
import { createSupabaseApp } from '../src/supabase-server.mjs';
import { importTherapistsSqlite, teamImportPlan } from '../src/therapist-import.mjs';
import { therapistProfiles } from '../src/therapist-profiles.mjs';
import { existsSync } from 'node:fs';

test('profile import preserves edited and unpublished records on rerun',()=>{
  const db=openDatabase(':memory:');
  try{
    const profiles=contentSnapshot(db).team;
    assert.equal(profiles.length,11);
    assert.doesNotMatch(contentSnapshot(db).pages.find(p=>p.id==='about').intro,/12/);
    const sample=JSON.parse(db.prepare("SELECT snapshot FROM revisions WHERE collection='team' AND entity_id='team-2' ORDER BY id DESC LIMIT 1").get().snapshot);
    assert.equal(teamImportPlan([{id:sample.id,draft:sample,published:sample}]).remove.length,1);
    assert.equal(teamImportPlan([{id:sample.id,draft:{...sample,body:'User edited biography'},published:sample}]).remove.length,0);
    assert.equal(teamImportPlan([{id:sample.id,draft:sample,published:null}]).remove.length,0);
    for(const profile of profiles){
      assert.ok(profile.roleEn&&profile.specialtiesEn&&profile.methodsEn&&profile.careerEn,profile.id);
      assert.ok(existsSync(`public${profile.image}`),profile.image);
    }
    const edited={...profiles[0],title:'Edited by Admin',body:'Edited biography',specialtiesEn:'Edited focus'};
    db.prepare("UPDATE content SET draft=?,published=NULL WHERE collection='team' AND id=?").run(JSON.stringify(edited),edited.id);
    const result=importTherapistsSqlite(db);
    assert.equal(result.add.length,0);
    assert.equal(result.remove.length,0);
    const saved=db.prepare("SELECT * FROM content WHERE collection='team' AND id=?").get(edited.id);
    assert.equal(saved.published,null);
    assert.deepEqual(JSON.parse(saved.draft),edited);
  }finally{db.close();}
});

for(const backend of ['sqlite','supabase'])test(`${backend}: booking records the published therapist, rejects missing/draft profiles and preserves notes`,async()=>{
  const originalFetch=global.fetch,keys=['SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','SUPABASE_SECRET_KEY','APP_ORIGIN'],env=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
  delete process.env.APP_ORIGIN;
  let db,server,saved,published=true;
  const therapist=therapistProfiles[0];
  if(backend==='sqlite'){db=openDatabase(':memory:');server=createApp(db);}
  else{
    Object.assign(process.env,{SUPABASE_URL:'https://supabase.example',SUPABASE_PUBLISHABLE_KEY:'test-key',SUPABASE_SECRET_KEY:'test-secret'});
    global.fetch=async(url,options={})=>{
      const parsed=new URL(url);
      if(parsed.pathname==='/rest/v1/content')return Response.json(published&&parsed.searchParams.get('id')===`eq.${therapist.id}`?[{published:therapist}]:[]);
      if(parsed.pathname==='/rest/v1/appointment_requests'){saved=JSON.parse(options.body);return Response.json([{id:1,...saved}]);}
      throw new Error(`Unexpected Supabase call: ${parsed.pathname}`);
    };
    server=createSupabaseApp();
  }
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const post=async changes=>{const res=await originalFetch(origin+'/api/requests',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({name:'Profile booking test',email:'test@example.test',phone:'+4369912682157',consent:true,therapistId:therapist.id,therapistName:'FORGED',preference:'Afternoons',concern:'Kiefer',...changes})});return {status:res.status,data:await res.json()};};
  try{
    assert.equal((await post({})).status,201);
    if(db)saved=db.prepare('SELECT * FROM requests ORDER BY id DESC').get();
    assert.equal(saved.preference,`WunschtherapeutIn: ${therapist.title}\nAnliegen: Kiefer\nAfternoons`);
    assert.equal((await post({therapistId:'missing'})).status,400);
    assert.equal((await post({therapistId:'invalid&id=other'})).status,400);
    assert.equal((await post({preference:'x'.repeat(301)})).status,400);
    assert.equal((await post({therapistId:''})).status,201);
    published=false;
    if(db)db.prepare("UPDATE content SET published=NULL WHERE collection='team' AND id=?").run(therapist.id);
    assert.equal((await post({})).status,400);
  }finally{
    await new Promise(resolve=>server.close(resolve));db?.close();global.fetch=originalFetch;
    for(const key of keys)if(env[key]===undefined)delete process.env[key];else process.env[key]=env[key];
  }
});

