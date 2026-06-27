// ============================================
// ALPHA — AI Streaming Analysis
// ============================================
const db = require('../db/database');
const llm = require('./llm');
const { v4: uuidv4 } = require('uuid');

async function runStreamingAnalysis(boardId, io) {
  const board = db.getBoardFull(boardId);
  if (!board) return;

  const streamId = uuidv4();

  // Send initial event
  if (io) {
    io.to(boardId).emit('ai-stream-start', { streamId, boardId });
  }

  const columnStats = {};
  board.columns.forEach(col => {
    columnStats[col.id] = { name: col.name, current: col.cards.length };
  });

  const prompt = `
You are the Alpha AI Project Manager. Provide a concise, high-level brainstorming review of this Kanban board.
Identify any clear bottlenecks or sprint risks in 2-3 sentences.
Use plain text markdown. Do NOT use JSON.

Board Data:
Columns: ${JSON.stringify(Object.values(columnStats))}
`;

  try {
    let fullText = '';
    
    // Simulate streaming if rate-limited, otherwise use real streaming
    if (!llm.isConfigured()) {
      const demoChunks = ["The board looks healthy. ", "However, ", "there is a slight pileup in the Review column. ", "I recommend assigning more people to reviews."];
      for (const chunk of demoChunks) {
        fullText += chunk;
        if (io) {
          io.to(boardId).emit('ai-stream-chunk', { streamId, chunk, textSoFar: fullText });
        }
        await new Promise(r => setTimeout(r, 400));
      }
    } else {
      try {
        fullText = await llm.generateStream(prompt, (chunk) => {
          if (io) {
            io.to(boardId).emit('ai-stream-chunk', { streamId, chunk, textSoFar: fullText + chunk });
          }
        });
      } catch(e) {
        console.error("AI stream error, falling back to mock:", e.message);
        fullText = "*(Demo Fallback - API Limit Reached)*\n\n";
        const demoChunks = ["The board looks generally healthy. ", "However, ", "there is a slight pileup in the Review column. ", "I recommend assigning more people to reviews to clear the bottleneck."];
        for (const chunk of demoChunks) {
          fullText += chunk;
          if (io) {
            io.to(boardId).emit('ai-stream-chunk', { streamId, chunk, textSoFar: fullText });
          }
          await new Promise(r => setTimeout(r, 400));
        }
      }
    }

    // Save as an insight once finished
    const insightData = {
      severity: 'medium',
      message: fullText,
      recommendation: ''
    };
    const insight = db.createInsight(boardId, 'brainstorm', insightData);

    if (io) {
      io.to(boardId).emit('ai-stream-done', { streamId, insight });
      io.to(boardId).emit('ai-insight-new', insight);
    }
  } catch (err) {
    console.error('Streaming failed:', err);
    if (io) io.to(boardId).emit('ai-stream-error', { streamId, error: err.message });
  }
}

module.exports = {
  runStreamingAnalysis
};
