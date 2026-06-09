const crypto = require('crypto');
const Database = require('better-sqlite3');
const path = require('path');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

const dbPath = process.argv[2] || '../data/manas_group.db';
const email = process.argv[3] || 'admin@agriforge.in';
const password = process.argv[4] || 'AgriForge@2026';

const db = new Database(dbPath);

const user = db.prepare('SELECT id, email FROM users WHERE email = ?').get(email);
if (!user) {
  console.error(`User ${email} not found. Run migrate_phase5.py first.`);
  process.exit(1);
}

const hash = hashPassword(password);
db.prepare('UPDATE users SET password_hash = ? WHERE email = ?').run(hash, email);
db.close();

console.log(`Password set for ${email}`);
console.log('Use these credentials to log in at /login');
