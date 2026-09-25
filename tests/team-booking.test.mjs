import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isTeamMemberBookable} from '../src/team-booking.mjs';

test('team booking defaults keep known secretaries out and clinicians bookable',()=>{
  assert.equal(isTeamMemberBookable({id:'lisa-muster',title:'Lisa Muster',role:'Sekretariat'}),false);
  assert.equal(isTeamMemberBookable({id:'petra-muster',title:'Petra Muster',role:'Office'}),false);
  assert.equal(isTeamMemberBookable({id:'therapist-1',title:'Alex Therapist',role:'Physiotherapeutin'}),true);
});

test('an explicit admin booking switch overrides legacy defaults',()=>{
  assert.equal(isTeamMemberBookable({id:'lisa-muster',title:'Lisa Muster',bookable:true}),true);
  assert.equal(isTeamMemberBookable({id:'therapist-1',title:'Alex Therapist',bookable:false}),false);
});
