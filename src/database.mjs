import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { seed } from './seed.mjs';

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
