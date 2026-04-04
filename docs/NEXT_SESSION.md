# Next session — functional fixes & polish

Handoff list from manual testing. **Start with P0** items that block demos or corrupt data.

For **visual / IA consistency**, also read `CLAUDE.md` → **Frontend Conventions** and **Open UX / polish** (merge duplicate saved-chart tabs, align Pre-Approval + Expense Reports with `talk-page` / `pc-page` aesthetics).

---

## P0 — Data integrity & broken flows

### 1. Talk to your data — not working (likely API / errors)

**Observed:** Chat tab does not function; suspected Claude API not connected.

**Reality check:** The feature **is** wired: `POST /api/chat` (`routes/chat.js` → `ai/chat.js`), frontend `fetch` from `app.js` on the default route (`talk-to-data`). If `ANTHROPIC_API_KEY` is missing, invalid, or the account has **no API credits**, the server returns **500** with a generic message and the UI may look “dead.”

**Todos:**

- [ ] With server running, open browser **DevTools → Network**, send a prompt, inspect `POST /api/chat`: status code, response JSON (`error` field), and **terminal stderr** (`Chat error:`).
- [ ] Confirm `.env` has a valid `ANTHROPIC_API_KEY` for a workspace with **positive API credit balance** (Console → Plans & billing). Restart `npm start` after any `.env` change.
- [ ] If API works but UI still fails, trace `app.js`: form submit handler, `appendMessage` / `appendChart`, abort/stop handling, and history load `GET /api/chat/history/:sessionId`.
- [ ] **UX:** Surface API failures in-thread (e.g. “Couldn’t reach AI: …”) instead of silent failure.

**Files:** `app.js` (talk route + `initRoute` for `talk-to-data`), `routes/chat.js`, `ai/chat.js`.

---

### 2. Expense Reports — AI backend failing

**Observed:** Generate reports path fails (server or model error).

**Todos:**

- [ ] Reproduce: Admin → Expense Reports → pick employee, date range → **Generate Reports**. Capture Network tab for `POST /api/reports/generate` and server logs (`Report generation error:`).
- [ ] `ai/reports.js` expects Claude to return **only** a JSON array of report groups; fragile if the model wraps JSON in markdown or truncates. Add **robust JSON extraction** (strip ` ```json ` fences, parse retry) and clearer errors back to the client.
- [ ] Confirm same **API key / credits** as chat (shared `ANTHROPIC_API_KEY`).
- [ ] Validate date formats vs SQLite `transactions.transaction_date` (string comparison) so queries return rows.

**Files:** `ai/reports.js`, `routes/reports.js`, `app.js` (`routeId === "expense-reports"`).

---

### 3. Pre-approval parsing — amount wrong ($1200 → $0)

**Observed:** As John, submit works and row appears in “My Requests,” but **parsed amount** is wrong (e.g. $0 instead of $1200).

**Root causes to investigate:**

- [ ] `parseRequest` in `ai/approvals.js` uses a single model call; **`JSON.parse` failure** falls back to `parsed_amount: 0` (see `catch` in `parseRequest`) — improve prompt (explicit: “extract numeric amount from text like $1,200 or 1200 CAD”) and/or **regex fallback** to pull currency amounts from `raw_request` before/after Claude.
- [ ] Model might return **markdown** or extra text around JSON — strip fences before `JSON.parse`.
- [ ] Store and display **raw request** prominently so wrong parses are obvious; optional admin override later.

**Files:** `ai/approvals.js` (`parseRequest`, `PARSE_SYSTEM`), `routes/approvals.js` (POST body validation).

---

## P1 — UX / layout (still “functional” for judges)

### 4. UI consistency across the four major flows

**Goal:** One coherent product: **Talk to your data**, **Policy violations / compliance**, **Pre-approval**, **Expense reports** should share spacing, radii, panels, and typography — not a mix of “premium” and plain pages.

**Reference:** `CLAUDE.md` → **Open UX / polish** (merge `data-gallery` vs `saved-visuals`; align `approvals-page` + `reports-page` with `talk-page` + `pc-page`).

**Todos:**

- [ ] Audit each route’s root class (`talk-page`, `pc-page`, `approvals-page`, `reports-page`, `cg-page`) and list gaps.
- [ ] Add **additive** CSS in `style.css` only (per project rules); reuse variables `--color-*`, accent colors documented in `CLAUDE.md`.
- [ ] After merging saved-chart routes, remove duplicate sidebar noise.

**Files:** `app.js` (route `render` templates), `style.css`, `index.html` if needed.

---

### 5. Approve requests — layout, scroll, empty space, Approve/Deny + notes

**Observed:** Panel not scrollable; hard to read AI recommendation; lots of empty space; need to verify **Approve**, **Deny**, and **notes** behavior.

**Todos:**

- [ ] **Layout:** Make `#approvalPanel` (or wrapper) `max-height` + `overflow-y: auto`; ensure recommendation text is readable (line-height, max width).
- [ ] **Empty space:** Use a two-column or constrained-width layout on large screens so the list + panel don’t leave a dead zone (flex/grid in `style.css` for `.approvals-page`).
- [ ] **Escaping:** Recommendation HTML should go through **`escHtml`** (or `textContent`) to avoid XSS; today much of the panel uses `innerHTML` with model text.
- [ ] **E2E:** Click row → panel loads → edit **Decision Note** → **Approve** / **Deny** → confirm `POST /api/approvals/:id/decide` returns 200 and list refreshes; verify DB or UI status badge updates.
- [ ] **Optional:** Close panel / keyboard focus trap for a11y.

**Files:** `app.js` (`pre-approval` branch in `initRoute`), `style.css` (`.approval-panel`, `.submissions-list`), `routes/approvals.js` (POST `/:id/decide`).

---

### 6. Expense Reports — layout & UI

**Observed:** Tab needs clearer structure (cards, hierarchy, empty states, loading states).

**Todos:**

- [ ] Match **Policy compliance**-style toolbar or **Talk**-style section headers where appropriate.
- [ ] Loading/success/error for **Generate** (not only `alert`); skeleton or disabled state on list while fetching.
- [ ] Ensure report cards **escape** user/model text if rendered via `innerHTML`.

**Files:** `app.js` (`expense-reports`), `style.css` (`.reports-page`, `.report-card`).

---

### 7. Run Compliance Scan — verify end-to-end

**Observed:** Need confidence the button works “properly.”

**Current behavior (code):** Admin → Policy violations → **Run Compliance Scan** → `POST /api/compliance/scan` → on success, `navigate("policy-violations")` (same route).

**Todos:**

- [ ] Confirm scan **actually refreshes** violation data after success (SPA re-init: if `initRoute` does not re-fetch when navigating to the same `routeId`, violations may look stale — may need explicit **re-load** of violations API or full `location.reload()` as temporary fix).
- [ ] On failure, show **toast or inline error** with server message (not only button label).
- [ ] Log `runComplianceScan` duration; timeout errors should be user-visible.

**Files:** `app.js` (scan button handler ~2197–2214), `routes/compliance.js`, `ai/compliance.js`.

---

## P2 — Account switching & email

### 8. John ↔ Admin switching — more seamless

**Observed:** Switching persona is clunky or confusing.

**Current:** Account stored in `localStorage` (`exi.account` in `STORAGE`); sidebar likely toggles via settings.

**Todos:**

- [ ] Document in UI **who you are** (e.g. header chip: “Viewing as: John / Admin”).
- [ ] On account change, **re-render current route** or navigate to a safe default so gated controls (scan, generate, approval list) appear/disappear without stale DOM.
- [ ] Consider persisting last route vs resetting to home when switching (product decision).

**Files:** `app.js` (account toggle handler, `render`, `navigate`).

---

### 9. Resend email notifications — not working

**Observed:** Pre-approval emails not received.

**Code path:** After `POST /api/approvals`, `generateRecommendation` then `sendApprovalEmail` (`email.js`) — **async**, errors only `console.error`.

**Todos:**

- [ ] Confirm `.env`: **`RESEND_API_KEY`**, **`FINANCE_EMAIL`** (must be a deliverable address). Restart server after edits.
- [ ] **Resend constraints:** `from` is `approvals@resend.dev` — on Resend’s free tier you typically may only send **to your own verified email** unless domain is verified. If `FINANCE_EMAIL` is unverified, sending may fail silently in UX.
- [ ] Check server logs for **`Email send error:`** after a submission.
- [ ] Optionally use Resend dashboard → **Logs** for bounces/API errors.
- [ ] **UX:** Return a warning in API response if email failed (without blocking submission), or surface in UI “Request saved; email could not be sent.”

**Files:** `email.js`, `routes/approvals.js` (`.then` / `.catch` after `sendApprovalEmail`), `.env.example` (document `BASE_URL` for email links — `email.js` uses `BASE_URL` or `localhost` for approve/deny links in email).

---

## Quick verification checklist (next session)

| Check | Command / action |
|--------|-------------------|
| Anthropic | `POST /api/chat` or minimal script; expect 200, not credit-balance error |
| Chat UI | Send message; see assistant reply in thread |
| Compliance scan | Admin → scan → violations list updates |
| John submit | POST submission; parsed amount sane; row in My Requests |
| Approve/Deny | Admin panel; note persisted per API contract |
| Reports generate | Admin generate; rows in list; no 500 |
| Resend | Submit request; log clean; email in inbox / Resend logs |

---

## Suggested order of work

1. **API health** (Talk + Reports + parsing) — unblock everything that hits Claude.  
2. **Compliance scan refresh** + **approval panel** scroll/layout + **parse amount** fixes.  
3. **Resend** configuration + error visibility.  
4. **Visual pass** + **account switch** polish.
