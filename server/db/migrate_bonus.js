const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'alpha.db');
const db = new Database(DB_PATH);

console.log('Running bonus migrations...');

// 1. Add is_public to boards if it doesn't exist
try {
  db.prepare('ALTER TABLE boards ADD COLUMN is_public INTEGER DEFAULT 0').run();
  console.log('Added is_public to boards.');
} catch (err) {
  if (err.message.includes('duplicate column name')) {
    console.log('is_public already exists.');
  } else {
    console.error('Error adding is_public:', err.message);
  }
}

// 2. Add time_spent to cards if it doesn't exist
try {
  db.prepare('ALTER TABLE cards ADD COLUMN time_spent INTEGER DEFAULT 0').run();
  console.log('Added time_spent to cards.');
} catch (err) {
  if (err.message.includes('duplicate column name')) {
    console.log('time_spent already exists.');
  } else {
    console.error('Error adding time_spent:', err.message);
  }
}

// 3. Create time_sessions table
db.exec(`
  CREATE TABLE IF NOT EXISTS time_sessions (
    id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL,
    user_id TEXT,
    start_time TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
  );
`);
console.log('Created time_sessions table.');

// 4. Create card_dependencies table
db.exec(`
  CREATE TABLE IF NOT EXISTS card_dependencies (
    blocker_id TEXT NOT NULL,
    blocked_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (blocker_id, blocked_id),
    FOREIGN KEY (blocker_id) REFERENCES cards(id) ON DELETE CASCADE,
    FOREIGN KEY (blocked_id) REFERENCES cards(id) ON DELETE CASCADE
  );
`);
console.log('Created card_dependencies table.');

console.log('Migration complete.');
db.close();
