// A media item is live only when the published content references its exact path.
function containsPath(value,path){
  if(value===path)return true;
  if(Array.isArray(value))return value.some(item=>containsPath(item,path));
  if(value&&typeof value==='object')return Object.values(value).some(item=>containsPath(item,path));
  return false;
}

export function mediaUsageStatus(path,published,draft){
  if(containsPath(published,path))return 'live';
  if(containsPath(draft,path))return 'draft';
  return 'unused';
}
