// ============================================
// ALPHA — Board Routes
// ============================================
const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/boards — list all boards
router.get('/', (req, res) => {
  try {
    const boards = db.getAllBoards();
    res.json(boards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/boards/:id — get full board with columns, cards, members
router.get('/:id', (req, res) => {
  try {
    const board = db.getBoardFull(req.params.id);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    res.json(board);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/boards — create board
router.post('/', (req, res) => {
  try {
    const { name, sprint_end_date, template, is_public } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const board = db.createBoard(name, sprint_end_date, template || 'default', is_public || 0);
    res.status(201).json(board);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/boards/:id — update board
router.put('/:id', (req, res) => {
  try {
    const { name, sprint_end_date, is_public } = req.body;
    const board = db.updateBoard(req.params.id, name, sprint_end_date, is_public);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    res.json(board);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/boards/:id
router.delete('/:id', (req, res) => {
  try {
    db.deleteBoard(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
