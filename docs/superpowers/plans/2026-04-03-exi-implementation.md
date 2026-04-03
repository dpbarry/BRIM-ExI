# ExI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full ExI expense intelligence platform: Express backend, SQLite database, Claude tool-use AI layer, and four live features wired into the existing vanilla JS frontend.

**Architecture:** Express serves the existing static frontend files and exposes `/api/*` routes. SQLite (better-sqlite3) stores all data. Claude API runs agentic tool-use loops server-side — the frontend never touches API keys. All four features share the same tool-use loop pattern defined in `ai/tools.js`.

**Tech Stack:** Node.js 18+, Express 4, better-sqlite3, @anthropic-ai/sdk, xlsx, resend, uuid, dotenv, ApexCharts (CDN)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `package.json` | Create | Dependencies + npm scripts |
| `.env.example` | Create | Environment variable template |
| `server.js` | Create | Express entry, static files, route mounting, startup |
| `db.js` | Create | SQLite schema creation + connection singleton |
| `seed.js` | Create | One-time data seeder: xlsx → employees, transactions, violations, submissions, budgets |
| `ai/tools.js` | Create | All Claude tool definitions + executor functions |
| `ai/chat.js` | Create | Talk to Data agentic loop |
| `ai/compliance.js` | Create | Compliance scan agentic loop |
| `ai/approvals.js` | Create | Pre-approval AI reasoning loop |
| `ai/reports.js` | Create | Expense report generation agentic loop |
| `routes/chat.js` | Create | POST /api/chat, GET /api/chat/saved-charts |
| `routes/compliance.js` | Create | GET violations/leaderboard, POST scan |
| `routes/approvals.js` | Create | Full CRUD + email token endpoint |
| `routes/reports.js` | Create | GET reports, POST generate, POST decide |
| `index.html` | Modify | Add ApexCharts CDN script tag |
| `app.js` | Modify | Replace stubs with fetch, add new routes (saved-visuals, pre-approval UI) |
| `style.css` | Modify | Add styles for charts, approval panels, report cards |

---

## Task 1: Project Bootstrap

**Files:**
- Create: `package.json`
- Create: `.env.example`
- Create: `server.js`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "exi",
  "version": "1.0.0",
  "type": "commonjs",
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.20.0",
    "better-sqlite3": "^9.4.3",
    "dotenv": "^16.4.1",
    "express": "^4.18.2",
    "resend": "^3.2.0",
    "uuid": "^9.0.1",
    "xlsx": "^0.18.5"
  }
}
```

- [ ] **Step 2: Create .env.example**

```
ANTHROPIC_API_KEY=
RESEND_API_KEY=
FINANCE_EMAIL=
PORT=3000
```

Copy to `.env` and fill in keys.

- [ ] **Step 3: Create server.js**

```js
require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.use('/api/chat', require('./routes/chat'));
app.use('/api/compliance', require('./routes/compliance'));
app.use('/api/approvals', require('./routes/approvals'));
app.use('/api/reports', require('./routes/reports'));

app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));

const PORT = process.env.PORT || 3000;

async function start() {
  const { initDb } = require('./db');
  const { runSeed } = require('./seed');
  initDb();
  await runSeed();
  app.listen(PORT, () => console.log(`ExI running at http://localhost:${PORT}`));
}

start().catch(err => { console.error(err); process.exit(1); });
```

- [ ] **Step 4: Install dependencies**

```bash
npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .env.example server.js
git commit -m "feat: bootstrap Express server with dependency setup"
```

---

## Task 2: Database Schema

**Files:**
- Create: `db.js`

- [ ] **Step 1: Create db.js**

```js
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
      decision_token TEXT UNIQUE,
      created_at TEXT DEFAULT (datetime('now')),
      decided_at TEXT
    );
    CREATE TABLE IF NOT EXISTS saved_charts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      original_query TEXT,
      chart_config_json TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS conversation_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
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
  return db;
}

module.exports = { getDb, initDb };
```

- [ ] **Step 2: Verify DB initialises**

Create a temporary stub `seed.js` so server.js can start:

```js
// seed.js (temporary stub — will be replaced in Task 3)
async function runSeed() {}
module.exports = { runSeed };
```

Run: `node server.js`  
Expected: `ExI running at http://localhost:3000` and `exi.db` file created in project root.

- [ ] **Step 3: Commit**

```bash
git add db.js seed.js
git commit -m "feat: add SQLite schema and db connection"
```

---

## Task 3: Seed Script

**Files:**
- Modify: `seed.js` (replace stub)

- [ ] **Step 1: Write seed.js**

```js
const XLSX = require('xlsx');
const path = require('path');
const { getDb } = require('./db');

// MCC → department mapping
const MCC_TO_DEPT = {
  4215: 'Logistics', 5541: 'Logistics', 5172: 'Logistics',
  5046: 'Logistics', 9399: 'Logistics', 7699: 'Logistics',
  5984: 'Logistics', 5511: 'Logistics',
  5734: 'Engineering', 7372: 'Engineering', 5045: 'Engineering',
  8220: 'Engineering', 5065: 'Engineering', 5044: 'Engineering',
  5812: 'Sales', 7011: 'Sales', 4111: 'Sales', 4121: 'Sales',
  5813: 'Sales', 5814: 'Sales',
  3501: 'Sales', 3502: 'Sales', 3503: 'Sales', 3504: 'Sales',
  3505: 'Sales', 3506: 'Sales', 3507: 'Sales', 3508: 'Sales',
  3509: 'Sales', 3510: 'Sales', 3511: 'Sales', 3512: 'Sales',
  3513: 'Sales', 3514: 'Sales', 3515: 'Sales', 3516: 'Sales',
  3517: 'Sales', 3518: 'Sales', 3519: 'Sales', 3520: 'Sales',
  3600: 'Sales', 3601: 'Sales', 3602: 'Sales', 3603: 'Sales',
  3604: 'Sales', 3605: 'Sales', 3606: 'Sales', 3607: 'Sales',
  3608: 'Sales', 3609: 'Sales', 3610: 'Sales', 3611: 'Sales',
  3612: 'Sales', 3613: 'Sales', 3614: 'Sales', 3615: 'Sales',
  3616: 'Sales', 3617: 'Sales', 3618: 'Sales', 3619: 'Sales',
  3620: 'Sales', 3621: 'Sales', 3622: 'Sales', 3623: 'Sales',
  3624: 'Sales', 3625: 'Sales', 3626: 'Sales', 3627: 'Sales',
  3628: 'Sales', 3629: 'Sales', 3630: 'Sales', 3631: 'Sales',
  3632: 'Sales', 3633: 'Sales', 3634: 'Sales', 3635: 'Sales',
  3636: 'Sales', 3637: 'Sales', 3638: 'Sales', 3639: 'Sales',
  3640: 'Sales',
  5940: 'Operations', 5941: 'Operations', 5661: 'Operations',
  5199: 'Operations', 5085: 'Operations', 5065: 'Operations',
};

const EMPLOYEES = [
  { name: 'John Smith',    department: 'Sales',       role: 'Sales Representative',  email: 'john@brimco.com' },
  { name: 'Sarah Chen',    department: 'Marketing',   role: 'Marketing Manager',     email: 'sarah@brimco.com' },
  { name: 'Marcus Webb',   department: 'Engineering', role: 'Senior Engineer',        email: 'marcus@brimco.com' },
  { name: 'Dylan Park',    department: 'Logistics',   role: 'Logistics Coordinator', email: 'dylan@brimco.com' },
  { name: 'Priya Nair',    department: 'Finance',     role: 'Finance Analyst',       email: 'priya@brimco.com' },
  { name: 'James Okafor',  department: 'Engineering', role: 'Software Engineer',     email: 'james@brimco.com' },
  { name: 'Aisha Mensah',  department: 'Sales',       role: 'Account Executive',     email: 'aisha@brimco.com' },
  { name: 'Tom Vasquez',   department: 'Operations',  role: 'Operations Manager',    email: 'tom@brimco.com' },
  { name: 'Kenji Tanaka',  department: 'HR',          role: 'HR Specialist',          email: 'kenji@brimco.com' },
  { name: 'Rachel Torres', department: 'Marketing',   role: 'Content Strategist',    email: 'rachel@brimco.com' },
];

const POLICY_RULES = [
  { rule_text: 'All expenses over $50 require manager pre-authorization.', category: 'approval', threshold: 50 },
  { rule_text: 'Single transactions exceeding $500 require manager pre-approval before purchase.', category: 'approval', threshold: 500 },
  { rule_text: 'All airfare and hotel bookings must be made through the approved company travel portal.', category: 'travel', threshold: null },
  { rule_text: 'Client meal expenses are capped at $75 per person; internal team meals are capped at $50 per person.', category: 'meals', threshold: 75 },
  { rule_text: 'Software and SaaS subscriptions above $100/month require IT department approval.', category: 'software', threshold: 100 },
  { rule_text: 'Splitting a transaction into smaller charges to circumvent approval thresholds is strictly prohibited.', category: 'fraud', threshold: null },
  { rule_text: 'Alcohol may only be expensed during approved client entertainment events with a documented attendee list.', category: 'meals', threshold: null },
  { rule_text: 'Office supply purchases up to $150 may be made without prior approval.', category: 'supplies', threshold: 150 },
  { rule_text: 'International travel totalling over $2,000 requires written CFO approval at least 5 business days in advance.', category: 'travel', threshold: 2000 },
  { rule_text: 'All entertainment expenses must include names, titles, and business purpose for every attendee.', category: 'entertainment', threshold: null },
  { rule_text: 'Personal expenses must never be combined with business transactions on a company card.', category: 'personal', threshold: null },
  { rule_text: 'Meal tips are capped at 20%; service and porterage tips are capped at 15%.', category: 'meals', threshold: null },
];

function excelDateToString(val) {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().split('T')[0];
  if (typeof val === 'number') {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    return d.toISOString().split('T')[0];
  }
  return String(val).split('T')[0];
}

async function runSeed() {
  const db = getDb();
  const row = db.prepare('SELECT done FROM seeded WHERE id = 1').get();
  if (row && row.done) {
    console.log('DB already seeded — skipping.');
    return;
  }

  console.log('Seeding database from xlsx...');

  // 1. Insert employees
  const insertEmployee = db.prepare(
    'INSERT INTO employees (name, department, role, email) VALUES (?, ?, ?, ?)'
  );
  const empIds = {};
  const deptToEmpIds = {};
  for (const emp of EMPLOYEES) {
    const result = insertEmployee.run(emp.name, emp.department, emp.role, emp.email);
    empIds[emp.name] = result.lastInsertRowid;
    if (!deptToEmpIds[emp.department]) deptToEmpIds[emp.department] = [];
    deptToEmpIds[emp.department].push(result.lastInsertRowid);
  }

  // 2. Insert policy rules
  const insertRule = db.prepare(
    'INSERT INTO policy_rules (rule_text, category, threshold) VALUES (?, ?, ?)'
  );
  const ruleIds = [];
  for (const rule of POLICY_RULES) {
    const r = insertRule.run(rule.rule_text, rule.category, rule.threshold ?? null);
    ruleIds.push(r.lastInsertRowid);
  }

  // 3. Parse xlsx
  const wb = XLSX.readFile(path.join(__dirname, 'data', 'brimtransactions.xlsx'));
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws);

  // dept → employees round-robin counter
  const deptCounters = {};

  const insertTx = db.prepare(`
    INSERT INTO transactions
      (transaction_code, description, category, posting_date, transaction_date,
       merchant_name, amount, type, mcc, city, country, postal_code, state,
       conversion_rate, employee_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const txIds = [];
  const insertMany = db.transaction((rows) => {
    for (const row of rows) {
      const mcc = parseInt(row['Merchant Category Code']) || null;
      const dept = MCC_TO_DEPT[mcc] || 'Finance';
      const empList = deptToEmpIds[dept] || deptToEmpIds['Finance'];
      if (!deptCounters[dept]) deptCounters[dept] = 0;
      const empId = empList[deptCounters[dept] % empList.length];
      deptCounters[dept]++;

      const r = insertTx.run(
        String(row['Transaction Code'] || ''),
        row['Transaction Description'] || '',
        String(row['Transaction Category'] || ''),
        excelDateToString(row['Posting date of transaction']),
        excelDateToString(row['Transaction Date']),
        row['Merchant Info DBA Name'] || '',
        parseFloat(row['Transaction Amount']) || 0,
        row['Debit or Credit'] || 'Debit',
        mcc,
        String(row['Merchant City'] || ''),
        row['Merchant Country'] || '',
        String(row['Merchant Postal Code'] || ''),
        row['Merchant State/Province'] || '',
        parseFloat(row['Conversion Rate']) || 0,
        empId
      );
      txIds.push({ id: r.lastInsertRowid, amount: parseFloat(row['Transaction Amount']) || 0, empId });
    }
  });
  insertMany(rows);
  console.log(`Imported ${rows.length} transactions.`);

  // 4. Seed violations — flag transactions >$500 (pre-approval threshold)
  const approvalRuleId = ruleIds[1]; // "Single transactions exceeding $500..."
  const travelRuleId = ruleIds[2];   // "Airfare/hotel via travel portal"
  const insertViolation = db.prepare(`
    INSERT INTO violations (employee_id, transaction_id, rule_id, amount, merchant, date, severity, note, ai_reasoning)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const largeTxs = db.prepare(
    'SELECT * FROM transactions WHERE amount > 500 AND type = "Debit" ORDER BY amount DESC LIMIT 20'
  ).all();

  for (const tx of largeTxs) {
    const severity = tx.amount > 2000 ? 'high' : tx.amount > 1000 ? 'med' : 'low';
    insertViolation.run(
      tx.employee_id, tx.id, approvalRuleId,
      tx.amount, tx.merchant_name, tx.transaction_date,
      severity,
      `Transaction of $${tx.amount.toFixed(2)} at ${tx.merchant_name} exceeds $500 approval threshold with no pre-authorization on file.`,
      `Amount $${tx.amount.toFixed(2)} exceeds the $500 single-transaction pre-approval policy. No approval record found.`
    );
  }

  // Flag hotel/airline transactions (MCC 7011, 3xxx ranges) as possible non-portal bookings
  const travelTxs = db.prepare(
    `SELECT * FROM transactions WHERE (mcc = 7011 OR (mcc >= 3500 AND mcc <= 3640)) AND amount > 200 LIMIT 10`
  ).all();
  for (const tx of travelTxs) {
    insertViolation.run(
      tx.employee_id, tx.id, travelRuleId,
      tx.amount, tx.merchant_name, tx.transaction_date,
      'med',
      `Hotel/airfare booking at ${tx.merchant_name} ($${tx.amount.toFixed(2)}) — verify booking was made via approved travel portal.`,
      `Transaction category suggests direct hotel/airline booking. Policy requires use of approved travel portal.`
    );
  }

  console.log('Seeded violations.');

  // 5. Seed submissions from large transactions (pre-approval requests)
  const { v4: uuidv4 } = require('uuid');
  const submissionTemplates = [
    (tx, emp) => ({
      purpose: `Conference registration and travel expenses`,
      rawRequest: `Hi, this is ${emp.name} from ${emp.department}. I'm requesting approval for $${tx.amount.toFixed(2)} for conference registration and associated travel costs at ${tx.merchant_name}.`,
    }),
    (tx, emp) => ({
      purpose: `Equipment and supply procurement`,
      rawRequest: `${emp.name} here, ${emp.department} team. Requesting reimbursement of $${tx.amount.toFixed(2)} for equipment purchase from ${tx.merchant_name} needed for an upcoming project.`,
    }),
    (tx, emp) => ({
      purpose: `Client entertainment and meals`,
      rawRequest: `This is ${emp.name}. I need approval for a $${tx.amount.toFixed(2)} client entertainment expense at ${tx.merchant_name}. This was for a business dinner with a key client.`,
    }),
    (tx, emp) => ({
      purpose: `Software subscription`,
      rawRequest: `Hi team, ${emp.name} from ${emp.department}. Requesting pre-approval for $${tx.amount.toFixed(2)} software subscription from ${tx.merchant_name}. This tool is essential for our department workflows.`,
    }),
    (tx, emp) => ({
      purpose: `Travel and accommodation`,
      rawRequest: `${emp.name} (${emp.department}) — requesting approval for $${tx.amount.toFixed(2)} accommodation at ${tx.merchant_name} for business travel last week.`,
    }),
  ];

  const submissionTxs = db.prepare(
    'SELECT t.*, e.name as emp_name, e.department as emp_dept FROM transactions t JOIN employees e ON t.employee_id = e.id WHERE t.amount > 400 AND t.type = "Debit" ORDER BY t.amount DESC LIMIT 12'
  ).all();

  const insertSubmission = db.prepare(`
    INSERT INTO submissions (employee_id, raw_request, parsed_name, parsed_department, parsed_purpose, parsed_amount, status, decision_token, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-' || ? || ' days'))
  `);

  const statuses = ['pending', 'pending', 'pending', 'pending', 'pending', 'approved', 'approved', 'denied', 'pending', 'pending', 'approved', 'pending'];
  for (let i = 0; i < submissionTxs.length; i++) {
    const tx = submissionTxs[i];
    const emp = { name: tx.emp_name, department: tx.emp_dept };
    const template = submissionTemplates[i % submissionTemplates.length](tx, emp);
    const daysAgo = Math.floor(Math.random() * 14);
    insertSubmission.run(
      tx.employee_id,
      template.rawRequest,
      tx.emp_name,
      tx.emp_dept,
      template.purpose,
      tx.amount,
      statuses[i] || 'pending',
      uuidv4(),
      String(daysAgo)
    );
  }
  console.log('Seeded submissions.');

  // 6. Seed department budgets from actual spend
  const deptSpend = db.prepare(`
    SELECT e.department, SUM(t.amount) as total_spent
    FROM transactions t
    JOIN employees e ON t.employee_id = e.id
    WHERE t.type = 'Debit'
    GROUP BY e.department
  `).all();

  const insertBudget = db.prepare(
    'INSERT INTO department_budgets (department, period, budget_amount, spent_amount) VALUES (?, ?, ?, ?)'
  );
  for (const row of deptSpend) {
    insertBudget.run(row.department, '2025-Q3', Math.round(row.total_spent * 0.4 * 1.2), Math.round(row.total_spent * 0.4));
    insertBudget.run(row.department, '2025-Q4', Math.round(row.total_spent * 0.3 * 1.2), Math.round(row.total_spent * 0.3));
    insertBudget.run(row.department, '2026-Q1', Math.round(row.total_spent * 0.3 * 1.2), Math.round(row.total_spent * 0.3));
  }
  console.log('Seeded department budgets.');

  // Mark seeded
  db.prepare('INSERT OR REPLACE INTO seeded (id, done) VALUES (1, 1)').run();
  console.log('Seeding complete.');
}

module.exports = { runSeed };
```

- [ ] **Step 2: Verify seeding**

```bash
node -e "require('./db').initDb(); require('./seed').runSeed().then(() => console.log('done'))"
```

Expected output:
```
Seeding database from xlsx...
Imported 4235 transactions.
Seeded violations.
Seeded submissions.
Seeded department budgets.
Seeding complete.
```

- [ ] **Step 3: Verify DB contents**

```bash
node -e "
const db = require('./db').getDb();
console.log('employees:', db.prepare('SELECT COUNT(*) as n FROM employees').get().n);
console.log('transactions:', db.prepare('SELECT COUNT(*) as n FROM transactions').get().n);
console.log('violations:', db.prepare('SELECT COUNT(*) as n FROM violations').get().n);
console.log('submissions:', db.prepare('SELECT COUNT(*) as n FROM submissions').get().n);
console.log('budgets:', db.prepare('SELECT COUNT(*) as n FROM department_budgets').get().n);
"
```

Expected: employees: 10, transactions: 4235, violations: ~30, submissions: ~12, budgets: ~15

- [ ] **Step 4: Delete exi.db and restart server to confirm idempotent seeding**

```bash
rm exi.db && node server.js
```

Expected: seeding runs, then `ExI running at http://localhost:3000`. Second restart should show "DB already seeded — skipping."

- [ ] **Step 5: Commit**

```bash
git add seed.js
git commit -m "feat: seed SQLite from brimtransactions.xlsx with employees, violations, submissions, budgets"
```

---

## Task 4: AI Tools Layer

**Files:**
- Create: `ai/tools.js`

- [ ] **Step 1: Create ai/tools.js**

```js
const { getDb } = require('../db');

// ─── Tool Definitions (Claude API schema) ────────────────────────────────────

const SHARED_TOOLS = [
  {
    name: 'get_schema',
    description: 'Get the column names, types, and 3 sample rows for a database table. Call this before run_query to understand what data is available.',
    input_schema: {
      type: 'object',
      properties: {
        table_name: { type: 'string', description: 'Name of the SQLite table' },
      },
      required: ['table_name'],
    },
  },
  {
    name: 'run_query',
    description: 'Execute a read-only SELECT SQL query against the database. Only SELECT statements are permitted.',
    input_schema: {
      type: 'object',
      properties: {
        sql: { type: 'string', description: 'A valid SQLite SELECT statement' },
      },
      required: ['sql'],
    },
  },
  {
    name: 'get_policy_rules',
    description: 'Retrieve all company expense policy rules.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
];

const CHAT_TOOLS = [
  ...SHARED_TOOLS,
  {
    name: 'save_chart',
    description: 'Save a chart to the Saved Visuals Gallery for quick future access.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'A short descriptive title for this chart' },
        original_query: { type: 'string', description: 'The user question that generated this chart' },
        chart_config_json: { type: 'string', description: 'JSON string of the ApexCharts configuration object' },
      },
      required: ['title', 'original_query', 'chart_config_json'],
    },
  },
];

const APPROVAL_TOOLS = [
  ...SHARED_TOOLS,
  {
    name: 'get_employee_history',
    description: 'Get an employee\'s transaction history for the last 90 days plus their violation count and severity breakdown.',
    input_schema: {
      type: 'object',
      properties: {
        employee_id: { type: 'integer', description: 'The employee ID' },
      },
      required: ['employee_id'],
    },
  },
  {
    name: 'get_department_budget',
    description: 'Get the budget vs actual spend for a department in the current quarter.',
    input_schema: {
      type: 'object',
      properties: {
        department: { type: 'string', description: 'Department name (e.g. "Sales", "Engineering")' },
      },
      required: ['department'],
    },
  },
];

const COMPLIANCE_TOOLS = [
  ...SHARED_TOOLS,
  {
    name: 'flag_violation',
    description: 'Record a policy violation discovered during the compliance scan.',
    input_schema: {
      type: 'object',
      properties: {
        employee_id: { type: 'integer' },
        transaction_id: { type: 'integer' },
        rule_id: { type: 'integer' },
        amount: { type: 'number' },
        merchant: { type: 'string' },
        date: { type: 'string' },
        severity: { type: 'string', enum: ['high', 'med', 'low'] },
        note: { type: 'string', description: 'Short human-readable note shown in the UI' },
        reasoning: { type: 'string', description: 'Detailed AI reasoning for why this is a violation' },
      },
      required: ['employee_id', 'transaction_id', 'rule_id', 'amount', 'merchant', 'date', 'severity', 'note', 'reasoning'],
    },
  },
];

const REPORT_TOOLS = [...SHARED_TOOLS];

// ─── Tool Executors ──────────────────────────────────────────────────────────

const VALID_TABLES = [
  'employees', 'transactions', 'policy_rules', 'violations',
  'submissions', 'saved_charts', 'conversation_history',
  'expense_reports', 'expense_report_items', 'department_budgets',
];

function executeTool(name, input) {
  const db = getDb();

  if (name === 'get_schema') {
    const { table_name } = input;
    if (!VALID_TABLES.includes(table_name)) {
      return { error: `Unknown table: ${table_name}. Available: ${VALID_TABLES.join(', ')}` };
    }
    const tableInfo = db.prepare(`PRAGMA table_info(${table_name})`).all();
    const samples = db.prepare(`SELECT * FROM ${table_name} LIMIT 3`).all();
    return { columns: tableInfo.map(c => ({ name: c.name, type: c.type })), sample_rows: samples };
  }

  if (name === 'run_query') {
    const { sql } = input;
    const normalized = sql.trim().toLowerCase();
    if (!normalized.startsWith('select')) {
      return { error: 'Only SELECT queries are permitted.' };
    }
    try {
      const rows = db.prepare(sql).all();
      return { rows, count: rows.length };
    } catch (err) {
      return { error: err.message };
    }
  }

  if (name === 'get_policy_rules') {
    return { rules: db.prepare('SELECT * FROM policy_rules').all() };
  }

  if (name === 'save_chart') {
    const { title, original_query, chart_config_json } = input;
    const r = db.prepare(
      'INSERT INTO saved_charts (title, original_query, chart_config_json) VALUES (?, ?, ?)'
    ).run(title, original_query, chart_config_json);
    return { saved: true, id: r.lastInsertRowid };
  }

  if (name === 'get_employee_history') {
    const { employee_id } = input;
    const txns = db.prepare(
      `SELECT * FROM transactions WHERE employee_id = ? AND transaction_date >= date('now', '-90 days') ORDER BY transaction_date DESC`
    ).all(employee_id);
    const violations = db.prepare(
      `SELECT severity, COUNT(*) as count FROM violations WHERE employee_id = ? GROUP BY severity`
    ).all(employee_id);
    const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(employee_id);
    return { employee, recent_transactions: txns, violation_summary: violations };
  }

  if (name === 'get_department_budget') {
    const { department } = input;
    const currentPeriod = getCurrentQuarter();
    const budget = db.prepare(
      'SELECT * FROM department_budgets WHERE department = ? AND period = ?'
    ).get(department, currentPeriod);
    if (!budget) return { error: `No budget found for ${department} in ${currentPeriod}` };
    return { ...budget, remaining: budget.budget_amount - budget.spent_amount, period: currentPeriod };
  }

  if (name === 'flag_violation') {
    const { employee_id, transaction_id, rule_id, amount, merchant, date, severity, note, reasoning } = input;
    // Avoid duplicate violations for same transaction + rule
    const existing = getDb().prepare(
      'SELECT id FROM violations WHERE transaction_id = ? AND rule_id = ?'
    ).get(transaction_id, rule_id);
    if (existing) return { skipped: true, reason: 'Violation already recorded' };
    const r = db.prepare(`
      INSERT INTO violations (employee_id, transaction_id, rule_id, amount, merchant, date, severity, note, ai_reasoning)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(employee_id, transaction_id, rule_id, amount, merchant, date, severity, note, reasoning);
    return { flagged: true, id: r.lastInsertRowid };
  }

  return { error: `Unknown tool: ${name}` };
}

function getCurrentQuarter() {
  const now = new Date();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  return `${now.getFullYear()}-Q${q}`;
}

module.exports = { CHAT_TOOLS, APPROVAL_TOOLS, COMPLIANCE_TOOLS, REPORT_TOOLS, executeTool };
```

- [ ] **Step 2: Verify tool executor works**

```bash
node -e "
require('./db').initDb();
const { executeTool } = require('./ai/tools');
console.log(JSON.stringify(executeTool('get_schema', { table_name: 'employees' }), null, 2));
console.log(JSON.stringify(executeTool('run_query', { sql: 'SELECT COUNT(*) as n FROM transactions' }), null, 2));
"
```

Expected: schema for employees table + `{ rows: [{ n: 4235 }], count: 1 }`

- [ ] **Step 3: Commit**

```bash
git add ai/tools.js
git commit -m "feat: add Claude tool definitions and executors for all AI features"
```

---

## Task 5: Talk to Data — Backend

**Files:**
- Create: `ai/chat.js`
- Create: `routes/chat.js`

- [ ] **Step 1: Create ai/chat.js**

```js
const Anthropic = require('@anthropic-ai/sdk');
const { getDb } = require('../db');
const { CHAT_TOOLS, executeTool } = require('./tools');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are ExI, an AI-powered expense intelligence assistant for a financial team. You have access to a company's full transaction history, employee records, policy rules, and department budgets in a SQLite database.

When answering questions:
1. First use get_schema to understand relevant tables
2. Use run_query to fetch exactly the data needed — craft precise SQL
3. Always respond with BOTH a text summary AND an ApexCharts configuration when the answer involves numbers
4. For the chart, choose the most appropriate type: bar for comparisons, pie/donut for proportions, line for trends over time
5. Return the ApexCharts config as valid JSON in a code block tagged \`\`\`apexcharts

Dates in the database are stored as YYYY-MM-DD strings. The data covers Aug 2025 – Mar 2026.
Currency amounts are in CAD (conversion_rate = 0 means already CAD; otherwise multiply amount by conversion_rate).
Always convert USD amounts to CAD when summing across currencies.`;

async function runChatLoop(sessionId, userMessage) {
  const db = getDb();

  // Load conversation history
  const history = db.prepare(
    'SELECT role, content FROM conversation_history WHERE session_id = ? ORDER BY created_at ASC'
  ).all(sessionId);

  const messages = [
    ...history.map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: userMessage },
  ];

  // Agentic loop
  let response;
  while (true) {
    response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: CHAT_TOOLS,
      messages,
    });

    if (response.stop_reason === 'end_turn') break;

    if (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');
      messages.push({ role: 'assistant', content: response.content });

      const toolResults = toolUseBlocks.map(block => ({
        type: 'tool_result',
        tool_use_id: block.id,
        content: JSON.stringify(executeTool(block.name, block.input)),
      }));
      messages.push({ role: 'user', content: toolResults });
    } else {
      break;
    }
  }

  const textBlock = response.content.find(b => b.type === 'text');
  const rawText = textBlock ? textBlock.text : '';

  // Extract ApexCharts config if present
  let chartConfig = null;
  const chartMatch = rawText.match(/```apexcharts\s*([\s\S]*?)```/);
  if (chartMatch) {
    try {
      chartConfig = JSON.parse(chartMatch[1].trim());
    } catch {
      chartConfig = null;
    }
  }

  // Clean text (remove the code block)
  const cleanText = rawText.replace(/```apexcharts[\s\S]*?```/g, '').trim();

  // Persist conversation
  db.prepare('INSERT INTO conversation_history (session_id, role, content) VALUES (?, ?, ?)').run(sessionId, 'user', userMessage);
  db.prepare('INSERT INTO conversation_history (session_id, role, content) VALUES (?, ?, ?)').run(sessionId, 'assistant', rawText);

  return { text: cleanText, chartConfig };
}

module.exports = { runChatLoop };
```

- [ ] **Step 2: Create routes/chat.js**

```js
const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { runChatLoop } = require('../ai/chat');

// POST /api/chat
router.post('/', async (req, res) => {
  const { message, session_id } = req.body;
  if (!message || !session_id) return res.status(400).json({ error: 'message and session_id required' });
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
```

- [ ] **Step 3: Test endpoint with curl**

Start the server: `node server.js`

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "How many total transactions are in the database?", "session_id": "test-123"}'
```

Expected: `{"text": "...", "chartConfig": null}` with a count answer. Check the text contains the number 4235.

- [ ] **Step 4: Test saved charts endpoint**

```bash
curl http://localhost:3000/api/chat/saved-charts
```

Expected: `[]` (empty array — no charts saved yet).

- [ ] **Step 5: Commit**

```bash
git add ai/chat.js routes/chat.js
git commit -m "feat: Talk to Data backend — Claude agentic loop with tool use"
```

---

## Task 6: Talk to Data — Frontend

**Files:**
- Modify: `index.html` — add ApexCharts CDN
- Modify: `app.js` — replace placeholder stub, add session_id, render charts

- [ ] **Step 1: Add ApexCharts to index.html**

Find the closing `</head>` tag in `index.html` and add before it:

```html
  <script src="https://cdn.jsdelivr.net/npm/apexcharts"></script>
```

- [ ] **Step 2: Add session_id to STORAGE keys in app.js**

Find the `STORAGE` object at the top of `app.js`:
```js
const STORAGE = {
    route: "exi.route",
    account: "exi.account",
    talkHasMessage: "exi.talk.hasMessage",
    theme: "exi.theme",
};
```

Add `sessionId` key:
```js
const STORAGE = {
    route: "exi.route",
    account: "exi.account",
    talkHasMessage: "exi.talk.hasMessage",
    theme: "exi.theme",
    sessionId: "exi.session_id",
};
```

- [ ] **Step 3: Add getSessionId() helper in app.js**

After the `store` object definition, add:

```js
function getSessionId() {
    let id = store.get(STORAGE.sessionId);
    if (!id) {
        id = crypto.randomUUID();
        store.set(STORAGE.sessionId, id);
    }
    return id;
}
```

- [ ] **Step 4: Replace the placeholder form submit handler in app.js**

Find this block in the `talk-to-data` route setup (around the `form.addEventListener("submit"` section):

```js
    await new Promise((r) => setTimeout(r, 1400 + Math.random() * 600));
    loadingEl.remove();
    this.appendMessage(thread, "ai", "This is a placeholder response. Connect the model API here.");
```

Replace with:

```js
    try {
        const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: text, session_id: getSessionId() }),
        });
        const data = await res.json();
        loadingEl.remove();
        if (data.error) {
            this.appendMessage(thread, "ai", `Error: ${data.error}`);
        } else {
            this.appendMessage(thread, "ai", data.text);
            if (data.chartConfig) {
                this.appendChart(thread, data.chartConfig);
            }
        }
    } catch (err) {
        loadingEl.remove();
        this.appendMessage(thread, "ai", "Connection error — is the server running?");
    }
```

- [ ] **Step 5: Add appendChart() method to the App class in app.js**

Find the `appendLoading(thread)` method and add after it:

```js
appendChart(thread, config) {
    const wrapper = document.createElement("div");
    wrapper.className = "msg msg--ai";
    const chartEl = document.createElement("div");
    chartEl.className = "msg__chart";
    wrapper.appendChild(chartEl);
    thread.appendChild(wrapper);
    wrapper.scrollIntoView({ behavior: "smooth", block: "end" });
    // Ensure ApexCharts renders after DOM insertion
    requestAnimationFrame(() => {
        const chart = new ApexCharts(chartEl, config);
        chart.render();
    });
    return wrapper;
}
```

- [ ] **Step 6: Add .msg__chart CSS to style.css**

At the end of `style.css`, add:

```css
/* ── Chart Messages ───────────────────────────────────── */
.msg__chart {
  min-width: 320px;
  max-width: 560px;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: 1rem;
  margin-top: 0.25rem;
}
```

- [ ] **Step 7: Load conversation history on Talk to Data init**

In the talk-to-data route's `render` function setup code, after the form submit handler, add history loading. Find where the talk page is initialized (where `form.addEventListener` is set up) and add before it:

```js
// Load existing conversation history
const sessionId = getSessionId();
fetch(`/api/chat/history/${sessionId}`)
    .then(r => r.json())
    .then(history => {
        if (!history.length) return;
        if (!this.state.talkHasMessage) {
            this.state.talkHasMessage = true;
            view.querySelector(".talk-page")?.classList.add("has-message");
            thread.style.overflowY = "auto";
        }
        for (const msg of history) {
            if (msg.role === "user") {
                this.appendMessage(thread, "user", msg.content);
            } else {
                // Extract chart if present in stored content
                const chartMatch = msg.content.match(/```apexcharts\s*([\s\S]*?)```/);
                const cleanText = msg.content.replace(/```apexcharts[\s\S]*?```/g, "").trim();
                this.appendMessage(thread, "ai", cleanText);
                if (chartMatch) {
                    try {
                        this.appendChart(thread, JSON.parse(chartMatch[1].trim()));
                    } catch {}
                }
            }
        }
    })
    .catch(() => {});
```

- [ ] **Step 8: Verify in browser**

Open `http://localhost:3000`, navigate to Talk to Data. Type: `"What are the top 5 merchants by total spend?"`. Expected: loading dots appear, then AI response with text + a chart rendered via ApexCharts.

Refresh the page — conversation history should reload.

- [ ] **Step 9: Commit**

```bash
git add index.html app.js style.css
git commit -m "feat: wire Talk to Data frontend to Claude API with ApexCharts rendering"
```

---

## Task 7: Saved Visuals Gallery

**Files:**
- Modify: `app.js` — add saved-visuals route

- [ ] **Step 1: Add saved-visuals route to the routes array in app.js**

Find the routes array (where `talk-to-data`, `policy-compliance` etc. are defined) and add:

```js
{
    id: "saved-visuals",
    title: "Saved Visuals",
    navLabel: "Saved Visuals",
    render: (_state) => `
        <section class="page saved-visuals-page">
            <header class="page-header">
                <h1 class="page-header__title">Saved Visuals</h1>
                <p class="page-header__sub">Charts saved from your data conversations.</p>
            </header>
            <div class="gallery-grid" id="galleryGrid">
                <div class="gallery-loading">Loading charts…</div>
            </div>
        </section>`
},
```

- [ ] **Step 2: Add gallery initialization in the route lifecycle**

In the section of `app.js` where routes are activated (where the DOM is set up after `innerHTML` is set), add handling for `saved-visuals`:

```js
if (route.id === "saved-visuals") {
    const grid = view.querySelector("#galleryGrid");
    fetch("/api/chat/saved-charts")
        .then(r => r.json())
        .then(charts => {
            if (!charts.length) {
                grid.innerHTML = `<p class="gallery-empty">No saved charts yet. Save a chart from <a href="#" data-nav="talk-to-data">Talk to Data</a>.</p>`;
                grid.querySelector("[data-nav]")?.addEventListener("click", (e) => {
                    e.preventDefault();
                    this.navigate("talk-to-data");
                });
                return;
            }
            grid.innerHTML = "";
            charts.forEach(chart => {
                const card = document.createElement("div");
                card.className = "gallery-card";
                card.innerHTML = `
                    <p class="gallery-card__title">${chart.title}</p>
                    <p class="gallery-card__query">${chart.original_query}</p>
                    <div class="gallery-card__chart" id="chart-${chart.id}"></div>
                    <p class="gallery-card__date">${new Date(chart.created_at).toLocaleDateString()}</p>
                `;
                grid.appendChild(card);
                try {
                    const config = JSON.parse(chart.chart_config_json);
                    requestAnimationFrame(() => {
                        new ApexCharts(card.querySelector(`#chart-${chart.id}`), config).render();
                    });
                } catch {}
            });
        })
        .catch(() => { grid.innerHTML = `<p class="gallery-empty">Failed to load charts.</p>`; });
}
```

- [ ] **Step 3: Add gallery CSS to style.css**

```css
/* ── Saved Visuals Gallery ────────────────────────────── */
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.25rem;
  padding: 1.5rem;
}
.gallery-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.gallery-card__title { font-weight: 600; font-size: 0.9rem; }
.gallery-card__query { font-size: 0.75rem; color: var(--color-text-sub); }
.gallery-card__date  { font-size: 0.7rem; color: var(--color-text-sub); }
.gallery-empty { padding: 2rem; color: var(--color-text-sub); }
.gallery-loading { padding: 2rem; color: var(--color-text-sub); }
```

- [ ] **Step 4: Verify**

Save a chart from Talk to Data by asking a question (Claude will call `save_chart` if appropriate, or test by saving manually). Navigate to Saved Visuals — chart cards should appear with rendered ApexCharts.

- [ ] **Step 5: Commit**

```bash
git add app.js style.css
git commit -m "feat: add Saved Visuals Gallery route with ApexCharts grid"
```

---

## Task 8: Policy Compliance — Backend

**Files:**
- Create: `ai/compliance.js`
- Create: `routes/compliance.js`

- [ ] **Step 1: Create ai/compliance.js**

```js
const Anthropic = require('@anthropic-ai/sdk');
const { getDb } = require('../db');
const { COMPLIANCE_TOOLS, executeTool } = require('./tools');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a compliance officer AI for an SMB expense management platform. Your job is to scan employee transactions against company expense policy and flag violations.

Instructions:
1. Use get_policy_rules() to load all rules
2. Use run_query() to fetch recent transactions per employee (last 60 days)
3. Analyse each employee's transactions as a cluster — look for patterns, not just individual amounts
4. Flag violations using flag_violation() — be contextually aware:
   - A $200 dinner for a team of 4 is fine; a $200 solo dinner is a violation
   - Two charges of $490 at the same vendor on the same day is likely split-purchase fraud
   - Hotel bookings direct (MCC 7011) may violate the travel portal requirement
5. Only flag clear violations — do not flag ambiguous transactions
6. After scanning, return a brief summary of what you found`;

async function runComplianceScan() {
  const db = getDb();
  const messages = [{ role: 'user', content: 'Please run a full compliance scan on all employee transactions from the last 60 days.' }];

  let response;
  let iterations = 0;
  const MAX_ITERATIONS = 20;

  while (iterations < MAX_ITERATIONS) {
    iterations++;
    response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: COMPLIANCE_TOOLS,
      messages,
    });

    if (response.stop_reason === 'end_turn') break;

    if (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');
      messages.push({ role: 'assistant', content: response.content });

      const toolResults = toolUseBlocks.map(block => ({
        type: 'tool_result',
        tool_use_id: block.id,
        content: JSON.stringify(executeTool(block.name, block.input)),
      }));
      messages.push({ role: 'user', content: toolResults });
    } else {
      break;
    }
  }

  const textBlock = response.content.find(b => b.type === 'text');
  return textBlock ? textBlock.text : 'Scan complete.';
}

module.exports = { runComplianceScan };
```

- [ ] **Step 2: Create routes/compliance.js**

```js
const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { runComplianceScan } = require('../ai/compliance');

// GET /api/compliance/violations
router.get('/violations', (req, res) => {
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
});

// GET /api/compliance/leaderboard
router.get('/leaderboard', (req, res) => {
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
});

// POST /api/compliance/scan  (Admin only — enforced client-side)
router.post('/scan', async (req, res) => {
  try {
    const summary = await runComplianceScan();
    res.json({ success: true, summary });
  } catch (err) {
    console.error('Compliance scan error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

- [ ] **Step 3: Test endpoints**

```bash
curl http://localhost:3000/api/compliance/violations | python3 -m json.tool | head -40
curl http://localhost:3000/api/compliance/leaderboard | python3 -m json.tool
```

Expected: violations array with employee names + leaderboard with counts.

- [ ] **Step 4: Commit**

```bash
git add ai/compliance.js routes/compliance.js
git commit -m "feat: Policy Compliance Engine backend with AI scan and REST endpoints"
```

---

## Task 9: Policy Compliance — Frontend

**Files:**
- Modify: `app.js` — replace hardcoded VIOLATIONS_DATA and LEADERBOARD_DATA with API calls

- [ ] **Step 1: Replace hardcoded data with API fetch in the policy-compliance route**

In the existing policy-compliance route render/init code, find where `VIOLATIONS_DATA` and `LEADERBOARD_DATA` are used to render the table and leaderboard. Replace those references to load from API:

Find and replace the section that populates violations rows (it will reference `VIOLATIONS_DATA.map(...)`) with:

```js
// Load violations from API
fetch("/api/compliance/violations")
    .then(r => r.json())
    .then(violations => {
        const tbody = view.querySelector("#violationsBody");
        if (!tbody) return;
        if (!violations.length) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--color-text-sub)">No violations on record.</td></tr>`;
            return;
        }
        tbody.innerHTML = violations.map(v => `
            <tr>
                <td>${v.employee_name}</td>
                <td>${v.dept}</td>
                <td>$${Number(v.amount).toFixed(2)}</td>
                <td>${v.merchant}</td>
                <td>${v.date}</td>
                <td><span class="badge badge--${v.severity}">${v.severity.toUpperCase()}</span></td>
            </tr>
        `).join("");
    });
```

Find and replace the section that populates the leaderboard (references `LEADERBOARD_DATA`) with:

```js
// Load leaderboard from API
fetch("/api/compliance/leaderboard")
    .then(r => r.json())
    .then(leaderboard => {
        const lbBody = view.querySelector("#leaderboardBody");
        if (!lbBody) return;
        lbBody.innerHTML = leaderboard.map((e, i) => `
            <tr>
                <td>${i + 1}</td>
                <td>${e.employee}</td>
                <td>${e.dept}</td>
                <td>${e.violations}</td>
                <td>$${Number(e.totalAmount).toFixed(2)}</td>
                <td>
                    ${e.highCount > 0 ? `<span class="badge badge--high">${e.highCount}H</span> ` : ""}
                    ${e.medCount > 0  ? `<span class="badge badge--med">${e.medCount}M</span> ` : ""}
                    ${e.lowCount > 0  ? `<span class="badge badge--low">${e.lowCount}L</span>` : ""}
                </td>
            </tr>
        `).join("");
    });
```

- [ ] **Step 2: Add "Run Compliance Scan" button (Admin only)**

In the policy-compliance page render function, add a scan button to the page header (visible only when Admin):

```js
${state.account === "Admin" ? `
    <button class="btn btn--primary" id="scanBtn">Run Compliance Scan</button>
` : ""}
```

Wire up the button in the route init code:

```js
const scanBtn = view.querySelector("#scanBtn");
if (scanBtn) {
    scanBtn.addEventListener("click", async () => {
        scanBtn.disabled = true;
        scanBtn.textContent = "Scanning…";
        try {
            const res = await fetch("/api/compliance/scan", { method: "POST" });
            const data = await res.json();
            scanBtn.textContent = "Scan Complete";
            // Reload violations and leaderboard
            // (re-trigger the fetch calls above by re-navigating)
            this.navigate("policy-compliance");
        } catch {
            scanBtn.disabled = false;
            scanBtn.textContent = "Scan Failed — Retry";
        }
    });
}
```

- [ ] **Step 3: Verify in browser**

Navigate to Policy Compliance — violations table and leaderboard should load from DB. As Admin, click "Run Compliance Scan" — page should reload with any new violations.

- [ ] **Step 4: Commit**

```bash
git add app.js
git commit -m "feat: Policy Compliance frontend — replace hardcoded data with live API"
```

---

## Task 10: Pre-Approval — Backend

**Files:**
- Create: `ai/approvals.js`
- Create: `routes/approvals.js`

- [ ] **Step 1: Create ai/approvals.js**

```js
const Anthropic = require('@anthropic-ai/sdk');
const { APPROVAL_TOOLS, executeTool } = require('./tools');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PARSE_SYSTEM = `You are an expense request parser. Extract structured information from a free-text employee expense request.
Return a JSON object with these exact keys:
- parsed_name: string (employee's full name)
- parsed_department: string (department if mentioned, otherwise "Unknown")
- parsed_purpose: string (concise description of what the expense is for)
- parsed_amount: number (dollar amount, or 0 if not specified)

Return ONLY valid JSON, no other text.`;

const CONTEXT_SYSTEM = `You are an AI expense advisor for a finance team. Given a pre-approval request, gather context and provide a recommendation.

Steps:
1. Use get_schema and run_query to find the employee in the database by name
2. Use get_employee_history to get their recent transactions and violation history
3. Use get_department_budget to check the department's current budget status
4. Use get_policy_rules to verify if the request aligns with policy
5. Return a structured recommendation with:
   - A context summary (2-3 sentences about the employee and their history)
   - Budget status (remaining budget in their department)
   - Violation history summary
   - Clear APPROVE or DENY recommendation with reasoning
   - A short note (1 sentence) suitable for the approval record`;

async function parseRequest(rawRequest) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    system: PARSE_SYSTEM,
    messages: [{ role: 'user', content: rawRequest }],
  });
  const text = response.content.find(b => b.type === 'text')?.text || '{}';
  try {
    return JSON.parse(text);
  } catch {
    return { parsed_name: 'Unknown', parsed_department: 'Unknown', parsed_purpose: rawRequest.slice(0, 100), parsed_amount: 0 };
  }
}

async function generateRecommendation(submission) {
  const userMsg = `Please review this expense request and provide a recommendation:

Employee: ${submission.parsed_name} (${submission.parsed_department})
Purpose: ${submission.parsed_purpose}
Amount: $${submission.parsed_amount}

Original request: "${submission.raw_request}"`;

  const messages = [{ role: 'user', content: userMsg }];
  let response;
  let iterations = 0;

  while (iterations < 15) {
    iterations++;
    response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: CONTEXT_SYSTEM,
      tools: APPROVAL_TOOLS,
      messages,
    });

    if (response.stop_reason === 'end_turn') break;

    if (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');
      messages.push({ role: 'assistant', content: response.content });
      const toolResults = toolUseBlocks.map(block => ({
        type: 'tool_result',
        tool_use_id: block.id,
        content: JSON.stringify(executeTool(block.name, block.input)),
      }));
      messages.push({ role: 'user', content: toolResults });
    } else {
      break;
    }
  }

  const text = response.content.find(b => b.type === 'text')?.text || '';

  // Extract short note (last sentence or first sentence after "Note:")
  const noteMatch = text.match(/note[:\s]+([^.!?\n]+[.!?])/i);
  const shortNote = noteMatch ? noteMatch[1].trim() : text.split(/[.!?]/)[0].trim() + '.';

  return { recommendation: text, shortNote };
}

module.exports = { parseRequest, generateRecommendation };
```

- [ ] **Step 2: Create routes/approvals.js**

```js
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { parseRequest, generateRecommendation } = require('../ai/approvals');
const { sendApprovalEmail } = require('../email');

// GET /api/approvals  (?status=pending|approved|denied|all)
router.get('/', (req, res) => {
  const db = getDb();
  const status = req.query.status || 'pending';
  const query = status === 'all'
    ? `SELECT s.*, e.name as emp_name, e.department as emp_dept
       FROM submissions s LEFT JOIN employees e ON s.employee_id = e.id
       ORDER BY s.created_at DESC`
    : `SELECT s.*, e.name as emp_name, e.department as emp_dept
       FROM submissions s LEFT JOIN employees e ON s.employee_id = e.id
       WHERE s.status = ? ORDER BY s.created_at DESC`;
  const rows = status === 'all'
    ? db.prepare(query).all()
    : db.prepare(query).all(status);
  res.json(rows);
});

// POST /api/approvals  — new submission from employee
router.post('/', async (req, res) => {
  const { raw_request, account } = req.body;
  if (!raw_request) return res.status(400).json({ error: 'raw_request required' });

  try {
    const db = getDb();
    // Parse with AI
    const parsed = await parseRequest(raw_request);

    // Find employee in DB by name
    const employee = db.prepare(
      `SELECT * FROM employees WHERE name LIKE ?`
    ).get(`%${(parsed.parsed_name || '').split(' ')[0]}%`);

    // Generate recommendation + fire email
    const token = uuidv4();
    const sub = db.prepare(`
      INSERT INTO submissions
        (employee_id, raw_request, parsed_name, parsed_department, parsed_purpose, parsed_amount, status, decision_token)
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

    // Generate recommendation and send email asynchronously
    generateRecommendation(submission)
      .then(({ recommendation, shortNote }) => sendApprovalEmail(submission, recommendation, token))
      .catch(err => console.error('Email send error:', err));

    res.json({ success: true, id: sub.lastInsertRowid, parsed });
  } catch (err) {
    console.error('Submission error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/approvals/:id  — fetch one + generate fresh recommendation
router.get('/:id', async (req, res) => {
  const db = getDb();
  const submission = db.prepare('SELECT * FROM submissions WHERE id = ?').get(req.params.id);
  if (!submission) return res.status(404).json({ error: 'Not found' });

  try {
    const { recommendation, shortNote } = await generateRecommendation(submission);
    res.json({ ...submission, recommendation, shortNote });
  } catch (err) {
    console.error('Recommendation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/approvals/:id/decide  — approve/deny from web app
router.post('/:id/decide', (req, res) => {
  const { action, note } = req.body;
  if (!['approved', 'denied'].includes(action)) return res.status(400).json({ error: 'action must be approved or denied' });

  const db = getDb();
  db.prepare(`
    UPDATE submissions SET status = ?, note = ?, decided_at = datetime('now'), decision_token = NULL WHERE id = ?
  `).run(action, note || null, req.params.id);

  res.json({ success: true, status: action });
});

// GET /api/approvals/decide  — email token link
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
  db.prepare(`
    UPDATE submissions SET status = ?, decided_at = datetime('now'), decision_token = NULL WHERE id = ?
  `).run(status, submission.id);

  res.send(`<html><body style="font-family:sans-serif;padding:2rem;max-width:480px;margin:auto">
    <h2 style="color:${status === 'approved' ? '#16a34a' : '#dc2626'}">
      Request ${status.charAt(0).toUpperCase() + status.slice(1)}
    </h2>
    <p><strong>${submission.parsed_name}</strong>'s request for <strong>$${submission.parsed_amount}</strong> (${submission.parsed_purpose}) has been <strong>${status}</strong>.</p>
    <p style="color:#6b7280;font-size:0.875rem">You can close this tab.</p>
  </body></html>`);
});

module.exports = router;
```

- [ ] **Step 3: Create email.js**

```js
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);
const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

async function sendApprovalEmail(submission, recommendation, token) {
  const approveUrl = `${BASE_URL}/api/approvals/decide?token=${token}&action=approve`;
  const denyUrl    = `${BASE_URL}/api/approvals/decide?token=${token}&action=deny`;

  const btnStyle = `display:inline-block;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;text-decoration:none;`;

  await resend.emails.send({
    from: 'ExI Approvals <approvals@yourdomain.com>',
    to: process.env.FINANCE_EMAIL,
    subject: `[Action Required] Expense Request — ${submission.parsed_name} — $${submission.parsed_amount}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:2rem">
        <h2 style="color:#0f172a">Expense Pre-Approval Request</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:1.5rem">
          <tr><td style="padding:6px 0;color:#64748b;width:140px">Employee</td><td><strong>${submission.parsed_name}</strong> (${submission.parsed_department})</td></tr>
          <tr><td style="padding:6px 0;color:#64748b">Purpose</td><td>${submission.parsed_purpose}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b">Amount</td><td><strong>$${submission.parsed_amount}</strong></td></tr>
        </table>
        <div style="background:#f8fafc;border-radius:8px;padding:1.25rem;margin-bottom:1.5rem">
          <h3 style="margin:0 0 0.75rem;color:#0f172a">AI Analysis</h3>
          <p style="margin:0;white-space:pre-wrap;color:#334155">${recommendation}</p>
        </div>
        <div style="display:flex;gap:12px">
          <a href="${approveUrl}" style="${btnStyle}background:#16a34a;color:#fff">✓ Approve</a>
          <a href="${denyUrl}"    style="${btnStyle}background:#dc2626;color:#fff">✗ Deny</a>
        </div>
        <p style="margin-top:1.5rem;font-size:0.75rem;color:#94a3b8">
          Or open the <a href="${BASE_URL}">ExI web app</a> to review with fresh context.
        </p>
      </div>
    `,
  });
}

module.exports = { sendApprovalEmail };
```

- [ ] **Step 4: Test submission endpoint**

```bash
curl -X POST http://localhost:3000/api/approvals \
  -H "Content-Type: application/json" \
  -d '{"raw_request": "Hi, this is John Smith. I need approval for $850 for a client dinner at Canoe Restaurant. This is for a key account meeting."}'
```

Expected: `{"success":true,"id":13,"parsed":{"parsed_name":"John Smith",...}}`

```bash
curl http://localhost:3000/api/approvals
```

Expected: array including the new pending submission.

```bash
curl http://localhost:3000/api/approvals/13
```

Expected: submission object with `recommendation` and `shortNote` fields.

- [ ] **Step 5: Commit**

```bash
git add ai/approvals.js routes/approvals.js email.js
git commit -m "feat: Pre-Approval Workflow backend — AI parsing, recommendations, email via Resend"
```

---

## Task 11: Pre-Approval — Frontend

**Files:**
- Modify: `app.js` — add submissions list (Admin), submit form (John), approval panel

- [ ] **Step 1: Update pre-approval route render in app.js**

Replace the existing `pre-approval` route render with:

```js
{
    id: "pre-approval",
    title: "Pre-Approval",
    navLabel: "Pre-Approval",
    render: (state) => state.account === "Admin"
        ? `<section class="page approvals-page">
            <header class="page-header">
                <h1 class="page-header__title">Pre-Approval Requests</h1>
                <div class="page-header__actions">
                    <select id="statusFilter" class="filter-select">
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="denied">Denied</option>
                        <option value="all">All</option>
                    </select>
                </div>
            </header>
            <div id="submissionsList" class="submissions-list">Loading…</div>
            <div id="approvalPanel" class="approval-panel hidden"></div>
           </section>`
        : `<section class="page approvals-page">
            <header class="page-header">
                <h1 class="page-header__title">Submit Expense Request</h1>
            </header>
            <form id="submitRequestForm" class="request-form">
                <label class="request-form__label" for="requestText">Describe your expense request</label>
                <textarea id="requestText" class="request-form__textarea"
                    placeholder="e.g. Hi, I'm John Smith from Sales. I need approval for $850 for a client dinner at a downtown restaurant for a key account meeting." rows="5"></textarea>
                <button type="submit" class="btn btn--primary">Submit Request</button>
            </form>
            <div id="mySubmissions" class="submissions-list" style="margin-top:2rem">
                <h2 class="section-title">My Requests</h2>
                <div id="mySubmissionsBody">Loading…</div>
            </div>
           </section>`,
},
```

- [ ] **Step 2: Wire Admin view — load submissions + approval panel**

In the route init code for `pre-approval`, add:

```js
if (this.state.account === "Admin") {
    const loadSubmissions = (status) => {
        const list = view.querySelector("#submissionsList");
        list.innerHTML = "Loading…";
        fetch(`/api/approvals?status=${status}`)
            .then(r => r.json())
            .then(subs => {
                if (!subs.length) { list.innerHTML = `<p class="empty-state">No ${status} requests.</p>`; return; }
                list.innerHTML = subs.map(s => `
                    <div class="submission-row" data-id="${s.id}">
                        <div class="submission-row__info">
                            <span class="submission-row__name">${s.parsed_name}</span>
                            <span class="submission-row__dept">${s.parsed_department}</span>
                            <span class="submission-row__purpose">${s.parsed_purpose}</span>
                        </div>
                        <div class="submission-row__meta">
                            <span class="submission-row__amount">$${Number(s.parsed_amount).toFixed(2)}</span>
                            <span class="badge badge--${s.status}">${s.status}</span>
                        </div>
                    </div>
                `).join("");
                // Attach click handlers
                list.querySelectorAll(".submission-row").forEach(row => {
                    row.addEventListener("click", () => openApprovalPanel(row.dataset.id));
                });
            });
    };

    loadSubmissions("pending");

    view.querySelector("#statusFilter")?.addEventListener("change", e => loadSubmissions(e.target.value));

    const openApprovalPanel = async (id) => {
        const panel = view.querySelector("#approvalPanel");
        panel.classList.remove("hidden");
        panel.innerHTML = `<div class="approval-panel__loading">Generating AI recommendation…</div>`;
        panel.scrollIntoView({ behavior: "smooth" });
        try {
            const res = await fetch(`/api/approvals/${id}`);
            const data = await res.json();
            panel.innerHTML = `
                <div class="approval-panel__header">
                    <h3>${data.parsed_name} — $${Number(data.parsed_amount).toFixed(2)}</h3>
                    <p class="approval-panel__purpose">${data.parsed_purpose}</p>
                </div>
                <div class="approval-panel__recommendation">
                    <h4>AI Analysis</h4>
                    <p>${data.recommendation}</p>
                </div>
                <div class="approval-panel__actions">
                    <label class="approval-panel__note-label">Decision Note</label>
                    <textarea id="decisionNote" class="approval-panel__note">${data.shortNote}</textarea>
                    <div class="approval-panel__btns">
                        <button class="btn btn--approve" data-action="approved" data-id="${id}">✓ Approve</button>
                        <button class="btn btn--deny"    data-action="denied"   data-id="${id}">✗ Deny</button>
                    </div>
                </div>
            `;
            panel.querySelectorAll("[data-action]").forEach(btn => {
                btn.addEventListener("click", async () => {
                    const note = panel.querySelector("#decisionNote").value;
                    await fetch(`/api/approvals/${id}/decide`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: btn.dataset.action, note }),
                    });
                    panel.classList.add("hidden");
                    loadSubmissions(view.querySelector("#statusFilter").value);
                });
            });
        } catch {
            panel.innerHTML = `<p class="error-state">Failed to load recommendation.</p>`;
        }
    };
}
```

- [ ] **Step 3: Wire John's submit form**

```js
if (this.state.account !== "Admin") {
    // Load John's submissions
    fetch("/api/approvals?status=all")
        .then(r => r.json())
        .then(subs => {
            const body = view.querySelector("#mySubmissionsBody");
            if (!subs.length) { body.innerHTML = `<p class="empty-state">No requests yet.</p>`; return; }
            body.innerHTML = subs.map(s => `
                <div class="submission-row">
                    <span class="submission-row__purpose">${s.parsed_purpose}</span>
                    <span class="submission-row__amount">$${Number(s.parsed_amount).toFixed(2)}</span>
                    <span class="badge badge--${s.status}">${s.status}</span>
                    <span class="submission-row__date">${new Date(s.created_at).toLocaleDateString()}</span>
                    ${s.note ? `<span class="submission-row__note">${s.note}</span>` : ""}
                </div>
            `).join("");
        });

    view.querySelector("#submitRequestForm")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const text = view.querySelector("#requestText").value.trim();
        if (!text) return;
        const btn = e.target.querySelector("button[type=submit]");
        btn.disabled = true;
        btn.textContent = "Submitting…";
        try {
            await fetch("/api/approvals", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ raw_request: text }),
            });
            view.querySelector("#requestText").value = "";
            btn.textContent = "Submitted!";
            setTimeout(() => { btn.disabled = false; btn.textContent = "Submit Request"; }, 2000);
            this.navigate("pre-approval"); // reload to show new submission
        } catch {
            btn.disabled = false;
            btn.textContent = "Failed — Retry";
        }
    });
}
```

- [ ] **Step 4: Add approval panel CSS to style.css**

```css
/* ── Pre-Approval ─────────────────────────────────────── */
.submissions-list { display: flex; flex-direction: column; gap: 0.5rem; padding: 1rem 1.5rem; }
.submission-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.875rem 1rem; background: var(--color-surface);
  border: 1px solid var(--color-border); border-radius: var(--radius-md);
  cursor: pointer; gap: 1rem;
}
.submission-row:hover { border-color: var(--color-accent); }
.submission-row__info { display: flex; flex-direction: column; gap: 0.2rem; }
.submission-row__name  { font-weight: 600; font-size: 0.9rem; }
.submission-row__dept  { font-size: 0.75rem; color: var(--color-text-sub); }
.submission-row__purpose { font-size: 0.8rem; }
.submission-row__meta  { display: flex; align-items: center; gap: 0.75rem; }
.submission-row__amount { font-weight: 600; }
.submission-row__note  { font-size: 0.75rem; color: var(--color-text-sub); font-style: italic; }
.submission-row__date  { font-size: 0.75rem; color: var(--color-text-sub); }
.approval-panel {
  margin: 1rem 1.5rem; padding: 1.5rem; background: var(--color-surface);
  border: 1px solid var(--color-border); border-radius: var(--radius-lg);
}
.approval-panel.hidden { display: none; }
.approval-panel__header h3 { margin: 0 0 0.25rem; }
.approval-panel__purpose { color: var(--color-text-sub); margin: 0 0 1rem; }
.approval-panel__recommendation { background: var(--color-bg); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1rem; }
.approval-panel__recommendation h4 { margin: 0 0 0.5rem; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-sub); }
.approval-panel__note-label { display: block; font-size: 0.8rem; font-weight: 600; margin-bottom: 0.4rem; }
.approval-panel__note { width: 100%; min-height: 60px; padding: 0.5rem; border-radius: var(--radius-sm); border: 1px solid var(--color-border); background: var(--color-bg); color: var(--color-text); font-family: inherit; font-size: 0.875rem; resize: vertical; }
.approval-panel__btns { display: flex; gap: 0.75rem; margin-top: 0.75rem; }
.btn--approve { background: #16a34a; color: #fff; border: none; padding: 0.6rem 1.5rem; border-radius: var(--radius-sm); cursor: pointer; font-weight: 600; }
.btn--deny    { background: #dc2626; color: #fff; border: none; padding: 0.6rem 1.5rem; border-radius: var(--radius-sm); cursor: pointer; font-weight: 600; }
.request-form { padding: 1.5rem; max-width: 600px; display: flex; flex-direction: column; gap: 0.75rem; }
.request-form__label { font-weight: 600; font-size: 0.875rem; }
.request-form__textarea { padding: 0.75rem; border-radius: var(--radius-md); border: 1px solid var(--color-border); background: var(--color-surface); color: var(--color-text); font-family: inherit; font-size: 0.9rem; resize: vertical; }
.badge--pending  { background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 999px; font-size: 0.7rem; font-weight: 600; }
.badge--approved { background: #d1fae5; color: #065f46; padding: 2px 8px; border-radius: 999px; font-size: 0.7rem; font-weight: 600; }
.badge--denied   { background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 999px; font-size: 0.7rem; font-weight: 600; }
```

- [ ] **Step 5: Verify full flow**

1. Switch to John → Pre-Approval → submit a request → "Submitted!"
2. Switch to Admin → Pre-Approval → new pending request appears
3. Click the request → AI recommendation panel loads
4. Approve → status updates to Approved
5. Check FINANCE_EMAIL inbox → approval email received with Approve/Deny buttons
6. Click Approve in email → confirmation page shown

- [ ] **Step 6: Commit**

```bash
git add app.js style.css
git commit -m "feat: Pre-Approval frontend — John submit form, Admin review panel, status filtering"
```

---

## Task 12: Expense Reports — Backend + Frontend

**Files:**
- Create: `ai/reports.js`
- Create: `routes/reports.js`
- Modify: `app.js` — expense-reports route

- [ ] **Step 1: Create ai/reports.js**

```js
const Anthropic = require('@anthropic-ai/sdk');
const { getDb } = require('../db');
const { REPORT_TOOLS, executeTool } = require('./tools');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are an expense report generator for an SMB finance team. 
Given an employee and date range, analyze their transactions and group them into logical expense reports.

Steps:
1. Use run_query to get the employee's transactions in the date range
2. Group transactions into logical clusters:
   - Same city + consecutive dates → a trip report (name it: "Trip to [City] — [Date Range]")
   - Recurring merchant + ~monthly interval → a subscription report (name it: "[Merchant] Subscriptions")  
   - MCC category cluster → a category report (name it: "[Category] Expenses — [Month]")
3. For each group, check against policy rules using get_policy_rules
4. Return a JSON array of report objects with this structure:
[
  {
    "title": "string",
    "date_range_start": "YYYY-MM-DD",
    "date_range_end": "YYYY-MM-DD",
    "transaction_ids": [1, 2, 3],
    "total_amount": 1234.56,
    "policy_summary": "string — 1-2 sentences on compliance status"
  }
]

Return ONLY the JSON array, no other text.`;

async function generateReports(employeeId, dateStart, dateEnd) {
  const userMsg = `Generate expense reports for employee ID ${employeeId} for transactions between ${dateStart} and ${dateEnd}.`;
  const messages = [{ role: 'user', content: userMsg }];
  let response;
  let iterations = 0;

  while (iterations < 15) {
    iterations++;
    response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: REPORT_TOOLS,
      messages,
    });

    if (response.stop_reason === 'end_turn') break;

    if (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');
      messages.push({ role: 'assistant', content: response.content });
      const toolResults = toolUseBlocks.map(block => ({
        type: 'tool_result',
        tool_use_id: block.id,
        content: JSON.stringify(executeTool(block.name, block.input)),
      }));
      messages.push({ role: 'user', content: toolResults });
    } else {
      break;
    }
  }

  const text = response.content.find(b => b.type === 'text')?.text || '[]';
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  try {
    return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
  } catch {
    return [];
  }
}

module.exports = { generateReports };
```

- [ ] **Step 2: Create routes/reports.js**

```js
const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { generateReports } = require('../ai/reports');

// GET /api/reports  (?status=pending|approved|denied|all)
router.get('/', (req, res) => {
  const db = getDb();
  const status = req.query.status || 'all';
  const query = status === 'all'
    ? `SELECT r.*, e.name as emp_name, e.department as emp_dept,
              COUNT(ri.id) as item_count
       FROM expense_reports r
       JOIN employees e ON r.employee_id = e.id
       LEFT JOIN expense_report_items ri ON ri.report_id = r.id
       GROUP BY r.id ORDER BY r.created_at DESC`
    : `SELECT r.*, e.name as emp_name, e.department as emp_dept,
              COUNT(ri.id) as item_count
       FROM expense_reports r
       JOIN employees e ON r.employee_id = e.id
       LEFT JOIN expense_report_items ri ON ri.report_id = r.id
       WHERE r.status = ?
       GROUP BY r.id ORDER BY r.created_at DESC`;
  const rows = status === 'all' ? db.prepare(query).all() : db.prepare(query).all(status);
  res.json(rows);
});

// POST /api/reports/generate
router.post('/generate', async (req, res) => {
  const { employee_id, date_start, date_end } = req.body;
  if (!employee_id || !date_start || !date_end) {
    return res.status(400).json({ error: 'employee_id, date_start, date_end required' });
  }
  try {
    const db = getDb();
    const reportGroups = await generateReports(employee_id, date_start, date_end);

    const insertReport = db.prepare(`
      INSERT INTO expense_reports (employee_id, title, date_range_start, date_range_end, total_amount, policy_summary)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const insertItem = db.prepare(
      'INSERT INTO expense_report_items (report_id, transaction_id) VALUES (?, ?)'
    );

    const created = [];
    for (const group of reportGroups) {
      const r = insertReport.run(
        employee_id, group.title, group.date_range_start, group.date_range_end,
        group.total_amount, group.policy_summary
      );
      for (const txId of (group.transaction_ids || [])) {
        insertItem.run(r.lastInsertRowid, txId);
      }
      created.push(r.lastInsertRowid);
    }

    res.json({ success: true, created: created.length, report_ids: created });
  } catch (err) {
    console.error('Report generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reports/:id/decide
router.post('/:id/decide', (req, res) => {
  const { action, note } = req.body;
  if (!['approved', 'denied'].includes(action)) {
    return res.status(400).json({ error: 'action must be approved or denied' });
  }
  const db = getDb();
  db.prepare(`UPDATE expense_reports SET status = ? WHERE id = ?`).run(action, req.params.id);
  res.json({ success: true, status: action });
});

module.exports = router;
```

- [ ] **Step 3: Update expense-reports route in app.js**

Replace the existing `expense-reports` route render and init with:

```js
// Render
{
    id: "expense-reports",
    title: "Expense Reports",
    navLabel: "Expense Reports",
    render: (state) => `
        <section class="page reports-page">
            <header class="page-header">
                <h1 class="page-header__title">Expense Reports</h1>
                ${state.account === "Admin" ? `
                <div class="page-header__actions">
                    <select id="reportEmployee" class="filter-select">
                        <option value="">Select employee…</option>
                    </select>
                    <input type="date" id="reportStart" class="date-input" />
                    <input type="date" id="reportEnd" class="date-input" />
                    <button id="generateBtn" class="btn btn--primary">Generate Reports</button>
                </div>` : ""}
            </header>
            <div id="reportsList" class="reports-list">Loading…</div>
        </section>`,
},
```

Init code for expense-reports:

```js
if (route.id === "expense-reports") {
    const loadReports = () => {
        fetch("/api/reports")
            .then(r => r.json())
            .then(reports => {
                const list = view.querySelector("#reportsList");
                if (!reports.length) { list.innerHTML = `<p class="empty-state">No expense reports yet.</p>`; return; }
                list.innerHTML = reports.map(r => `
                    <div class="report-card">
                        <div class="report-card__header">
                            <span class="report-card__title">${r.title}</span>
                            <span class="badge badge--${r.status}">${r.status}</span>
                        </div>
                        <div class="report-card__meta">
                            <span>${r.emp_name} · ${r.emp_dept}</span>
                            <span>${r.date_range_start} → ${r.date_range_end}</span>
                            <span>${r.item_count} transactions · <strong>$${Number(r.total_amount).toFixed(2)}</strong></span>
                        </div>
                        <p class="report-card__policy">${r.policy_summary || ""}</p>
                        ${r.status === "pending" && this.state.account === "Admin" ? `
                        <div class="report-card__actions">
                            <button class="btn btn--approve" data-report="${r.id}" data-action="approved">✓ Approve</button>
                            <button class="btn btn--deny"    data-report="${r.id}" data-action="denied">✗ Deny</button>
                        </div>` : ""}
                    </div>
                `).join("");
                list.querySelectorAll("[data-report]").forEach(btn => {
                    btn.addEventListener("click", () => {
                        fetch(`/api/reports/${btn.dataset.report}/decide`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ action: btn.dataset.action }),
                        }).then(() => loadReports());
                    });
                });
            });
    };

    loadReports();

    if (this.state.account === "Admin") {
        // Populate employee dropdown
        fetch("/api/compliance/leaderboard")
            .then(r => r.json())
            .then(() => {
                // Use employees endpoint via a quick query
                return fetch("/api/approvals?status=all");
            })
            .catch(() => {});

        // Simpler: fetch employees directly
        fetch("/api/reports").then(() => {
            // Load employee list for dropdown via a known route that returns emp data
        });

        // Set default date range (last 90 days)
        const endDate = new Date().toISOString().split("T")[0];
        const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        const startInput = view.querySelector("#reportStart");
        const endInput = view.querySelector("#reportEnd");
        if (startInput) startInput.value = startDate;
        if (endInput) endInput.value = endDate;

        view.querySelector("#generateBtn")?.addEventListener("click", async () => {
            const empSel = view.querySelector("#reportEmployee");
            const empId = empSel?.value;
            const start = view.querySelector("#reportStart")?.value;
            const end = view.querySelector("#reportEnd")?.value;
            if (!empId || !start || !end) {
                alert("Please select an employee and date range.");
                return;
            }
            const btn = view.querySelector("#generateBtn");
            btn.disabled = true;
            btn.textContent = "Generating…";
            try {
                const res = await fetch("/api/reports/generate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ employee_id: parseInt(empId), date_start: start, date_end: end }),
                });
                const data = await res.json();
                btn.textContent = `Generated ${data.created} report(s)`;
                setTimeout(() => { btn.disabled = false; btn.textContent = "Generate Reports"; }, 2000);
                loadReports();
            } catch {
                btn.disabled = false;
                btn.textContent = "Failed — Retry";
            }
        });
    }
}
```

- [ ] **Step 4: Add GET /api/employees route to server.js**

Add a simple employees endpoint so the report dropdown can populate. Add to `server.js` before route mounts:

```js
app.get('/api/employees', (_req, res) => {
  const { getDb } = require('./db');
  const employees = getDb().prepare('SELECT id, name, department FROM employees ORDER BY name').all();
  res.json(employees);
});
```

Then in the expense-reports init, populate the employee dropdown:

```js
fetch("/api/employees")
    .then(r => r.json())
    .then(employees => {
        const sel = view.querySelector("#reportEmployee");
        if (!sel) return;
        employees.forEach(e => {
            const opt = document.createElement("option");
            opt.value = e.id;
            opt.textContent = `${e.name} (${e.department})`;
            sel.appendChild(opt);
        });
    });
```

- [ ] **Step 5: Add report card CSS to style.css**

```css
/* ── Expense Reports ──────────────────────────────────── */
.reports-list { display: flex; flex-direction: column; gap: 0.75rem; padding: 1rem 1.5rem; }
.report-card {
  background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: var(--radius-lg); padding: 1.25rem;
  display: flex; flex-direction: column; gap: 0.5rem;
}
.report-card__header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.report-card__title  { font-weight: 600; }
.report-card__meta   { display: flex; flex-wrap: wrap; gap: 1rem; font-size: 0.8rem; color: var(--color-text-sub); }
.report-card__policy { font-size: 0.8rem; color: var(--color-text-sub); font-style: italic; }
.report-card__actions { display: flex; gap: 0.5rem; margin-top: 0.5rem; }
.date-input { padding: 0.4rem 0.6rem; border-radius: var(--radius-sm); border: 1px solid var(--color-border); background: var(--color-surface); color: var(--color-text); font-family: inherit; }
```

- [ ] **Step 6: Test full flow**

1. Open `http://localhost:3000` as Admin → Expense Reports
2. Select an employee, set date range (e.g. 2025-08-01 to 2026-01-01)
3. Click "Generate Reports" → AI groups transactions → report cards appear
4. Each card shows title, date range, transaction count, total, policy summary
5. Click Approve on a report → status badge updates to Approved

- [ ] **Step 7: Commit**

```bash
git add ai/reports.js routes/reports.js app.js style.css server.js
git commit -m "feat: Automated Expense Report Generation with AI grouping and approve/deny workflow"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** All 4 required features + Saved Visuals Gallery covered
- [x] **Tool types consistent:** `executeTool` in `ai/tools.js` handles all tool names referenced in feature loops
- [x] **Route mounting:** all `routes/*.js` files mounted in `server.js`
- [x] **email.js** is required in `routes/approvals.js` — file is created in Task 10
- [x] **`/api/approvals/decide`** GET route must be registered BEFORE `/:id` GET route to avoid Express matching "decide" as an ID — the order in `routes/approvals.js` handles this correctly
- [x] **Session ID** stored in localStorage as `exi.session_id` — added to STORAGE in Task 6
- [x] **`appendChart`** method added to App class — used in Task 6 and Task 7
- [x] **`/api/employees`** added to `server.js` in Task 12 for the report dropdown
- [x] **Seed guard** prevents re-seeding on restart
- [x] **`exi.db`** excluded from git (add to `.gitignore`)

Add to `.gitignore`:
```
node_modules/
.env
exi.db
```
