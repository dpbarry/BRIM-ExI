# ExI — Product Requirements Document

**Product:** ExI (Expense Intelligence)  
**Competition:** McGill CBC Hackathon 2026 — Brim Financial Sub-Challenge  
**Date:** 2026-04-03  
**Stack:** Vanilla JS · Node.js/Express · SQLite · Claude API · Resend · ApexCharts

---

## Problem

SMBs generate thousands of card transactions per month but lack the tools to understand their own spending, enforce expense policies, or manage approvals efficiently. Finance managers — often the business owner themselves — are drowning in spreadsheets and email chains.

---

## Solution

ExI is an AI-powered expense intelligence platform that makes company spending data accessible, policy-compliant, and actionable — without requiring technical knowledge from the finance team.

---

## Users

| Role | Account | Primary Actions |
|---|---|---|
| Finance Manager / Admin | Admin | Review analytics, run compliance scans, approve/deny requests and reports |
| Employee | John | Submit expense requests, view own history |

---

## Core Features (Required)

### 1. Talk to Your Data
Finance managers ask questions in plain English and receive answers with the right visualization.

**How it works:**
- User types a natural language question into the chat composer
- Claude (via tool use) determines which data tables are needed, fetches schema + sample rows, crafts a SQL query, executes it, and generates an ApexCharts visualization
- Response: text summary + chart rendered inline
- Follow-up questions maintain conversation context (persisted in SQLite across sessions)
- Users can save charts to the **Saved Visuals Gallery** for quick re-access

**Success criteria:**
- Multi-step reasoning across departments, time periods, and categories
- Context carries between follow-up questions
- Charts are appropriate to the data (pie for proportions, bar for comparisons, line for trends)

---

### 2. Policy Compliance Engine
Automated scanning of transactions against company expense policy, with AI contextual reasoning.

**How it works:**
- Violations and employee leaderboard are loaded from SQLite (seeded from real transaction data)
- Admin can trigger a live "Run Compliance Scan" — Claude scans recent transactions in batches, reasons contextually (not just rule-matching), and flags violations
- Violations ranked by severity (High / Med / Low)
- Repeat offenders surfaced in leaderboard
- AI catches nuanced violations: split purchases to duck thresholds, alcohol on non-client meals, etc.

**Success criteria:**
- Detects split-purchase abuse (e.g. $600 split into 2x $300 to avoid $500 threshold)
- Severity ranking is meaningful and explainable
- Leaderboard drives accountability

---

### 3. AI Pre-Approval Workflow
Streamlined approval process with AI-generated recommendations, accessible from web or email.

**How it works:**
- **Employee (John):** Submits a free-text expense request. Claude parses it into structured fields (name, department, purpose, amount). Stored in DB as Pending.
- **Finance Manager (Admin):** Views submissions filtered by Pending by default. Clicking a request triggers Claude to gather context (spend history, budget status, violation history) and generate an Approve/Deny recommendation with reasoning.
- Admin can use the AI-generated note or write their own, then approve or deny.
- **Email notification:** Resend fires immediately on new submission. Email contains AI context + Approve/Deny buttons (tokenized links). One click from inbox — no login required.
- Token invalidated after use. Web app generates a fresh recommendation independently.

**Success criteria:**
- AI recommendation includes: employee spend history, department budget remaining, violation count, clear Approve/Deny suggestion with reasoning
- Email approve/deny updates DB status in real time
- Finance manager never needs to leave their inbox for straightforward decisions

---

### 4. Automated Expense Report Generation
AI groups transactions into logical expense reports, applies policy checks, and routes for approval.

**How it works:**
- Admin selects an employee + date range
- Claude queries transaction history and groups into logical clusters:
  - Same city + consecutive dates → trip report (e.g. "San Diego Conference — Sept 12–15")
  - Recurring merchant + monthly pattern → subscription report
  - MCC category cluster → category report (e.g. "Software Purchases — Q3")
- Each report: employee, date range, transaction list, total, policy compliance summary
- Reports routed through same Approve/Deny workflow as submissions

**Success criteria:**
- Grouping logic is intelligent and produces named, meaningful reports
- Policy compliance summary identifies any issues within the report
- CFO/Admin can approve an entire trip or category with one click

---

## Bonus Feature

### Saved Visuals Gallery
A dedicated route in the sidebar that displays all charts saved from Talk to Your Data. Partial implementation — list and render only. Finance managers can revisit key charts without re-asking questions.

---

## Data Model Summary

| Table | Purpose |
|---|---|
| `employees` | ~10 synthetic employees seeded from MCC patterns in xlsx |
| `transactions` | 4,235 rows imported from `brimtransactions.xlsx` |
| `policy_rules` | Rules from app + Brim expense policy PDF |
| `violations` | Compliance flags (seeded + dynamically generated) |
| `submissions` | Pre-approval requests (seeded for demo + live from John) |
| `saved_charts` | Charts saved from Talk to Data |
| `conversation_history` | Talk to Data chat history, persists across sessions |
| `expense_reports` | AI-generated report clusters |
| `expense_report_items` | Transactions belonging to each report |
| `department_budgets` | Synthetic budgets derived from actual xlsx spend |

---

## AI Architecture

**Model:** `claude-sonnet-4-6`  
**Pattern:** Native tool use — Claude decides which tools to call and in what order

**Shared tools (all features):**
- `get_schema(table)` — structure + sample rows
- `run_query(sql)` — SELECT only, read-only guard enforced server-side
- `get_policy_rules()` — full policy context

**Feature tools:**
- `save_chart(...)` — Talk to Data
- `get_employee_history(id)` — Pre-Approval
- `get_department_budget(dept)` — Pre-Approval
- `flag_violation(...)` — Compliance Scan

---

## Technical Constraints

- Vanilla JS frontend — no frameworks, no build step
- Express serves static files — single origin, no CORS complexity
- `better-sqlite3` — synchronous, file-based, zero setup
- All AI calls server-side — API key never exposed to browser
- `run_query` enforces SELECT-only — no AI-driven data mutations

---

## Judging Alignment

| Criterion | How ExI addresses it |
|---|---|
| Required features /6 | All 4 features fully implemented and genuinely useful |
| Optional features /6 | Saved Visuals Gallery + email approval from inbox |
| AI depth /4 | Multi-step tool use loop, contextual reasoning, agentic workflows — not single-prompt wrappers |
| UI/UX /4 | Built on existing polished design system, charts that clarify not decorate |
