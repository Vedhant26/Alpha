// ============================================
// ALPHA — AI Sprint Risk Assessment
// ============================================
const db = require('../db/database');
const llm = require('./llm');

async function analyze(board) {
  if (!board.sprint_end_date) return null;
  
  const end = new Date(board.sprint_end_date);
  const now = new Date();
  
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysRemaining = Math.max(0, Math.ceil((end - now) / msPerDay));
  
  if (daysRemaining === 0) {
    return { status: 'ended', message: 'Sprint has ended.' };
  }
  
  const doneColIds = board.columns.filter(c => c.color === 'done').map(c => c.id);
  
  let cardsRemaining = 0;
  board.columns.forEach(col => {
    if (!doneColIds.includes(col.id)) {
      cardsRemaining += col.cards.length;
    }
  });
  
  if (cardsRemaining === 0) {
    return {
      severity: 'low',
      risk_score: 0,
      message: 'All tasks completed ahead of schedule.',
      confidence: 'high'
    };
  }
  
  const completedCards = db.cardQueries.getCompletedByBoard.all(board.id);
  const recentCompleted = completedCards.filter(c => {
    const completedDate = new Date(c.completed_at);
    const ageInDays = (now - completedDate) / msPerDay;
    return ageInDays <= 14;
  });
  
  let velocityPerDay = recentCompleted.length / 14;
  if (velocityPerDay === 0) {
    velocityPerDay = Math.max(1, board.members.length * 0.5);
  }
  
  const expectedCapacity = velocityPerDay * daysRemaining;
  const ratio = cardsRemaining / expectedCapacity;

  if (llm.isConfigured()) {
    const prompt = `
You are the Alpha AI Project Manager assessing sprint risk.
Based on the following metrics, output a risk assessment.

Metrics:
Days Remaining: ${daysRemaining}
Cards Remaining: ${cardsRemaining}
Recent Velocity (cards/day): ${velocityPerDay.toFixed(2)}
Expected Capacity (velocity * days): ${expectedCapacity.toFixed(2)}
Ratio (Remaining / Capacity): ${ratio.toFixed(2)}

Output ONLY a valid JSON object with the following schema:
{
  "severity": "low, medium, or high",
  "risk_score": <number 0-100>,
  "message": "Clear 2 sentence summary of the risk to the sprint goal",
  "confidence": "low, medium, or high"
}
`;
    try {
      const response = await llm.generate(prompt, {
        type: "object",
        properties: {
          severity: { type: "string", enum: ["low", "medium", "high"] },
          risk_score: { type: "integer" },
          message: { type: "string" },
          confidence: { type: "string", enum: ["low", "medium", "high"] }
        },
        required: ["severity", "risk_score", "message", "confidence"]
      });

      return {
        ...response,
        velocity: velocityPerDay,
        cards_remaining: cardsRemaining,
        days_remaining: daysRemaining
      };
    } catch (err) {
      console.error('[AI] Risk Assessment LLM failed, falling back.', err);
    }
  }

  return analyzeHeuristic(ratio, velocityPerDay, cardsRemaining, daysRemaining, expectedCapacity, recentCompleted.length > 5 ? 'high' : 'low');
}

function analyzeHeuristic(ratio, velocityPerDay, cardsRemaining, daysRemaining, expectedCapacity, confidence) {
  let severity = 'low';
  let message = `On track to finish. At your velocity of ${velocityPerDay.toFixed(1)} cards/day, you have plenty of capacity for the remaining ${cardsRemaining} cards.`;
  
  if (ratio > 1.2) {
    severity = 'high';
    message = `High risk of missing deadline. You have ${cardsRemaining} cards left but historical velocity suggests you'll only finish ${Math.round(expectedCapacity)} in the remaining ${daysRemaining} days.`;
  } else if (ratio > 0.9) {
    severity = 'medium';
    message = `Moderate risk. You are trending very close to the deadline. Consider descoping non-critical items among the remaining ${cardsRemaining} tasks.`;
  }
  
  return {
    severity,
    risk_score: Math.round(ratio * 100),
    message,
    velocity: velocityPerDay,
    cards_remaining: cardsRemaining,
    days_remaining: daysRemaining,
    confidence
  };
}

module.exports = { analyze };
