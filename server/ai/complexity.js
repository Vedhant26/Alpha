// ============================================
// ALPHA — AI Task Complexity Inference
// ============================================

const llm = require('./llm');

async function infer(title, description = '', labels = []) {
  if (!llm.isConfigured()) {
    return inferHeuristic(title, description, labels);
  }

  const prompt = `
You are an expert Agile Project Manager.
Estimate the complexity of the following task on a scale of 1 to 5 story points.
1: Trivial (typo fix, small text change)
2: Easy (small component update)
3: Medium (new endpoint, medium feature)
4: Hard (complex feature, architecture change)
5: Epic (major migration, large epic)

Task Title: ${title}
Task Description: ${description}
Labels: ${labels.join(', ')}

Output ONLY a JSON object exactly like this:
{
  "score": <number between 1 and 5>
}
  `;

  try {
    const response = await llm.generate(prompt, {
      type: "object",
      properties: { score: { type: "integer", description: "Complexity score from 1 to 5" } },
      required: ["score"]
    });
    let score = parseInt(response.score);
    return Math.max(1, Math.min(5, isNaN(score) ? 1 : score));
  } catch (err) {
    console.error('[AI] Complexity Inference failed, falling back to heuristic.', err);
    return inferHeuristic(title, description, labels);
  }
}

function inferHeuristic(title, description, labels) {
  let score = 1;
  const text = (title + ' ' + description).toLowerCase();
  
  const complexKeywords = ['architecture', 'refactor', 'database', 'migration', 'auth', 'oauth', 'payment', 'integration', 'pipeline', 'infrastructure', 'websocket'];
  const mediumKeywords = ['api', 'endpoint', 'component', 'modal', 'form', 'state', 'crud', 'design', 'review'];
  const simpleKeywords = ['typo', 'color', 'padding', 'margin', 'copy', 'text', 'link', 'update', 'fix'];
  
  let complexCount = 0;
  complexKeywords.forEach(kw => { if (text.includes(kw)) complexCount++; });
  
  let mediumCount = 0;
  mediumKeywords.forEach(kw => { if (text.includes(kw)) mediumCount++; });
  
  let simpleCount = 0;
  simpleKeywords.forEach(kw => { if (text.includes(kw)) simpleCount++; });
  
  if (complexCount >= 2) score = 5;
  else if (complexCount === 1) score = 3;
  else if (mediumCount >= 2) score = 3;
  else if (mediumCount === 1) score = 2;
  
  if (simpleCount > 0 && score > 3) score -= 1;
  if (description.length > 500 && score < 5) score += 1;
  if (description.length < 50 && score > 1 && complexCount === 0) score -= 1;
  
  const labelStr = labels.join(' ').toLowerCase();
  if (labelStr.includes('bug') && score > 3) score -= 1;
  if (labelStr.includes('epic') || labelStr.includes('feature')) score = Math.max(score, 3);
  
  return Math.max(1, Math.min(5, score));
}

module.exports = { infer };
