import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mediaInUse,mediaDownloadName,mediaFileSize} from '../src/media-library.mjs';
import {createSupabaseClient} from '../src/supabase-client.mjs';
import {stat} from 'node:fs/promises';

test('media references include drafts and published nested content',()=>{
  const path='/uploads/photo.png';
  assert.equal(mediaInUse(path,[{draft:JSON.stringify({image:path}),published:null}]),true);
  assert.equal(mediaInUse(path,[{draft:{gallery:[{image:path}]},published:{image:'/assets/other.jpg'}}]),true);
  assert.equal(mediaInUse(path,[{draft:{image:'/uploads/other.png'},published:{image:'/assets/other.jpg'}}]),false);
  assert.equal(mediaDownloadName({id:'example-1',path:'https://example.test/storage/uploads/photo.png'}),'citypraxis-example-1.png');
});

test('media sizes use local file metadata or trusted storage object metadata',async()=>{
  const local='/assets/wordmark-white.png';
  assert.equal(await mediaFileSize({path:local},'public'),(await stat('public'+local)).size);
  assert.equal(await mediaFileSize({path:'/assets/..'},'public'),null);
  let requested;
  const remote='https://fixture.supabase.co/storage/v1/object/public/website-media/uploads/example.webp';
  const options={supabaseOrigin:'https://fixture.supabase.co',storageSecret:'test-secret',fetchImpl:async(url,request)=>{
    requested={url,authorization:request.headers.Authorization};
    return Response.json({size:123456});
  }};
  assert.equal(await mediaFileSize({path:remote,storage_path:'uploads/example.webp'},'public',options),123456);
  assert.deepEqual(requested,{url:'https://fixture.supabase.co/storage/v1/object/info/website-media/uploads/example.webp',authorization:'Bearer test-secret'});
  requested=null;
  assert.equal(await mediaFileSize({path:'https://other.example/photo.webp',storage_path:'uploads/example.webp'},'public',options),null);
  assert.equal(requested,null);
});

test('Supabase storage download and removal use the object API',async()=>{
  const previous={url:process.env.SUPABASE_URL,publishable:process.env.SUPABASE_PUBLISHABLE_KEY,secret:process.env.SUPABASE_SECRET_KEY,fetch:globalThis.fetch};
  const calls=[];
  try{
    process.env.SUPABASE_URL='https://fixture.supabase.co';
    process.env.SUPABASE_PUBLISHABLE_KEY='publishable-test';
    process.env.SUPABASE_SECRET_KEY='secret-test';
    globalThis.fetch=async(url,options)=>{calls.push({url,options});return options.method==='DELETE'?new Response('[]',{headers:{'content-type':'application/json'}}):new Response(Uint8Array.of(1,2,3));};
    const client=createSupabaseClient();
    assert.deepEqual(await client.download('uploads/example.png'),Buffer.from([1,2,3]));
    await client.remove('uploads/example.png');
    assert.match(calls[0].url,/\/storage\/v1\/object\/website-media\/uploads\/example.png$/);
    assert.equal(calls[0].options.headers.Authorization,'Bearer secret-test');
    assert.match(calls[1].url,/\/storage\/v1\/object\/website-media$/);
    assert.equal(calls[1].options.method,'DELETE');
    assert.deepEqual(JSON.parse(calls[1].options.body),{prefixes:['uploads/example.png']});
  }finally{
    globalThis.fetch=previous.fetch;
    for(const [key,value]of [['SUPABASE_URL',previous.url],['SUPABASE_PUBLISHABLE_KEY',previous.publishable],['SUPABASE_SECRET_KEY',previous.secret]])if(value===undefined)delete process.env[key];else process.env[key]=value;
  }
});
