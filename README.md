# ExI — Expense Intelligence

AI-powered expense intelligence platform for SMBs. Built for the 2026 McGill CBC Hackathon — Brim Financial Sub-Challenge.

## Features

- **Talk to Your Data** — Ask questions in plain English, get back charts and summaries powered by Claude AI
- **Policy Compliance Engine** — Automated transaction scanning against company expense policy with contextual AI reasoning
- **AI Pre-Approval Workflow** — Employees submit requests, AI generates approve/deny recommendations, finance manager decides from web or email
- **Automated Expense Report Generation** — AI groups transactions into logical reports (trips, subscriptions, categories) for CFO approval
- **Saved Visuals Gallery** — Save and revisit charts from your data conversations

## Stack

- **Frontend:** Vanilla JS, HTML5, CSS3 (no frameworks, no build step)
- **Backend:** Node.js + Express
- **Database:** SQLite (`better-sqlite3`)
- **AI:** Anthropic Claude API (`claude-sonnet-4-6`) with native tool use
- **Email:** Resend
- **Charts:** ApexCharts

## Setup

```bash
npm install
cp .env.example .env   # fill in ANTHROPIC_API_KEY, RESEND_API_KEY, FINANCE_EMAIL
node server.js         # seeds DB on first run, then serves at http://localhost:3000
```

## Docs

- `PRD.md` — Full product requirements
- `CLAUDE.md` — AI context and project conventions
- `docs/` — Hackathon brief, judging criteria, expense policy

## Polish / roadmap notes

See **`CLAUDE.md` → *Open UX / polish*** for details. In short:

- **Saved charts:** The app currently exposes two sidebar items (*Saved charts and graphs* vs *Saved Visuals*) for the same saved-chart data; they should be **merged into one**, favoring the **`data-gallery`** (`cg-page`) visuals.
- **Pre-Approval & Expense Reports:** UI should be **brought in line** with the rounded, polished look of Talk to Your Data and the Policy Compliance Engine.
