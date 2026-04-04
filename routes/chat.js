const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { runChatLoop } = require('../ai/chat');

// POST /api/chat
router.post('/', async (req, res) => {
  const { message, session_id } = req.body;
  if (!message || !session_id) {
    return res.status(400).json({ error: 'message and session_id required' });
  }
  try {
    const result = await runChatLoop(session_id, message);
    res.json(result);
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/chat/saved-charts
router.get('/saved-charts', (req, res) => {
  const db = getDb();
  const charts = db.prepare('SELECT * FROM saved_charts ORDER BY created_at DESC').all();
  res.json(charts);
});

// GET /api/chat/history/:sessionId
router.get('/history/:sessionId', (req, res) => {
  const db = getDb();
  const history = db.prepare(
    'SELECT role, content, created_at FROM conversation_history WHERE session_id = ? ORDER BY created_at ASC'
  ).all(req.params.sessionId);
  res.json(history);
});

module.exports = router;
