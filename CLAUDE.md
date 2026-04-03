# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Running the App

```bash
npm install
cp .env.example .env    # fill in keys (see Environment Variables below)
node server.js          # seeds DB on first run, serves at http://localhost:3000
```

The seed script (`seed.js`) runs automatically on first start — it reads `data/brimtransactions.xlsx`, creates synthetic employees, imports all transactions, seeds violations, submissions, and budgets. It only runs once (guarded by a `seeded` table in SQLite).

To force a re-seed: delete `exi.db` and restart.

---

## Architecture

**Split model:** Express backend + vanilla JS frontend. Express serves the static files directly — no separate frontend server, no CORS.

```
server.js          Express entry point
db.js              SQLite schema + better-sqlite3 connection singleton
seed.js            One-time data seeder (xlsx → SQLite)
routes/            API route handlers (chat, compliance, approvals, reports)
ai/                Claude agentic loops + tool definitions (tools.js, chat.js, approvals.js, compliance.js)
app.js             All frontend logic (SPA router, state, UI rendering)
index.html         SPA shell — sidebar + <main class="content-shell">
style.css          Design system (CSS custom properties, light/dark theme)
data/              brimtransactions.xlsx (source of truth, 4,235 rows)
docs/              Hackathon brief, judging criteria, Brim expense policy PDF
```

---

## Frontend Conventions (critical — do not break)

`app.js` is a single-file SPA. All routes follow this exact pattern:

```js
{ id: "route-id", title: "...", navLabel: "...", render: (state) => `...html...` }
```

Routes render into `.content-shell` via `innerHTML`. **Never change this contract.**

State is stored in `localStorage` under these keys (defined in `STORAGE` at the top of `app.js`):
- `exi.route` — current route
- `exi.account` — "Admin" or "John"
- `exi.theme` — "light" or "dark"
- `exi.talk.hasMessage` — whether chat thread has content
- `exi.session_id` — UUID for conversation history

Account gating: `this.state.account === 'Admin'` controls visibility of finance manager features (Run Compliance Scan, Approvals view, Generate Reports). John's view shows Submit Request and own history only.

**Style rules:**
- `style.css` — additions only, never remove or override existing rules
- All colors via CSS custom properties (`--color-*`)
- Accent: `#00b8e6` light / `#3dd3f5` dark
- No CSS frameworks, no build step
- ApexCharts loaded from CDN in `index.html`

---

## AI Layer (Claude Tool Use)

All AI features use the same agentic loop pattern in `ai/`:

1. Build `messages` array with system prompt + history + user input
2. Call Claude API (`claude-sonnet-4-6`, max 4096 tokens) with tools
3. If response has `tool_use` blocks → execute tool → append `tool_result` → loop
4. On `end_turn` with text → return to route handler

**Shared tools** (available to all features, defined in `ai/tools.js`):
- `get_schema(table)` — column names + 3 sample rows
- `run_query(sql)` — SELECT only; server enforces read-only guard before execution
- `get_policy_rules()` — all policy_rules rows

**Feature-specific tools:**
- `save_chart(title, query, config)` — Talk to Data
- `get_employee_history(employee_id)` — Pre-Approval
- `get_department_budget(department)` — Pre-Approval
- `flag_violation(employee_id, tx_id, rule_id, severity, reasoning)` — Compliance Scan

Claude can call `get_schema` and `run_query` on any table from any feature — don't restrict this.

---

## Database (SQLite via `better-sqlite3`)

Key tables and their roles:

| Table | Role |
|---|---|
| `employees` | ~10 synthetic employees seeded from MCC patterns in xlsx |
| `transactions` | 4,235 rows from xlsx, assigned to employees via MCC→department mapping |
| `policy_rules` | Expense policy rules (from app.js array + BrimExpensePolicy.pdf) |
| `violations` | Compliance flags — seeded + written by `flag_violation` tool |
| `submissions` | Pre-approval requests — seeded for demo + live from John's UI |
| `conversation_history` | Talk to Data chat, keyed by `session_id`, persists across sessions |
| `saved_charts` | Charts saved from Talk to Data, shown in Saved Visuals Gallery |
| `expense_reports` + `expense_report_items` | AI-grouped transaction clusters for CFO approval |
| `department_budgets` | Synthetic budgets derived from actual xlsx aggregate spend |

`decision_token` on `submissions` is a UUID v4 used in email approve/deny links — set to NULL after use.

---

## API Routes

```
POST /api/chat                        Talk to Data (agentic loop, returns { text, chartConfig })
GET  /api/chat/saved-charts           Saved Visuals Gallery data
POST /api/chat/save-chart             Manual save (also callable as Claude tool)

GET  /api/compliance/violations       Violations joined with employees
GET  /api/compliance/leaderboard      Aggregate violations per employee
POST /api/compliance/scan             Trigger AI compliance scan (Admin only)

GET  /api/approvals                   Submissions list (?status=pending|approved|denied)
POST /api/approvals                   New submission from John (parses + emails)
GET  /api/approvals/:id               Fetch one + trigger AI recommendation
POST /api/approvals/:id/decide        Approve/deny from web app
GET  /api/approvals/decide            Approve/deny from email token (?token=&action=)

GET  /api/reports                     All expense reports
POST /api/reports/generate            AI groups transactions into reports
POST /api/reports/:id/decide          Approve/deny a report
```

---

## Environment Variables

```
ANTHROPIC_API_KEY=
RESEND_API_KEY=
FINANCE_EMAIL=       # receives pre-approval notification emails
PORT=3000
```

---

## Hackathon Context

**Competition:** McGill CBC Hackathon — April 4, 2026 | Brim Financial Sub-Challenge  
**Judging (Brim, 20pts):** Required features /6 · Optional/creativity /6 · AI depth /4 · UI/UX /4  
**Key judge note:** Quality over quantity — 2 features that work beautifully beat 6 that half-work. AI depth means multi-step reasoning and agentic workflows, not single-prompt wrappers.

Full brief: `docs/BRIM_SubChallenge_Info.txt`  
Expense policy: `docs/BrimExpensePolicy.pdf`  
Full PRD: `PRD.md`

### Transaction Data (`data/brimtransactions.xlsx`)
4,235 transactions | Aug 2025–Mar 2026 | $0.05–$264,517.44  
14 columns: Transaction Code (type classifier, not employee ID), Description, Category, Posting Date, Transaction Date, Merchant Name, Amount, Debit/Credit, MCC, City, Country, Postal, State, Conversion Rate (0 = CAD)

### Key Expense Policy Rules
- Expenses **>$50** require manager pre-authorization
- Alcohol only reimbursable when dining with a customer
- Meal tips capped at **20%**, service tips at **15%**
- Corporate cards: named cardholder only, no personal charges
