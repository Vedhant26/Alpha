// ============================================
// ALPHA — AI Project Manager Scheduler
// ============================================

const cron = require('node-cron');
const db = require('../db/database');
const bottleneck = require('./bottleneck');
const sprintRisk = require('./sprintRisk');
const complexity = require('./complexity');
const digest = require('./digest');

let ioInstance = null;

function startScheduler(io) {
  ioInstance = io;
  
  // Run every 6 hours by default: 0 */6 * * *
  cron.schedule('0 */6 * * *', async () => {
    console.log('[AI] Running scheduled background analysis...');
    const boards = db.getAllBoards();
    for (const board of boards) {
      await runFullAnalysis(board.id, io);
    }
  });
}

async function runFullAnalysis(boardId, io) {
  console.log(`[AI] Analyzing board ${boardId}`);
  const board = db.getBoardFull(boardId);
  if (!board) return;

  const results = {};

  // 1. Bottleneck Detection
  const bottleneckResult = await bottleneck.analyze(board);
  if (bottleneckResult) {
    const insight = db.createInsight(boardId, 'bottleneck', bottleneckResult);
    if (io) io.to(boardId).emit('ai-insight-new', insight);
    results.bottleneck = bottleneckResult;
  }

  // 2. Sprint Risk Assessment
  if (board.sprint_end_date) {
    const riskResult = await sprintRisk.analyze(board);
    if (riskResult) {
      const insight = db.createInsight(boardId, 'risk', riskResult);
      if (io) io.to(boardId).emit('ai-insight-new', insight);
      results.risk = riskResult;
    }
  }

  // 3. Weekly Digest
  const digestResult = await digest.generate(boardId);
  if (digestResult) {
    const now = new Date();
    const periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    db.createDigest(boardId, digestResult, periodStart, now.toISOString());
    results.digest = digestResult;
  }
  
  // Cleanup old insights (keep last 7 days)
  db.insightQueries.deleteOld.run(boardId);

  return results;
}

module.exports = {
  startScheduler,
  runFullAnalysis,
  // Export complexity separately so it can be called synchronously on card creation
  inferComplexity: complexity.infer
};
