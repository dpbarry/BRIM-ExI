# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Build Status — Where We Are

### ✅ Completed (Tasks 1–10)

- **Task 1:** `package.json`, `server.js`, `.env.example`, `.gitignore`, stub route files — Express boots cleanly
- **Task 2:** `db.js` — all 11 SQLite tables via better-sqlite3 v12 (upgraded from v9 for Node.js v24 compatibility)
- **Task 3:** `seed.js` — reads `data/brimtransactions.xlsx`, inserts 10 employees, 12 policy rules, 4235 transactions, 30 violations, 12 submissions, 15 budget rows. Idempotent (guarded by `seeded` table).
- **Task 4:** `ai/tools.js` — all Claude tool definitions (CHAT_TOOLS, APPROVAL_TOOLS, COMPLIANCE_TOOLS, REPORT_TOOLS) + `executeTool` dispatcher. Hardened: `stmt.reader` enforces SELECT-only, 200-row result cap, `flag_violation` deduplicates by (transaction_id, rule_id), `get_department_budget` falls back to latest available period.
- **Task 5:** `ai/chat.js` + `routes/chat.js` — Talk to Data agentic loop (MAX_ITERATIONS=15), ApexCharts config extraction from ```apexcharts blocks, conversation history persisted to SQLite. Routes: `POST /api/chat`, `GET /api/chat/saved-charts`, `GET /api/chat/history/:sessionId`.
- **Task 6:** Talk to Data frontend wired — ApexCharts CDN in `index.html`, `getSessionId()` helper, `appendChart()` method on App class, form submit replaced with real `fetch('/api/chat')`, history loading on route init with chart replay. Dead `_runStream` removed. Double-render on page load fixed.
- **Task 7:** Saved Visuals Gallery — `saved-visuals` route in `app.js`, gallery grid with ApexCharts per card, HTML-escaped titles/queries. Gallery chart container has explicit `height: 220px`.
- **Task 8:** `ai/compliance.js` + `routes/compliance.js` — compliance scan agentic loop (MAX_ITERATIONS=20), `GET /violations`, `GET /leaderboard`, `POST /scan`. SDK timeout correctly passed as second argument to `client.messages.create`.
- **Task 9:** Policy Compliance frontend — violations table and leaderboard now fetched from API (no hardcoded data). "Run Compliance Scan" button added (Admin only), navigates to reload after scan.
- **Task 10:** `ai/approvals.js` + `routes/approvals.js` + `email.js` — `parseRequest` (single Claude call), `generateRecommendation` (agentic loop with APPROVAL_TOOLS). Full REST: `GET /`, `POST /`, `GET /decide` (email token, registered before `/:id`), `GET /:id`, `POST /:id/decide`. Email via Resend with approve/deny token links.

### ❌ Not Yet Built (Tasks 11–12)

| Task | What to build | Key files |
|---|---|---|
| **11** | Pre-Approval Frontend | Modify `app.js` — Admin submissions list + approval panel, John submit form + history |
| **12** | Expense Reports | `ai/reports.js`, `routes/reports.js`, modify `app.js` (expense-reports route) |

### How to Resume
The full implementation plan is at:
`docs/superpowers/plans/2026-04-03-exi-implementation.md`

Start at **Task 11**. Use `superpowers:subagent-driven-development` skill with the plan file.

Each task follows: dispatch implementer subagent → spec review → code quality review → mark complete → next task.

---

## Running the App

```bash
npm install
cp .env.example .env    # fill in keys (see Environment Variables below)
node server.js          # seeds DB on first run, serves at http://localhost:3000
```

The seed script (`seed.js`) runs automatically on first start — it reads `data/brimtransactions.xlsx`, creates synthetic employees, imports all transactions, seeds violations, submissions, and budgets. It only runs once (guarded by a `seeded` table in SQLite).

To force a re-seed: delete `exi.db` and restart.

> **Note:** `better-sqlite3` requires Node.js v18–v24. We use v12.x of the package (not v9) — this is intentional for Node.js v24 compatibility. Do not downgrade.

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
