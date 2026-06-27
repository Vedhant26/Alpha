// ============================================
// ALPHA — AI Bottleneck Detection
// ============================================
const db = require('../db/database');
const llm = require('./llm');

async function analyze(board) {
  const activity = db.getActivityByBoardSince(board.id, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
  
  const columnStats = {};
  board.columns.forEach(col => {
    columnStats[col.id] = { name: col.name, arrivals: 0, departures: 0, current: col.cards.length };
  });

  // Calculate dependency chains locally to feed to LLM
  const allCards = [];
  board.columns.forEach(c => allCards.push(...c.cards));
  const blockersInfo = allCards.map(c => {
    const blockedCount = allCards.filter(other => (other.blockers || []).includes(c.id)).length;
    return { id: c.id, title: c.title, blockedCount, column: board.columns.find(col => col.id === c.column_id)?.name };
  }).filter(c => c.blockedCount > 0);

  // If no activity and LLM not configured, fall back to simple heuristic
  if (activity.length === 0 && !llm.isConfigured()) {
    return analyzeHeuristic(board, columnStats);
  }

  if (llm.isConfigured()) {
    const prompt = `
You are the Alpha AI Project Manager. Analyze the following Kanban board data and identify the biggest bottleneck.
A bottleneck is a stage where work is piling up, a person is overloaded, or a task blocks many others.
If there are no clear bottlenecks and the board flows well, return null.

Board Data:
Columns: ${JSON.stringify(Object.values(columnStats))}
Blockers Info: ${JSON.stringify(blockersInfo)}
Recent Activity Count: ${activity.length}

Output ONLY a valid JSON object with the following schema, or 'null' if no bottleneck:
{
  "columnId": "the ID of the bottlenecked column (if any)",
  "columnName": "name of the column",
  "severity": "low, medium, or high",
  "cause": "short phrase describing the cause",
  "message": "A clear, 1-2 sentence explanation",
  "recommendation": "1 sentence actionable recommendation"
}
`;
    try {
      const response = await llm.generate(prompt, {
        type: "object",
        properties: {
          columnId: { type: "string" },
          columnName: { type: "string" },
          severity: { type: "string", enum: ["low", "medium", "high"] },
          cause: { type: "string" },
          message: { type: "string" },
          recommendation: { type: "string" }
        },
        required: ["columnName", "severity", "cause", "message", "recommendation"]
      });
      
      if (!response || !response.columnName) return null;
      
      // Attempt to map back the column ID if LLM didn't get it
      let colId = response.columnId;
      if (!colId) {
        const found = board.columns.find(c => c.name.toLowerCase() === response.columnName.toLowerCase());
        if (found) colId = found.id;
      }
      response.columnId = colId || board.columns[0]?.id;

      return response;
    } catch (err) {
      console.error('[AI] Bottleneck LLM failed, falling back.', err);
    }
  }

  return analyzeHeuristic(board, columnStats);
}

function analyzeHeuristic(board, columnStats) {
  let bottleneckCol = null;
  let maxCards = 0;
  
  board.columns.forEach(col => {
    if (col.color !== 'done' && col.color !== 'backlog') {
      if (col.cards.length > maxCards && col.cards.length >= 3) {
        maxCards = col.cards.length;
        bottleneckCol = col;
      }
    }
  });
  
  if (bottleneckCol) {
    return {
      columnId: bottleneckCol.id,
      columnName: bottleneckCol.name,
      severity: maxCards > 5 ? 'high' : 'medium',
      cause: 'Accumulation',
      message: `The "${bottleneckCol.name}" column is accumulating cards. There are ${maxCards} items waiting here.`,
      recommendation: `Consider swarming on "${bottleneckCol.name}" to clear the queue before pulling new work.`
    };
  }
  return null;
}

module.exports = { analyze };
