// ============================================
// ALPHA — GitHub Routes
// ============================================
const express = require('express');
const router = express.Router();
const github = require('../scraper/github');
const db = require('../db/database');

// POST /api/github/preview — preview issues before importing
router.post('/preview', async (req, res) => {
  try {
    const { repo_url } = req.body;
    if (!repo_url) return res.status(400).json({ error: 'Repository URL is required' });
    
    const data = await github.fetchAllOpenIssues(repo_url);
    res.json({
      repo: data.repoString,
      count: data.issues.length,
      sample: data.issues.slice(0, 5) // Send top 5 for preview
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/github/import — run the import
router.post('/import', async (req, res) => {
  try {
    const { board_id, repo_url, target_column_id } = req.body;
    
    if (!board_id || !repo_url) {
      return res.status(400).json({ error: 'board_id and repo_url are required' });
    }
    
    // Default to first column (Backlog) if none specified
    let colId = target_column_id;
    if (!colId) {
      const cols = db.getColumnsByBoard(board_id);
      if (cols.length > 0) colId = cols[0].id;
      else return res.status(400).json({ error: 'Board has no columns' });
    }
    
    const result = await github.importIssuesToBoard(board_id, repo_url, colId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
