import test from 'node:test';
import assert from 'node:assert/strict';
import {validPatientAction as valid} from './action-validation.mjs';
const p={email:'patient@organic.example.test',initialEmail:'old@organic.example.test',correctedEmail:'corrected@organic.example.test',phone:'+12025550100',wantsSubmit:false,refusePhone:true};
const v={availableActions:[{action:'message'}]};
const message=text=>({action:'message',message:text});
test('actual failed-run question may quote a verified public clinic email',()=>{
 const a=message('Kann ich meine Fragen einfach an info@citypraxis.wien schicken, oder sollte ich dabei bestimmte Angaben oder Unterlagen mitschicken?');
 assert.equal(valid(a,v,p),false);
 assert.equal(valid(a,v,p,['info@citypraxis.wien']),true);
});
test('a public contact allowance does not allow other real or peer patient identities',()=>{
 for(const email of ['someone@example.com','other@organic.example.test','info@another-clinic.test'])assert.equal(valid(message('Meine E-Mail ist '+email),v,p,['info@citypraxis.wien']),false);
 for(const email of [p.email,p.initialEmail,p.correctedEmail])assert.equal(valid(message(email+'!'),v,p,['info@citypraxis.wien']),true);
});
test('contact references do not bypass current UI affordances or send authorization',()=>{
 assert.equal(valid(message('info@citypraxis.wien'),{availableActions:[{action:'submit'}]},p,['info@citypraxis.wien']),false);
 assert.equal(valid({action:'submit'},{availableActions:[{action:'submit'}]},p,['info@citypraxis.wien']),false);
});
test('fixed phone refusal remains enforced even with public email references',()=>{
 assert.equal(valid(message('info@citypraxis.wien '+p.phone),v,p,['info@citypraxis.wien']),false);
});
