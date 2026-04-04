// routes/approvals.js
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { parseRequest, generateRecommendation } = require('../ai/approvals');
const { sendApprovalEmail } = require('../email');

function persistRecommendation(db, submissionId, recommendation) {
  try {
    db.prepare(`
      UPDATE submissions
      SET recommendation_text = ?, recommendation_updated_at = datetime('now')
      WHERE id = ?
    `).run(recommendation, submissionId);
    return;
  } catch {}

  // Backward-compatible fallback for pre-migration DBs.
  try {
    db.prepare(`UPDATE submissions SET note = ? WHERE id = ?`).run(recommendation, submissionId);
  } catch {}
}

function decideSubmission(db, id, action, note) {
  try {
    db.prepare(`
      UPDATE submissions
      SET
        status = ?,
        note = COALESCE(?, note),
        recommendation_text = COALESCE(?, recommendation_text),
        decided_at = datetime('now'),
        decision_token = NULL
      WHERE id = ?
    `).run(action, note || null, note || null, id);
    return;
  } catch {}

  // Backward-compatible fallback for pre-migration DBs.
  db.prepare(`
    UPDATE submissions
    SET status = ?, note = COALESCE(?, note), decided_at = datetime('now'), decision_token = NULL
    WHERE id = ?
  `).run(action, note || null, id);
}

// GET /api/approvals/decide  — email token link (must be before /:id to avoid route conflict)
router.get('/decide', (req, res) => {
  const { token, action } = req.query;
  if (!token || !['approve', 'deny'].includes(action)) {
    return res.status(400).send('Invalid link.');
  }

  const db = getDb();
  const submission = db.prepare('SELECT * FROM submissions WHERE decision_token = ?').get(token);
  if (!submission) {
    return res.send(`<html><body style="font-family:sans-serif;padding:2rem"><h2>Link already used or expired.</h2><p>Please check the web app for the current status.</p></body></html>`);
  }

  const status = action === 'approve' ? 'approved' : 'denied';
  db.prepare(`UPDATE submissions SET status = ?, decided_at = datetime('now'), decision_token = NULL WHERE id = ?`).run(status, submission.id);

  res.send(`<html><body style="font-family:sans-serif;padding:2rem;max-width:480px;margin:auto">
    <h2 style="color:${status === 'approved' ? '#16a34a' : '#dc2626'}">
      Request ${status.charAt(0).toUpperCase() + status.slice(1)}
    </h2>
    <p><strong>${submission.parsed_name}</strong>'s request for <strong>$${submission.parsed_amount}</strong> (${submission.parsed_purpose}) has been <strong>${status}</strong>.</p>
    <p style="color:#6b7280;font-size:0.875rem">You can close this tab.</p>
  </body></html>`);
});

// GET /api/approvals  (?status=pending|approved|denied|all)
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const status = req.query.status || 'pending';
    const rows = status === 'all'
      ? db.prepare(`SELECT s.*, e.name as emp_name, e.department as emp_dept FROM submissions s LEFT JOIN employees e ON s.employee_id = e.id ORDER BY s.created_at DESC`).all()
      : db.prepare(`SELECT s.*, e.name as emp_name, e.department as emp_dept FROM submissions s LEFT JOIN employees e ON s.employee_id = e.id WHERE s.status = ? ORDER BY s.created_at DESC`).all(status);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/approvals  — new submission from employee
router.post('/', async (req, res) => {
  const { raw_request } = req.body;
  if (!raw_request) return res.status(400).json({ error: 'raw_request required' });

  try {
    const db = getDb();
    const parsed = await parseRequest(raw_request);

    const employee = db.prepare(`SELECT * FROM employees WHERE name LIKE ?`).get(`%${(parsed.parsed_name || '').split(' ')[0]}%`);

    const token = uuidv4();
    const sub = db.prepare(`
      INSERT INTO submissions (employee_id, raw_request, parsed_name, parsed_department, parsed_purpose, parsed_amount, status, decision_token)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
    `).run(
      employee?.id ?? null,
      raw_request,
      parsed.parsed_name,
      parsed.parsed_department !== 'Unknown' ? parsed.parsed_department : (employee?.department ?? 'Unknown'),
      parsed.parsed_purpose,
      parsed.parsed_amount,
      token
    );

    const submission = db.prepare('SELECT * FROM submissions WHERE id = ?').get(sub.lastInsertRowid);

    // Generate recommendation and send email asynchronously (non-blocking)
    generateRecommendation(submission)
      .then(({ recommendation }) => {
        persistRecommendation(db, submission.id, recommendation);
        sendApprovalEmail(submission, recommendation, token);
      })
      .catch(err => console.error('Email send error:', err));

    res.json({ success: true, id: sub.lastInsertRowid, parsed });
  } catch (err) {
    console.error('Submission error:', err);
    res.status(500).json({ error: 'Submission failed.' });
  }
});

// GET /api/approvals/:id  — fetch one + cached recommendation, or regenerate on demand
router.get('/:id', async (req, res) => {
  try {
    const db = getDb();
    const submission = db.prepare('SELECT * FROM submissions WHERE id = ?').get(req.params.id);
    if (!submission) return res.status(404).json({ error: 'Not found' });

    const refresh = req.query.refresh === '1' || req.query.refresh === 'true';
    const storedRecommendation = submission.recommendation_text || submission.note || null;

    if (!refresh) {
      if (storedRecommendation) {
        return res.json({
          ...submission,
          recommendation: storedRecommendation,
          shortNote: storedRecommendation,
          cached: true,
        });
      }
      if (submission.status !== 'pending') {
        return res.json({
          ...submission,
          recommendation: 'No saved recommendation for this request yet.',
          shortNote: 'No saved recommendation for this request yet.',
          cached: true,
        });
      }
    }

    const { recommendation, shortNote } = await generateRecommendation(submission);
    persistRecommendation(db, submission.id, recommendation);
    const updated = db.prepare('SELECT * FROM submissions WHERE id = ?').get(req.params.id) || submission;
    res.json({ ...updated, recommendation, shortNote, cached: false });
  } catch (err) {
    console.error('Recommendation error:', err);
    res.status(500).json({ error: 'Failed to generate recommendation.' });
  }
});

// POST /api/approvals/:id/decide  — approve/deny from web app
router.post('/:id/decide', (req, res) => {
  const { action, note } = req.body;
  if (!['approved', 'denied'].includes(action)) return res.status(400).json({ error: 'action must be approved or denied' });

  try {
    const db = getDb();
    decideSubmission(db, req.params.id, action, note);
    res.json({ success: true, status: action });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
