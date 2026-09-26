import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {createSupabaseApp} from '../src/supabase-server.mjs';

test('Supabase team reorder persists to admin and public content after a reload',async()=>{
  const previous={...process.env},originalFetch=global.fetch;
  process.env.SUPABASE_URL='https://example.supabase.co';
  process.env.SUPABASE_PUBLISHABLE_KEY='fixture-public';
  process.env.SUPABASE_SECRET_KEY='fixture-secret';
  const ids=['isabella-casny','alex','bea'];
  const rows=ids.map((id,order)=>({collection:'team',id,draft:{id,title:id,order},published:{id,title:id,order}}));
  let suppressPatch=false;
  const queryRows=(url)=>{
    let found=rows.filter(row=>!url.searchParams.has('collection')||url.searchParams.get('collection')===`eq.${row.collection}`);
    if(url.searchParams.has('id'))found=found.filter(row=>url.searchParams.get('id')===`eq.${row.id}`);
    return found;
  };
  global.fetch=async(input,options={})=>{
    const url=new URL(input);
    if(url.pathname==='/auth/v1/user')return Response.json({id:'admin-1'});
    if(url.pathname==='/rest/v1/staff_profiles')return Response.json([{id:'admin-1',email:'admin@example.test',name:'Admin',role:'owner',active:true}]);
    if(url.pathname==='/rest/v1/content'){
      const found=queryRows(url);
      if(options.method==='PATCH'){
        if(suppressPatch)return Response.json([]);
        const change=JSON.parse(options.body);
        for(const row of found)Object.assign(row,change);
        return Response.json(found.map(row=>({id:row.id})));
      }
      if(url.searchParams.get('published')==='not.is.null')return Response.json(found.map(({collection,id,published})=>({collection,id,published})));
      return Response.json(found.map(({collection,id,draft,published})=>({collection,id,draft,published})));
    }
    if(['/rest/v1/revisions','/rest/v1/audit_log'].includes(url.pathname))return Response.json([]);
    throw new Error(`Unexpected fixture request: ${url.pathname}`);
  };
  const app=createSupabaseApp();await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${app.address().port}`;
  const csrf=createHmac('sha256','fixture-secret').update('fixture-token').digest('hex');
  const call=async(path,method='GET',body)=>{
    const response=await originalFetch(origin+path,{method,headers:{Origin:origin,Cookie:'cp_access=fixture-token','X-CSRF-Token':csrf,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
    return {status:response.status,data:await response.json()};
  };
  try{
    const requested=['isabella-casny','bea','alex'];
    assert.equal((await call('/api/admin/team-order','PUT',{ids:requested})).status,200);
    assert.deepEqual((await call('/api/admin/content')).data.team.map(member=>member.id),requested);
    assert.deepEqual((await call('/api/content')).data.team.map(member=>member.id),requested);
    assert.deepEqual(rows.map(row=>row.published.order),[0,2,1]);
    suppressPatch=true;
    assert.equal((await call('/api/admin/team-order','PUT',{ids})).status,500);
    assert.deepEqual((await call('/api/content')).data.team.map(member=>member.id),requested);
  }finally{await new Promise(resolve=>app.close(resolve));global.fetch=originalFetch;process.env=previous;}
});
