import {mkdir,writeFile} from 'node:fs/promises';
import {createSupabaseClient} from '../src/supabase-client.mjs';
import {childrenService,refineTherapyRecord} from '../src/therapy-catalog.mjs';

const apply=process.argv.includes('--apply');
const client=createSupabaseClient();
const rows=await client.rest('content','?collection=eq.services&select=collection,id,draft,published');
const byId=new Map(rows.map(row=>[row.id,row]));
const updates=['physiotherapie','logopaedie','heilmassage'].flatMap(id=>{
  const row=byId.get(id);if(!row)return [];
  const draft=refineTherapyRecord(id,row.draft),published=refineTherapyRecord(id,row.published);
  return JSON.stringify(draft)!==JSON.stringify(row.draft)||JSON.stringify(published)!==JSON.stringify(row.published)?[{id,row,draft,published}]:[];
});
const addChild=!byId.has(childrenService.id),removeBack=byId.has('rueckenfit');
console.log(JSON.stringify({mode:apply?'apply':'preview',update:updates.map(item=>item.id),addChild,removeBack}));
if(apply&&(updates.length||addChild||removeBack)){
  await mkdir('backups',{recursive:true});
  const backupPath=`backups/therapy-catalog-${new Date().toISOString().replaceAll(':','-')}.json`;
  await writeFile(backupPath,JSON.stringify(rows,null,2));
  console.log(`Saved public service backup: ${backupPath}`);

  for(const {id,row,draft,published} of updates){
    await client.rest('revisions','',{method:'POST',body:{collection:'services',entity_id:id,snapshot:row.draft,actor_email:'therapy catalog update'}});
    await client.rest('content',`?collection=eq.services&id=eq.${id}`,{method:'PATCH',body:{draft,published,updated_at:new Date().toISOString()}});
  }
  if(addChild)await client.rest('content','',{method:'POST',body:{collection:'services',id:childrenService.id,draft:childrenService,published:childrenService,updated_at:new Date().toISOString()}});
  if(removeBack){
    const row=byId.get('rueckenfit');
    await client.rest('revisions','',{method:'POST',body:{collection:'services',entity_id:row.id,snapshot:row.draft,actor_email:'therapy catalog update'}});
    await client.rest('content','?collection=eq.services&id=eq.rueckenfit',{method:'DELETE'});
  }
  console.log('Therapy catalog updated. Other Admin fields were preserved.');
}
