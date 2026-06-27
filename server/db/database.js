// ============================================
// ALPHA — Database Module (SQLite via better-sqlite3)
// ============================================
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'alpha.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize schema
const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
db.exec(schema);

// ─── Helper ───
function generateId() {
  return uuidv4();
}

// ═══════════════════════════════════════
// USERS
// ═══════════════════════════════════════
const userQueries = {
  getByUsername: db.prepare('SELECT * FROM users WHERE username = ?'),
  getById: db.prepare('SELECT * FROM users WHERE id = ?'),
  create: db.prepare('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)')
};

function getUserByUsername(username) {
  return userQueries.getByUsername.get(username);
}

function getUserById(id) {
  return userQueries.getById.get(id);
}

function createUser(username, passwordHash) {
  const id = generateId();
  try {
    userQueries.create.run(id, username, passwordHash);
    return { id, username };
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw new Error('Username already exists');
    }
    throw err;
  }
}

// ═══════════════════════════════════════
// BOARDS
// ═══════════════════════════════════════
const boardQueries = {
  getAll: db.prepare('SELECT * FROM boards ORDER BY created_at DESC'),
  getById: db.prepare('SELECT * FROM boards WHERE id = ?'),
  create: db.prepare('INSERT INTO boards (id, name, sprint_end_date, is_public) VALUES (?, ?, ?, ?)'),
  update: db.prepare('UPDATE boards SET name = ?, sprint_end_date = ?, is_public = ? WHERE id = ?'),
  delete: db.prepare('DELETE FROM boards WHERE id = ?'),
};

function getAllBoards() {
  return boardQueries.getAll.all();
}

function getBoardById(id) {
  return boardQueries.getById.get(id);
}

function createBoard(name, sprintEndDate = null, template = 'default', isPublic = 0) {
  const id = generateId();
  boardQueries.create.run(id, name, sprintEndDate, isPublic);

  // Template Columns
  let columns = [];
  if (template === 'software') {
    columns = [
      { name: 'Backlog', color: 'backlog' },
      { name: 'To Do', color: 'todo' },
      { name: 'In Progress', color: 'in-progress' },
      { name: 'Review', color: 'review' },
      { name: 'Done', color: 'done' },
    ];
  } else if (template === 'content') {
    columns = [
      { name: 'Ideas', color: 'backlog' },
      { name: 'Writing', color: 'todo' },
      { name: 'Editing', color: 'in-progress' },
      { name: 'Scheduled', color: 'review' },
      { name: 'Published', color: 'done' },
    ];
  } else if (template === 'roadmap') {
    columns = [
      { name: 'Later', color: 'backlog' },
      { name: 'Next', color: 'todo' },
      { name: 'Now', color: 'in-progress' },
      { name: 'Done', color: 'done' },
    ];
  } else {
    // Default
    columns = [
      { name: 'Backlog', color: 'backlog' },
      { name: 'To Do', color: 'todo' },
      { name: 'In Progress', color: 'in-progress' },
      { name: 'Review', color: 'review' },
      { name: 'Done', color: 'done' },
    ];
  }

  columns.forEach((col, i) => {
    columnQueries.create.run(generateId(), id, col.name, i, col.color);
  });

  return getBoardFull(id);
}

function updateBoard(id, name, sprintEndDate, isPublic) {
  const existing = getBoardById(id);
  if (!existing) return null;
  boardQueries.update.run(
    name ?? existing.name, 
    sprintEndDate !== undefined ? sprintEndDate : existing.sprint_end_date, 
    isPublic !== undefined ? (isPublic ? 1 : 0) : existing.is_public,
    id
  );
  return getBoardById(id);
}

function deleteBoard(id) {
  boardQueries.delete.run(id);
}

function getBoardFull(boardId) {
  const board = getBoardById(boardId);
  if (!board) return null;

  const columns = getColumnsByBoard(boardId);
  const cards = getCardsByBoard(boardId);
  const members = getMembersByBoard(boardId);

  // Organize cards into columns
  const columnsWithCards = columns.map(col => ({
    ...col,
    cards: cards
      .filter(c => c.column_id === col.id)
      .sort((a, b) => a.position - b.position),
  }));

  return {
    ...board,
    columns: columnsWithCards,
    members,
  };
}

// ═══════════════════════════════════════
// COLUMNS
// ═══════════════════════════════════════
const columnQueries = {
  getByBoard: db.prepare('SELECT * FROM columns WHERE board_id = ? ORDER BY position'),
  getById: db.prepare('SELECT * FROM columns WHERE id = ?'),
  create: db.prepare('INSERT INTO columns (id, board_id, name, position, color) VALUES (?, ?, ?, ?, ?)'),
  update: db.prepare('UPDATE columns SET name = ?, position = ? WHERE id = ?'),
  delete: db.prepare('DELETE FROM columns WHERE id = ?'),
};

function getColumnsByBoard(boardId) {
  return columnQueries.getByBoard.all(boardId);
}

function getColumnById(id) {
  return columnQueries.getById.get(id);
}

// ═══════════════════════════════════════
// CARDS
// ═══════════════════════════════════════
const cardQueries = {
  getByBoard: db.prepare('SELECT * FROM cards WHERE board_id = ? ORDER BY position'),
  getByColumn: db.prepare('SELECT * FROM cards WHERE column_id = ? ORDER BY position'),
  getById: db.prepare('SELECT * FROM cards WHERE id = ?'),
  create: db.prepare(`INSERT INTO cards (id, column_id, board_id, title, description, assignee_id, complexity, position, labels, reference_url, milestone)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
  update: db.prepare(`UPDATE cards SET title = ?, description = ?, assignee_id = ?, complexity = ?, complexity_accepted = ?,
                       labels = ?, reference_url = ?, milestone = ?, updated_at = datetime('now') WHERE id = ?`),
  move: db.prepare(`UPDATE cards SET column_id = ?, position = ?, updated_at = datetime('now') WHERE id = ?`),
  updatePosition: db.prepare(`UPDATE cards SET position = ?, updated_at = datetime('now') WHERE id = ?`),
  delete: db.prepare('DELETE FROM cards WHERE id = ?'),
  getMaxPosition: db.prepare('SELECT COALESCE(MAX(position), -1) as max_pos FROM cards WHERE column_id = ?'),
  getByGithubIssue: db.prepare('SELECT * FROM cards WHERE github_issue_id = ? AND github_repo = ?'),
  createGithub: db.prepare(`INSERT INTO cards (id, column_id, board_id, title, description, assignee_id, complexity, position, labels, github_issue_id, github_repo, milestone)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
  getCompletedByBoard: db.prepare(`SELECT c.*, al.created_at as completed_at FROM cards c
                                    JOIN activity_log al ON al.card_id = c.id AND al.action = 'card-moved-to-done'
                                    WHERE c.board_id = ? ORDER BY al.created_at DESC`),
  getByAssignee: db.prepare('SELECT * FROM cards WHERE assignee_id = ? AND board_id = ?'),
};

const dependencyQueries = {
  add: db.prepare('INSERT OR IGNORE INTO card_dependencies (blocker_id, blocked_id) VALUES (?, ?)'),
  remove: db.prepare('DELETE FROM card_dependencies WHERE blocker_id = ? AND blocked_id = ?'),
  getByBoard: db.prepare(`SELECT cd.* FROM card_dependencies cd 
                          JOIN cards c ON cd.blocked_id = c.id 
                          WHERE c.board_id = ?`),
  getBlockers: db.prepare('SELECT blocker_id FROM card_dependencies WHERE blocked_id = ?'),
  getBlocked: db.prepare('SELECT blocked_id FROM card_dependencies WHERE blocker_id = ?')
};

function getCardsByBoard(boardId) {
  const cards = cardQueries.getByBoard.all(boardId);
  const deps = dependencyQueries.getByBoard.all(boardId);
  
  // Attach blockers to cards
  return cards.map(c => {
    c.labels = JSON.parse(c.labels || '[]');
    c.blockers = deps.filter(d => d.blocked_id === c.id).map(d => d.blocker_id);
    return c;
  });
}

function getCardById(id) {
  const card = cardQueries.getById.get(id);
  if (card) {
    card.labels = JSON.parse(card.labels || '[]');
    card.blockers = dependencyQueries.getBlockers.all(id).map(d => d.blocker_id);
  }
  return card;
}

function createCard(columnId, boardId, title, description = '', assigneeId = null, labels = [], referenceUrl = '') {
  const id = generateId();
  const maxPos = cardQueries.getMaxPosition.get(columnId).max_pos;
  cardQueries.create.run(id, columnId, boardId, title, description, assigneeId, null, maxPos + 1, JSON.stringify(labels), referenceUrl, null);

  // Log activity
  logActivity(id, boardId, 'card-created', `Card "${title}" created`);

  return getCardById(id);
}

function updateCard(id, data) {
  const existing = cardQueries.getById.get(id);
  if (!existing) return null;

  const title = data.title ?? existing.title;
  const description = data.description ?? existing.description;
  const assigneeId = data.assignee_id !== undefined ? (data.assignee_id === '' ? null : data.assignee_id) : existing.assignee_id;
  const complexity = data.complexity !== undefined ? data.complexity : existing.complexity;
  const complexityAccepted = data.complexity_accepted !== undefined ? data.complexity_accepted : existing.complexity_accepted;
  const labels = data.labels !== undefined ? JSON.stringify(data.labels) : existing.labels;
  const referenceUrl = data.reference_url ?? existing.reference_url;
  const milestone = data.milestone !== undefined ? data.milestone : existing.milestone;

  cardQueries.update.run(title, description, assigneeId, complexity, complexityAccepted, labels, referenceUrl, milestone, id);

  if (data.title && data.title !== existing.title) {
    logActivity(id, existing.board_id, 'card-updated', `Title changed to "${data.title}"`);
  }
  if (data.description !== undefined && data.description !== existing.description) {
    logActivity(id, existing.board_id, 'card-updated', 'Description updated');
  }

  // Update dependencies if provided
  if (data.blockers !== undefined) {
    // Clear old blockers
    db.prepare('DELETE FROM card_dependencies WHERE blocked_id = ?').run(id);
    // Add new blockers
    data.blockers.forEach(blockerId => {
      dependencyQueries.add.run(blockerId, id);
    });
  }

  return getCardById(id);
}

function moveCard(id, newColumnId, newPosition) {
  const existing = cardQueries.getById.get(id);
  if (!existing) return null;

  const oldColumn = getColumnById(existing.column_id);
  const newColumn = getColumnById(newColumnId);

  cardQueries.move.run(newColumnId, newPosition, id);

  // Reorder cards in old and new columns
  reorderColumn(existing.column_id);
  if (existing.column_id !== newColumnId) {
    reorderColumn(newColumnId);
  }

  if (oldColumn && newColumn && oldColumn.id !== newColumn.id) {
    logActivity(id, existing.board_id, 'card-moved', `Moved from "${oldColumn.name}" to "${newColumn.name}"`);

    if (newColumn.color === 'done') {
      logActivity(id, existing.board_id, 'card-moved-to-done', `Completed in "${newColumn.name}"`);
    }
  }

  return getCardById(id);
}

function reorderColumn(columnId) {
  const cards = cardQueries.getByColumn.all(columnId);
  cards.sort((a, b) => a.position - b.position);
  cards.forEach((card, i) => {
    if (card.position !== i) {
      cardQueries.updatePosition.run(i, card.id);
    }
  });
}

function deleteCard(id) {
  const card = cardQueries.getById.get(id);
  if (card) {
    logActivity(null, card.board_id, 'card-deleted', `Card "${card.title}" deleted`);
  }
  cardQueries.delete.run(id);
}

// ═══════════════════════════════════════
// TIME TRACKING
// ═══════════════════════════════════════
const timeQueries = {
  start: db.prepare('INSERT INTO time_sessions (id, card_id, user_id) VALUES (?, ?, ?)'),
  stop: db.prepare('DELETE FROM time_sessions WHERE card_id = ? AND user_id = ? RETURNING start_time'),
  getActive: db.prepare('SELECT * FROM time_sessions WHERE card_id = ?'),
  addTime: db.prepare('UPDATE cards SET time_spent = time_spent + ? WHERE id = ?'),
};

function startTimer(cardId, userId) {
  timeQueries.start.run(generateId(), cardId, userId || 'anonymous');
}

function stopTimer(cardId, userId) {
  const session = timeQueries.stop.get(cardId, userId || 'anonymous');
  if (session) {
    const elapsedSeconds = Math.floor((new Date() - new Date(session.start_time)) / 1000);
    timeQueries.addTime.run(elapsedSeconds, cardId);
  }
  return getCardById(cardId);
}

function getActiveTimers(cardId) {
  return timeQueries.getActive.all(cardId);
}

// ═══════════════════════════════════════
// TEAM MEMBERS
// ═══════════════════════════════════════
const memberQueries = {
  getByBoard: db.prepare('SELECT * FROM team_members WHERE board_id = ? ORDER BY created_at'),
  getById: db.prepare('SELECT * FROM team_members WHERE id = ?'),
  getByGithubUsername: db.prepare('SELECT * FROM team_members WHERE board_id = ? AND github_username = ?'),
  create: db.prepare('INSERT INTO team_members (id, board_id, name, github_username, avatar_color) VALUES (?, ?, ?, ?, ?)'),
  update: db.prepare('UPDATE team_members SET name = ?, github_username = ? WHERE id = ?'),
  delete: db.prepare('DELETE FROM team_members WHERE id = ?'),
};

const AVATAR_COLORS = ['#4aa8e8', '#64B5F6', '#4CAF50', '#FFB74D', '#EF5350', '#9575CD', '#4DB6AC', '#FF8A65', '#7986CB', '#AED581'];

function getMembersByBoard(boardId) {
  return memberQueries.getByBoard.all(boardId);
}

function getMemberById(id) {
  return memberQueries.getById.get(id);
}

function createMember(boardId, name, githubUsername = '') {
  const id = generateId();
  const existingCount = getMembersByBoard(boardId).length;
  const color = AVATAR_COLORS[existingCount % AVATAR_COLORS.length];
  memberQueries.create.run(id, boardId, name, githubUsername, color);
  return memberQueries.getById.get(id);
}

function deleteMember(id) {
  memberQueries.delete.run(id);
}

// ═══════════════════════════════════════
// COMMENTS
// ═══════════════════════════════════════
const commentQueries = {
  getByCard: db.prepare('SELECT * FROM comments WHERE card_id = ? ORDER BY created_at ASC'),
  create: db.prepare('INSERT INTO comments (id, card_id, author_id, author_name, text) VALUES (?, ?, ?, ?, ?)'),
};

function getCommentsByCard(cardId) {
  return commentQueries.getByCard.all(cardId);
}

function createComment(cardId, authorName, text) {
  const id = generateId();
  commentQueries.create.run(id, cardId, null, authorName, text);

  const card = cardQueries.getById.get(cardId);
  if (card) {
    logActivity(cardId, card.board_id, 'comment-added', `${authorName} commented`);
  }

  return commentQueries.getByCard.all(cardId).pop();
}

// ═══════════════════════════════════════
// ACTIVITY LOG
// ═══════════════════════════════════════
const activityQueries = {
  getByCard: db.prepare('SELECT * FROM activity_log WHERE card_id = ? ORDER BY created_at DESC LIMIT 50'),
  getByBoard: db.prepare('SELECT * FROM activity_log WHERE board_id = ? ORDER BY created_at DESC LIMIT 100'),
  getByBoardSince: db.prepare('SELECT * FROM activity_log WHERE board_id = ? AND created_at >= ? ORDER BY created_at DESC'),
  create: db.prepare('INSERT INTO activity_log (id, card_id, board_id, action, details, actor_name) VALUES (?, ?, ?, ?, ?, ?)'),
};

function logActivity(cardId, boardId, action, details, actorName = 'System') {
  activityQueries.create.run(generateId(), cardId, boardId, action, details, actorName);
}

function getActivityByCard(cardId) {
  return activityQueries.getByCard.all(cardId);
}

function getActivityByBoard(boardId) {
  return activityQueries.getByBoard.all(boardId);
}

function getActivityByBoardSince(boardId, sinceDate) {
  return activityQueries.getByBoardSince.all(boardId, sinceDate);
}

// ═══════════════════════════════════════
// AI INSIGHTS
// ═══════════════════════════════════════
const insightQueries = {
  getByBoard: db.prepare('SELECT * FROM ai_insights WHERE board_id = ? ORDER BY created_at DESC LIMIT 20'),
  create: db.prepare('INSERT INTO ai_insights (id, board_id, type, data) VALUES (?, ?, ?, ?)'),
  deleteOld: db.prepare("DELETE FROM ai_insights WHERE board_id = ? AND created_at < datetime('now', '-7 days')"),
};

function getInsightsByBoard(boardId) {
  return insightQueries.getByBoard.all(boardId).map(i => ({
    ...i,
    data: JSON.parse(i.data),
  }));
}

function createInsight(boardId, type, data) {
  const id = generateId();
  insightQueries.create.run(id, boardId, type, JSON.stringify(data));
  return { id, board_id: boardId, type, data, created_at: new Date().toISOString() };
}

// ═══════════════════════════════════════
// DIGESTS
// ═══════════════════════════════════════
const digestQueries = {
  getLatest: db.prepare('SELECT * FROM digests WHERE board_id = ? ORDER BY created_at DESC LIMIT 1'),
  create: db.prepare('INSERT INTO digests (id, board_id, data, period_start, period_end) VALUES (?, ?, ?, ?, ?)'),
};

function getLatestDigest(boardId) {
  const digest = digestQueries.getLatest.get(boardId);
  if (digest) digest.data = JSON.parse(digest.data);
  return digest;
}

function createDigest(boardId, data, periodStart, periodEnd) {
  const id = generateId();
  digestQueries.create.run(id, boardId, JSON.stringify(data), periodStart, periodEnd);
  return { id, board_id: boardId, data, period_start: periodStart, period_end: periodEnd };
}

// ═══════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════
module.exports = {
  db,
  generateId,
  // Users
  getUserByUsername,
  getUserById,
  createUser,
  // Boards
  getAllBoards,
  getBoardById,
  createBoard,
  updateBoard,
  deleteBoard,
  getBoardFull,
  // Columns
  getColumnsByBoard,
  getColumnById,
  // Cards
  getCardsByBoard,
  getCardById,
  createCard,
  updateCard,
  moveCard,
  deleteCard,
  cardQueries,
  // Members
  getMembersByBoard,
  getMemberById,
  createMember,
  deleteMember,
  memberQueries,
  // Comments
  getCommentsByCard,
  createComment,
  // Activity
  logActivity,
  getActivityByCard,
  getActivityByBoard,
  getActivityByBoardSince,
  // AI
  getInsightsByBoard,
  createInsight,
  getLatestDigest,
  createDigest,
  startTimer,
  stopTimer,
  getActiveTimers,
};
