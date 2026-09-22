// Run after deploying the matching portrait assets. Dry run unless --apply is set.
import { loadEnvFile } from 'node:process';
import { mkdir, writeFile } from 'node:fs/promises';
import { createSupabaseClient } from '../src/supabase-client.mjs';
import { teamImportPlan, refreshTeamIntroduction } from '../src/therapist-import.mjs';
try{loadEnvFile('.env');}catch{}
const client=createSupabaseClient();
const marker='therapist-profiles-pdf-20260923';
if((await client.rest('audit_log',`?action=eq.import&entity=eq.${marker}&select=id&limit=1`)).length){console.log('Import already completed. Admin changes and deletions are preserved.');process.exit(0);}
const rows=await client.rest('content','?collection=eq.team&select=*');
const plan=teamImportPlan(rows);
console.log(JSON.stringify({add:plan.add.map(t=>t.title),replaceOriginalSamples:plan.remove.map(r=>r.id),preserve:plan.keep},null,2));
if(!process.argv.includes('--apply')){console.log('Dry run. Use --apply after deploying the profile pages and images.');process.exit(0);}
if(!plan.add.length&&!plan.remove.length){console.log('Already imported. Existing Admin edits were preserved.');process.exit(0);}
await mkdir('backups',{recursive:true});
await writeFile(`backups/team-before-pdf-import-${Date.now()}.json`,JSON.stringify(rows,null,2));
// Insert only missing profiles. Existing profiles, including drafts, are untouched.
if(plan.add.length)await client.rest('content','?on_conflict=collection,id',{method:'POST',prefer:'resolution=ignore-duplicates,return=representation',body:plan.add.map(profile=>({collection:'team',id:profile.id,draft:profile,published:profile}))});
for(const profile of plan.add)await client.rest('media','?on_conflict=id',{method:'POST',prefer:'resolution=ignore-duplicates,return=representation',body:{id:`therapist-${profile.id}`,path:profile.image,name:profile.title,alt:profile.title,mime_type:'image/webp'}});
for(const row of plan.remove){
  // Recheck immediately before removing an untouched legacy sample.
  const query=`?collection=eq.team&id=eq.${encodeURIComponent(row.id)}`;
  const current=await client.rest('content',query+'&select=*');
  if(!teamImportPlan(current).remove.length)continue;
  await client.rest('revisions','',{method:'POST',body:{collection:'team',entity_id:row.id,snapshot:row.draft,actor_email:'PDF therapist profile import'}});
  // Match the snapshot too, so concurrent Admin edits are not deleted.
  await client.rest('content',query+`&draft=eq.${encodeURIComponent(JSON.stringify(current[0].draft))}&published=eq.${encodeURIComponent(JSON.stringify(current[0].published))}`,{method:'DELETE'});
}
const about=(await client.rest('content','?collection=eq.pages&id=eq.about&select=*'))[0];
if(about){
  const draft=refreshTeamIntroduction(about.draft),published=refreshTeamIntroduction(about.published);
  if(JSON.stringify(draft)!==JSON.stringify(about.draft)||JSON.stringify(published)!==JSON.stringify(about.published)){
    await writeFile(`backups/about-before-pdf-import-${Date.now()}.json`,JSON.stringify(about,null,2));
    await client.rest('revisions','',{method:'POST',body:{collection:'pages',entity_id:'about',snapshot:about.draft,actor_email:'PDF therapist profile import'}});
    await client.rest('content',`?collection=eq.pages&id=eq.about&draft=eq.${encodeURIComponent(JSON.stringify(about.draft))}`,{method:'PATCH',body:{draft,published}});
  }
}
await client.rest('audit_log','',{method:'POST',body:{actor_email:'PDF therapist profile import',action:'import',entity:marker}});
console.log('Therapist profiles imported. Team backup saved in backups/.');
