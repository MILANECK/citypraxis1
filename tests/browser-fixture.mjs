// Isolated, disposable browser QA environment. Never uses the working database.
import { openDatabase,passwordHash } from '../src/database.mjs';
import { createApp } from '../src/server.mjs';
const db=openDatabase(':memory:');
db.prepare('INSERT INTO users(email,name,password,role) VALUES(?,?,?,?)').run('preview@example.test','Preview Admin',passwordHash('local-preview-only-2026'),'owner');
const port=Number(process.env.QA_PORT||3001);
process.env.APP_ORIGIN=`http://127.0.0.1:${port}`;
// The fixture always uses SQLite, even if --env-file provides real API credentials.
createApp(db).listen(port,'127.0.0.1',()=>console.log(`Disposable QA preview: http://127.0.0.1:${port}/admin`));
