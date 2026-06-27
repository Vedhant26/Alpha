// ============================================
// ALPHA — Card Routes
// ============================================
const express = require('express');
const router = express.Router();
const db = require('../db/database');

// POST /api/cards — create card
router.post('/', async (req, res) => {
  try {
    const { column_id, board_id, title, description, assignee_id, labels, reference_url } = req.body;
    if (!column_id || !board_id || !title) {
      return res.status(400).json({ error: 'column_id, board_id, and title are required' });
    }

    // Create card immediately — respond fast
    const card = db.createCard(column_id, board_id, title, description, assignee_id, labels, reference_url);
    res.status(201).json(card);

    // Fire-and-forget: AI complexity inference in background
    if (req.body.complexity === undefined) {
      setImmediate(async () => {
        try {
          const { infer } = require('../ai/complexity');
          const score = await infer(title, description || '', labels || []);
          if (score !== undefined) {
            db.cardQueries.update.run(card.title, card.description, card.assignee_id, score, 0, JSON.stringify(card.labels || []), card.reference_url, card.milestone || null, card.id);
            // Push update to connected clients via WebSocket
            const io = req.app.get('io');
            if (io) {
              const updated = db.getCardById(card.id);
              io.to(board_id).emit('card-updated', updated);
            }
          }
        } catch (err) {
          console.error('[AI] Background complexity inference failed:', err.message);
        }
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cards/:id — get card detail
router.get('/:id', (req, res) => {
  try {
    const card = db.getCardById(req.params.id);
    if (!card) return res.status(404).json({ error: 'Card not found' });

    const comments = db.getCommentsByCard(req.params.id);
    const activity = db.getActivityByCard(req.params.id);

    res.json({ ...card, comments, activity });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/cards/:id — update card
router.put('/:id', (req, res) => {
  try {
    const card = db.updateCard(req.params.id, req.body);
    if (!card) return res.status(404).json({ error: 'Card not found' });
    res.json(card);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/cards/:id/move — move card to new column/position
router.put('/:id/move', (req, res) => {
  try {
    const { column_id, position } = req.body;
    if (!column_id || position === undefined) {
      return res.status(400).json({ error: 'column_id and position are required' });
    }
    const card = db.moveCard(req.params.id, column_id, position);
    if (!card) return res.status(404).json({ error: 'Card not found' });
    res.json(card);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/cards/:id
router.delete('/:id', (req, res) => {
  try {
    db.deleteCard(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cards/:id/comments — add comment
router.post('/:id/comments', (req, res) => {
  try {
    const { author_name, text } = req.body;
    if (!text) return res.status(400).json({ error: 'Text is required' });
    const comment = db.createComment(req.params.id, author_name || 'Anonymous', text);
    res.status(201).json(comment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cards/:id/comments
router.get('/:id/comments', (req, res) => {
  try {
    const comments = db.getCommentsByCard(req.params.id);
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// POST /api/cards/:id/timer/start
router.post('/:id/timer/start', (req, res) => {
  try {
    const { user_id } = req.body;
    db.startTimer(req.params.id, user_id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cards/:id/timer/stop
router.post('/:id/timer/stop', (req, res) => {
  try {
    const { user_id } = req.body;
    const card = db.stopTimer(req.params.id, user_id);
    res.json(card);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cards/:id/timer
router.get('/:id/timer', (req, res) => {
  try {
    const timers = db.getActiveTimers(req.params.id);
    res.json(timers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
