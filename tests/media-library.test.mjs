import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mediaInUse,mediaDownloadName} from '../src/media-library.mjs';
import {createSupabaseClient} from '../src/supabase-client.mjs';

test('media references include drafts and published nested content',()=>{
  const path='/uploads/photo.png';
  assert.equal(mediaInUse(path,[{draft:JSON.stringify({image:path}),published:null}]),true);
  assert.equal(mediaInUse(path,[{draft:{gallery:[{image:path}]},published:{image:'/assets/other.jpg'}}]),true);
  assert.equal(mediaInUse(path,[{draft:{image:'/uploads/other.png'},published:{image:'/assets/other.jpg'}}]),false);
  assert.equal(mediaDownloadName({id:'example-1',path:'https://example.test/storage/uploads/photo.png'}),'citypraxis-example-1.png');
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
