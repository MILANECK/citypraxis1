import http from 'node:http';
import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { randomBytes, createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { loadEnvFile } from 'node:process';
import { gzipSync } from 'node:zlib';
import { serveFile, mediaType } from './media.mjs';
import { openDatabase, contentSnapshot, collections, passwordHash, verifyPassword } from './database.mjs';
import { hasSupabaseConfig } from './supabase-client.mjs';
import { createSupabaseApp } from './supabase-server.mjs';
import { normalizeSocialLinks } from './social-links.mjs';
import { mediaInUse,mediaDownloadName } from './media-library.mjs';
import {createAppointmentService} from './appointment-service.mjs';
import {createConversationService,conversationFacts} from './chat/conversation.mjs';
import {createChatService} from './chat/service.mjs';
import {sqliteChatStore} from './chat/store.mjs';
import {isTeamMemberBookable} from './team-booking.mjs';

const root = resolve('public');
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.svg':'image/svg+xml', '.ico':'image/x-icon', '.mp4':'video/mp4' };
const hash = value => createHash('sha256').update(value).digest('hex');
const clean = (value, max = 200) => typeof value === 'string' ? value.trim().slice(0,max) : '';
const emailValid = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
export function createApp(db = openDatabase()) {
  const conversation=createConversationService({store:sqliteChatStore(db),getFacts:async()=>conversationFacts(contentSnapshot(db))});
  const chat=createChatService({store:sqliteChatStore(db),getSettings:async()=>contentSnapshot(db).settings[0]||{}});
  const appointment=createAppointmentService({store:sqliteChatStore(db),getSettings:async()=>contentSnapshot(db).settings[0]||{},getTherapist:async id=>{
    const row=db.prepare("SELECT published FROM content WHERE collection='team' AND id=? AND published IS NOT NULL").get(id);const therapist=row?JSON.parse(row.published):null;return therapist&&isTeamMemberBookable(therapist)?therapist:null;
  }});
  const attempts = new Map();
  function limit(key, max) {
    const now = Date.now();
    if (attempts.size > 1000) for (const [k,v] of attempts) if (v.until < now) attempts.delete(k);
    let state = attempts.get(key);
    if (!state || state.until < now) state = { count:0, until:now + 15 * 60000 };
    state.count++; attempts.set(key,state);
    if (state.count > max) throw Object.assign(new Error('Zu viele Versuche. Bitte später erneut versuchen.'), { status:429 });
  }
  const audit = (user, action, entity) => db.prepare('INSERT INTO audit(actor,action,entity) VALUES(?,?,?)').run(user?.email || 'public', action, entity);
  return http.createServer(async (req,res) => {
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options','DENY');
    if(process.env.NODE_ENV==='production')res.setHeader('Strict-Transport-Security','max-age=31536000; includeSubDomains');
    res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; style-src 'self'; script-src 'self'; font-src 'self'; connect-src 'self'; frame-src https://www.google.com https://maps.google.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
    const json = (status, data) => { let payload=Buffer.from(JSON.stringify(data));const headers={ 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store' };if(payload.length>1024&&/\bgzip\b/.test(req.headers['accept-encoding']||'')){payload=gzipSync(payload);headers['Content-Encoding']='gzip';headers.Vary='Accept-Encoding';}headers['Content-Length']=payload.length;res.writeHead(status,headers);res.end(payload); };
    try {
      const url = new URL(req.url, 'http://localhost');
      const path = decodeURIComponent(url.pathname);
      if(path.split('/').some(part=>part.startsWith('.')))return json(404,{error:'Nicht gefunden.'});
      if (['GET','HEAD'].includes(req.method) && !path.startsWith('/api/')) {
        let file = resolve(root, `.${path}`);
        if (!file.startsWith(root + sep) && file !== root) return json(404,{ error:'Nicht gefunden.' });
        if (!extname(path)) file = resolve(root, path.startsWith('/admin') ? 'admin.html' : 'index.html');
        try {
          await serveFile(req,res,file,mime[extname(file)] || 'application/octet-stream');
        } catch { if(!res.headersSent)json(404,{error:'Nicht gefunden.'}); }
        return;
      }
      if (!path.startsWith('/api/')) return json(405,{error:'Methode nicht erlaubt.'});
      if (path === '/api/health' && req.method === 'GET') return json(200,{ok:true,backend:'sqlite'});
      const token = /(?:^|;\s*)cp_session=([a-f0-9]+)/.exec(req.headers.cookie || '')?.[1];
      const user = token && db.prepare('SELECT u.id,u.email,u.name,u.role,s.csrf FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires>? AND u.active=1').get(hash(token),Date.now());
      let body = {};
      if (!['GET','HEAD'].includes(req.method)) {
        const expected = process.env.APP_ORIGIN || `http://${req.headers.host}`;
        if (req.headers.origin !== expected || req.headers['sec-fetch-site'] === 'cross-site') return json(403,{error:'Ungültiger Ursprung.'});
        if(path==='/api/admin/media-upload' && req.method==='POST') {
          if(!user)return json(401,{error:'Bitte anmelden.'});
          if(!['owner','editor'].includes(user.role) || req.headers['x-csrf-token']!==user.csrf)return json(403,{error:'Upload nicht erlaubt.'});
          const type=req.headers['content-type'];
          if(!['video/mp4','image/png','image/jpeg','image/webp'].includes(type))return json(415,{error:'Bitte MP4, PNG, JPEG oder WebP verwenden.'});
          const max=type==='video/mp4'?60_000_000:10_000_000;
          if(Number(req.headers['content-length'])>max)return json(413,{error:'Datei zu groß: Video maximal 60 MB, Bild maximal 10 MB.'});
          const name=clean(url.searchParams.get('name')),alt=clean(url.searchParams.get('alt'),300);
          if(!alt)return json(400,{error:'Bitte eine Bild- oder Videobeschreibung eingeben.'});
          const chunks=[];let size=0;
          for await(const chunk of req){size+=chunk.length;if(size>max)throw Object.assign(new Error('Datei zu groß.'),{status:413});chunks.push(chunk);}
          const bytes=Buffer.concat(chunks),extension=mediaType(bytes,type);
          if(!extension)return json(400,{error:'Dateiformat stimmt nicht mit dem Inhalt überein.'});
          const id=randomBytes(12).toString('hex'),mediaPath=`/uploads/${id}.${extension}`;
          await mkdir(resolve(root,'uploads'),{recursive:true});await writeFile(resolve(root,`.${mediaPath}`),bytes);
          db.prepare('INSERT INTO media(id,path,name,alt) VALUES(?,?,?,?)').run(id,mediaPath,name,alt);audit(user,'upload media',id);
          return json(201,{path:mediaPath,name,alt});
        }
        if (!req.headers['content-type']?.startsWith('application/json')) return json(415,{error:'JSON erforderlich.'});
        let raw = ''; let size = 0;
        for await (const chunk of req) { size += chunk.length; if (size > ((path.startsWith('/api/chat/')||path==='/api/requests')?64_000:4_000_000)) throw Object.assign(new Error('Datei oder Anfrage zu groß.'),{status:413}); raw += chunk; }
        try { body = JSON.parse(raw || '{}'); } catch { return json(400,{error:'Ungültige Anfrage.'}); }
        if (!body || Array.isArray(body) || typeof body !== 'object') return json(400,{error:'Ungültige Anfrage.'});
      }
      if(await conversation.handle(req,path,body,json))return;
      if(await chat.handle(req,path,body,json))return;
      if (path === '/api/content' && req.method === 'GET') return json(200,contentSnapshot(db));
      if(await appointment(req,path,body,json))return;
      if (path === '/api/login' && req.method === 'POST') {
        limit(`login:${req.socket.remoteAddress}`,12);
        const user = db.prepare('SELECT * FROM users WHERE email = ? AND active = 1').get(clean(body.email).toLowerCase());
        if (!user || typeof body.password !== 'string' || body.password.length > 512 || !verifyPassword(body.password,user.password)) return json(401,{error:'E-Mail oder Passwort nicht korrekt.'});
        const token = randomBytes(32).toString('hex'), csrf = randomBytes(24).toString('hex');
        db.prepare('DELETE FROM sessions WHERE expires < ?').run(Date.now());
        db.prepare('INSERT INTO sessions(token,user_id,csrf,expires) VALUES(?,?,?,?)').run(hash(token),user.id,csrf,Date.now()+8*3600000);
        res.setHeader('Set-Cookie',`cp_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${process.env.APP_ORIGIN?.startsWith('https:') ? '; Secure' : ''}`);
        audit(user,'login','session'); return json(200,{ok:true});
      }
      if (!user) return json(401,{error:'Bitte anmelden.'});
      if (req.method !== 'GET' && req.headers['x-csrf-token'] !== user.csrf) return json(403,{error:'Sicherheitsprüfung fehlgeschlagen. Bitte neu anmelden.'});
      if (path === '/api/me' && req.method === 'GET') return json(200,user);
      if (path === '/api/logout' && req.method === 'POST') { db.prepare('DELETE FROM sessions WHERE token=?').run(hash(token)); res.setHeader('Set-Cookie','cp_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'); return json(200,{ok:true}); }
      const owner = user.role === 'owner', editor = owner || user.role === 'editor', reception = owner || user.role === 'reception';
      if(path==='/api/admin/capacity'&&req.method==='GET')return json(200,{available:false});
      if(path==='/api/admin/requests/notify'&&req.method==='POST'&&reception)return json(200,await chat.retryNotification(body.id));
      if(path==='/api/admin/social-links'&&req.method==='PUT'&&editor){
        let socialLinks;try{socialLinks=normalizeSocialLinks(body.socialLinks);}catch{return json(400,{error:'Bitte gültige Instagram- oder Facebook-Profillinks verwenden (https://).'});}
        const row=db.prepare("SELECT draft,published FROM content WHERE collection='settings' AND id='practice'").get();
        if(!row)return json(404,{error:'Praxisdaten fehlen.'});
        const draft={...JSON.parse(row.draft),socialLinks},published={...JSON.parse(row.published||row.draft),socialLinks};
        db.exec('BEGIN');
        try{
          db.prepare('INSERT INTO revisions(collection,entity_id,snapshot,actor) VALUES(?,?,?,?)').run('settings','practice',row.draft,user.email);
          db.prepare("UPDATE content SET draft=?,published=?,updated_at=CURRENT_TIMESTAMP WHERE collection='settings' AND id='practice'").run(JSON.stringify(draft),JSON.stringify(published));
          audit(user,'publish social links','settings/practice');db.exec('COMMIT');
        }catch(error){db.exec('ROLLBACK');throw error;}
        return json(200,{ok:true,socialLinks});
      }
      if (path === '/api/admin/team-order' && req.method === 'PUT' && editor) {
        const ids=body.ids,rows=db.prepare("SELECT id,draft,published FROM content WHERE collection='team'").all();
        if(!Array.isArray(ids)||ids.length!==rows.length||ids.length>20||ids.some(id=>typeof id!=='string'||!/^[a-z0-9-]{1,200}$/.test(id))||new Set(ids).size!==ids.length||rows.some(row=>!ids.includes(row.id)))return json(400,{error:'Die Teamreihenfolge ist ungültig. Bitte laden Sie die Seite neu.'});
        if(rows.some(row=>row.id==='isabella-casny')&&ids[0]!=='isabella-casny')return json(400,{error:'Isabella bleibt als hervorgehobenes Profil an erster Stelle.'});
        const byId=new Map(rows.map(row=>[row.id,row]));
        const changed=ids.map((id,order)=>({row:byId.get(id),order})).filter(({row,order})=>{
          const draft=JSON.parse(row.draft),published=row.published?JSON.parse(row.published):null;
          return Number(draft.order)!==order||(published&&Number(published.order)!==order);
        });
        db.exec('BEGIN');
        try{
          for(const {row,order} of changed){
            const draft={...JSON.parse(row.draft),order},published=row.published?{...JSON.parse(row.published),order}:null;
            db.prepare('INSERT INTO revisions(collection,entity_id,snapshot,actor) VALUES(?,?,?,?)').run('team',row.id,row.draft,user.email);
            db.prepare('UPDATE content SET draft=?,published=?,updated_at=CURRENT_TIMESTAMP WHERE collection=\'team\' AND id=?').run(JSON.stringify(draft),published?JSON.stringify(published):null,row.id);
          }
          if(changed.length)audit(user,'reorder','team');
          db.exec('COMMIT');
        }catch(error){db.exec('ROLLBACK');throw error;}
        return json(200,{ok:true});
      }
      if (path === '/api/admin/content' && req.method === 'GET' && editor) return json(200,contentSnapshot(db,true));
      const contentMatch = /^\/api\/admin\/content\/([a-z]+)\/([a-z0-9-]+)$/.exec(path);
      if (contentMatch && editor) {
        const [,collection,id] = contentMatch;
        if (!collections.includes(collection)) return json(400,{error:'Unbekannter Bereich.'});
        const row = db.prepare('SELECT * FROM content WHERE collection=? AND id=?').get(collection,id);
        if (req.method === 'PATCH') {
          if (collection === 'settings' || (collection === 'pages' && ['home','about'].includes(id))) return json(400,{error:'Dieser Basisinhalt muss veröffentlicht bleiben.'});
          db.prepare('UPDATE content SET published=NULL WHERE collection=? AND id=?').run(collection,id);
          audit(user,'unpublish',`${collection}/${id}`); return json(200,{ok:true});
        }
        if (req.method === 'PUT') {
          if(body.createOnly&&row)return json(409,{error:'This entry already exists. Please edit it or choose a different identifier.'});
          if(collection==='team'&&!row&&db.prepare("SELECT COUNT(*) AS total FROM content WHERE collection='team'").get().total>=20)return json(409,{error:'Es können höchstens 20 Teamprofile angelegt werden.'});
          if(collection==='reviews'&&!row&&db.prepare('SELECT COUNT(*) AS total FROM content WHERE collection=?').get('reviews').total>=3)return json(409,{error:'All three review slots are filled. Please edit or delete an existing review.'});
          if (!body.data || typeof body.data !== 'object' || Array.isArray(body.data)) return json(400,{error:'Inhalt fehlt.'});
          const data = { id };
          for (const [key,value] of Object.entries(body.data)) if (/^[a-zA-Z]+$/.test(key) && !['published','dirty','id','__proto__','constructor','prototype'].includes(key) && ['string','number','boolean'].includes(typeof value)) data[key] = typeof value === 'string' ? value.slice(0,20000) : value;
          if(collection==='settings'&&Array.isArray(body.data.appointmentConcerns))data.appointmentConcerns=body.data.appointmentConcerns.slice(0,20).map(item=>({title:clean(item?.title,60),titleEn:clean(item?.titleEn,60),...(item?.custom?{custom:true}:{})})).filter(item=>item.title&&item.titleEn);
          if(collection==='settings'&&body.data.socialLinks!==undefined){try{data.socialLinks=normalizeSocialLinks(body.data.socialLinks);}catch{return json(400,{error:'Bitte gültige Instagram- oder Facebook-Profillinks verwenden (https://).'});}}
          if (!clean(data.title)) return json(400,{error:'Titel erforderlich.'});
          if(data.sourceUrl){try{const source=new URL(data.sourceUrl);if(!['https:','http:'].includes(source.protocol))throw new Error();data.sourceUrl=source.href;}catch{return json(400,{error:'Bitte einen gültigen Link zur Originalbewertung verwenden.'});}}
          if (data.image && !/^\/(assets|uploads)\/[a-zA-Z0-9._-]+$/.test(data.image)) return json(400,{error:'Bitte ein Bild aus der Mediathek verwenden.'});
          if(data.video && !/^\/(assets|uploads)\/[a-zA-Z0-9._-]+\.mp4$/.test(data.video))return json(400,{error:'Bitte ein MP4-Video aus der Mediathek verwenden.'});
          if(collection==='pages' && id==='home') {
            for(const [key,values] of Object.entries({heroMedia:['image','video'],heroHeight:['fullscreen','large'],heroPosition:['left','center','right'],heroMobilePosition:['left','center','right'],heroOverlay:['soft','balanced','strong']})) {
              if(data[key] && !values.includes(data[key]))return json(400,{error:'Ungültige Hero-Einstellung.'});
            }
            if(data.heroMedia==='video' && !data.video)return json(400,{error:'Bitte ein Video auswählen.'});
            if(!data.image)return json(400,{error:'Bitte ein Titelbild wählen. Es dient auch als Video-Standbild.'});
          }
          const value = JSON.stringify(data);
          db.exec('BEGIN');
          try {
            if (row) db.prepare('INSERT INTO revisions(collection,entity_id,snapshot,actor) VALUES(?,?,?,?)').run(collection,id,row.draft,user.email);
            db.prepare('INSERT INTO content(collection,id,draft,published) VALUES(?,?,?,?) ON CONFLICT(collection,id) DO UPDATE SET draft=excluded.draft,published=excluded.published,updated_at=CURRENT_TIMESTAMP').run(collection,id,value,body.publish ? value : row?.published || null);
            audit(user,body.publish ? 'publish' : 'save draft',`${collection}/${id}`); db.exec('COMMIT');
          } catch(error) { db.exec('ROLLBACK'); throw error; }
          return json(200,{ok:true});
        }
        if (req.method === 'DELETE') {
          if (collection === 'settings' || (collection === 'pages' && ['home','about'].includes(id))) return json(400,{error:'Dieser Basisinhalt kann nicht gelöscht werden.'});
          if (row) db.prepare('INSERT INTO revisions(collection,entity_id,snapshot,actor) VALUES(?,?,?,?)').run(collection,id,row.draft,user.email);
          db.prepare('DELETE FROM content WHERE collection=? AND id=?').run(collection,id); audit(user,'delete',`${collection}/${id}`); return json(200,{ok:true});
        }
      }
      if (path === '/api/admin/revisions' && req.method === 'GET' && editor) return json(200,db.prepare('SELECT * FROM revisions WHERE collection=? AND entity_id=? ORDER BY id DESC LIMIT 30').all(url.searchParams.get('collection'),url.searchParams.get('id')));
      if (path === '/api/admin/requests' && req.method === 'GET' && reception) return json(200,db.prepare('SELECT * FROM requests ORDER BY id DESC').all());
      if (path === '/api/admin/requests' && req.method === 'PUT' && reception) {
        if (!['new','contacted','confirmed','closed'].includes(body.status)) return json(400,{error:'Ungültiger Status.'});
        const assignee = body.assignee ? Number(body.assignee) : null;
        if (assignee && !db.prepare("SELECT id FROM users WHERE id=? AND active=1 AND role IN ('owner','reception')").get(assignee)) return json(400,{error:'Ungültige Zuweisung.'});
        db.prepare('UPDATE requests SET status=?,assignee=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(body.status,assignee,Number(body.id)); audit(user,`request ${body.status}`,`request/${body.id}`); return json(200,{ok:true});
      }
      if (path === '/api/admin/requests' && req.method === 'DELETE' && owner) { db.prepare('DELETE FROM requests WHERE id=?').run(Number(body.id)); audit(user,'delete request',`request/${body.id}`); return json(200,{ok:true}); }
      if (path === '/api/admin/staff' && req.method === 'GET' && reception) return json(200,db.prepare("SELECT id,name FROM users WHERE active=1 AND role IN ('owner','reception')").all());
      if (path === '/api/admin/users' && owner) {
        if (req.method === 'GET') return json(200,db.prepare('SELECT id,name,email,role,active FROM users').all());
        if (req.method === 'POST') {
          const email = clean(body.email).toLowerCase(), name = clean(body.name);
          if (!emailValid(email) || !name || typeof body.password !== 'string' || body.password.length < 12 || body.password.length > 512 || !['owner','editor','reception'].includes(body.role)) return json(400,{error:'Name, E-Mail, Rolle und Passwort (mind. 12 Zeichen) prüfen.'});
          if (db.prepare('SELECT id FROM users WHERE email=?').get(email)) return json(409,{error:'Diese E-Mail ist bereits vergeben.'});
          db.prepare('INSERT INTO users(email,name,password,role) VALUES(?,?,?,?)').run(email,name,passwordHash(body.password),body.role); audit(user,'create user',email); return json(201,{ok:true});
        }
        if (req.method === 'PUT') {
          if (Number(body.id) === user.id) return json(400,{error:'Das eigene Konto kann hier nicht deaktiviert werden.'});
          db.prepare('UPDATE users SET active=? WHERE id=?').run(body.active ? 1 : 0,Number(body.id));
          db.prepare('DELETE FROM sessions WHERE user_id=?').run(Number(body.id)); audit(user,'update access',`user/${body.id}`); return json(200,{ok:true});
        }
      }
      if (path === '/api/admin/password' && req.method === 'PUT') {
        const current = db.prepare('SELECT password FROM users WHERE id=?').get(user.id);
        if (typeof body.current !== 'string' || body.current.length > 512 || !verifyPassword(body.current,current.password) || typeof body.password !== 'string' || body.password.length < 12 || body.password.length > 512) return json(400,{error:'Aktuelles Passwort und neues Passwort (mind. 12 Zeichen) prüfen.'});
        db.prepare('UPDATE users SET password=? WHERE id=?').run(passwordHash(body.password),user.id);
        db.prepare('DELETE FROM sessions WHERE user_id=? AND token<>?').run(user.id,hash(token)); audit(user,'change password','account'); return json(200,{ok:true});
      }
      if (path === '/api/admin/audit' && req.method === 'GET' && owner) return json(200,db.prepare('SELECT * FROM audit ORDER BY id DESC LIMIT 100').all());
      if (path === '/api/admin/media' && editor) {
        if (req.method === 'GET') return json(200,db.prepare('SELECT * FROM media ORDER BY created_at DESC').all());
        if (req.method === 'POST') {
          const match = /^data:image\/(png|jpeg|webp);base64,([a-zA-Z0-9+/=]+)$/.exec(body.data || '');
          if (!match || !clean(body.alt)) return json(400,{error:'PNG, JPEG oder WebP mit Alternativtext erforderlich.'});
          const bytes = Buffer.from(match[2],'base64'), type = match[1];
          const valid = type === 'png' ? bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : type === 'jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 : bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP';
          if (!valid || bytes.length > 2_500_000) return json(400,{error:'Ungültiges Bild oder größer als 2,5 MB.'});
          const id = randomBytes(12).toString('hex'), path = `/uploads/${id}.${type}`;
          await mkdir(resolve(root,'uploads'),{recursive:true}); await writeFile(resolve(root,`.${path}`),bytes);
          db.prepare('INSERT INTO media(id,path,name,alt) VALUES(?,?,?,?)').run(id,path,clean(body.name),clean(body.alt,300)); audit(user,'upload image',id); return json(201,{path});
        }
      }
      const mediaAction=/^\/api\/admin\/media\/([a-zA-Z0-9-]+)(?:\/(download))?$/.exec(path);
      if(mediaAction && editor){
        const media=db.prepare('SELECT * FROM media WHERE id=?').get(mediaAction[1]);
        if(!media)return json(404,{error:'Datei nicht gefunden.'});
        if(mediaAction[2]==='download'&&req.method==='GET'){
          if(!/^\/(assets|uploads)\/[a-zA-Z0-9._-]+$/.test(media.path))return json(400,{error:'Ungültiger Medienpfad.'});
          const file=resolve(root,`.${media.path}`),bytes=await readFile(file);
          res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Content-Disposition':`attachment; filename="${mediaDownloadName(media)}"`,'Content-Length':bytes.length,'Cache-Control':'no-store'});
          return res.end(bytes);
        }
        if(!mediaAction[2]&&req.method==='DELETE'){
          const rows=db.prepare('SELECT draft,published FROM content').all();
          if(mediaInUse(media.path,rows))return json(409,{error:'Dieses Medium wird noch auf der Website oder in einem Entwurf verwendet.'});
          if(/^\/uploads\/[a-zA-Z0-9._-]+$/.test(media.path)){
            try{await unlink(resolve(root,`.${media.path}`));}catch(error){if(error.code!=='ENOENT')throw error;}
          }
          db.prepare('DELETE FROM media WHERE id=?').run(media.id);audit(user,'delete media',media.id);return json(200,{ok:true});
        }
      }
      return json(403,{error:'Diese Aktion ist für Ihr Konto nicht verfügbar.'});
    } catch (error) { if (!error.status) console.error(error); if (!res.headersSent) json(error.status || 500,{error:error.status ? error.message : 'Ein Fehler ist aufgetreten. Bitte erneut versuchen.'}); }
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { loadEnvFile('.env'); } catch {}
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');
  const usingSupabase = hasSupabaseConfig();
  const app = usingSupabase ? createSupabaseApp() : createApp();
  app.listen(port,host,() => console.log(`Citypraxis listening on ${host}:${port}\nAdmin: /admin\nBackend: ${usingSupabase ? 'Supabase' : 'local SQLite'}`));
}
