// ============================================
// ALPHA — Team Member Routes
// ============================================
const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/teams/:boardId/members
router.get('/:boardId/members', (req, res) => {
  try {
    const members = db.getMembersByBoard(req.params.boardId);
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/teams/:boardId/members — add member
router.post('/:boardId/members', (req, res) => {
  try {
    const { name, github_username } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const member = db.createMember(req.params.boardId, name, github_username || '');
    res.status(201).json(member);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/teams/members/:id
router.delete('/members/:id', (req, res) => {
  try {
    db.deleteMember(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/teams/:boardId/stats — team stats for team view
router.get('/:boardId/stats', (req, res) => {
  try {
    const members = db.getMembersByBoard(req.params.boardId);
    const cards = db.getCardsByBoard(req.params.boardId);
    const columns = db.getColumnsByBoard(req.params.boardId);
    const doneColumnIds = columns.filter(c => c.color === 'done').map(c => c.id);
    const inProgressColumnIds = columns.filter(c => c.color === 'in-progress').map(c => c.id);

    const stats = members.map(member => {
      const memberCards = cards.filter(c => c.assignee_id === member.id);
      const completedCards = memberCards.filter(c => doneColumnIds.includes(c.column_id));
      const wipCards = memberCards.filter(c => inProgressColumnIds.includes(c.column_id));
      const totalAssigned = memberCards.length;

      // Label specialisation
      const labelCounts = {};
      memberCards.forEach(c => {
        const labels = JSON.parse(c.labels || '[]');
        labels.forEach(l => {
          labelCounts[l] = (labelCounts[l] || 0) + 1;
        });
      });
      const topLabels = Object.entries(labelCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([label, count]) => ({ label, count }));

      return {
        ...member,
        total_assigned: totalAssigned,
        completed: completedCards.length,
        completion_rate: totalAssigned > 0 ? Math.round((completedCards.length / totalAssigned) * 100) : 0,
        wip: wipCards.map(c => ({ id: c.id, title: c.title })),
        wip_count: wipCards.length,
        top_labels: topLabels,
      };
    });

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
