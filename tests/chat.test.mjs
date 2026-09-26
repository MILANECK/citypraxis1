import {test} from 'node:test';
import assert from 'node:assert/strict';
import {phone,emailValid} from '../src/chat/validation.mjs';
import {safetySignal} from '../src/chat/safety.mjs';
import {newSession,sign,verify,makeLimiter} from '../src/chat/security.mjs';
import {createChatService} from '../src/chat/service.mjs';
test('shared contact validation and emergency detection remain available to Luna',()=>{
 assert.equal(phone('0699 12682157'),'+4369912682157');assert.throws(()=>phone('123'));
 assert.equal(emailValid('test@example.com'),true);assert.equal(emailValid('bad@'),false);
 assert.equal(safetySignal('I cannot breathe'),'emergency');assert.equal(safetySignal('no chest pain'),null);
});
test('sessions reject tampering and rate limits bound resource use',()=>{
 assert.throws(()=>verify(newSession()+'tampered','session'));assert.throws(()=>verify(sign({kind:'session',expires:0}),'session'));
 const limit=makeLimiter();limit('a',1);assert.throws(()=>limit('a',1));
});
test('retired guided endpoints cannot call AI or create requests; Luna session still works',async()=>{
 const service=createChatService({store:{save(){throw Error('must not save');}},fetcher(){throw Error('must not call AI');}});
 for(const path of ['interpret','contact','submit']){
  let result;await service.handle({method:'POST',headers:{},socket:{remoteAddress:'test'}},'/api/chat/'+path,{token:newSession()},(status,data)=>result={status,data});assert.equal(result.status,404);
 }
 let session;await service.handle({method:'GET',headers:{},socket:{remoteAddress:'test'}},'/api/chat/session',{},(status,data)=>session={status,data});assert.equal(session.status,200);assert.ok(verify(session.data.token,'session').id);
});
