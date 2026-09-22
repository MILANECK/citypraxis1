import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createSupabaseApp } from '../src/supabase-server.mjs';

test('password recovery requires an active staff account and a valid session', async () => {
  const originalFetch=global.fetch;
  const originalEnv={SUPABASE_URL:process.env.SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY:process.env.SUPABASE_PUBLISHABLE_KEY,SUPABASE_SECRET_KEY:process.env.SUPABASE_SECRET_KEY,APP_ORIGIN:process.env.APP_ORIGIN};
  process.env.SUPABASE_URL='https://supabase.example';
  process.env.SUPABASE_PUBLISHABLE_KEY='test-publishable';
  process.env.SUPABASE_SECRET_KEY='test-secret';
  let active=false,updated=false;
  global.fetch=async (url,options={})=>{
    const path=new URL(url).pathname;
    if(path==='/auth/v1/user'&&options.method==='PUT'){updated=true;return Response.json({id:'staff-1'});}
    if(path==='/auth/v1/user')return options.headers.Authorization==='Bearer valid-recovery-token'?Response.json({id:'staff-1'}):Response.json({message:'invalid token'},{status:401});
    if(path==='/rest/v1/staff_profiles')return Response.json(active?[{id:'staff-1',email:'staff@example.test',name:'Staff',role:'owner',active:true}]:[]);
    if(path==='/rest/v1/audit_log'||path==='/auth/v1/logout')return Response.json({});
    throw new Error(`Unexpected Supabase request: ${path}`);
  };
  const server=createSupabaseApp();
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const port=server.address().port;
  process.env.APP_ORIGIN=`http://127.0.0.1:${port}`;
  const send=body=>new Promise((resolve,reject)=>{
    const payload=JSON.stringify(body);
    const req=http.request({host:'127.0.0.1',port,path:'/api/recovery/password',method:'POST',headers:{Origin:process.env.APP_ORIGIN,'Content-Type':'application/json','Content-Length':Buffer.byteLength(payload)}},res=>{let raw='';res.on('data',chunk=>raw+=chunk);res.on('end',()=>resolve({status:res.statusCode,body:JSON.parse(raw)}));});
    req.on('error',reject);req.end(payload);
  });
  try{
    assert.equal((await send({accessToken:'invalid',password:'a-long-new-password'})).status,400);
    assert.equal(updated,false);
    assert.equal((await send({accessToken:'valid-recovery-token',password:'a-long-new-password'})).status,403);
    assert.equal(updated,false);
    active=true;
    assert.equal((await send({accessToken:'valid-recovery-token',password:'short'})).status,400);
    assert.equal((await send({accessToken:'valid-recovery-token',password:'a-long-new-password'})).status,200);
    assert.equal(updated,true);
  }finally{
    await new Promise(resolve=>server.close(resolve));
    global.fetch=originalFetch;
    for(const [key,value]of Object.entries(originalEnv))if(value===undefined)delete process.env[key];else process.env[key]=value;
  }
});
