// ============================================
// ALPHA — AI Auto Assignment
// ============================================
const db = require('../db/database');
const llm = require('./llm');

async function recommendAssignee(boardId, cardId) {
  const board = db.getBoardFull(boardId);
  const card = db.getCardById(cardId);
  if (!board || !card) throw new Error('Board or Card not found');

  const members = db.getMembersByBoard(boardId);
  if (!members || members.length === 0) return null;

  // Calculate current workload
  const workloads = members.map(m => {
    let activeTasks = 0;
    board.columns.forEach(col => {
      // Assuming last column is "Done"
      if (col.position < board.columns.length - 1) {
        activeTasks += col.cards.filter(c => c.assignee === m.name).length;
      }
    });
    return { name: m.name, role: m.role, activeTasks };
  });

  const prompt = `
You are the Alpha AI Project Manager. Recommend the best assignee for a specific task.
Consider workload, roles, and task details.

Task: "${card.title}"
Description: "${card.description || ''}"
Labels: ${(card.labels || []).join(', ')}

Available Team Members:
${JSON.stringify(workloads)}

Output ONLY a valid JSON object:
{
  "recommendedAssignee": "Exact name of the recommended member from the list",
  "reason": "1-sentence explanation of why this person is best suited based on workload and role."
}
`;

  try {
    if (!llm.isConfigured()) {
      // Heuristic fallback
      workloads.sort((a, b) => a.activeTasks - b.activeTasks);
      return {
        recommendedAssignee: workloads[0].name,
        reason: 'Recommended based on having the lowest current workload.'
      };
    }

    const response = await llm.generate(prompt, {
      type: "object",
      properties: {
        recommendedAssignee: { type: "string" },
        reason: { type: "string" }
      },
      required: ["recommendedAssignee", "reason"]
    });
    return response;
  } catch (error) {
    console.error('Auto assign failed:', error);
    // Fallback heuristic
    workloads.sort((a, b) => a.activeTasks - b.activeTasks);
    return {
      recommendedAssignee: workloads[0].name,
      reason: 'Recommended based on having the lowest current workload (fallback).'
    };
  }
}

module.exports = {
  recommendAssignee
};
