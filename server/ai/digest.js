// ============================================
// ALPHA — AI Digest Generator
// ============================================
const db = require('../db/database');
const bottleneck = require('./bottleneck');

async function generate(boardId) {
  const board = db.getBoardFull(boardId);
  if (!board) return null;
  
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const completedCards = db.cardQueries.getCompletedByBoard.all(board.id);
  const completedThisWeek = completedCards.filter(c => new Date(c.completed_at) >= oneWeekAgo);
  
  // Calculate velocity trend (this week vs last week)
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const completedLastWeek = completedCards.filter(c => {
    const d = new Date(c.completed_at);
    return d >= twoWeeksAgo && d < oneWeekAgo;
  });
  
  const velocityChange = completedThisWeek.length - completedLastWeek.length;
  
  // Distribution
  const distribution = {};
  board.columns.forEach(c => {
    distribution[c.name] = {
      count: c.cards.length,
      color: c.color
    };
  });
  
  // Top Bottleneck
  const currentBottleneck = await bottleneck.analyze(board);
  
  const report = {
    completed_count: completedThisWeek.length,
    velocity_change: velocityChange,
    distribution,
    bottleneck: currentBottleneck,
    generated_at: now.toISOString()
  };
  
  return report;
}

module.exports = { generate };
