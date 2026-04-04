const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { generateReports } = require('../ai/reports');

function isIsoDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

// GET /api/reports  (?status=pending|approved|denied|all)
router.get('/', (req, res) => {
  const db = getDb();
  const status = req.query.status || 'all';
  const base = `SELECT r.*, e.name as emp_name, e.department as emp_dept,
    COUNT(ri.id) as item_count
    FROM expense_reports r
    JOIN employees e ON r.employee_id = e.id
    LEFT JOIN expense_report_items ri ON ri.report_id = r.id`;
  const query = status === 'all'
    ? `${base} GROUP BY r.id ORDER BY r.created_at DESC`
    : `${base} WHERE r.status = ? GROUP BY r.id ORDER BY r.created_at DESC`;
  const rows = status === 'all' ? db.prepare(query).all() : db.prepare(query).all(status);
  res.json(rows);
});

// POST /api/reports/generate
router.post('/generate', async (req, res) => {
  const { employee_id, date_start, date_end } = req.body;
  if (!employee_id || !date_start || !date_end)
    return res.status(400).json({ error: 'employee_id, date_start, date_end required' });
  if (!isIsoDate(date_start) || !isIsoDate(date_end)) {
    return res.status(400).json({ error: 'date_start and date_end must be YYYY-MM-DD.' });
  }
  if (date_start > date_end) {
    return res.status(400).json({ error: 'date_start must be before or equal to date_end.' });
  }
  try {
    const db = getDb();
    const reportGroups = await generateReports(employee_id, date_start, date_end);
    if (!Array.isArray(reportGroups) || reportGroups.length === 0) {
      return res.status(400).json({ error: 'No report groups generated for this range.' });
    }
    const insertReport = db.prepare(
      `INSERT INTO expense_reports (employee_id, title, date_range_start, date_range_end, total_amount, policy_summary) VALUES (?, ?, ?, ?, ?, ?)`
    );
    const insertItem = db.prepare(
      `INSERT INTO expense_report_items (report_id, transaction_id) VALUES (?, ?)`
    );
    const created = [];
    for (const group of reportGroups) {
      const r = insertReport.run(employee_id, group.title, group.date_range_start, group.date_range_end, group.total_amount, group.policy_summary);
      for (const txId of (group.transaction_ids || [])) {
        insertItem.run(r.lastInsertRowid, txId);
      }
      created.push(r.lastInsertRowid);
    }
    res.json({ created: created.length, ids: created });
  } catch (err) {
    console.error('Report generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reports/:id/decide
router.post('/:id/decide', (req, res) => {
  const { action } = req.body;
  if (!['approved', 'denied'].includes(action))
    return res.status(400).json({ error: 'action must be approved or denied' });
  const db = getDb();
  db.prepare(`UPDATE expense_reports SET status = ? WHERE id = ?`).run(action, req.params.id);
  res.json({ success: true, status: action });
});

module.exports = router;
