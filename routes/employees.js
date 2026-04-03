const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  try {
    const { getDb } = require('../db');
    const db = getDb();
    if (!db) return res.status(503).json({ error: 'Database not yet initialized' });
    const employees = db.prepare('SELECT id, name, department FROM employees ORDER BY name').all();
    res.json(employees);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
