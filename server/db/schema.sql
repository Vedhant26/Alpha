-- ============================================
-- ALPHA — Database Schema (SQLite)
-- ============================================

-- Users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Boards
CREATE TABLE IF NOT EXISTS boards (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sprint_end_date TEXT,
  is_public INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Columns
CREATE TABLE IF NOT EXISTS columns (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  color TEXT DEFAULT '',
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
);

-- Cards
CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,
  column_id TEXT NOT NULL,
  board_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  assignee_id TEXT,
  complexity INTEGER,
  complexity_accepted INTEGER DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  labels TEXT DEFAULT '[]',
  github_issue_id INTEGER,
  github_repo TEXT,
  reference_url TEXT DEFAULT '',
  milestone TEXT DEFAULT '',
  time_spent INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE CASCADE,
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
  FOREIGN KEY (assignee_id) REFERENCES team_members(id) ON DELETE SET NULL
);

-- Unique constraint for GitHub issue deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_cards_github
  ON cards(github_issue_id, github_repo)
  WHERE github_issue_id IS NOT NULL;

-- Team Members
CREATE TABLE IF NOT EXISTS team_members (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL,
  name TEXT NOT NULL,
  github_username TEXT DEFAULT '',
  avatar_color TEXT DEFAULT '#4aa8e8',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
);

-- Comments
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL,
  author_id TEXT,
  author_name TEXT DEFAULT 'Anonymous',
  text TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
);

-- Activity Log
CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY,
  card_id TEXT,
  board_id TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT DEFAULT '',
  actor_name TEXT DEFAULT 'System',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
);

-- AI Insights
CREATE TABLE IF NOT EXISTS ai_insights (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL,
  type TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
);

-- Digests
CREATE TABLE IF NOT EXISTS digests (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '{}',
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
);

-- Time Sessions (Active timers)
CREATE TABLE IF NOT EXISTS time_sessions (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL,
  user_id TEXT,
  start_time TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
);

-- Card Dependencies
CREATE TABLE IF NOT EXISTS card_dependencies (
  blocker_id TEXT NOT NULL,
  blocked_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (blocker_id, blocked_id),
  FOREIGN KEY (blocker_id) REFERENCES cards(id) ON DELETE CASCADE,
  FOREIGN KEY (blocked_id) REFERENCES cards(id) ON DELETE CASCADE
);
