// Scoped, reversible publication of the owner-confirmed policy. Dry run by default.
import {loadEnvFile} from 'node:process';
import {mkdir,writeFile} from 'node:fs/promises';
import {isDeepStrictEqual} from 'node:util';
import {createSupabaseClient} from '../src/supabase-client.mjs';
import {applyReferralContent,referralContentTargets} from '../src/referral-content.mjs';
try{loadEnvFile('.env');}catch{}
const client=createSupabaseClient(),apply=process.argv.includes('--apply');
const marker='owner-referral-policy-2026-10-11';
const deployed='https://citypraxis-wien.onrender.com';
const publicResponse=await fetch(deployed+'/api/content');
if(!publicResponse.ok)throw Error('Unable to verify the deployed public content');
const publicContent=await publicResponse.json();
const plan=[];
for(const [collection,id] of referralContentTargets){
 const row=(await client.rest('content',`?collection=eq.${collection}&id=eq.${id}&select=collection,id,draft,published,updated_at`))[0];
 if(!row)throw Error(`Required content record is missing: ${collection}/${id}`);
 const live=publicContent[collection]?.find(item=>item.id===id);
 if(!isDeepStrictEqual(row.published,live??null))throw Error(`The configured database does not match deployed content: ${collection}/${id}`);
 const draft=applyReferralContent(collection,id,row.draft),published=applyReferralContent(collection,id,row.published);
 if(!isDeepStrictEqual(row.draft,draft)||!isDeepStrictEqual(row.published,published))plan.push({row,draft,published});
}
await mkdir('output',{recursive:true});
const preview='output/Citypraxis-Referral-Policy-Change-Preview-2026-10-11.json';
await writeFile(preview,JSON.stringify(plan.map(({row,draft,published})=>({collection:row.collection,id:row.id,before:{draft:row.draft,published:row.published},after:{draft,published}})),null,2)+'\n');
console.log(JSON.stringify({mode:apply?'apply':'dry-run',records:plan.map(({row})=>`${row.collection}/${row.id}`),preview}));
if(!apply||!plan.length)process.exit(0);
if((await client.rest('audit_log',`?action=eq.import&entity=eq.${marker}&select=id&limit=1`)).length)throw Error('This migration was already applied; preserve subsequent Admin edits');
await mkdir('backups',{recursive:true});
const backup=`backups/referral-policy-before-${Date.now()}.json`;
await writeFile(backup,JSON.stringify(plan.map(({row})=>row),null,2)+'\n');
for(const {row,draft,published} of plan){
 await client.rest('revisions','',{method:'POST',body:{collection:row.collection,entity_id:row.id,snapshot:row.draft,actor_email:'Owner-confirmed referral policy update'}});
 const query=`?collection=eq.${row.collection}&id=eq.${row.id}&updated_at=eq.${encodeURIComponent(row.updated_at)}`;
 const changed=await client.rest('content',query,{method:'PATCH',body:{draft,published,updated_at:new Date().toISOString()}});
 if(changed?.length!==1)throw Error(`Concurrent edit detected; stopped before overwriting ${row.collection}/${row.id}. Backup: ${backup}`);
 const current=(await client.rest('content',`?collection=eq.${row.collection}&id=eq.${row.id}&select=draft,published`))[0];
 if(!isDeepStrictEqual(current,{draft,published}))throw Error(`Read-back verification failed for ${row.collection}/${row.id}`);
}
await client.rest('audit_log','',{method:'POST',body:{actor_email:'Owner-confirmed referral policy update',action:'import',entity:marker}});
console.log(JSON.stringify({updated:plan.length,backup,verified:true,patientDataAccessed:false,outgoingEmails:false}));
