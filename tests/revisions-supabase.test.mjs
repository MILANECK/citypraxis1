import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {createSupabaseApp} from '../src/supabase-server.mjs';

test('Supabase keeps ten versions per entry and lets only the owner delete one',async()=>{
  const previous={...process.env},originalFetch=global.fetch;
  process.env.SUPABASE_URL='https://example.supabase.co';
  process.env.SUPABASE_PUBLISHABLE_KEY='fixture-public';
  process.env.SUPABASE_SECRET_KEY='fixture-secret';
  const revisions=Array.from({length:12},(_,index)=>({id:index+1,collection:'pages',entity_id:'home',snapshot:{title:`Version ${index+1}`},actor_email:'owner@example.test'}));
  global.fetch=async(input,options={})=>{
    const url=new URL(input);
    if(url.pathname==='/auth/v1/user')return Response.json({id:options.headers.Authorization.endsWith('editor-token')?'editor':'owner'});
    if(url.pathname==='/rest/v1/staff_profiles')return Response.json([{id:url.searchParams.get('id')?.endsWith('editor')?'editor':'owner',email:'admin@example.test',name:'Admin',role:url.searchParams.get('id')?.endsWith('editor')?'editor':'owner',active:true}]);
    if(url.pathname==='/rest/v1/audit_log')return Response.json([]);
    if(url.pathname==='/rest/v1/revisions'){
      const matches=()=>revisions.filter(row=>row.collection===url.searchParams.get('collection')?.slice(3)&&row.entity_id===url.searchParams.get('entity_id')?.slice(3)&&(!url.searchParams.has('id')||url.searchParams.get('id').startsWith('lt.')&&row.id<Number(url.searchParams.get('id').slice(3))||url.searchParams.get('id')===`eq.${row.id}`));
      if(options.method==='DELETE'){
        const deleted=matches();
        for(const row of deleted)revisions.splice(revisions.indexOf(row),1);
        return options.headers.Prefer==='return=minimal'?new Response(null,{status:204}):Response.json(deleted);
      }
      const found=matches().sort((a,b)=>b.id-a.id).slice(0,Number(url.searchParams.get('limit')||1000));
      return Response.json(url.searchParams.get('select')==='id'?found.map(row=>({id:row.id})):found);
    }
    throw new Error(`Unexpected fixture request: ${url.pathname}`);
  };
  const app=createSupabaseApp();await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${app.address().port}`;
  const call=async(role,path,method='GET',body)=>{
    const token=`${role}-token`,csrf=createHmac('sha256','fixture-secret').update(token).digest('hex');
    const response=await originalFetch(origin+'/api/'+path,{method,headers:{Origin:origin,Cookie:`cp_access=${token}`,'X-CSRF-Token':csrf,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
    return {status:response.status,data:await response.json()};
  };
  try{
    const listed=await call('owner','admin/revisions?collection=pages&id=home');
    assert.equal(listed.status,200);
    assert.equal(listed.data.length,10);
    assert.deepEqual(revisions.map(row=>row.id),[3,4,5,6,7,8,9,10,11,12]);
    assert.equal((await call('editor','admin/revisions','DELETE',{id:12,collection:'pages',entityId:'home'})).status,403);
    assert.equal((await call('owner','admin/revisions','DELETE',{id:12,collection:'pages',entityId:'about'})).status,404);
    assert.equal((await call('owner','admin/revisions','DELETE',{id:12,collection:'pages',entityId:'home'})).status,200);
    assert.ok(!revisions.some(row=>row.id===12));
  }finally{await new Promise(resolve=>app.close(resolve));global.fetch=originalFetch;process.env=previous;}
});
