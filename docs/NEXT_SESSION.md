# Next session — to-do list

---

## 1. Email Use Case 1 — Policy Violation Reprimand (send to employee)

**Trigger:** Admin clicks **Reprimand** button on a violation row in the Policy Violations tab.

**Behavior:** Send an email to the address stored at `EMPLOYEE_EMAIL` (the flagged employee's email). The email should:
- Ask for more information or reasoning about the flagged transaction
- Optionally suggest setting up a meeting
- Be professional and non-judgmental — do not berate or demean the employee

**Verification goal (current session):** Before worrying about the AI-generated message body, first confirm the Resend API is connected and the email actually arrives. Send a simple placeholder/static email to verify delivery end-to-end, then layer in the AI-generated content once that's confirmed.

**Todos:**
- [ ] Confirm `EMPLOYEE_EMAIL` is set in `.env` (or stored per-employee in DB) and is a deliverable address
- [ ] Wire **Reprimand** button → `POST /api/compliance/violations/:id/reprimand` (or equivalent)
- [ ] In `email.js`, add a `sendReprimandEmail(employee, violation)` function — for now, send a static/placeholder body so we can verify delivery
- [ ] Confirm email arrives; check Resend dashboard → Logs for errors
- [ ] Once delivery is verified, replace static body with a short AI-generated message (professional, asks for context, not accusatory)

**Files:** `app.js` (Reprimand button in policy-violations route), `routes/compliance.js`, `email.js`, `.env` / `.env.example`

---

## 2. Email Use Case 2 — Pre-Approval Submission (send to finance manager)

**Trigger:** John submits a pre-approval request.

**Behavior:** Send an email to `FINANCE_EMAIL` (from `.env`) with:
- A brief summary of the request
- **Approve** and **Deny** buttons that, when clicked, actually update the submission status in the DB

**Verification goal (current session):** Skip the AI recommendation body for now. Send a minimal email with just the request summary + working Approve/Deny buttons. Confirm the buttons hit the correct endpoint and update the DB status before adding AI content.

**Todos:**
- [ ] Confirm `FINANCE_EMAIL` and `RESEND_API_KEY` are set in `.env`; confirm `BASE_URL` is set (used for token links) — restart server after edits
- [ ] In `email.js`, simplify `sendApprovalEmail` to send a static/minimal body (request details + approve/deny token links) — no AI recommendation yet
- [ ] Submit a request as John; verify email arrives at `FINANCE_EMAIL`; check Resend dashboard → Logs for errors
- [ ] Click **Approve** link in email → confirm `GET /api/approvals/decide?token=...&action=approve` returns 200 and DB `status` updates to `approved`
- [ ] Click **Deny** link → same for `denied`
- [ ] Confirm status updates are reflected in both Admin approval list and John's "My Requests" view
- [ ] Once buttons are verified, re-add a short AI recommendation blurb to the email body

**Files:** `email.js`, `routes/approvals.js` (`POST /` and `GET /decide`), `ai/approvals.js`, `.env` / `.env.example`

---

## Notes

- Resend free tier: `from` address is `approvals@resend.dev` — you can only send **to your own verified email** unless your domain is verified. Make sure `FINANCE_EMAIL` and `EMPLOYEE_EMAIL` are verified addresses in your Resend account, or use your own verified domain.
- After any `.env` change, **restart the server** (`npm start` or `npm run dev`).
- Surface email errors in the API response or server logs — don't let failures fail silently in the UX.
