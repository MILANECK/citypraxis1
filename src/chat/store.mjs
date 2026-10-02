export function sqliteChatStore(db){
  const decode=r=>r&&({...r,intake:JSON.parse(r.intake||'null')});
  return {
    async save(row){
      const result=db.prepare('INSERT INTO requests(name,email,phone,preference,acute,intake,submission_key,notification_status) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(submission_key) DO NOTHING').run(row.name,row.email,row.phone,row.preference,row.acute?1:0,JSON.stringify(row.intake),row.submission_key,row.notification_status);
      return {created:Boolean(result.changes),row:decode(db.prepare('SELECT * FROM requests WHERE submission_key=?').get(row.submission_key))};
    },
    async get(id){return decode(db.prepare('SELECT * FROM requests WHERE id=?').get(id));},
    async recent(since){return db.prepare("SELECT * FROM requests WHERE created_at>=? AND status!='closed' ORDER BY created_at DESC").all(since.slice(0,19).replace('T',' ')).map(decode);},
    async update(id,row){
      const result=db.prepare("UPDATE requests SET name=?,email=?,phone=?,preference=?,acute=?,intake=?,notification_status=?,updated_at=? WHERE id=? AND status!='closed'").run(row.name,row.email,row.phone,row.preference,row.acute?1:0,JSON.stringify(row.intake),row.notification_status,new Date().toISOString(),id);
      return result.changes?decode(db.prepare('SELECT * FROM requests WHERE id=?').get(id)):null;
    },
    async notification(id,status){db.prepare('UPDATE requests SET notification_status=? WHERE id=?').run(status,id);},
    async notificationRecipients(){return db.prepare("SELECT email FROM users WHERE active=1 AND role='reception'").all().map(user=>user.email);}
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
    async recent(since){
      const rows=[];let page;
      do{page=await client.rest('appointment_requests',`?created_at=gte.${encodeURIComponent(since)}&status=neq.closed&select=*&order=created_at.desc&limit=1000&offset=${rows.length}`);rows.push(...page);}while(page.length===1000);
      return rows;
    },
    async update(id,row){
      const rows=await client.rest('appointment_requests',`?id=eq.${encodeURIComponent(id)}&status=neq.closed&select=*`,{method:'PATCH',prefer:'return=representation',body:{name:row.name,email:row.email,phone:row.phone,preference:row.preference,acute:row.acute||false,intake:row.intake,notification_status:row.notification_status,updated_at:new Date().toISOString()}});
      return rows?.[0]||null;
    },
    async notification(id,status){await client.rest('appointment_requests',`?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',body:{notification_status:status}});},
    async notificationRecipients(){return (await client.rest('staff_profiles','?active=eq.true&role=eq.reception&select=email')).map(user=>user.email);}
  };
}
