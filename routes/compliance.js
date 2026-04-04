const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { runComplianceScan } = require('../ai/compliance');

// GET /api/compliance/violations
router.get('/violations', (req, res) => {
  try {
    const db = getDb();
    const violations = db.prepare(`
      SELECT v.*, e.name as employee_name, e.department
      FROM violations v
      JOIN employees e ON v.employee_id = e.id
      ORDER BY
        CASE v.severity WHEN 'high' THEN 1 WHEN 'med' THEN 2 ELSE 3 END,
        v.amount DESC
    `).all();
    res.json(violations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/compliance/leaderboard
router.get('/leaderboard', (req, res) => {
  try {
    const db = getDb();
    const leaderboard = db.prepare(`
      SELECT
        e.id, e.name as employee, e.department as dept,
        COUNT(v.id) as violations,
        COALESCE(SUM(v.amount), 0) as totalAmount,
        SUM(CASE WHEN v.severity = 'high' THEN 1 ELSE 0 END) as highCount,
        SUM(CASE WHEN v.severity = 'med'  THEN 1 ELSE 0 END) as medCount,
        SUM(CASE WHEN v.severity = 'low'  THEN 1 ELSE 0 END) as lowCount
      FROM employees e
      LEFT JOIN violations v ON e.id = v.employee_id
      GROUP BY e.id
      HAVING violations > 0
      ORDER BY violations DESC, totalAmount DESC
    `).all();
    res.json(leaderboard);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/compliance/scan
router.post('/scan', async (req, res) => {
  try {
    const summary = await runComplianceScan();
    res.json({ success: true, summary });
  } catch (err) {
    console.error('Compliance scan error:', err);
    res.status(500).json({ error: 'Scan failed. Check server logs.' });
  }
});

module.exports = router;
