import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { randomBytes } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { serveFile, mediaType } from './media.mjs';
import { collections } from './database.mjs';
import { createSupabaseClient } from './supabase-client.mjs';

const root = resolve('public');
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.svg':'image/svg+xml', '.ico':'image/x-icon', '.mp4':'video/mp4' };
const clean = (value, max = 200) => typeof value === 'string' ? value.trim().slice(0,max) : '';
const emailValid = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const requestPreference = body => {
  const concern=clean(body.concern,100),symptoms=clean(body.symptoms,220),preference=clean(body.preference,300);
  return [concern?`Anliegen: ${concern}${symptoms?` – ${symptoms}`:''}`:'',preference].filter(Boolean).join('\n').slice(0,300);
};
const filter = value => encodeURIComponent(`eq.${value}`);
const cookie = (req, name) => new RegExp(`(?:^|;\\s*)${name}=([^;]+)`).exec(req.headers.cookie || '')?.[1];

function snapshots(rows, admin = false) {
  const result = Object.fromEntries(collections.map(key => [key, []]));
  for (const row of rows) {
    const value = admin ? row.draft : row.published;
    if (value) result[row.collection].push({ ...value, ...(admin ? { published:Boolean(row.published), dirty:JSON.stringify(row.draft)!==JSON.stringify(row.published) } : {}) });
  }
  for (const values of Object.values(result)) values.sort((a,b)=>(a.order||0)-(b.order||0));
  return result;
}

export function createSupabaseApp() {
  const supabase = createSupabaseClient();
  const attempts = new Map();
  let publicContentCache;
  const storagePrefix = `${supabase.url}/storage/v1/object/public/${encodeURIComponent(supabase.bucket)}/`;
  function limit(key,max){const now=Date.now();let state=attempts.get(key);if(!state||state.until<now)state={count:0,until:now+900000};state.count++;attempts.set(key,state);if(state.count>max)throw Object.assign(new Error('Zu viele Versuche. Bitte später erneut versuchen.'),{status:429});}
  const audit = (user,action,entity)=>supabase.rest('audit_log','',{method:'POST',body:{actor:user?.id||null,actor_email:user?.email||'public',action,entity}});
  async function currentUser(req) {
    const accessToken = cookie(req,'cp_access');
    if (!accessToken) return null;
    try {
      const auth = await supabase.getAuthUser(accessToken);
      const profiles = await supabase.rest('staff_profiles',`?id=${filter(auth.id)}&select=id,email,name,role,active`);
      const profile = profiles[0];
      return profile?.active ? { ...profile, csrf:supabase.csrf(accessToken), accessToken } : null;
    } catch { return null; }
  }
  return http.createServer(async (req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options','DENY');
    if(process.env.NODE_ENV==='production')res.setHeader('Strict-Transport-Security','max-age=31536000; includeSubDomains');
    res.setHeader('Content-Security-Policy',`default-src 'self'; img-src 'self' data: blob: ${supabase.url}; media-src 'self' blob: ${supabase.url}; style-src 'self'; script-src 'self'; font-src 'self'; connect-src 'self'; frame-src https://www.google.com https://maps.google.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'`);
    const json=(status,data)=>{let payload=Buffer.from(JSON.stringify(data));const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'};if(payload.length>1024&&/\bgzip\b/.test(req.headers['accept-encoding']||'')){payload=gzipSync(payload);headers['Content-Encoding']='gzip';headers.Vary='Accept-Encoding';}headers['Content-Length']=payload.length;res.writeHead(status,headers);res.end(payload);};
    try {
      const url=new URL(req.url,'http://localhost'),path=decodeURIComponent(url.pathname);
      if(['GET','HEAD'].includes(req.method)&&!path.startsWith('/api/')){
        let file=resolve(root,`.${path}`);if(!file.startsWith(root+sep)&&file!==root)return json(404,{error:'Nicht gefunden.'});
        if(!extname(path))file=resolve(root,path.startsWith('/admin')?'admin.html':'index.html');
        try{await serveFile(req,res,file,mime[extname(file)]||'application/octet-stream');}catch{if(!res.headersSent)json(404,{error:'Nicht gefunden.'});}return;
      }
      if(!path.startsWith('/api/'))return json(405,{error:'Methode nicht erlaubt.'});
      const user=await currentUser(req);let body={};
      if(!['GET','HEAD'].includes(req.method)){
        const expected=process.env.APP_ORIGIN||process.env.RENDER_EXTERNAL_URL||`http://${req.headers.host}`;
        if(req.headers.origin!==expected||req.headers['sec-fetch-site']==='cross-site')return json(403,{error:'Ungültiger Ursprung.'});
        if(path==='/api/admin/media-upload'&&req.method==='POST'){
          if(!user)return json(401,{error:'Bitte anmelden.'});
          if(!['owner','editor'].includes(user.role)||req.headers['x-csrf-token']!==user.csrf)return json(403,{error:'Upload nicht erlaubt.'});
          const type=req.headers['content-type'];if(!['video/mp4','image/png','image/jpeg','image/webp'].includes(type))return json(415,{error:'Bitte MP4, PNG, JPEG oder WebP verwenden.'});
          const max=type==='video/mp4'?60_000_000:10_000_000;if(Number(req.headers['content-length'])>max)return json(413,{error:'Datei zu groß.'});
          const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>max)throw Object.assign(new Error('Datei zu groß.'),{status:413});chunks.push(chunk);}
          const bytes=Buffer.concat(chunks),extension=mediaType(bytes,type);if(!extension)return json(400,{error:'Dateiformat stimmt nicht mit dem Inhalt überein.'});
          const id=randomBytes(12).toString('hex'),storagePath=`uploads/${id}.${extension}`,mediaPath=await supabase.upload(storagePath,bytes,type),name=clean(url.searchParams.get('name')),alt=clean(url.searchParams.get('alt'),300);
          if(!alt)return json(400,{error:'Bitte eine Bild- oder Videobeschreibung eingeben.'});
          await supabase.rest('media','',{method:'POST',body:{id,path:mediaPath,storage_path:storagePath,name,alt,mime_type:type,created_by:user.id}});await audit(user,'upload media',id);
          return json(201,{path:mediaPath,name,alt});
        }
        if(!req.headers['content-type']?.startsWith('application/json'))return json(415,{error:'JSON erforderlich.'});
        let raw='',size=0;for await(const chunk of req){size+=chunk.length;if(size>4_000_000)throw Object.assign(new Error('Datei oder Anfrage zu groß.'),{status:413});raw+=chunk;}
        try{body=JSON.parse(raw||'{}');}catch{return json(400,{error:'Ungültige Anfrage.'});}
        if(!body||Array.isArray(body)||typeof body!=='object')return json(400,{error:'Ungültige Anfrage.'});
      }
      if(path==='/api/health'&&req.method==='GET')return json(200,{ok:true,backend:'supabase'});
      if(path==='/api/content'&&req.method==='GET'){
        if(!publicContentCache||Date.now()-publicContentCache.savedAt>30000)publicContentCache={savedAt:Date.now(),content:snapshots(await supabase.rest('content','?select=collection,id,published&published=not.is.null'),false)};
        return json(200,publicContentCache.content);
      }
      if(path==='/api/requests'&&req.method==='POST'){
        limit(`request:${req.socket.remoteAddress}`,10);if(body.website)return json(400,{error:'Anfrage konnte nicht verarbeitet werden.'});
        const name=clean(body.name,100),email=clean(body.email,200),phone=clean(body.phone,40),preference=requestPreference(body);if(!name||!emailValid(email)||body.consent!==true)return json(400,{error:'Bitte Name, E-Mail und Einverständnis prüfen.'});
        const rows=await supabase.rest('appointment_requests','',{method:'POST',body:{name,email,phone,preference,acute:body.acute===true}});return json(201,{id:rows[0].id,message:'Ihre Anfrage wurde gespeichert. Der Termin ist noch nicht bestätigt.'});
      }
      if(path==='/api/login'&&req.method==='POST'){
        limit(`login:${req.socket.remoteAddress}`,12);let session;
        try{session=await supabase.signIn(clean(body.email).toLowerCase(),body.password);}catch{return json(401,{error:'E-Mail oder Passwort nicht korrekt.'});}
        const profiles=await supabase.rest('staff_profiles',`?id=${filter(session.user.id)}&select=id,email,name,role,active`);if(!profiles[0]?.active)return json(403,{error:'Dieses Konto hat keinen aktiven Praxiszugang.'});
        const secure=process.env.APP_ORIGIN?.startsWith('https:')?'; Secure':'';res.setHeader('Set-Cookie',`cp_access=${session.access_token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${session.expires_in||3600}${secure}`);await audit(profiles[0],'login','session');return json(200,{ok:true});
      }
      if(!user)return json(401,{error:'Bitte anmelden.'});
      if(req.method!=='GET'&&req.headers['x-csrf-token']!==user.csrf)return json(403,{error:'Sicherheitsprüfung fehlgeschlagen. Bitte neu anmelden.'});
      if(path==='/api/me'&&req.method==='GET')return json(200,{id:user.id,email:user.email,name:user.name,role:user.role,csrf:user.csrf});
      if(path==='/api/logout'&&req.method==='POST'){try{await supabase.logout(user.accessToken);}catch{}res.setHeader('Set-Cookie','cp_access=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return json(200,{ok:true});}
      const owner=user.role==='owner',editor=owner||user.role==='editor',reception=owner||user.role==='reception';
      if(path==='/api/admin/content'&&req.method==='GET'&&editor)return json(200,snapshots(await supabase.rest('content','?select=collection,id,draft,published'),true));
      const match=/^\/api\/admin\/content\/([a-z]+)\/([a-z0-9-]+)$/.exec(path);
      if(match&&editor){
        const [,collection,id]=match;if(!collections.includes(collection))return json(400,{error:'Unbekannter Bereich.'});
        const rows=await supabase.rest('content',`?collection=${filter(collection)}&id=${filter(id)}&select=*`),row=rows[0];
        if(req.method==='PATCH'){if(collection==='settings'||(collection==='pages'&&['home','about'].includes(id)))return json(400,{error:'Dieser Basisinhalt muss veröffentlicht bleiben.'});await supabase.rest('content',`?collection=${filter(collection)}&id=${filter(id)}`,{method:'PATCH',body:{published:null}});publicContentCache=null;await audit(user,'unpublish',`${collection}/${id}`);return json(200,{ok:true});}
        if(req.method==='PUT'){
          if(!body.data||typeof body.data!=='object'||Array.isArray(body.data))return json(400,{error:'Inhalt fehlt.'});const data={id};
          for(const [key,value]of Object.entries(body.data))if(/^[a-zA-Z]+$/.test(key)&&!['published','dirty','id','__proto__','constructor','prototype'].includes(key)&&['string','number','boolean'].includes(typeof value))data[key]=typeof value==='string'?value.slice(0,20000):value;
          if(!clean(data.title))return json(400,{error:'Titel erforderlich.'});
          if(data.sourceUrl){try{const source=new URL(data.sourceUrl);if(!['https:','http:'].includes(source.protocol))throw new Error();data.sourceUrl=source.href;}catch{return json(400,{error:'Bitte einen gültigen Link zur Originalbewertung verwenden.'});}}
          const mediaOk=value=>!value||/^\/(assets|uploads)\/[a-zA-Z0-9._-]+$/.test(value)||value.startsWith(storagePrefix);if(!mediaOk(data.image)||!mediaOk(data.video))return json(400,{error:'Bitte eine Datei aus der Mediathek verwenden.'});
          if(row)await supabase.rest('revisions','',{method:'POST',body:{collection,entity_id:id,snapshot:row.draft,actor:user.id,actor_email:user.email}});
          await supabase.rest('content','?on_conflict=collection,id',{method:'POST',prefer:'resolution=merge-duplicates,return=representation',body:{collection,id,draft:data,published:body.publish?data:(row?.published||null),updated_at:new Date().toISOString()}});if(body.publish)publicContentCache=null;await audit(user,body.publish?'publish':'save draft',`${collection}/${id}`);return json(200,{ok:true});
        }
        if(req.method==='DELETE'){if(collection==='settings'||(collection==='pages'&&['home','about'].includes(id)))return json(400,{error:'Dieser Basisinhalt kann nicht gelöscht werden.'});if(row)await supabase.rest('revisions','',{method:'POST',body:{collection,entity_id:id,snapshot:row.draft,actor:user.id,actor_email:user.email}});await supabase.rest('content',`?collection=${filter(collection)}&id=${filter(id)}`,{method:'DELETE'});publicContentCache=null;await audit(user,'delete',`${collection}/${id}`);return json(200,{ok:true});}
      }
      if(path==='/api/admin/revisions'&&req.method==='GET'&&editor){const rows=await supabase.rest('revisions',`?collection=${filter(url.searchParams.get('collection'))}&entity_id=${filter(url.searchParams.get('id'))}&select=*&order=id.desc&limit=30`);return json(200,rows.map(r=>({...r,actor:r.actor_email||r.actor})));}
      if(path==='/api/admin/requests'&&req.method==='GET'&&reception)return json(200,await supabase.rest('appointment_requests','?select=*&order=id.desc'));
      if(path==='/api/admin/requests'&&req.method==='PUT'&&reception){if(!['new','contacted','confirmed','closed'].includes(body.status))return json(400,{error:'Ungültiger Status.'});const assignee=body.assignee||null;if(assignee){const p=await supabase.rest('staff_profiles',`?id=${filter(assignee)}&active=eq.true&select=id,role`);if(!p[0]||!['owner','reception'].includes(p[0].role))return json(400,{error:'Ungültige Zuweisung.'});}await supabase.rest('appointment_requests',`?id=${filter(body.id)}`,{method:'PATCH',body:{status:body.status,assignee,updated_at:new Date().toISOString()}});await audit(user,`request ${body.status}`,`request/${body.id}`);return json(200,{ok:true});}
      if(path==='/api/admin/requests'&&req.method==='DELETE'&&owner){await supabase.rest('appointment_requests',`?id=${filter(body.id)}`,{method:'DELETE'});await audit(user,'delete request',`request/${body.id}`);return json(200,{ok:true});}
      if(path==='/api/admin/staff'&&req.method==='GET'&&reception)return json(200,await supabase.rest('staff_profiles','?active=eq.true&role=in.(owner,reception)&select=id,name'));
      if(path==='/api/admin/users'&&owner){
        if(req.method==='GET')return json(200,await supabase.rest('staff_profiles','?select=id,name,email,role,active&order=created_at.asc'));
        if(req.method==='POST'){const email=clean(body.email).toLowerCase(),name=clean(body.name);if(!emailValid(email)||!name||typeof body.password!=='string'||body.password.length<12||body.password.length>512||!['owner','editor','reception'].includes(body.role))return json(400,{error:'Name, E-Mail, Rolle und Passwort (mind. 12 Zeichen) prüfen.'});let created;try{created=await supabase.createAuthUser(email,body.password,name);await supabase.rest('staff_profiles','',{method:'POST',body:{id:created.id,email,name,role:body.role}});}catch(error){if(created?.id)try{await supabase.deleteAuthUser(created.id);}catch{}throw error;}await audit(user,'create user',email);return json(201,{ok:true});}
        if(req.method==='PUT'){if(String(body.id)===user.id)return json(400,{error:'Das eigene Konto kann hier nicht deaktiviert werden.'});await supabase.rest('staff_profiles',`?id=${filter(body.id)}`,{method:'PATCH',body:{active:Boolean(body.active),updated_at:new Date().toISOString()}});await supabase.updateAuthUser(body.id,{ban_duration:body.active?'none':'876000h'});await audit(user,'update access',`user/${body.id}`);return json(200,{ok:true});}
      }
      if(path==='/api/admin/password'&&req.method==='PUT'){if(typeof body.current!=='string'||typeof body.password!=='string'||body.password.length<12||body.password.length>512)return json(400,{error:'Aktuelles Passwort und neues Passwort (mind. 12 Zeichen) prüfen.'});try{await supabase.signIn(user.email,body.current);}catch{return json(400,{error:'Das aktuelle Passwort ist nicht korrekt.'});}await supabase.updatePassword(user.accessToken,body.password);await audit(user,'change password','account');return json(200,{ok:true});}
      if(path==='/api/admin/audit'&&req.method==='GET'&&owner){const rows=await supabase.rest('audit_log','?select=*&order=id.desc&limit=100');return json(200,rows.map(r=>({...r,actor:r.actor_email||r.actor})));}
      if(path==='/api/admin/media'&&editor){
        if(req.method==='GET')return json(200,await supabase.rest('media','?select=*&order=created_at.desc'));
        if(req.method==='POST'){const image=/^data:image\/(png|jpeg|webp);base64,([a-zA-Z0-9+/=]+)$/.exec(body.data||'');if(!image||!clean(body.alt))return json(400,{error:'PNG, JPEG oder WebP mit Alternativtext erforderlich.'});const bytes=Buffer.from(image[2],'base64'),type=`image/${image[1]}`,extension=mediaType(bytes,type);if(!extension||bytes.length>2_500_000)return json(400,{error:'Ungültiges Bild oder größer als 2,5 MB.'});const id=randomBytes(12).toString('hex'),storagePath=`uploads/${id}.${extension}`,mediaPath=await supabase.upload(storagePath,bytes,type);await supabase.rest('media','',{method:'POST',body:{id,path:mediaPath,storage_path:storagePath,name:clean(body.name),alt:clean(body.alt,300),mime_type:type,created_by:user.id}});await audit(user,'upload image',id);return json(201,{path:mediaPath});}
      }
      return json(403,{error:'Diese Aktion ist für Ihr Konto nicht verfügbar.'});
    }catch(error){if(!error.status||error.status>=500)console.error(error);if(!res.headersSent)json(error.status&&error.status<500?error.status:500,{error:error.status&&error.status<500?'Supabase-Anfrage konnte nicht verarbeitet werden.':'Ein Fehler ist aufgetreten. Bitte erneut versuchen.'});}
  });
}
