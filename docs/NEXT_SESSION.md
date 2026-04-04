# Next session — to-do list

---

## 1. UX Polish — Merge duplicate Saved Charts nav entries

Two sidebar entries point to the same data (`data-gallery` and `saved-visuals`). Consolidate into one route using the stronger `data-gallery` card/dialog presentation; remove the flat `saved-visuals` page and its nav entry.

**Files:** `app.js` (routes array, `initRoute` branches), `style.css` (remove dead `saved-visuals-page` / `gallery-grid` rules)

---

## 2. UX Polish — Visual consistency: Pre-Approval & Expense Reports

Pre-Approval and Expense Reports pages should match the rounded-panel atmosphere of Talk to Data and Policy Compliance. Currently they use a plainer layout.

**Reference:** The `ux-hero` + `ux-panel` + `pc-wrap` pattern on `pc-page` and `talk-page`.

**Files:** `app.js` (render strings for `pre-approval` Admin view and `expense-reports`), `style.css`

---

## Notes

- After any `.env` change, **restart the server** (`npm start` or `npm run dev`).
- Surface API errors in server logs — don't let failures fail silently.
