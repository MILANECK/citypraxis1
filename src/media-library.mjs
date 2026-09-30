import { extname,resolve,sep } from 'node:path';
import { stat } from 'node:fs/promises';

export function mediaInUse(path, rows) {
  const contains = value => {
    if (value === path) return true;
    if (Array.isArray(value)) return value.some(contains);
    if (value && typeof value === 'object') return Object.values(value).some(contains);
    return false;
  };
  return rows.some(row => [row.draft, row.published].some(value => {
    if (typeof value === 'string') {
      try { return contains(JSON.parse(value)); } catch { return false; }
    }
    return contains(value);
  }));
}

export function mediaDownloadName(media) {
  const id=String(media.id||'file').replace(/[^a-zA-Z0-9-]/g,'').slice(0,80)||'file';
  const extension=extname(new URL(media.path,'http://localhost').pathname).toLowerCase();
  return `citypraxis-${id}${/^\.(png|jpe?g|webp|mp4)$/.test(extension)?extension:''}`;
}

export async function mediaFileSize(media,root,{supabaseOrigin,storageSecret,bucket='website-media',fetchImpl=fetch}={}){
  if(/^\/(assets|uploads)\/[a-zA-Z0-9._-]+$/.test(media.path||'')){
    const base=resolve(root),file=resolve(base,`.${media.path}`);
    if(!file.startsWith(base+sep))return null;
    try{const info=await stat(file);return info.isFile()?info.size:null;}catch{return null;}
  }
  if(!supabaseOrigin||!storageSecret||!/^uploads\/[a-zA-Z0-9._-]+$/.test(media.storage_path||''))return null;
  const origin=new URL(supabaseOrigin).origin;
  const expected=`${origin}/storage/v1/object/public/${encodeURIComponent(bucket)}/${media.storage_path}`;
  if(media.path!==expected)return null;
  try{
    const infoUrl=`${origin}/storage/v1/object/info/${encodeURIComponent(bucket)}/${media.storage_path}`;
    const response=await fetchImpl(infoUrl,{headers:{apikey:storageSecret,Authorization:`Bearer ${storageSecret}`},signal:AbortSignal.timeout(5000)});
    if(!response.ok)return null;
    const info=await response.json(),value=info.size??info.metadata?.size;
    const bytes=Number(value);
    return value!=null&&Number.isSafeInteger(bytes)&&bytes>=0?bytes:null;
  }catch{return null;}
}
