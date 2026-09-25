import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { seed } from './seed.mjs';
import {childrenService,refineTherapyRecord} from './therapy-catalog.mjs';
import originalContent from './original-content.json' with {type:'json'};
import { englishContent } from './english-content.mjs';
import { importTherapistsSqlite } from './therapist-import.mjs';

export const collections = Object.keys(seed);
export function passwordHash(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
export function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  return timingSafeEqual(scryptSync(password, salt, 64), Buffer.from(hash, 'hex'));
}
export function openDatabase(file = process.env.DB_PATH || resolve('data/citypraxis.sqlite')) {
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(`PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS migrations (version INTEGER PRIMARY KEY, applied_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS content (collection TEXT NOT NULL, id TEXT NOT NULL, draft TEXT NOT NULL, published TEXT, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(collection,id));
    CREATE TABLE IF NOT EXISTS revisions (id INTEGER PRIMARY KEY, collection TEXT, entity_id TEXT, snapshot TEXT NOT NULL, actor TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, password TEXT NOT NULL, role TEXT CHECK(role IN ('owner','editor','reception')) NOT NULL, active INTEGER DEFAULT 1);
    CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, csrf TEXT NOT NULL, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS requests (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL DEFAULT '', preference TEXT NOT NULL DEFAULT '', acute INTEGER DEFAULT 0, status TEXT DEFAULT 'new', assignee INTEGER REFERENCES users(id), created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY, actor TEXT, action TEXT NOT NULL, entity TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS media (id TEXT PRIMARY KEY, path TEXT NOT NULL, name TEXT NOT NULL, alt TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
  `);
  if (!db.prepare('SELECT version FROM migrations WHERE version = 1').get()) {
    const insert = db.prepare('INSERT INTO content(collection,id,draft,published) VALUES(?,?,?,?)');
    db.exec('BEGIN');
    try {
      for (const [collection, records] of Object.entries(seed)) records.forEach((record, order) => {
        const doc = { ...record, order }; const json = JSON.stringify(doc);
        insert.run(collection, doc.id, json, record.status === 'draft' ? null : json);
      });
      db.prepare('INSERT INTO migrations(version) VALUES(1)').run(); db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
  }
  if (!db.prepare('SELECT version FROM migrations WHERE version = 2').get()) {
    const row=db.prepare("SELECT * FROM content WHERE collection='pages' AND id='home'").get();
    const enhance=value=>{
      if(!value)return null;
      const doc=JSON.parse(value);
      if(!doc.heroMedia){
        Object.assign(doc,{heroMedia:'video',video:'/assets/hero-film.mp4',heroHeight:'fullscreen',heroPosition:'center',heroMobilePosition:'center',heroOverlay:'balanced',heroAlt:'Einblicke in die Citypraxis Wien'});
        if(doc.image==='/assets/hero.jpg')doc.image='/assets/hero-video-poster.jpg';
      }
      return JSON.stringify(doc);
    };
    db.exec('BEGIN');
    try{
      if(row){
        db.prepare('INSERT INTO revisions(collection,entity_id,snapshot,actor) VALUES(?,?,?,?)').run('pages','home',row.draft,'hero migration');
        db.prepare("UPDATE content SET draft=?,published=? WHERE collection='pages' AND id='home'").run(enhance(row.draft),enhance(row.published));
      }
      db.prepare("INSERT OR IGNORE INTO media(id,path,name,alt) VALUES(?,?,?,?)").run('citypraxis-film','/assets/hero-film.mp4','Citypraxis Praxisfilm','Einblicke in die Citypraxis Wien');
      db.prepare("INSERT OR IGNORE INTO media(id,path,name,alt) VALUES(?,?,?,?)").run('citypraxis-poster','/assets/hero-video-poster.jpg','Praxisfilm Standbild','Einblicke in die Citypraxis Wien');
      db.prepare('INSERT INTO migrations(version) VALUES(2)').run();db.exec('COMMIT');
    }catch(error){db.exec('ROLLBACK');throw error;}
  }
  if(!db.prepare('SELECT version FROM migrations WHERE version=3').get()){
    db.exec('BEGIN');
    try{
      for(const {collection,id,data} of originalContent){
        const row=db.prepare('SELECT * FROM content WHERE collection=? AND id=?').get(collection,id);
        if(row)db.prepare('INSERT INTO revisions(collection,entity_id,snapshot,actor) VALUES(?,?,?,?)').run(collection,id,row.draft,'original content migration');
        const published=JSON.stringify({...JSON.parse(row?.published||'{}'),...data});
        const draft=JSON.stringify({...JSON.parse(row?.draft||'{}'),...data});
        db.prepare('INSERT INTO content(collection,id,draft,published) VALUES(?,?,?,?) ON CONFLICT(collection,id) DO UPDATE SET draft=excluded.draft,published=excluded.published').run(collection,id,draft,published);
      }
      db.prepare('INSERT INTO migrations(version) VALUES(3)').run();db.exec('COMMIT');
    }catch(error){db.exec('ROLLBACK');throw error;}
  }
  if(!db.prepare('SELECT version FROM migrations WHERE version=4').get()){
    db.exec('BEGIN');
    try{
      const count=db.prepare("SELECT COUNT(*) AS count FROM content WHERE collection='team'").get().count;
      if(!count)for(let i=0;i<12;i++){
        const roles=['Physiotherapie','Osteopathie','Logopädie','Heilmassage'];
        const names=['Anna Katharina Plank, BSc','Sophie Berger','Katharina Leitner','Laura Steiner','Julia Gruber','Clara Hofmann','Lena Wagner','Theresa Schuster','Marie Huber','Elisa Fuchs','Johanna Winter','Sarah Moser'];
        const data={id:`team-${i+1}`,title:names[i],role:i===0?'Physiotherapeutin · Craniosacraltherapeutin':roles[i%4],body:i===0?'Physiotherapie und Craniosacraltherapie in der Citypraxis.':'Fiktives Beispielprofil. Die persönliche Vorstellung und Behandlungsschwerpunkte werden hier ergänzt.',qualifications:i===0?'BSc':'',image:`/assets/team-placeholder-${i%4+1}.jpg`,placeholder:true,fictional:i!==0,phone:i===0?'+43 670 4041236':'',email:i===0?'amandavoeltl@citypraxis.wien':'',order:i};
        const json=JSON.stringify(data);db.prepare("INSERT INTO content(collection,id,draft,published) VALUES('team',?,?,?)").run(data.id,json,json);
      }
      for(let i=1;i<=4;i++)db.prepare('INSERT OR IGNORE INTO media(id,path,name,alt) VALUES(?,?,?,?)').run(`team-placeholder-${i}`,`/assets/team-placeholder-${i}.jpg`,`Beispielportrait ${i}`,'Platzhalterfoto, kein tatsächliches Teammitglied');
      db.prepare('INSERT INTO migrations(version) VALUES(4)').run();db.exec('COMMIT');
    }catch(error){db.exec('ROLLBACK');throw error;}
  }
  if(!db.prepare('SELECT version FROM migrations WHERE version=5').get()){
    db.exec('BEGIN');
    try{
      for(const row of db.prepare('SELECT * FROM content').all()){
        const translations=englishContent[row.collection]?.[row.id];
        if(!translations)continue;
        const enhance=value=>{
          if(!value)return null;
          const doc=JSON.parse(value);
          for(const [key,text] of Object.entries(translations))if(doc[key+'En']===undefined)doc[key+'En']=text;
          return JSON.stringify(doc);
        };
        db.prepare('INSERT INTO revisions(collection,entity_id,snapshot,actor) VALUES(?,?,?,?)').run(row.collection,row.id,row.draft,'English content migration');
        db.prepare('UPDATE content SET draft=?,published=? WHERE collection=? AND id=?').run(enhance(row.draft),enhance(row.published),row.collection,row.id);
      }
      db.prepare('INSERT INTO migrations(version) VALUES(5)').run();db.exec('COMMIT');
    }catch(error){db.exec('ROLLBACK');throw error;}
  }
  if(!db.prepare('SELECT version FROM migrations WHERE version=6').get()){
    db.exec('BEGIN');
    try{
      const row=db.prepare("SELECT * FROM content WHERE collection='pages' AND id='home'").get();
      const enhance=value=>{
        if(!value)return null;
        const doc=JSON.parse(value);
        if(doc.teamImage===undefined)Object.assign(doc,{teamImage:'/assets/team-group.png',teamImageAlt:'Team-Gruppenfoto',teamImageAltEn:'Team group photo'});
        return JSON.stringify(doc);
      };
      if(row){
        db.prepare('INSERT INTO revisions(collection,entity_id,snapshot,actor) VALUES(?,?,?,?)').run('pages','home',row.draft,'homepage group photo migration');
        db.prepare("UPDATE content SET draft=?,published=? WHERE collection='pages' AND id='home'").run(enhance(row.draft),enhance(row.published));
      }
      db.prepare('INSERT OR IGNORE INTO media(id,path,name,alt) VALUES(?,?,?,?)').run('team-group','/assets/team-group.png','Team Gruppenfoto','Team-Gruppenfoto');
      db.prepare('INSERT INTO migrations(version) VALUES(6)').run();db.exec('COMMIT');
    }catch(error){db.exec('ROLLBACK');throw error;}
  }
  if(!db.prepare('SELECT version FROM migrations WHERE version=7').get()){
    db.exec('BEGIN');
    try{
      for(const row of db.prepare("SELECT * FROM content WHERE collection='settings'").all()){
        const enhance=value=>{
          if(!value)return null;
          const doc=JSON.parse(value);
          const schedule={monday:['08:00–20:00','8 am–8 pm'],tuesday:['07:00–20:00','7 am–8 pm'],wednesday:['08:00–20:00','8 am–8 pm'],thursday:['07:00–20:00','7 am–8 pm'],friday:['08:00–19:00','8 am–7 pm'],saturdayHours:['08:00–14:00','8 am–2 pm'],sunday:['Geschlossen','Closed']};
          for(const [day,[de,en]] of Object.entries(schedule)){
            if(doc[day]===undefined)doc[day]=de;
            if(doc[day+'En']===undefined)doc[day+'En']=en;
          }
          return JSON.stringify(doc);
        };
        db.prepare('INSERT INTO revisions(collection,entity_id,snapshot,actor) VALUES(?,?,?,?)').run(row.collection,row.id,row.draft,'weekly hours migration');
        db.prepare('UPDATE content SET draft=?,published=? WHERE collection=? AND id=?').run(enhance(row.draft),enhance(row.published),row.collection,row.id);
      }
      db.prepare('INSERT INTO migrations(version) VALUES(7)').run();db.exec('COMMIT');
    }catch(error){db.exec('ROLLBACK');throw error;}
  }
  if(!db.prepare('SELECT version FROM migrations WHERE version=8').get()){
    db.exec('BEGIN');
    try{
      for(const row of db.prepare("SELECT * FROM content WHERE collection='prices'").all())db.prepare('INSERT INTO revisions(collection,entity_id,snapshot,actor) VALUES(?,?,?,?)').run('prices',row.id,row.draft,'2026 price list migration');
      db.prepare("DELETE FROM content WHERE collection='prices'").run();
      for(const item of seed.prices){const value=JSON.stringify(item);db.prepare("INSERT INTO content(collection,id,draft,published) VALUES('prices',?,?,?)").run(item.id,value,value);}
      db.prepare('INSERT INTO migrations(version) VALUES(8)').run();db.exec('COMMIT');
    }catch(error){db.exec('ROLLBACK');throw error;}
  }
  if(!db.prepare('SELECT version FROM migrations WHERE version=9').get()){
    db.exec('BEGIN');
    try{importTherapistsSqlite(db);db.prepare('INSERT INTO migrations(version) VALUES(9)').run();db.exec('COMMIT');}
    catch(error){db.exec('ROLLBACK');throw error;}
  }
  if(!db.prepare('SELECT version FROM migrations WHERE version=10').get()){
    db.exec('BEGIN');
    try{
      db.exec("ALTER TABLE requests ADD COLUMN intake TEXT; ALTER TABLE requests ADD COLUMN submission_key TEXT; ALTER TABLE requests ADD COLUMN notification_status TEXT NOT NULL DEFAULT 'not_configured'; CREATE UNIQUE INDEX requests_submission_key_idx ON requests(submission_key); INSERT INTO migrations(version) VALUES(10);");
      db.exec('COMMIT');
    }catch(error){db.exec('ROLLBACK');throw error;}
  }
  if(!db.prepare('SELECT version FROM migrations WHERE version=11').get()){
    db.exec('BEGIN');
    try{
      const back=db.prepare("SELECT draft FROM content WHERE collection='services' AND id='rueckenfit'").get();
      if(back){
        db.prepare('INSERT INTO revisions(collection,entity_id,snapshot,actor) VALUES(?,?,?,?)').run('services','rueckenfit',back.draft,'therapy catalog update');
        db.prepare("DELETE FROM content WHERE collection='services' AND id='rueckenfit'").run();
      }
      for(const id of ['physiotherapie','logopaedie','heilmassage']){
        const row=db.prepare("SELECT draft,published FROM content WHERE collection='services' AND id=?").get(id);
        if(!row)continue;
        const change=value=>value?JSON.stringify(refineTherapyRecord(id,JSON.parse(value))):null;
        const draft=change(row.draft),published=change(row.published);
        if(draft!==row.draft||published!==row.published){
          db.prepare('INSERT INTO revisions(collection,entity_id,snapshot,actor) VALUES(?,?,?,?)').run('services',id,row.draft,'therapy catalog update');
          db.prepare("UPDATE content SET draft=?,published=? WHERE collection='services' AND id=?").run(draft,published,id);
        }
      }
      const value=JSON.stringify(childrenService);
      db.prepare("INSERT OR IGNORE INTO content(collection,id,draft,published) VALUES('services',?,?,?)").run(childrenService.id,value,value);
      db.prepare('INSERT INTO migrations(version) VALUES(11)').run();db.exec('COMMIT');
    }catch(error){db.exec('ROLLBACK');throw error;}
  }
  if(!db.prepare('SELECT version FROM migrations WHERE version=12').get()){
    db.exec('BEGIN');
    try{
      const exists=db.prepare("SELECT 1 FROM content WHERE collection='symptoms' AND id='hirnnervenprobleme'").get();
      if(!exists){
        const order=db.prepare("SELECT COALESCE(MAX(CAST(json_extract(draft,'$.order') AS INTEGER)), -1) + 1 AS value FROM content WHERE collection='symptoms'").get().value;
        const record={id:'hirnnervenprobleme',title:'Hirnnervenprobleme',titleEn:'Cranial Nerve Disorders',subtitle:'',intro:'',body:'',service:'physiotherapie',icon:'head',order};
        const value=JSON.stringify(record);
        db.prepare("INSERT INTO content(collection,id,draft,published) VALUES('symptoms',?,?,?)").run(record.id,value,value);
      }
      db.prepare('INSERT INTO migrations(version) VALUES(12)').run();db.exec('COMMIT');
    }catch(error){db.exec('ROLLBACK');throw error;}
  }
  return db;
}
export function contentSnapshot(db, admin = false) {
  const result = Object.fromEntries(collections.map(k => [k, []]));
  for (const row of db.prepare('SELECT * FROM content').all()) {
    const value = admin ? row.draft : row.published;
    if (value) result[row.collection].push({ ...JSON.parse(value), ...(admin ? { published: Boolean(row.published), dirty: row.draft !== row.published } : {}) });
  }
  for (const values of Object.values(result)) values.sort((a,b) => (a.order || 0) - (b.order || 0));
  return result;
}
