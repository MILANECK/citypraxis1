export function sqliteChatStore(db){
  const decode=r=>r&&({...r,intake:JSON.parse(r.intake||'null')});
  return {
    async save(row){
      const result=db.prepare('INSERT INTO requests(name,email,phone,preference,acute,intake,submission_key,notification_status) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(submission_key) DO NOTHING').run(row.name,row.email,row.phone,row.preference,row.acute?1:0,JSON.stringify(row.intake),row.submission_key,row.notification_status);
      return {created:Boolean(result.changes),row:decode(db.prepare('SELECT * FROM requests WHERE submission_key=?').get(row.submission_key))};
    },
    async get(id){return decode(db.prepare('SELECT * FROM requests WHERE id=?').get(id));},
    async notification(id,status){db.prepare('UPDATE requests SET notification_status=? WHERE id=?').run(status,id);}
  };
}
export function supabaseChatStore(client){
  return {
    async save(row){
      const rows=await client.rest('appointment_requests','?on_conflict=submission_key',{method:'POST',prefer:'resolution=ignore-duplicates,return=representation',body:row});
      if(rows?.[0])return {created:true,row:rows[0]};
      const existing=await client.rest('appointment_requests',`?submission_key=eq.${encodeURIComponent(row.submission_key)}&select=*`);
      if(!existing?.[0])throw new Error('Storage unavailable');
      return {created:false,row:existing[0]};
    },
    async get(id){return (await client.rest('appointment_requests',`?id=eq.${encodeURIComponent(id)}&select=*`))[0];},
    async notification(id,status){await client.rest('appointment_requests',`?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',body:{notification_status:status}});}
  };
}
