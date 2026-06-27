// ============================================
// ALPHA — LLM Wrapper for Gemini API
// ============================================
const { GoogleGenAI, Type } = require('@google/genai');

let ai = null;

function getAI() {
  if (!ai && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return ai;
}

/**
 * Generate a response using Gemini 2.5 Flash
 * @param {string} prompt 
 * @param {Object} schema Optional JSON schema for structured output
 * @returns {Object|string} parsed JSON or string
 */
async function generate(prompt, schema = null) {
  const model = getAI();
  if (!model) {
    throw new Error('GEMINI_API_KEY is not set or invalid.');
  }

  try {
    const config = {
      systemInstruction: 'You are the Alpha Autonomous AI Project Manager. You analyze Kanban boards, identify bottlenecks, and infer task complexities. You answer concisely.',
    };

    if (schema) {
      config.responseMimeType = 'application/json';
      config.responseSchema = schema;
    }

    const response = await model.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: config
    });

    if (schema) {
      return JSON.parse(response.text);
    }
    return response.text;
  } catch (error) {
    console.error('[AI] Gemini generation failed:', error);
    throw error;
  }
}

/**
 * Stream a response using Gemini 2.5 Flash
 * @param {string} prompt 
 * @param {Function} onChunk Callback fired with each text chunk
 */
async function generateStream(prompt, onChunk) {
  const model = getAI();
  if (!model) {
    throw new Error('GEMINI_API_KEY is not set or invalid.');
  }

  try {
    const config = {
      systemInstruction: 'You are the Alpha Autonomous AI Project Manager. You analyze Kanban boards, identify bottlenecks, and infer task complexities. You answer concisely.',
    };

    const responseStream = await model.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: config
    });

    let fullText = '';
    for await (const chunk of responseStream) {
      if (chunk.text) {
        fullText += chunk.text;
        if (onChunk) onChunk(chunk.text);
      }
    }
    return fullText;
  } catch (error) {
    console.error('[AI] Gemini stream generation failed:', error);
    throw error;
  }
}

module.exports = {
  generate,
  generateStream,
  isConfigured: () => !!getAI()
};
