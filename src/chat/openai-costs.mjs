const monthRange=(now)=>({
  start:Math.floor(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1)/1000),
  end:Math.floor(now.getTime()/1000)+1
});

export function createOpenAICostReporter({apiKey=process.env.OPENAI_ADMIN_KEY,projectId=process.env.OPENAI_PROJECT_ID,model=process.env.CHAT_CONVERSATION_MODEL||'gpt-6-luna',fetcher=fetch,now=()=>new Date(),cacheMs=120000}={}){
  let cached=null;
  return {
    async monthly(){
      if(!apiKey)return {available:false,reason:'not_configured'};
      if(!projectId)return {available:false,reason:'project_not_configured'};
      const requestedAt=now(),range=monthRange(requestedAt),cacheKey=`${projectId}:${range.start}`;
      if(cached?.key===cacheKey&&Date.now()-cached.at<cacheMs)return cached.value;
      let page=null,total=0,pages=0;
      try{
        do{
          const url=new URL('https://api.openai.com/v1/organization/costs');
          url.searchParams.set('start_time',String(range.start));
          url.searchParams.set('end_time',String(range.end));
          url.searchParams.set('bucket_width','1d');
          url.searchParams.set('limit','180');
          url.searchParams.append('group_by','project_id');
          url.searchParams.append('group_by','line_item');
          url.searchParams.set('project_ids',projectId);
          if(page)url.searchParams.set('page',page);
          const response=await fetcher(url,{headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(8000)});
          if(!response.ok)return {available:false,reason:response.status===401||response.status===403?'permission':'upstream'};
          const payload=await response.json();
          if(!Array.isArray(payload?.data))return {available:false,reason:'invalid_response'};
          for(const bucket of payload.data){
            if(!Array.isArray(bucket?.results))return {available:false,reason:'invalid_response'};
            for(const row of bucket.results){
              if(row.project_id!==projectId)continue;
              if(typeof row.line_item!=='string'||row.amount?.currency!=='usd'||!Number.isFinite(row.amount?.value)||row.amount.value<0)return {available:false,reason:'invalid_response'};
              if(!row.line_item.toLowerCase().startsWith(`${model.toLowerCase()},`))continue;
              total+=row.amount.value;
            }
          }
          page=payload.has_more?payload.next_page:null;
          pages++;
          if(payload.has_more&&!page)return {available:false,reason:'invalid_response'};
          if(payload.has_more&&pages>=3)return {available:false,reason:'incomplete'};
        }while(page);
      }catch{return {available:false,reason:'upstream'};}
      const value={available:true,cost:total,currency:'usd',reportedAt:requestedAt.toISOString()};
      cached={key:cacheKey,at:Date.now(),value};
      return value;
    }
  };
}
