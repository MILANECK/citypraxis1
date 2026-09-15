import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { openDatabase, passwordHash } from '../src/database.mjs';
const rl = createInterface({ input: stdin, output: stdout });
try {
  const email = (await rl.question('Admin email: ')).trim().toLowerCase();
  const name = (await rl.question('Name: ')).trim();
  stdout.write('Use a unique password of at least 12 characters. Input is visible in this local terminal.\n');
  const password = await rl.question('Password: ');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name || password.length < 12) throw new Error('Valid email, name and 12-character password required.');
  const db = openDatabase();
  db.prepare('INSERT INTO users(email,name,password,role) VALUES(?,?,?,?)').run(email, name, passwordHash(password), 'owner');
  db.close(); console.log('Owner created. Sign in at http://127.0.0.1:3000/admin');
} catch (error) { console.error(error.message); process.exitCode = 1; } finally { rl.close(); }
