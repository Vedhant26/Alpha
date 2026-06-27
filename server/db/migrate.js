const db = require('better-sqlite3')('data/alpha.db');

try {
  db.prepare("ALTER TABLE cards ADD COLUMN milestone TEXT DEFAULT '';").run();
  console.log("Successfully added milestone to cards table.");
} catch (e) {
  if (e.message.includes("duplicate column name")) {
    console.log("Milestone column already exists.");
  } else {
    console.error("Migration error:", e);
  }
}
