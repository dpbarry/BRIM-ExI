const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { runChatLoop } = require('../ai/chat');
const { getChartSignature } = require('../utils/chart-signature');

// POST /api/chat
router.post('/', async (req, res) => {
  const { message, session_id } = req.body;
  if (!message || !session_id) {
    return res.status(400).json({ error: 'message and session_id required' });
  }
  if (message.length > 4000) return res.status(400).json({ error: 'Message too long (max 4000 characters).' });
  try {
    const result = await runChatLoop(session_id, message);
    res.json(result);
  } catch (err) {
    console.error('Chat error:', err);
    const msg = err?.message || '';
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'Server is missing ANTHROPIC_API_KEY.' });
    }
    if (/credit|billing|authentication|api key|unauthorized|forbidden/i.test(msg)) {
      return res.status(500).json({ error: `AI request failed: ${msg}` });
    }
    res.status(500).json({ error: `An error occurred processing your request: ${msg || 'Unknown error'}` });
  }
});

// GET /api/chat/saved-charts
router.get('/saved-charts', (req, res) => {
  const db = getDb();
  const charts = db.prepare('SELECT * FROM saved_charts ORDER BY created_at DESC').all();
  res.json(charts);
});

// POST /api/chat/saved-charts
router.post('/saved-charts', (req, res) => {
  const { title, original_query, chart_config_json, ai_response } = req.body;
  if (!title || !chart_config_json) return res.status(400).json({ error: 'title and chart_config_json required' });
  const db = getDb();
  const incomingSignature = getChartSignature(original_query || title, chart_config_json);
  const existing = db.prepare('SELECT id, title, original_query, chart_config_json FROM saved_charts').all()
    .find((row) => getChartSignature(row.original_query || row.title, row.chart_config_json) === incomingSignature);
  if (existing) {
    return res.json({ saved: true, id: existing.id, alreadySaved: true });
  }
  const r = db.prepare(
    'INSERT INTO saved_charts (title, original_query, chart_config_json, ai_response) VALUES (?, ?, ?, ?)'
  ).run(title, original_query || title, chart_config_json, ai_response || null);
  res.json({ saved: true, id: r.lastInsertRowid });
});

// DELETE /api/chat/saved-charts
router.delete('/saved-charts', (req, res) => {
  const { title, original_query, chart_config_json } = req.body || {};
  if (!chart_config_json) return res.status(400).json({ error: 'chart_config_json required' });
  const signature = getChartSignature(original_query || title, chart_config_json);
  const db = getDb();
  const matches = db.prepare('SELECT id, title, original_query, chart_config_json FROM saved_charts').all()
    .filter((row) => getChartSignature(row.original_query || row.title, row.chart_config_json) === signature);
  if (!matches.length) return res.json({ removed: true, count: 0 });
  const del = db.prepare('DELETE FROM saved_charts WHERE id = ?');
  const tx = db.transaction((ids) => ids.forEach((id) => del.run(id)));
  tx(matches.map((row) => row.id));
  res.json({ removed: true, count: matches.length });
});

// DELETE /api/chat/history/:sessionId
router.delete('/history/:sessionId', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM conversation_history WHERE session_id = ?').run(req.params.sessionId);
  res.json({ cleared: true });
});

// GET /api/chat/history/:sessionId
router.get('/history/:sessionId', (req, res) => {
  const db = getDb();
  const history = db.prepare(
    'SELECT role, content, chart_config, created_at FROM conversation_history WHERE session_id = ? ORDER BY created_at ASC'
  ).all(req.params.sessionId);
  res.json(history);
});

module.exports = router;
