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
  5199: 'Operations', 5085: 'Operations',
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

function scaleTxAmount(rawAmount) {
  if (rawAmount <= 200)   return rawAmount;
  if (rawAmount <= 2000)  return 200 + (rawAmount - 200) * 0.20;
  if (rawAmount <= 20000) return 560 + (rawAmount - 2000) * 0.05;
  return Math.min(1460 + (rawAmount - 20000) * 0.01, 2500);
}

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

  // Global round-robin across all employees — prevents any one employee from
  // accumulating thousands of transactions due to dominant MCC categories in the xlsx
  const allEmpIds = EMPLOYEES.map(emp => empIds[emp.name]);
  let globalCounter = 0;

  const insertTx = db.prepare(`
    INSERT INTO transactions
      (transaction_code, description, category, posting_date, transaction_date,
       merchant_name, amount, type, mcc, city, country, postal_code, state,
       conversion_rate, employee_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((rows) => {
    for (const row of rows) {
      const mcc = parseInt(row['Merchant Category Code']) || null;
      const empId = allEmpIds[globalCounter % allEmpIds.length];
      globalCounter++;

      const rawAmount = parseFloat(row['Transaction Amount']) || 0;
      const convRate = parseFloat(row['Conversion Rate']) || 0;
      const cadAmount = convRate > 0 ? rawAmount * convRate : rawAmount;

      insertTx.run(
        String(row['Transaction Code'] || ''),
        row['Transaction Description'] || '',
        String(row['Transaction Category'] || ''),
        excelDateToString(row['Posting date of transaction']),
        excelDateToString(row['Transaction Date']),
        row['Merchant Info DBA Name'] || '',
        scaleTxAmount(cadAmount),
        row['Debit or Credit'] || 'Debit',
        mcc,
        String(row['Merchant City'] || ''),
        row['Merchant Country'] || '',
        String(row['Merchant Postal Code'] || ''),
        row['Merchant State/Province'] || '',
        0,  // amounts pre-normalized to CAD — no further conversion needed
        empId
      );
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
    "SELECT * FROM transactions WHERE amount > 500 AND type = 'Debit' ORDER BY amount DESC LIMIT 20"
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

  // Flag hotel/airline transactions as possible non-portal bookings
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

  // Seed concentrated violations for Aisha Mensah (repeat offender pattern)
  const aisha = db.prepare("SELECT id FROM employees WHERE name = 'Aisha Mensah'").get();
  if (aisha) {
    const mealRuleId = ruleIds[3]; // "Client meal expenses capped at $75..."

    // 1. Travel portal violations (top 3 hotel/airline transactions)
    const aishaTravelTxs = db.prepare(
      `SELECT * FROM transactions WHERE employee_id = ? AND (mcc = 7011 OR (mcc >= 3500 AND mcc <= 3640)) ORDER BY amount DESC LIMIT 3`
    ).all(aisha.id);
    for (const tx of aishaTravelTxs) {
      const existing = db.prepare('SELECT id FROM violations WHERE transaction_id = ? AND rule_id = ?').get(tx.id, travelRuleId);
      if (!existing) {
        insertViolation.run(
          aisha.id, tx.id, travelRuleId, tx.amount, tx.merchant_name, tx.transaction_date,
          'med',
          `Hotel/airfare booking at ${tx.merchant_name} ($${tx.amount.toFixed(2)}) — verify booking via approved travel portal. This is a recurring pattern for this employee.`,
          `Repeated direct hotel/airline booking. Policy requires travel portal. Pattern of non-compliance detected.`
        );
      }
    }

    // 2. Large purchase violations ($500+ without pre-approval)
    const aishaLargeTxs = db.prepare(
      `SELECT * FROM transactions WHERE employee_id = ? AND amount > 500 AND type = 'Debit' ORDER BY amount DESC LIMIT 2`
    ).all(aisha.id);
    for (const tx of aishaLargeTxs) {
      const existing = db.prepare('SELECT id FROM violations WHERE transaction_id = ? AND rule_id = ?').get(tx.id, approvalRuleId);
      if (!existing) {
        const severity = tx.amount > 2000 ? 'high' : 'med';
        insertViolation.run(
          aisha.id, tx.id, approvalRuleId, tx.amount, tx.merchant_name, tx.transaction_date,
          severity,
          `Transaction of $${tx.amount.toFixed(2)} at ${tx.merchant_name} exceeds $500 approval threshold. No pre-authorization on file. Third offense this quarter.`,
          `Amount exceeds $500 pre-approval policy. No approval record found. Employee has prior violations.`
        );
      }
    }

    // 3. Meal cap violation (highest restaurant transaction over $75)
    const aishaMealTx = db.prepare(
      `SELECT * FROM transactions WHERE employee_id = ? AND mcc IN (5812, 5813, 5814) ORDER BY amount DESC LIMIT 1`
    ).get(aisha.id);
    if (aishaMealTx && aishaMealTx.amount > 75) {
      const existing = db.prepare('SELECT id FROM violations WHERE transaction_id = ? AND rule_id = ?').get(aishaMealTx.id, mealRuleId);
      if (!existing) {
        insertViolation.run(
          aisha.id, aishaMealTx.id, mealRuleId, aishaMealTx.amount, aishaMealTx.merchant_name, aishaMealTx.transaction_date,
          'low',
          `Restaurant charge of $${aishaMealTx.amount.toFixed(2)} at ${aishaMealTx.merchant_name} exceeds the $75/person client meal cap.`,
          `Amount exceeds meal policy cap. Documentation of attendees and business purpose required.`
        );
      }
    }
  }

  console.log('Seeded violations.');

  // 5. Seed submissions from large transactions
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
    "SELECT t.*, e.name as emp_name, e.department as emp_dept FROM transactions t JOIN employees e ON t.employee_id = e.id WHERE t.amount > 400 AND t.type = 'Debit' ORDER BY t.amount DESC LIMIT 12"
  ).all();

  const insertSubmission = db.prepare(`
    INSERT INTO submissions (employee_id, raw_request, parsed_name, parsed_department, parsed_purpose, parsed_amount, status, decision_token, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ? || ' days'))
  `);

  const statuses = ['pending', 'pending', 'pending', 'pending', 'pending', 'approved', 'approved', 'denied', 'pending', 'pending', 'approved', 'pending'];
  for (let i = 0; i < submissionTxs.length; i++) {
    const tx = submissionTxs[i];
    const emp = { name: tx.emp_name, department: tx.emp_dept };
    const template = submissionTemplates[i % submissionTemplates.length](tx, emp);
    const daysAgo = `-${Math.floor(Math.random() * 14)}`;
    insertSubmission.run(
      tx.employee_id,
      template.rawRequest,
      tx.emp_name,
      tx.emp_dept,
      template.purpose,
      tx.amount,
      statuses[i] || 'pending',
      uuidv4(),
      daysAgo
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
