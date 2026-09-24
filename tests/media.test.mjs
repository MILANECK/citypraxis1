import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseRange,mediaType} from '../src/media.mjs';
import {openDatabase,contentSnapshot} from '../src/database.mjs';
import original from '../src/original-content.json' with {type:'json'};
test('video ranges include Safari/open/suffix requests and reject invalid ranges',()=>{
  assert.deepEqual(parseRange('bytes=0-1',100),{start:0,end:1});
  assert.deepEqual(parseRange('bytes=40-',100),{start:40,end:99});
  assert.deepEqual(parseRange('bytes=-20',100),{start:80,end:99});
  assert.equal(parseRange('bytes=100-',100),null);assert.equal(parseRange('bytes=5-2',100),null);assert.equal(parseRange('bytes=-0',100),null);assert.equal(parseRange('bytes=0-1,8-9',100),null);
});
test('media signatures reject mismatched uploads',()=>{
  assert.equal(mediaType(Buffer.from('not a movie'),'video/mp4'),null);
  const mp4=Buffer.alloc(24);mp4.writeUInt32BE(24);mp4.write('ftypisom',4);assert.equal(mediaType(mp4,'video/mp4'),'mp4');assert.equal(mediaType(mp4,'image/png'),null);
});
test('source migration retains original medical paragraphs and dated reimbursement amounts',()=>{
  const db=openDatabase(':memory:');const content=contentSnapshot(db);
  for(const entry of original.filter(entry=>entry.collection!=='prices'&&entry.id!=='rueckenfit')){const migrated=content[entry.collection].find(r=>r.id===entry.id);assert.ok(migrated,entry.id);for(const key of ['intro','body'])if(entry.data[key]&&!(entry.id==='about'&&key==='intro'))assert.equal(migrated[key],entry.data[key]);}
  assert.equal(content.services.some(item=>item.id==='rueckenfit'),false);
  assert.equal(content.services.find(r=>r.id==='crafta').body.includes('Hirnnervenprobleme'),true);
  assert.equal(content.reimbursements.length,7);assert.equal(content.reimbursements[0].asOf,'04/2023');assert.equal(content.prices.some(p=>p.id==='rueckenfit'),false);assert.equal(content.prices.find(p=>p.id==='physio-ersttermin-casny').amount,160);
  assert.equal(content.team.length,11);assert.equal(content.team.filter(t=>t.fictional).length,0);assert.equal(content.team[0].title,'Isabella Casny');db.close();
});
