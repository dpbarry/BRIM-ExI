// ai/tools.js
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
    description: "Get an employee's transaction history for the last 90 days plus their violation count and severity breakdown.",
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
    if (!sql.trim().toLowerCase().startsWith('select')) {
      return { error: 'Only SELECT queries are permitted.' };
    }
    try {
      const stmt = db.prepare(sql);
      if (!stmt.reader) {
        return { error: 'Only SELECT queries are permitted.' };
      }
      const rows = stmt.all();
      // Enforce row limit to avoid bloating Claude tool-result payloads
      const limited = rows.slice(0, 200);
      return { rows: limited, count: rows.length, truncated: rows.length > 200 };
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
    if (!employee) return { error: `Employee with id ${employee_id} not found` };
    return { employee, recent_transactions: txns, violation_summary: violations };
  }

  if (name === 'get_department_budget') {
    const { department } = input;
    const currentPeriod = getCurrentQuarter();
    let budget = db.prepare(
      'SELECT * FROM department_budgets WHERE department = ? AND period = ?'
    ).get(department, currentPeriod);
    // Fall back to most recent available period if current quarter not seeded
    if (!budget) {
      budget = db.prepare(
        'SELECT * FROM department_budgets WHERE department = ? ORDER BY period DESC LIMIT 1'
      ).get(department);
    }
    if (!budget) return { error: `No budget data found for department: ${department}` };
    return { ...budget, remaining: budget.budget_amount - budget.spent_amount, note: budget.period !== currentPeriod ? `Using most recent available period (${budget.period}); current quarter (${currentPeriod}) not yet seeded` : undefined };
  }

  if (name === 'flag_violation') {
    const { employee_id, transaction_id, rule_id, amount, merchant, date, severity, note, reasoning } = input;
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return { error: `Invalid date format: "${date}". Expected YYYY-MM-DD.` };
    }
    // Avoid duplicate violations for same transaction + rule
    const existing = db.prepare(
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
