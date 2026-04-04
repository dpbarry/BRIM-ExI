const Database = require('better-sqlite3');
const path = require('path');

let _db;

function getDb() {
  if (!_db) {
    _db = new Database(path.join(__dirname, 'exi.db'));
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
  }
  return _db;
}

function initDb() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS seeded (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      done INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      department TEXT NOT NULL,
      role TEXT,
      email TEXT
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_code TEXT,
      description TEXT,
      category TEXT,
      posting_date TEXT,
      transaction_date TEXT,
      merchant_name TEXT,
      amount REAL,
      type TEXT,
      mcc INTEGER,
      city TEXT,
      country TEXT,
      postal_code TEXT,
      state TEXT,
      conversion_rate REAL,
      employee_id INTEGER REFERENCES employees(id)
    );
    CREATE TABLE IF NOT EXISTS policy_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rule_text TEXT NOT NULL,
      category TEXT,
      threshold REAL
    );
    CREATE TABLE IF NOT EXISTS violations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER REFERENCES employees(id),
      transaction_id INTEGER REFERENCES transactions(id),
      rule_id INTEGER REFERENCES policy_rules(id),
      amount REAL,
      merchant TEXT,
      date TEXT,
      severity TEXT,
      note TEXT,
      ai_reasoning TEXT
    );
    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER REFERENCES employees(id),
      raw_request TEXT,
      parsed_name TEXT,
      parsed_department TEXT,
      parsed_purpose TEXT,
      parsed_amount REAL,
      status TEXT DEFAULT 'pending',
      note TEXT,
      recommendation_text TEXT,
      recommendation_updated_at TEXT,
      decision_token TEXT UNIQUE,
      created_at TEXT DEFAULT (datetime('now')),
      decided_at TEXT
    );
    CREATE TABLE IF NOT EXISTS saved_charts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      original_query TEXT,
      chart_config_json TEXT,
      ai_response TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS conversation_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      chart_config TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS expense_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER REFERENCES employees(id),
      title TEXT,
      date_range_start TEXT,
      date_range_end TEXT,
      total_amount REAL,
      status TEXT DEFAULT 'pending',
      policy_summary TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS expense_report_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER REFERENCES expense_reports(id),
      transaction_id INTEGER REFERENCES transactions(id),
      category TEXT,
      note TEXT
    );
    CREATE TABLE IF NOT EXISTS department_budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      department TEXT NOT NULL,
      period TEXT NOT NULL,
      budget_amount REAL,
      spent_amount REAL
    );
  `);
  // Migrate existing databases — add chart_config column if missing
  try { db.exec(`ALTER TABLE conversation_history ADD COLUMN chart_config TEXT`); } catch {}
  // Migrate saved_charts — add ai_response column if missing
  try { db.exec(`ALTER TABLE saved_charts ADD COLUMN ai_response TEXT`); } catch {}
  // Migrate submissions — add recommendation persistence columns if missing
  try { db.exec(`ALTER TABLE submissions ADD COLUMN recommendation_text TEXT`); } catch {}
  try { db.exec(`ALTER TABLE submissions ADD COLUMN recommendation_updated_at TEXT`); } catch {}

  return db;
}

module.exports = { getDb, initDb };
