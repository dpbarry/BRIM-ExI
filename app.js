(() => {
    const STORAGE = {
        route: "exi.route",
        account: "exi.account",
        talkHasMessage: "exi.talk.hasMessage",
        talkMessages: "exi.talk.messages",
        theme: "exi.theme",
        sidebarExpanded: "exi.sidebarExpanded",
        policyRules: "exi.policyRules",
        sessionId: "exi.session_id",
        apiBase: "exi.api_base",
    };

    const DEFAULT_ROUTE = "talk-to-data";
    const APP_NAME = "ExI";
    const ACCOUNTS = ["Admin", "John"];

    const TRANSITION = {
        riseMs: 210,
        riseDriftPx: 18,
        easeRise: "cubic-bezier(0.22, 0.88, 0.24, 1)",
    };

    const icons = {
        "talk-to-data": `<svg class="sidebar-item__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7.5A3.5 3.5 0 0 1 8.5 4h7A3.5 3.5 0 0 1 19 7.5v4A3.5 3.5 0 0 1 15.5 15H11l-3.8 3.5c-.6.5-1.2.1-1.2-.6V15.4A3.4 3.4 0 0 1 5 12.1z"/><path d="M9 8.35h6M9 10.6h4"/></svg>`,
        "policy-rules": `<svg class="sidebar-item__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 3.6v5.2c0 4.4-3 7.8-7 9.2-4-1.4-7-4.8-7-9.2V6.6z"/><path d="M9.3 12.1l1.8 1.8 3.6-3.6"/></svg>`,
        "policy-violations": `<svg class="sidebar-item__icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round"><path d="M11.4 5.25 3.8 18.75Q3.2 19.8 4.4 19.8H19.6Q20.8 19.8 20.2 18.75L12.6 5.25Q12 4.2 11.4 5.25Z"/><path d="M12 10v4.2"/><circle cx="12" cy="17.2" r="0.95" fill="currentColor" stroke="none"/></svg>`,
        "saved-visuals": `<svg class="sidebar-item__icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5.5" rx="7" ry="2.5" fill="none"/><path d="M5 5.5v4c0 1.38 3.13 2.5 7 2.5s7-1.12 7-2.5v-4" fill="none"/><path d="M5 9.5v4c0 1.38 3.13 2.5 7 2.5s7-1.12 7-2.5v-4" fill="none"/><path d="M5 13.5V18c0 1.38 3.13 2.5 7 2.5s7-1.12 7-2.5v-4.5" fill="none"/></svg>`,
        "pre-approval": `<svg class="sidebar-item__icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="7" cy="5.75" r="1.6"/><path d="M7 7.5v4.2a3.3 3.3 0 0 0 3.3 3.3h7.2"/><path d="M14.8 12.8 17.5 15.5l-2.7 2.7"/></svg>`,
        "expense-reports": `<svg class="sidebar-item__icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="3.5" width="12" height="17" rx="2" ry="2"/><path d="M9 8.5h6M9 12h6M9 15.5h3.5"/></svg>`,
    };

    const routes = [
        {
            id: DEFAULT_ROUTE,
            title: "Talk to data",
            navLabel: "Talk to your data",
            render: (state) => `
                <section class="page talk-page ${state.talkHasMessage ? "has-message" : ""}">
                    <div class="talk-page__bloom" aria-hidden="true">
                        <div class="talk-page__bloom-core"></div>
                    </div>
                    <div class="talk-page__stack">
                    <button type="button" class="talk-reset-btn" aria-label="Clear chat">
                        <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                            <path d="M3 3v5h5"/>
                        </svg>
                    </button>
                    <div class="talk-page__splash" aria-live="polite">
                        <p class="talk-page__kicker">Brim Intel</p>
                        <p class="talk-page__headline">Ask your data anything.</p>
                    </div>
                    <div class="talk-page__thread-wrap">
                        <div class="talk-page__thread" id="talkThread" aria-live="polite"></div>
                        <div class="talk-page__thread-mask talk-page__thread-mask--top" aria-hidden="true" data-visible="false"></div>
                        <div class="talk-page__thread-mask talk-page__thread-mask--bottom" aria-hidden="true" data-visible="false"></div>
                    </div>
                    <section class="composer" aria-label="Talk to your data composer">
                        <form class="composer__card" data-role="prompt-form" autocomplete="off">
                            <label class="sr-only" for="talkPrompt">Type your question</label>
                            <textarea id="talkPrompt" class="composer__input" placeholder="Type your question here..." rows="1" autocomplete="off" spellcheck="false"></textarea>
                            <div class="composer__actions">
                                <button type="submit" class="send-button" aria-label="Send prompt">
                                    <svg class="send-button__icon" viewBox="0 0 24 24" aria-hidden="true">
                                        <path d="M5 11.5 19.5 4 13 19.5l-2.2-5.8z"/>
                                        <path d="M10.8 13.7 19.4 4.1"/>
                                    </svg>
                                </button>
                                <button type="button" class="stop-button" aria-label="Stop response" style="display:none">
                                    <svg class="stop-button__icon" viewBox="0 0 24 24" aria-hidden="true">
                                        <rect x="4.5" y="4.5" width="15" height="15" rx="2"/>
                                    </svg>
                                </button>
                            </div>
                        </form>
                        <div class="talk-suggestions" id="talkSuggestions" role="group" aria-label="Suggested questions">
                            <button type="button" class="talk-suggestion" data-talk-suggestion="Show total expenditures aggregated and broken down by department.">
                                <svg class="talk-suggestion__icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 17v-5"/><path d="M12 17V8"/><path d="M16 17v-3"/></svg>
                                Total expenditures by department
                            </button>
                            <button type="button" class="talk-suggestion" data-talk-suggestion="Who are the highest spenders, ranked by total expense amount?">
                                <svg class="talk-suggestion__icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                                Highest spenders
                            </button>
                            <button type="button" class="talk-suggestion" data-talk-suggestion="What is the average total expense amount per calendar month?">
                                <svg class="talk-suggestion__icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg>
                                Average expenses per month
                            </button>
                        </div>
                    </section>
                    </div>
                </section>`,
        },
        {
            id: "saved-visuals",
            title: "Saved Visuals",
            navLabel: "Saved Visuals",
            render: (_state) => `
                <section class="page pc-page ux-page saved-visuals-page">
                    <div class="pc-wrap ux-wrap">
                        <header class="ux-hero">
                            <p class="ux-hero__kicker">Brim Intel</p>
                            <h1 class="ux-hero__title">Saved visuals</h1>
                            <p class="ux-hero__sub">Every chart saved from Talk to Data, ready to reuse in reviews and decision meetings.</p>
                        </header>
                        <div class="sv-gallery" id="galleryGrid">
                            <div class="ux-loading-inline" role="status" aria-live="polite"><p class="ux-loading-message">Loading charts…</p></div>
                        </div>
                    </div>
                    <dialog id="chartDialog" class="chart-dialog">
                        <div class="chart-dialog__inner">
                            <button type="button" class="chart-dialog__close" aria-label="Close">&times;</button>
                            <div class="chart-dialog__chart" id="chartDialogChart"></div>
                            <div class="chart-dialog__meta">
                                <p class="chart-dialog__query" id="chartDialogQuery"></p>
                                <p class="chart-dialog__ts" id="chartDialogTs"></p>
                            </div>
                            <p class="chart-dialog__response" id="chartDialogResponse"></p>
                        </div>
                    </dialog>
                </section>`,
        },
        {
            id: "policy-rules",
            title: "Expense policy rules",
            navLabel: "Expense policy rules",
            render: () => `
                <section class="page pc-page">
                    <div class="pc-wrap">
                        <div class="pc-panel">
                            <div class="pc-panel__head">
                                <div>
                                    <h2 class="pc-panel__title">Expense Policy Rules</h2>
                                    <p class="pc-panel__sub">Define rules in plain language — the AI applies them when scanning transactions.</p>
                                </div>
                            </div>
                            <ol class="rules-list" id="rulesList" aria-label="Policy rules"></ol>
                            <button class="rules-add-row" data-action="add-rule" aria-label="Add new policy rule">
                                <svg class="rules-add-row__icon" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/></svg>
                                Add rule
                            </button>
                        </div>
                    </div>
                </section>`,
        },
        {
            id: "policy-violations",
            title: "Policy violations",
            navLabel: "Policy violations",
            render: (state) => `
                <section class="page pc-page">
                    <div class="pc-wrap">
                        <div class="pc-panel">
                            <div class="pc-panel__head pc-panel__head--row pc-panel__head--violations">
                                <div class="pc-view-tabs" role="tablist" aria-label="Compliance views">
                                    <button type="button" class="pc-view-tab is-active" data-subtab="violations" role="tab" aria-selected="true">
                                        <svg class="pc-view-tab__icon pc-view-tab__icon--violations" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round"><path d="M11.4 5.25 3.8 18.75Q3.2 19.8 4.4 19.8H19.6Q20.8 19.8 20.2 18.75L12.6 5.25Q12 4.2 11.4 5.25Z"/><path d="M12 10v4.2"/><circle cx="12" cy="17.2" r="0.95" fill="currentColor" stroke="none"/></svg>
                                        Violations
                                    </button>
                                    <button type="button" class="pc-view-tab" data-subtab="leaderboard" role="tab" aria-selected="false">
                                        <svg class="pc-view-tab__icon" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1.5" y="9" width="3.5" height="5.5" rx="0.5"/><rect x="6.25" y="5.5" width="3.5" height="9" rx="0.5"/><rect x="11" y="2" width="3.5" height="12.5" rx="0.5"/></svg>
                                        By employee
                                    </button>
                                </div>
                                <div class="pc-toolbar" id="complianceToolbar"></div>
                                ${state.account === "Admin" ? `<button class="btn btn--primary" id="scanBtn">Run Compliance Scan</button>` : ""}
                            </div>
                            <div class="compliance-body" id="complianceBody"></div>
                        </div>
                    </div>
                </section>`,
        },
        {
            id: "pre-approval",
            title: "Approve Requests",
            navLabel: "Approve requests",
            johnLabel: "Submit Requests",
            render: (state) => state.account === "Admin"
                ? `<section class="page pc-page ux-page approvals-page">
                    <div class="pc-wrap ux-wrap approvals-wrap">
                        <header class="ux-hero">
                            <p class="ux-hero__kicker">Pre-Approval Engine</p>
                            <h1 class="ux-hero__title">Review and decide requests</h1>
                            <p class="ux-hero__sub">AI summarizes context, policy fit, and risk so finance can approve or deny quickly.</p>
                        </header>
                        <div class="approvals-layout">
                            <div class="pc-panel ux-panel approvals-list-panel">
                                <div class="ux-panel__head ux-panel__head--split">
                                    <h2 class="ux-panel__title">Incoming Requests</h2>
                                    <select id="statusFilter" class="filter-select ux-select" aria-label="Filter by status">
                                        <option value="pending">Pending</option>
                                        <option value="approved">Approved</option>
                                        <option value="denied">Denied</option>
                                        <option value="all">All</option>
                                    </select>
                                </div>
                                <div id="submissionsList" class="submissions-list"><div class="ux-loading-inline" role="status" aria-live="polite"><p class="ux-loading-message">Loading requests…</p></div></div>
                            </div>
                            <div id="approvalPanel" class="pc-panel ux-panel approval-panel" aria-live="polite">
                                <div class="approval-panel__empty">Click a request and a recommendation will appear here.</div>
                            </div>
                        </div>
                    </div>
                   </section>`
                : `<section class="page pc-page ux-page approvals-page sr-page">
                    <div class="pc-wrap ux-wrap approvals-wrap">
                        <header class="ux-hero">
                            <p class="ux-hero__kicker">Expense Requests</p>
                            <h1 class="ux-hero__title">Hi, John.</h1>
                            <p class="ux-hero__sub">Describe your expense in plain language — finance gets an AI-powered recommendation automatically.</p>
                        </header>
                        <div class="pc-panel ux-panel">
                            <div class="ux-panel__head">
                                <h2 class="ux-panel__title">New Request</h2>
                            </div>
                            <form id="submitRequestForm" class="request-form" autocomplete="off">
                                <textarea id="requestText" class="request-form__textarea"
                                    aria-label="Expense request details"
                                    placeholder="e.g. I need approval for $850 for a client dinner at Harbour House on April 12th." rows="4" autocomplete="off" spellcheck="false"></textarea>
                                <div class="request-form__footer">
                                    <span id="requestCharCount" class="request-form__charcount">0 / 500</span>
                                    <button type="submit" class="btn btn--primary">Submit Request</button>
                                </div>
                            </form>
                            <div id="submitFeedback" class="sr-feedback" hidden></div>
                        </div>
                        <div class="pc-panel ux-panel">
                            <div class="ux-panel__head ux-panel__head--split">
                                <h2 class="ux-panel__title">My Requests</h2>
                                <span id="myRequestsBadge" class="sr-count-badge" hidden></span>
                            </div>
                            <div id="mySubmissionsBody" class="submissions-list sr-list">
                                <div class="ux-loading-inline" role="status" aria-live="polite"><p class="ux-loading-message">Loading your requests…</p></div>
                            </div>
                        </div>
                    </div>
                   </section>`,
        },
        {
            id: "expense-reports",
            title: "Expense Reports",
            navLabel: "Expense Reports",
            render: (state) => `
                <section class="page pc-page ux-page reports-page">
                    <div class="pc-wrap ux-wrap reports-wrap">
                        <header class="ux-hero">
                            <p class="ux-hero__kicker">Expense Reports</p>
                            <h1 class="ux-hero__title">Grouped, policy-aware report bundles</h1>
                            <p class="ux-hero__sub">AI clusters raw transactions into review-ready reports with policy context and approval actions.</p>
                        </header>
                        <div class="pc-panel ux-panel">
                            ${state.account === "Admin" ? `
                            <div class="ux-panel__head ux-panel__head--stack">
                                <h2 class="ux-panel__title">Generate Report Set</h2>
                                <div class="reports-toolbar">
                                    <select id="reportEmployee" class="filter-select ux-select" aria-label="Employee for report">
                                        <option value="">Select employee…</option>
                                    </select>
                                    <input type="text" id="reportStart" class="date-input ux-date" autocomplete="off" placeholder="DD/MM/YYYY" readonly />
                                    <input type="text" id="reportEnd" class="date-input ux-date" autocomplete="off" placeholder="DD/MM/YYYY" readonly />
                                    <button id="generateBtn" class="btn btn--primary">Generate Reports</button>
                                </div>
                            </div>` : `
                            <div class="ux-panel__head">
                                <h2 class="ux-panel__title">Report Queue</h2>
                            </div>`}
                            <div id="reportsList" class="reports-list"><div class="ux-loading-inline" role="status" aria-live="polite"><p class="ux-loading-message">Loading reports…</p></div></div>
                        </div>
                    </div>
                </section>`,
        },
    ];

    const routeById = Object.fromEntries(routes.map((r) => [r.id, r]));

    function centeredTitle(text) {
        return `<section class="page page--centered-title"><h1>${text}</h1></section>`;
    }

    const store = {
        get(key) {
            try {
                return window.localStorage.getItem(key);
            } catch {
                return null;
            }
        },
        set(key, value) {
            try {
                window.localStorage.setItem(key, value);
            } catch {
                /* private mode */
            }
        },
    };

    function escHtml(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function uxLoadingHtml(message) {
        return `<div class="ux-loading-inline" role="status" aria-live="polite"><p class="ux-loading-message">${escHtml(message)}</p></div>`;
    }

    const CALENDAR_MONTHS = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
    ];
    const CALENDAR_WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

    function pad2(n) {
        return String(n).padStart(2, "0");
    }

    function isIsoDate(value) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
        const d = new Date(`${value}T12:00:00`);
        if (Number.isNaN(d.getTime())) return false;
        return d.toISOString().slice(0, 10) === value;
    }

    function isoToDisplayDate(iso) {
        if (!isIsoDate(iso)) return "";
        const [y, m, d] = iso.split("-");
        return `${d}/${m}/${y}`;
    }

    function displayToIsoDate(value) {
        const raw = String(value || "").trim();
        if (!raw) return "";
        if (isIsoDate(raw)) return raw;
        const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (!m) return "";
        const day = Number.parseInt(m[1], 10);
        const month = Number.parseInt(m[2], 10);
        const year = Number.parseInt(m[3], 10);
        const iso = `${year}-${pad2(month)}-${pad2(day)}`;
        return isIsoDate(iso) ? iso : "";
    }

    function getSessionId() {
        let id = store.get(STORAGE.sessionId);
        if (!id) {
            id = crypto.randomUUID();
            store.set(STORAGE.sessionId, id);
        }
        return id;
    }

    function getApiBase() {
        const fromGlobal = String(window.EXI_API_BASE || "").trim();
        const fromStorage = String(store.get(STORAGE.apiBase) || "").trim();
        const raw = fromGlobal || fromStorage;
        if (!raw) return "";
        return raw.replace(/\/+$/, "");
    }

    function apiUrl(path) {
        const raw = String(path || "");
        if (/^https?:\/\//i.test(raw)) return raw;
        const base = getApiBase();
        return base ? `${base}${raw}` : raw;
    }

    // ── Loader gate: dismiss only once route is rendered AND its fetches settled ──
    let _loaderDone = false;
    let _loaderRouteReady = false;
    let _loaderPending = 0;

    function _checkDismissLoader() {
        if (_loaderDone || !_loaderRouteReady || _loaderPending > 0) return;
        _loaderDone = true;
        const el = document.getElementById("appLoader");
        if (!el) return;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            el.remove();
            return;
        }
        el.classList.add("app-loader--out");
        el.addEventListener("transitionend", () => el.remove(), { once: true });
    }

    function dismissAppLoader() {
        _loaderRouteReady = true;
        _checkDismissLoader();
    }

    function apiFetch(path, options) {
        if (!_loaderDone) _loaderPending++;
        return fetch(apiUrl(path), options).finally(() => {
            if (!_loaderDone) {
                _loaderPending--;
                _checkDismissLoader();
            }
        });
    }

    function normalizeText(value) {
        return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
    }

    function stableStringify(value) {
        if (value === null || typeof value !== "object") return JSON.stringify(value);
        if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
        const keys = Object.keys(value).sort();
        return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
    }

    function getChartSignature(originalQuery, chartConfig) {
        const query = normalizeText(originalQuery);
        const normalizedConfig = stableStringify(chartConfig && typeof chartConfig === "object" ? chartConfig : {});
        return `${query}::${normalizedConfig}`;
    }

    function parseHashRoute() {
        const hash = window.location.hash;
        return hash.startsWith("#/") ? hash.slice(2) : "";
    }

    function normalizeRouteId(id) {
        return id === "policy-compliance" ? "policy-rules" : id;
    }

    function normalizeAccount(value) {
        return ACCOUNTS.includes(value) ? value : ACCOUNTS[0];
    }

    function readStoredTheme() {
        const v = store.get(STORAGE.theme);
        if (v === "dark" || v === "light") {
            return v;
        }
        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }

    function readStoredSidebarExpanded() {
        return store.get(STORAGE.sidebarExpanded) === "1";
    }

    function readStoredPolicyRules() {
        try {
            const raw = store.get(STORAGE.policyRules);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed) || !parsed.every((x) => typeof x === "string")) {
                return null;
            }
            return parsed;
        } catch {
            return null;
        }
    }

    function savePolicyRules(rules) {
        try {
            store.set(STORAGE.policyRules, JSON.stringify(rules));
        } catch {
            /* private mode */
        }
    }

    const POLICY_RULES = [
        "Any expense over $50 requires manager pre-authorization before it is incurred; receipts are required before reimbursement.",
        "Submit receipts within the same calendar month as the expense whenever reasonably possible.",
        "Supplier entertainment must be reasonable; guest names and business purpose must be listed with the receipts.",
        "Alcohol may be expensed only when dining with a customer; alcohol without a customer present is not reimbursable.",
        "Tips are capped at 15% for porterage and similar services; meal tips belong with the meal and must not exceed 20%.",
        "Use the most efficient, cost-effective transportation for business travel. Tolls are reimbursable; traffic tickets, parking fines, and personal use of rental cars are not.",
        "Car rentals require receipts for rental, parking, and fuel. Colleagues at the same site may be required to share a vehicle. Use your company or personal card to rent as directed.",
        "Corporate credit cards are for business only and may be used only by the person named on the card. Personal charges on a corporate card are prohibited.",
        "Personal-vehicle business mileage is reimbursed at the applicable Canada Revenue Agency rates only.",
        "Fees on personal credit cards (including annual or membership fees) are not reimbursed; Brim pays the fee for your assigned corporate card only.",
       
    ];

    const VIOLATIONS_DATA = [
        { id: 1,  employee: "Marcus Webb",  dept: "Sales",       amount: 428,  merchant: "Marriott Hotels",      date: "2024-03-14", rule: "Any expense over $50 requires manager pre-authorization before it is incurred; receipts are required before reimbursement.", severity: "high", note: "Two-night stay with no manager pre-auth on file." },
        { id: 2,  employee: "Priya Nair",   dept: "Marketing",   amount: 92,   merchant: "The Keg",              date: "2024-03-12", rule: "Supplier entertainment must be reasonable; guest names and business purpose must be listed with the receipts.", severity: "med",  note: "Receipt says \"client dinner\" only — no guest names or stated business purpose." },
        { id: 3,  employee: "James Okafor", dept: "Engineering", amount: 34,   merchant: "Pearson Airport Porter", date: "2024-03-10", rule: "Tips are capped at 15% for porterage and similar services; meal tips belong with the meal and must not exceed 20%.", severity: "low", note: "Porter gratuity claimed at roughly 22% of the posted service fee." },
        { id: 4,  employee: "Sarah Chen",   dept: "Marketing",   amount: 118,  merchant: "Local Craft Brewery",  date: "2024-03-08", rule: "Alcohol may be expensed only when dining with a customer; alcohol without a customer present is not reimbursable.", severity: "high", note: "Team social; attendee list shows no customers." },
        { id: 5,  employee: "Dylan Park",   dept: "Operations",  amount: 110,  merchant: "City of Toronto",      date: "2024-03-06", rule: "Use the most efficient, cost-effective transportation for business travel. Tolls are reimbursable; traffic tickets, parking fines, and personal use of rental cars are not.", severity: "med", note: "Parking violation ticket submitted as \"client meeting parking.\"" },
        { id: 6,  employee: "Aisha Mensah", dept: "Finance",     amount: 265,  merchant: "Enterprise Rent-A-Car", date: "2024-03-04", rule: "Car rentals require receipts for rental, parking, and fuel. Colleagues at the same site may be required to share a vehicle. Use your company or personal card to rent as directed.", severity: "med", note: "Fuel charges on the trip have no itemized receipt — only a card slip." },
        { id: 7,  employee: "Tom Vasquez",  dept: "Sales",       amount: 1720, merchant: "Air Canada",           date: "2024-02-28", rule: "Use the most efficient, cost-effective transportation for business travel. Tolls are reimbursable; traffic tickets, parking fines, and personal use of rental cars are not.", severity: "med", note: "Domestic route where flexible business class was booked though policy expects most cost-effective option." },
        { id: 8,  employee: "Marcus Webb",  dept: "Sales",       amount: 86,   merchant: "Whole Foods Market",   date: "2024-02-26", rule: "Corporate credit cards are for business only and may be used only by the person named on the card. Personal charges on a corporate card are prohibited.", severity: "high", note: "Line items are groceries and household goods unrelated to client work." },
        { id: 9,  employee: "Priya Nair",   dept: "Marketing",   amount: 156,  merchant: "Bar Isabel",           date: "2024-02-22", rule: "Tips are capped at 15% for porterage and similar services; meal tips belong with the meal and must not exceed 20%.", severity: "low", note: "Tip on the meal receipt is about 26% of the food subtotal." },
        { id: 10, employee: "James Okafor", dept: "Engineering", amount: 312,  merchant: "Mileage — personal vehicle", date: "2024-02-18", rule: "Personal-vehicle business mileage is reimbursed at the applicable Canada Revenue Agency rates only.", severity: "med", note: "Applied a per-km rate above the current CRA guideline for the claim period." },
        { id: 11, employee: "Sarah Chen",   dept: "Marketing",   amount: 74,   merchant: "Staples",              date: "2024-02-05", rule: "Submit receipts within the same calendar month as the expense whenever reasonably possible.", severity: "low", note: "Expense over $50 submitted two months late with receipt only after payroll inquiry." },
        { id: 12, employee: "Kenji Tanaka", dept: "HR",          amount: 620,  merchant: "Delta Hotels",         date: "2024-01-30", rule: "Falsifying expense reports or abusing this policy is prohibited.", severity: "high", note: "Same folio PDF attached to two different claim line items in the same report." },
        { id: 13, employee: "Aisha Mensah", dept: "Finance",     amount: 699,  merchant: "American Express",     date: "2024-02-11", rule: "Fees on personal credit cards (including annual or membership fees) are not reimbursed; Brim pays the fee for your assigned corporate card only.", severity: "med", note: "Personal card annual membership billed as a general admin / T&E reimbursement." },
    ];

    const LEADERBOARD_DATA = [
        { employee: "Aisha Mensah", dept: "Finance",     violations: 2, totalAmount: 964,  highCount: 0, medCount: 2, lowCount: 0 },
        { employee: "Marcus Webb",  dept: "Sales",       violations: 2, totalAmount: 514,  highCount: 2, medCount: 0, lowCount: 0 },
        { employee: "James Okafor", dept: "Engineering", violations: 2, totalAmount: 346,  highCount: 0, medCount: 1, lowCount: 1 },
        { employee: "Priya Nair",   dept: "Marketing",   violations: 2, totalAmount: 248,  highCount: 0, medCount: 1, lowCount: 1 },
        { employee: "Sarah Chen",   dept: "Marketing",   violations: 2, totalAmount: 192,  highCount: 1, medCount: 0, lowCount: 1 },
        { employee: "Tom Vasquez",  dept: "Sales",       violations: 1, totalAmount: 1720, highCount: 0, medCount: 1, lowCount: 0 },
        { employee: "Kenji Tanaka", dept: "HR",          violations: 1, totalAmount: 620,  highCount: 1, medCount: 0, lowCount: 0 },
        { employee: "Dylan Park",   dept: "Operations",  violations: 1, totalAmount: 110,  highCount: 0, medCount: 1, lowCount: 0 },
    ];

    class App {
        constructor(root) {
            this.root = root;
            this.appLayout = root;
            this.routeStage = root.querySelector("#routeStage");
            this.sidebarNav = root.querySelector("#sidebarNav");
            this.sidebarExpandToggle = root.querySelector("#sidebarExpandToggle");
            this.themeToggle = root.querySelector("#themeToggle");
            this.accountDock = root.querySelector("#accountDock");
            this.accountInitial = root.querySelector("#accountInitial");
            this.accountDisplayName = root.querySelector("#accountDisplayName");
            this.accountPanel = root.querySelector("#accountPanel");
            this.reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
            this.state = {
                currentRoute: "",
                account: normalizeAccount(store.get(STORAGE.account)),
                talkHasMessage: false,
                talkMessages: [],
                talkStreaming: false,
                talkStreamText: "",
            };
            this._talkAbortController = null;
            this._talkStreamBubble = null;
            this._talkLastUserMsgEl = null;
            this._savedChartSignatures = new Set();
            this._savedChartsLoadedPromise = null;
            this._calendarRoot = null;
            this._calendarInput = null;
            this._calendarMonth = 0;
            this._calendarYear = 0;
            this._pickerSeq = 0;
            this._pickerRoots = new Set();
            this._pickerPointerBound = false;
            this._onPickerPointerDown = (e) => {
                this._pickerRoots.forEach((root) => {
                    if (!root.isConnected) {
                        this._pickerRoots.delete(root);
                        return;
                    }
                    if (!root.contains(e.target)) {
                        root.classList.remove("is-open");
                        root.querySelector(".ux-picker__button")?.setAttribute("aria-expanded", "false");
                    }
                });
            };
            try {
                const raw = store.get(STORAGE.talkMessages);
                if (raw) {
                    this.state.talkMessages = JSON.parse(raw);
                    if (this.state.talkMessages.length > 0) this.state.talkHasMessage = true;
                }
            } catch { this.state.talkMessages = []; }
            this.onDocPointerDown = this.onDocPointerDown.bind(this);
            this.onKeydown = this.onKeydown.bind(this);
        }

        init() {
            this.applyTheme(readStoredTheme());
            this.applySidebarExpanded(readStoredSidebarExpanded());
            this.buildSidebar();
            this.buildAccountMenu();
            this.bindShell();
            this.syncAccountUi();
            this.resolveInitialRoute();
            window.addEventListener("hashchange", () => this.renderFromHash());
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    document.documentElement.classList.remove("sidebar-snap");
                });
            });
        }

        applyTheme(theme) {
            const next = theme === "dark" ? "dark" : "light";
            document.documentElement.dataset.theme = next;
            store.set(STORAGE.theme, next);
            if (this.themeToggle) {
                this.themeToggle.setAttribute("aria-label", next === "dark" ? "Use light mode" : "Use dark mode");
            }
        }

        toggleTheme() {
            const cur = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
            this.applyTheme(cur === "dark" ? "light" : "dark");
        }

        applySidebarExpanded(expanded) {
            const on = Boolean(expanded);
            const layout = this.appLayout;
            if (!on) {
                layout?.classList.remove("app-layout--sidebar-expanded");
                this.resetAccountPanelPosition();
            } else {
                layout?.classList.add("app-layout--sidebar-expanded");
            }
            store.set(STORAGE.sidebarExpanded, on ? "1" : "0");
            const btn = this.sidebarExpandToggle;
            if (btn) {
                btn.setAttribute("aria-expanded", String(on));
                btn.setAttribute("aria-label", on ? "Collapse sidebar" : "Expand sidebar");
            }
            if (on) {
                requestAnimationFrame(() => this.scheduleAccountPanelPlacement());
            }
        }

        toggleSidebarExpanded() {
            const next = !this.appLayout?.classList.contains("app-layout--sidebar-expanded");
            this.applySidebarExpanded(next);
        }

        resetAccountPanelPosition() {
            const panel = this.accountPanel;
            if (!panel) {
                return;
            }
            panel.style.removeProperty("left");
            panel.style.removeProperty("right");
            panel.classList.remove("account-dock__panel--placed");
        }

        positionAccountPanel() {
            const dock = this.accountDock;
            const panel = this.accountPanel;
            if (!dock || !panel) {
                return;
            }
            const expanded = this.appLayout?.classList.contains("app-layout--sidebar-expanded");
            if (!dock.open || !expanded) {
                this.resetAccountPanelPosition();
                return;
            }
            const inner = dock.querySelector(".account-dock__inner");
            if (!inner) {
                return;
            }
            const rawGap = getComputedStyle(dock).getPropertyValue("--account-dock-panel-gap").trim();
            const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
            let gapPx = 0;
            if (rawGap.endsWith("rem")) {
                gapPx = parseFloat(rawGap) * rootPx;
            } else if (rawGap.endsWith("px")) {
                gapPx = parseFloat(rawGap);
            }
            const dockRect = dock.getBoundingClientRect();
            const innerRect = inner.getBoundingClientRect();
            const leftPx = innerRect.right - dockRect.left + gapPx;
            panel.style.left = `${leftPx}px`;
            panel.style.right = "auto";
        }

        focusActiveAccountOption() {
            this.accountOptions?.find((o) => o.classList.contains("is-active"))?.focus({ preventScroll: true });
        }

        scheduleAccountPanelPlacement() {
            const dock = this.accountDock;
            const panel = this.accountPanel;
            if (!dock || !panel) {
                return;
            }
            if (!dock.open) {
                this.positionAccountPanel();
                return;
            }
            if (!this.appLayout?.classList.contains("app-layout--sidebar-expanded")) {
                panel.classList.remove("account-dock__panel--placed");
                this.positionAccountPanel();
                requestAnimationFrame(() => this.focusActiveAccountOption());
                return;
            }
            panel.classList.remove("account-dock__panel--placed");
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    this.positionAccountPanel();
                    panel.classList.add("account-dock__panel--placed");
                    this.focusActiveAccountOption();
                });
            });
        }

        buildSidebar() {
            const account = this.state.account;
            const visibleRoutes = account === "Admin"
                ? routes
                : routes.filter((r) => r.id === "pre-approval");
            this.sidebarNav.innerHTML = visibleRoutes
                .map((r) => {
                    const label = (account !== "Admin" && r.johnLabel) ? r.johnLabel : r.navLabel;
                    return `
                <button type="button" class="sidebar-item" data-route="${r.id}" aria-label="${label}" title="${label}">
                    ${icons[r.id] ?? ""}
                    <span class="sidebar-item__label" aria-hidden="true">${label}</span>
                </button>`;
                })
                .join("");
            this.sidebarItems = Array.from(this.sidebarNav.querySelectorAll(".sidebar-item"));
            this.sidebarItems.forEach((btn) => {
                btn.addEventListener("click", () => this.navigate(btn.dataset.route));
            });
        }

        buildAccountMenu() {
            this.accountPanel.innerHTML = ACCOUNTS.map(
                (name) =>
                    `<button type="button" class="account-option" data-account="${name}" role="menuitemradio" aria-checked="false">${name}</button>`
            ).join("");
            this.accountOptions = Array.from(this.accountPanel.querySelectorAll(".account-option"));
            this.accountOptions.forEach((opt) => {
                opt.addEventListener("click", () => this.setAccount(opt.dataset.account));
            });
        }

        bindShell() {
            document.addEventListener("pointerdown", this.onDocPointerDown);
            document.addEventListener("keydown", this.onKeydown);
            this.themeToggle?.addEventListener("click", () => {
                const docEl = document.documentElement;
                docEl.classList.add("no-transition");
                void docEl.offsetHeight;
                this.toggleTheme();
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        docEl.classList.remove("no-transition");
                    });
                });
            });
            this.sidebarExpandToggle?.addEventListener("click", () => this.toggleSidebarExpanded());
            this.accountDock?.addEventListener("toggle", () => this.scheduleAccountPanelPlacement());
            window.addEventListener("resize", () => {
                if (this.accountDock?.open) {
                    this.positionAccountPanel();
                }
                if (this._calendarRoot?.classList.contains("is-open")) {
                    this.positionCalendarPopup();
                }
            });
        }

        onDocPointerDown(event) {
            const calendarOpen = this._calendarRoot?.classList.contains("is-open");
            if (calendarOpen) {
                const target = event.target;
                const inCalendar = this._calendarRoot.contains(target);
                const inInput = this._calendarInput?.contains?.(target) || this._calendarInput === target;
                if (!inCalendar && !inInput) {
                    this.closeCalendarPopup();
                }
            }
            if (!this.accountDock?.open) {
                return;
            }
            if (this.accountDock.contains(event.target)) {
                return;
            }
            this.accountDock.removeAttribute("open");
        }

        onKeydown(event) {
            if (event.key !== "Escape") {
                return;
            }
            this.closeCalendarPopup();
            this.accountDock?.removeAttribute("open");
        }

        setAccount(name) {
            const next = normalizeAccount(name);
            this.state.account = next;
            store.set(STORAGE.account, next);
            this.syncAccountUi();
            this.buildSidebar();
            this.accountDock.removeAttribute("open");
            if (next !== "Admin" && this.state.currentRoute !== "pre-approval") {
                this.navigate("pre-approval", { replace: true });
            } else {
                const route = routeById[this.state.currentRoute];
                if (route) {
                    this.syncSidebar();
                    this.renderRoute(route, false);
                }
            }
        }

        syncAccountUi() {
            const name = this.state.account;
            this.accountInitial.textContent = name.charAt(0).toUpperCase();
            if (this.accountDisplayName) {
                this.accountDisplayName.textContent = name;
            }
            const summary = this.accountDock?.querySelector(".account-dock__button");
            if (summary) {
                summary.setAttribute("aria-label", `Switch account, ${name}`);
            }
            this.accountOptions.forEach((opt) => {
                const active = opt.dataset.account === name;
                opt.classList.toggle("is-active", active);
                opt.setAttribute("aria-checked", String(active));
            });
        }

        resolveInitialRoute() {
            const fromHash = normalizeRouteId(parseHashRoute());
            const fromStore = normalizeRouteId(store.get(STORAGE.route) ?? "");
            const id = routeById[fromHash]
                ? fromHash
                : routeById[fromStore]
                  ? fromStore
                  : DEFAULT_ROUTE;
            this.navigate(id, { replace: true });
        }

        navigate(routeId, { replace = false } = {}) {
            if (!routeById[routeId]) {
                return;
            }
            const target = `#/${routeId}`;
            if (replace) {
                window.history.replaceState(null, "", target);
                this.renderFromHash();
                return;
            }
            if (window.location.hash === target) {
                return;
            }
            window.location.hash = target;
        }

        renderFromHash() {
            const raw = parseHashRoute();
            let id = normalizeRouteId(raw);
            if (raw === "policy-compliance") {
                window.history.replaceState(null, "", `#/${id}`);
            }
            if (!routeById[id]) {
                id = DEFAULT_ROUTE;
                window.history.replaceState(null, "", `#/${id}`);
            }
            const route = routeById[id];
            if (this.state.account !== "Admin" && route.id !== "pre-approval") {
                this.navigate("pre-approval", { replace: true });
                return;
            }
            this.state.currentRoute = route.id;
            store.set(STORAGE.route, route.id);
            document.title = `${route.title} · ${APP_NAME}`;
            this.syncSidebar();
            this.renderRoute(route);
        }

        syncSidebar() {
            this.sidebarItems.forEach((btn) => {
                const active = btn.dataset.route === this.state.currentRoute;
                btn.classList.toggle("is-active", active);
                btn.setAttribute("aria-current", active ? "page" : "false");
            });
        }

        async renderRoute(route, isInitial) {
            this.closeCalendarPopup();
            // Abort any in-flight talk request on route change
            if (this._talkAbortController) {
                this._talkAbortController.abort();
                this._talkAbortController = null;
            }
            this.state.talkStreaming = false;
            const next = document.createElement("div");
            next.className = "route-view";
            next.dataset.route = route.id;
            next.innerHTML = route.render(this.state);
            if (route.id === DEFAULT_ROUTE) this.hydrateTalkThread(next);
            this.attachRouteHandlers(next, route.id);
            const prev = this.routeStage.querySelector(".route-view");

            if (!prev || isInitial || this.reduceMotion.matches) {
                this.routeStage.replaceChildren(next);
                if (!this.reduceMotion.matches) {
                    await this.playRiseIn(next);
                }
                dismissAppLoader();
                return;
            }

            this.routeStage.appendChild(next);
            prev.remove();
            await this.playRiseIn(next);
        }

        playRiseIn(el) {
            const { riseMs, riseDriftPx, easeRise } = TRANSITION;
            const anim = el.animate(
                [
                    { opacity: 0, transform: `translateY(${riseDriftPx}px)` },
                    { opacity: 1, transform: "translateY(0)" },
                ],
                { duration: riseMs, easing: easeRise, fill: "both" }
            );
            return anim.finished.catch(() => undefined);
        }

        appendMessage(thread, role, text) {
            const msg = document.createElement("div");
            msg.className = `msg msg--${role}`;
            const bubble = document.createElement("div");
            bubble.className = "msg__bubble";
            bubble.textContent = text;
            msg.appendChild(bubble);
            thread.appendChild(msg);
            return msg;
        }

        appendLoading(thread) {
            const msg = document.createElement("div");
            msg.className = "msg msg--ai";
            msg.innerHTML = `<div class="msg__bubble msg__loading"><span></span><span></span><span></span></div>`;
            thread.appendChild(msg);
            return msg;
        }

        appendChart(thread, config, originalQuery = "", aiResponse = "") {
            if (!config || typeof ApexCharts === "undefined") return null;
            const signature = getChartSignature(originalQuery || config.title?.text || "", config);
            const wrapper = document.createElement("div");
            wrapper.className = "msg msg--ai msg--chart-wrap";

            const card = document.createElement("div");
            card.className = "msg__chart";
            const chartEl = document.createElement("div");
            card.appendChild(chartEl);

            // Button is a sibling of msg__chart — outside ApexCharts' DOM entirely
            // so its pointer events can never be swallowed by ApexCharts' SVG overlay
            const saveBtn = document.createElement("button");
            saveBtn.type = "button";
            saveBtn.className = "chart-save-btn";
            saveBtn.innerHTML = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
            this._applyChartSaveButtonState(saveBtn, false);
            this._ensureSavedChartsIndex().then(() => {
                if (!saveBtn.isConnected) return;
                this._applyChartSaveButtonState(saveBtn, this._savedChartSignatures.has(signature));
            });

            saveBtn.addEventListener("click", async () => {
                if (saveBtn.classList.contains("chart-save-btn--saving")) return;
                saveBtn.classList.add("chart-save-btn--saving");
                try {
                    await this._ensureSavedChartsIndex();
                    const alreadySaved = this._savedChartSignatures.has(signature);
                    const method = alreadySaved ? "DELETE" : "POST";
                    const res = await apiFetch("/api/chat/saved-charts", {
                        method,
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            title: config.title?.text || "Saved Chart",
                            original_query: originalQuery || config.title?.text || "Saved Chart",
                            chart_config_json: JSON.stringify(config),
                            ai_response: aiResponse || null,
                        }),
                    });
                    if (!res.ok) throw new Error();
                    saveBtn.classList.remove("chart-save-btn--saving");
                    if (alreadySaved) {
                        this._savedChartSignatures.delete(signature);
                    } else {
                        this._savedChartSignatures.add(signature);
                    }
                    this._applyChartSaveButtonState(saveBtn, !alreadySaved);
                } catch {
                    saveBtn.classList.remove("chart-save-btn--saving");
                }
            });

            wrapper.appendChild(card);
            wrapper.appendChild(saveBtn);
            thread.appendChild(wrapper);
            requestAnimationFrame(() => {
                try {
                    const cs = getComputedStyle(document.documentElement);
                    const get = (v, fb) => cs.getPropertyValue(v).trim() || fb;
                    const ink = get("--color-ink", get("--color-text", "#0a0a0b"));
                    const muted = get("--color-text-muted", "#8b939c");
                    const border = get("--color-border", "#d2d8de");

                    const themed = JSON.parse(JSON.stringify(config));
                    if (themed.chart) themed.chart.foreColor = ink;
                    themed.grid = { ...(themed.grid || {}), borderColor: border };
                    if (themed.title?.style) themed.title.style.color = ink;
                    if (themed.subtitle?.style) themed.subtitle.style.color = muted;
                    if (themed.xaxis?.labels?.style) themed.xaxis.labels.style.colors = muted;
                    if (themed.yaxis?.labels?.style) themed.yaxis.labels.style.colors = [muted];

                    new ApexCharts(chartEl, themed).render();
                    requestAnimationFrame(() => {
                        wrapper.scrollIntoView({ behavior: "smooth", block: "nearest" });
                    });
                } catch {
                    wrapper.remove();
                }
            });
            return wrapper;
        }

        hydrateTalkThread(view) {
            const thread = view.querySelector("#talkThread");
            if (!thread) return;
            if (this.state.talkHasMessage) thread.style.overflowY = "auto";
            for (const msg of this.state.talkMessages) {
                this.appendMessage(thread, msg.role, msg.text);
                if (msg.role === "ai" && msg.chartConfig) {
                    this.appendChart(thread, msg.chartConfig, msg.originalQuery || "");
                }
            }
            thread.scrollTop = thread.scrollHeight;
            if (this.state.talkStreaming) {
                const bubble = this._appendStreamingBubble(thread, this.state.talkStreamText);
                this._talkStreamBubble = bubble;
            }
            this._setTalkStreamingUi(view, this.state.talkStreaming);
            this._updateTalkThreadEdgeMasks(thread);
        }

        _updateTalkThreadEdgeMasks(thread) {
            const wrap = thread?.closest(".talk-page__thread-wrap");
            if (!wrap) return;
            const top = wrap.querySelector(".talk-page__thread-mask--top");
            const bottom = wrap.querySelector(".talk-page__thread-mask--bottom");
            const page = thread.closest(".talk-page");
            if (!page?.classList.contains("has-message")) {
                top?.setAttribute("data-visible", "false");
                bottom?.setAttribute("data-visible", "false");
                return;
            }
            const eps = 8;
            const { scrollTop, scrollHeight, clientHeight } = thread;
            const overflow = scrollHeight - clientHeight > eps;
            const showTop = overflow && scrollTop > eps;
            const showBottom = overflow && scrollTop + clientHeight < scrollHeight - eps;
            top?.setAttribute("data-visible", String(showTop));
            bottom?.setAttribute("data-visible", String(showBottom));
        }

        _bindTalkThreadEdgeMasks(thread) {
            const sync = () => this._updateTalkThreadEdgeMasks(thread);
            thread.addEventListener("scroll", sync, { passive: true });
            new ResizeObserver(sync).observe(thread);
            sync();
        }

        _appendStreamingBubble(thread, initialText) {
            const msg = document.createElement("div");
            msg.className = "msg msg--ai";
            const bubble = document.createElement("div");
            bubble.className = "msg__bubble msg__bubble--streaming";
            bubble.textContent = initialText;
            msg.appendChild(bubble);
            thread.appendChild(msg);
            return bubble;
        }

        _setTalkStreamingUi(view, streaming) {
            const sendBtn = view?.querySelector(".send-button");
            const stopBtn = view?.querySelector(".stop-button");
            if (sendBtn) sendBtn.style.display = streaming ? "none" : "";
            if (stopBtn) stopBtn.style.display = streaming ? "" : "none";
        }

        _syncTalkComposerInput(view) {
            const input = view?.querySelector("#talkPrompt");
            if (!input) return;
            input.rows = 1;
            input.style.removeProperty("height");
        }

        _getTalkView() {
            return this.routeStage.querySelector('[data-route="talk-to-data"]') ?? null;
        }

        _saveTalkMessages() {
            store.set(STORAGE.talkMessages, JSON.stringify(this.state.talkMessages));
        }

        _applyChartSaveButtonState(btn, isSaved) {
            if (!btn) return;
            btn.classList.toggle("chart-save-btn--saved", isSaved);
            btn.setAttribute("aria-label", isSaved ? "Remove from Saved Visuals" : "Save to Saved Visuals");
            btn.setAttribute("title", isSaved ? "Remove from Saved Visuals" : "Save to Saved Visuals");
        }

        async _ensureSavedChartsIndex(force = false) {
            if (force) this._savedChartsLoadedPromise = null;
            if (!this._savedChartsLoadedPromise) {
                this._savedChartsLoadedPromise = apiFetch("/api/chat/saved-charts")
                    .then((r) => {
                        if (!r.ok) throw new Error("load failed");
                        return r.json();
                    })
                    .then((charts) => {
                        this._savedChartSignatures = new Set(
                            (charts || []).map((chart) => {
                                let parsedConfig = {};
                                try {
                                    parsedConfig = chart.chart_config_json ? JSON.parse(chart.chart_config_json) : {};
                                } catch {}
                                return getChartSignature(chart.original_query || chart.title || "", parsedConfig);
                            })
                        );
                        return this._savedChartSignatures;
                    })
                    .catch(() => {
                        this._savedChartSignatures = new Set();
                        return this._savedChartSignatures;
                    });
            }
            return this._savedChartsLoadedPromise;
        }

        _pinUserMessageForReply(thread, msgEl) {
            if (!thread?.isConnected || !msgEl?.isConnected) return;
            const inset = 12;
            const viewH = thread.clientHeight;
            if (viewH < 48) return;
            const reserveBelow = Math.min(280, Math.max(88, Math.round(viewH * 0.34)));
            thread.style.paddingBottom = `${reserveBelow}px`;
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    const relTop =
                        msgEl.getBoundingClientRect().top -
                        thread.getBoundingClientRect().top +
                        thread.scrollTop;
                    thread.scrollTop = Math.max(0, relTop - inset);
                    this._updateTalkThreadEdgeMasks(thread);
                });
            });
        }

        _checkStreamScroll() {
            const bubble = this._talkStreamBubble;
            if (!bubble?.isConnected) return;
            const msgEl = bubble.parentElement;
            const thread = msgEl?.parentElement;
            if (!thread?.isConnected) return;
            const tr = thread.getBoundingClientRect();
            const br = bubble.getBoundingClientRect();
            const margin = 14;
            if (br.bottom > tr.bottom - margin) {
                thread.scrollTop += br.bottom - tr.bottom + margin;
            }
            this._updateTalkThreadEdgeMasks(thread);
        }

        async sendTalkPrompt(view, text) {
            const trimmed = text.trim();
            if (!trimmed || this.state.talkStreaming) return;

            const input = view.querySelector("#talkPrompt");
            const thread = view.querySelector("#talkThread");
            if (!input || !thread) return;

            const isFirstMessage = !this.state.talkHasMessage;
            if (isFirstMessage) {
                this.state.talkHasMessage = true;
                view.querySelector(".talk-page")?.classList.add("has-message");
                thread.style.overflowY = "auto";
                this._syncTalkComposerInput(view);
                const threadWrap = thread.closest(".talk-page__thread-wrap");
                const onExpanded = (e) => {
                    if (e.propertyName !== "flex-grow") return;
                    threadWrap?.removeEventListener("transitionend", onExpanded);
                    this._updateTalkThreadEdgeMasks(thread);
                    if (this._talkLastUserMsgEl?.isConnected) {
                        this._pinUserMessageForReply(thread, this._talkLastUserMsgEl);
                    }
                };
                threadWrap?.addEventListener("transitionend", onExpanded);
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => this._updateTalkThreadEdgeMasks(thread));
                });
            }

            input.value = "";
            input.focus();

            this.state.talkMessages.push({ role: "user", text: trimmed });
            this._saveTalkMessages();
            const userMsgEl = this.appendMessage(thread, "user", trimmed);
            this._talkLastUserMsgEl = userMsgEl;
            if (isFirstMessage) {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => this._pinUserMessageForReply(thread, userMsgEl));
                });
            } else {
                this._pinUserMessageForReply(thread, userMsgEl);
            }

            this.state.talkStreaming = true;
            this.state.talkStreamText = "";
            this._talkAbortController = new AbortController();
            this._setTalkStreamingUi(view, true);

            const loadingEl = this.appendLoading(thread);

            let finalText = null;
            let chartConfig = null;
            try {
                const res = await apiFetch("/api/chat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ message: trimmed, session_id: getSessionId() }),
                    signal: this._talkAbortController.signal,
                });
                const data = await res.json();
                loadingEl.remove();
                if (data.error) {
                    finalText = `Error: ${data.error}`;
                } else {
                    finalText = data.text || null;
                    chartConfig = data.chartConfig || null;
                }
            } catch (err) {
                loadingEl.remove();
                if (err.name !== "AbortError") {
                    finalText = "Connection error — is the server running?";
                }
            }

            this.state.talkStreaming = false;
            this.state.talkStreamText = "";
            this._talkAbortController = null;
            this._talkStreamBubble = null;

            const currentView = this._getTalkView();
            this._setTalkStreamingUi(currentView, false);
            const currentThread = currentView?.querySelector("#talkThread");

            if (finalText) {
                this.state.talkMessages.push({ role: "ai", text: finalText, chartConfig: chartConfig || null, originalQuery: trimmed });
                this._saveTalkMessages();
                if (currentThread) {
                    this.appendMessage(currentThread, "ai", finalText);
                    if (chartConfig) this.appendChart(currentThread, chartConfig, trimmed, finalText);
                }
            }

            if (currentThread) {
                if (this._talkLastUserMsgEl?.isConnected) {
                    this._pinUserMessageForReply(currentThread, this._talkLastUserMsgEl);
                } else {
                    this._updateTalkThreadEdgeMasks(currentThread);
                }
            }
            currentView?.querySelector("#talkPrompt")?.focus();
        }

        resetTalkChat(view) {
            if (this._talkAbortController) this._talkAbortController.abort();
            this.state.talkMessages = [];
            this.state.talkHasMessage = false;
            this.state.talkStreaming = false;
            this.state.talkStreamText = "";
            this._talkAbortController = null;
            this._talkStreamBubble = null;
            this._talkLastUserMsgEl = null;
            store.set(STORAGE.talkMessages, "[]");
            apiFetch(`/api/chat/history/${getSessionId()}`, { method: "DELETE" }).catch(() => {});
            const page = view.querySelector(".talk-page");
            const thread = view.querySelector("#talkThread");
            page?.classList.remove("has-message");
            if (thread) {
                thread.style.overflowY = "";
                thread.style.paddingBottom = "";
                thread.innerHTML = "";
                this._updateTalkThreadEdgeMasks(thread);
            }
            this._setTalkStreamingUi(view, false);
        }

        attachRouteHandlers(view, routeId) {
            if (routeId === "policy-rules") {
                this.attachPolicyHandlers(view, "rules");
                return;
            }
            if (routeId === "policy-violations") {
                this.attachPolicyHandlers(view, "violations");
                return;
            }
            if (routeId === "saved-visuals") {
                const grid = view.querySelector("#galleryGrid");
                const dialog = view.querySelector("#chartDialog");
                const dialogChart = view.querySelector("#chartDialogChart");
                const dialogQuery = view.querySelector("#chartDialogQuery");
                const dialogTs = view.querySelector("#chartDialogTs");
                const dialogResponse = view.querySelector("#chartDialogResponse");

                view.querySelector(".chart-dialog__close")?.addEventListener("click", () => dialog.close());
                dialog?.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });

                let activeDialogChart = null;

                const applyTheme = (themed) => {
                    const cs = getComputedStyle(document.documentElement);
                    const get = (v, fb) => cs.getPropertyValue(v).trim() || fb;
                    const ink = get("--color-ink", get("--color-text", "#0a0a0b"));
                    const muted = get("--color-text-muted", "#8b939c");
                    const border = get("--color-border", "#d2d8de");
                    if (themed.chart) themed.chart.foreColor = ink;
                    themed.grid = { ...(themed.grid || {}), borderColor: border };
                    if (themed.title?.style) themed.title.style.color = ink;
                    if (themed.subtitle?.style) themed.subtitle.style.color = muted;
                    if (themed.xaxis?.labels?.style) themed.xaxis.labels.style.colors = muted;
                    if (themed.yaxis?.labels?.style) themed.yaxis.labels.style.colors = [muted];
                    return themed;
                };

                const openDialog = (chart) => {
                    if (activeDialogChart) { try { activeDialogChart.destroy(); } catch {} activeDialogChart = null; }
                    dialogChart.innerHTML = "";
                    dialogQuery.textContent = chart.original_query || "";
                    dialogTs.textContent = chart.created_at
                        ? new Date(chart.created_at).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
                        : "";
                    dialogResponse.textContent = chart.ai_response || "";
                    dialogResponse.hidden = !chart.ai_response;
                    dialog.showModal();
                    requestAnimationFrame(() => {
                        try {
                            const config = JSON.parse(chart.chart_config_json);
                            const themed = applyTheme(JSON.parse(JSON.stringify(config)));
                            if (themed.chart) { themed.chart.height = 320; themed.chart.toolbar = { show: false }; }
                            const chartEl = document.createElement("div");
                            dialogChart.appendChild(chartEl);
                            activeDialogChart = new ApexCharts(chartEl, themed);
                            activeDialogChart.render();
                        } catch {}
                    });
                };

                apiFetch("/api/chat/saved-charts")
                    .then(r => r.json())
                    .then(charts => {
                        this._savedChartSignatures = new Set(
                            (charts || []).map((chart) => {
                                let parsedConfig = {};
                                try { parsedConfig = chart.chart_config_json ? JSON.parse(chart.chart_config_json) : {}; } catch {}
                                return getChartSignature(chart.original_query || chart.title || "", parsedConfig);
                            })
                        );
                        this._savedChartsLoadedPromise = Promise.resolve(this._savedChartSignatures);
                        if (!charts.length) {
                            grid.innerHTML = `<p class="gallery-empty">No saved charts yet. Save a chart from Talk to Data.</p>`;
                            return;
                        }
                        grid.innerHTML = "";
                        charts.forEach(chart => {
                            let parsedConfig = {};
                            try { parsedConfig = chart.chart_config_json ? JSON.parse(chart.chart_config_json) : {}; } catch {}
                            const chartSignature = getChartSignature(chart.original_query || chart.title || "", parsedConfig);
                            const thumb = document.createElement("div");
                            thumb.className = "sv-thumb";
                            thumb.setAttribute("role", "button");
                            thumb.setAttribute("tabindex", "0");
                            thumb.setAttribute("aria-label", chart.title || "Saved chart");
                            const trashBtn = document.createElement("button");
                            trashBtn.type = "button";
                            trashBtn.className = "sv-thumb__trash";
                            trashBtn.setAttribute("aria-label", "Delete saved visual");
                            trashBtn.setAttribute("title", "Delete saved visual");
                            trashBtn.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4.6A1.6 1.6 0 0 1 9.6 3h4.8A1.6 1.6 0 0 1 16 4.6V6"/><path d="M6.8 6l.95 13.2A1.8 1.8 0 0 0 9.54 21h4.92a1.8 1.8 0 0 0 1.79-1.8L17.2 6"/><path d="M10 10v7"/><path d="M14 10v7"/></svg>`;
                            const chartEl = document.createElement("div");
                            chartEl.className = "sv-thumb__chart";
                            thumb.appendChild(trashBtn);
                            thumb.appendChild(chartEl);
                            grid.appendChild(thumb);

                            requestAnimationFrame(() => {
                                try {
                                    const config = JSON.parse(chart.chart_config_json);
                                    const themed = applyTheme(JSON.parse(JSON.stringify(config)));
                                    delete themed.title;
                                    delete themed.subtitle;
                                    if (themed.chart) { themed.chart.height = 160; themed.chart.toolbar = { show: false }; themed.chart.animations = { enabled: false }; }
                                    if (themed.legend) themed.legend.show = false;
                                    if (themed.dataLabels) themed.dataLabels.enabled = false;
                                    new ApexCharts(chartEl, themed).render();
                                } catch {}
                            });

                            const handleOpen = () => openDialog(chart);
                            const handleDelete = async () => {
                                if (trashBtn.disabled) return;
                                trashBtn.disabled = true;
                                try {
                                    const res = await apiFetch("/api/chat/saved-charts", {
                                        method: "DELETE",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({
                                            title: chart.title || "Saved Chart",
                                            original_query: chart.original_query || chart.title || "Saved Chart",
                                            chart_config_json: chart.chart_config_json,
                                        }),
                                    });
                                    if (!res.ok) throw new Error("delete failed");
                                    this._savedChartSignatures.delete(chartSignature);
                                    thumb.remove();
                                    if (!grid.querySelector(".sv-thumb")) {
                                        grid.innerHTML = `<p class="gallery-empty">No saved charts yet. Save a chart from Talk to Data.</p>`;
                                    }
                                } catch {
                                    trashBtn.disabled = false;
                                }
                            };
                            trashBtn.addEventListener("click", (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDelete();
                            });
                            thumb.addEventListener("click", handleOpen);
                            thumb.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleOpen(); } });
                        });
                    })
                    .catch(() => { grid.innerHTML = `<p class="gallery-empty">Failed to load charts.</p>`; });
                return;
            }
            if (routeId === "pre-approval") {
                if (this.state.account === "Admin") {
                    let submissionsById = new Map();
                    let activeApprovalReqToken = 0;
                    const loadSubmissions = (status) => {
                        const list = view.querySelector("#submissionsList");
                        list.innerHTML = uxLoadingHtml("Loading requests…");
                        apiFetch(`/api/approvals?status=${status}`)
                            .then(r => r.json())
                            .then(subs => {
                                submissionsById = new Map((subs || []).map((s) => [String(s.id), s]));
                                if (!subs.length) {
                                    list.innerHTML = `<p class="empty-state">No ${status} requests.</p>`;
                                    return;
                                }
                                list.innerHTML = subs.map(s => `
                                    <div class="submission-row" data-id="${s.id}">
                                        <div class="submission-row__info">
                                            <span class="submission-row__name">${escHtml(s.parsed_name || "Unknown")}</span>
                                            <span class="submission-row__dept">${escHtml(s.parsed_department || "Unknown")}</span>
                                            <span class="submission-row__purpose">${escHtml(s.parsed_purpose || "No purpose provided")}</span>
                                        </div>
                                        <div class="submission-row__meta">
                                            <span class="submission-row__amount">$${Number(s.parsed_amount).toFixed(2)}</span>
                                            <span class="badge badge--${s.status}">${s.status}</span>
                                        </div>
                                    </div>
                                `).join("");
                                list.querySelectorAll(".submission-row").forEach(row => {
                                    row.addEventListener("click", () => openApprovalPanel(row.dataset.id));
                                });
                            })
                            .catch(() => { list.innerHTML = `<p class="empty-state">Failed to load submissions.</p>`; });
                    };

                    const approvalPanelEmpty = `<div class="approval-panel__empty">Click a request and a recommendation will appear here.</div>`;
                    this.enhanceSelectControl(view, "#statusFilter");

                    loadSubmissions("pending");

                    view.querySelector("#statusFilter")?.addEventListener("change", e => {
                        activeApprovalReqToken++;
                        const panelEl = view.querySelector("#approvalPanel");
                        if (panelEl) {
                            panelEl.classList.remove("approval-panel--recommendation-loading");
                            panelEl.innerHTML = approvalPanelEmpty;
                        }
                        loadSubmissions(e.target.value);
                    });

                    const openApprovalPanel = async (id) => {
                        const panel = view.querySelector("#approvalPanel");
                        let submission = submissionsById.get(String(id)) || {};
                        const headerName = submission.parsed_name || "Unknown";
                        const headerPurpose = submission.parsed_purpose || "";
                        const headerAmount = Number(submission.parsed_amount || 0).toFixed(2);
                        const submissionStatus = String(submission.status || "pending").toLowerCase();
                        const reqToken = ++activeApprovalReqToken;
                        let recommendationText = String(submission.recommendation_text || submission.note || "").trim();
                        if (!recommendationText && submissionStatus !== "pending") {
                            recommendationText = "No saved recommendation for this request yet.";
                        }
                        let isRecommendationLoading = !recommendationText && submissionStatus === "pending";

                        const decisionButtonsHtml = (() => {
                            if (submissionStatus === "approved") {
                                return `
                                    <button class="btn btn--decision btn--deny" data-action="denied" data-id="${id}">
                                        <svg class="btn__icon" viewBox="0 0 24 24" aria-hidden="true">
                                            <path d="M18 6L6 18M6 6l12 12"></path>
                                        </svg>
                                        <span class="btn__label">Change to denied</span>
                                    </button>
                                `;
                            }
                            if (submissionStatus === "denied") {
                                return `
                                    <button class="btn btn--decision btn--approve" data-action="approved" data-id="${id}">
                                        <svg class="btn__icon" viewBox="0 0 24 24" aria-hidden="true">
                                            <path d="M20 6L9 17l-5-5"></path>
                                        </svg>
                                        <span class="btn__label">Change to approved</span>
                                    </button>
                                `;
                            }
                            return `
                                <button class="btn btn--decision btn--approve" data-action="approved" data-id="${id}">
                                    <svg class="btn__icon" viewBox="0 0 24 24" aria-hidden="true">
                                        <path d="M20 6L9 17l-5-5"></path>
                                    </svg>
                                    <span class="btn__label">Approve</span>
                                </button>
                                <button class="btn btn--decision btn--deny" data-action="denied" data-id="${id}">
                                    <svg class="btn__icon" viewBox="0 0 24 24" aria-hidden="true">
                                        <path d="M18 6L6 18M6 6l12 12"></path>
                                    </svg>
                                    <span class="btn__label">Deny</span>
                                </button>
                            `;
                        })();

                        const renderPanel = () => {
                            const recommendationCls = isRecommendationLoading
                                ? "approval-panel__recommendation approval-panel__recommendation--unified approval-panel__recommendation--loading"
                                : "approval-panel__recommendation approval-panel__recommendation--unified";
                            const recommendationHtml = isRecommendationLoading
                                ? `<div class="msg__loading" role="status" aria-label="Generating recommendation"><span></span><span></span><span></span></div>`
                                : `
                                    <button class="approval-panel__redo-btn" type="button" data-redo-recommendation title="Regenerate recommendation" aria-label="Regenerate recommendation">
                                        <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                                            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                                            <path d="M3 3v5h5"></path>
                                        </svg>
                                    </button>
                                    <p>${escHtml(recommendationText)}</p>
                                `;
                            panel.innerHTML = `
                                <div class="approval-panel__header">
                                    <h3>${escHtml(headerName)} — $${headerAmount}</h3>
                                    <p class="approval-panel__purpose">${escHtml(headerPurpose)}</p>
                                </div>
                                <div class="${recommendationCls}">
                                    ${recommendationHtml}
                                </div>
                                <div class="approval-panel__actions approval-panel__actions--decide">
                                    <div class="approval-panel__btns">
                                        ${decisionButtonsHtml}
                                    </div>
                                </div>
                            `;
                            panel.classList.toggle("approval-panel--recommendation-loading", isRecommendationLoading);
                            const redoBtn = panel.querySelector("[data-redo-recommendation]");
                            if (redoBtn) {
                                redoBtn.addEventListener("click", async () => {
                                    redoBtn.disabled = true;
                                    isRecommendationLoading = true;
                                    renderPanel();
                                    try {
                                        const res = await apiFetch(`/api/approvals/${id}?refresh=1`);
                                        if (!res.ok) throw new Error("refresh failed");
                                        const data = await res.json();
                                        if (reqToken !== activeApprovalReqToken) return;
                                        submission = { ...submission, ...data };
                                        submissionsById.set(String(id), submission);
                                        recommendationText = data.recommendation || "No recommendation generated.";
                                    } catch {
                                        if (reqToken !== activeApprovalReqToken) return;
                                        recommendationText = "Recommendation unavailable right now.";
                                    } finally {
                                        if (reqToken !== activeApprovalReqToken) return;
                                        isRecommendationLoading = false;
                                        renderPanel();
                                    }
                                });
                            }
                            panel.querySelectorAll("[data-action]").forEach(btn => {
                                btn.addEventListener("click", async () => {
                                    const action = btn.dataset.action;
                                    panel.querySelectorAll("[data-action]").forEach((actionBtn) => {
                                        actionBtn.disabled = true;
                                    });
                                    if (redoBtn) redoBtn.disabled = true;
                                    const note = isRecommendationLoading ? null : recommendationText;
                                    try {
                                        await apiFetch(`/api/approvals/${id}/decide`, {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({ action, note }),
                                        });
                                        if (reqToken === activeApprovalReqToken) {
                                            panel.classList.remove("approval-panel--recommendation-loading");
                                            panel.innerHTML = approvalPanelEmpty;
                                            loadSubmissions(view.querySelector("#statusFilter").value);
                                        }
                                    } catch {
                                        panel.querySelectorAll("[data-action]").forEach((actionBtn) => {
                                            actionBtn.disabled = false;
                                        });
                                        if (redoBtn) redoBtn.disabled = false;
                                    }
                                });
                            });
                        };

                        renderPanel();
                        panel.scrollIntoView({ behavior: "smooth" });
                        if (isRecommendationLoading) {
                            try {
                                const res = await apiFetch(`/api/approvals/${id}`);
                                if (!res.ok) throw new Error("fetch failed");
                                const data = await res.json();
                                if (reqToken !== activeApprovalReqToken) return;
                                submission = { ...submission, ...data };
                                submissionsById.set(String(id), submission);
                                recommendationText = data.recommendation || "No recommendation generated.";
                                isRecommendationLoading = false;
                                renderPanel();
                            } catch {
                                if (reqToken !== activeApprovalReqToken) return;
                                recommendationText = "Recommendation unavailable right now.";
                                isRecommendationLoading = false;
                                renderPanel();
                            }
                        }
                    };

                } else {
                    // ── John view ──────────────────────────────────────────
                    const loadMyRequests = () => {
                        const body = view.querySelector("#mySubmissionsBody");
                        const badge = view.querySelector("#myRequestsBadge");
                        body.innerHTML = uxLoadingHtml("Loading your requests…");
                        apiFetch("/api/approvals?status=all")
                            .then(r => r.json())
                            .then(subs => {
                                const mine = subs.filter(s =>
                                    (s.parsed_name || "").toLowerCase().includes("john")
                                );
                                const pending = mine.filter(s => s.status === "pending").length;
                                if (pending > 0) {
                                    badge.textContent = `${pending} pending`;
                                    badge.hidden = false;
                                } else {
                                    badge.hidden = true;
                                }
                                if (!mine.length) {
                                    body.innerHTML = `<p class="empty-state">No requests yet — submit your first one above.</p>`;
                                    return;
                                }
                                body.innerHTML = mine.map(s => `
                                    <div class="submission-row sr-row">
                                        <div class="submission-row__info">
                                            <span class="submission-row__purpose">${escHtml(s.parsed_purpose || "Expense request")}</span>
                                            <span class="submission-row__date">${new Date(s.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                                        </div>
                                        <div class="submission-row__meta">
                                            <span class="submission-row__amount">$${Number(s.parsed_amount || 0).toFixed(2)}</span>
                                            <span class="badge badge--${s.status}">${s.status}</span>
                                        </div>
                                    </div>
                                `).join("");
                            })
                            .catch(() => {
                                body.innerHTML = `<p class="empty-state">Failed to load requests.</p>`;
                            });
                    };

                    loadMyRequests();

                    const textarea = view.querySelector("#requestText");
                    const charCount = view.querySelector("#requestCharCount");
                    textarea?.addEventListener("input", () => {
                        const len = textarea.value.length;
                        charCount.textContent = `${len} / 500`;
                        charCount.classList.toggle("sr-charcount--warn", len > 450);
                    });

                    view.querySelector("#submitRequestForm")?.addEventListener("submit", async (e) => {
                        e.preventDefault();
                        const text = textarea.value.trim();
                        if (!text) return;
                        const btn = e.target.querySelector("button[type=submit]");
                        const feedback = view.querySelector("#submitFeedback");
                        btn.disabled = true;
                        btn.textContent = "Submitting…";
                        feedback.hidden = true;
                        try {
                            const res = await apiFetch("/api/approvals", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ raw_request: `I'm John. ${text}` }),
                            });
                            if (!res.ok) throw new Error("submit failed");
                            textarea.value = "";
                            charCount.textContent = "0 / 500";
                            feedback.textContent = "✓ Request submitted — finance will be notified.";
                            feedback.className = "sr-feedback sr-feedback--success";
                            feedback.hidden = false;
                            btn.textContent = "Submit Request";
                            btn.disabled = false;
                            loadMyRequests();
                            setTimeout(() => { feedback.hidden = true; }, 4000);
                        } catch {
                            feedback.textContent = "Something went wrong. Please try again.";
                            feedback.className = "sr-feedback sr-feedback--error";
                            feedback.hidden = false;
                            btn.disabled = false;
                            btn.textContent = "Submit Request";
                        }
                    });
                }
                return;
            }
            if (routeId === "expense-reports") {
                const loadReports = () => {
                    const listEl = view.querySelector("#reportsList");
                    if (listEl) listEl.innerHTML = uxLoadingHtml("Loading reports…");
                    apiFetch("/api/reports")
                        .then(r => r.json())
                        .then(reports => {
                            const list = view.querySelector("#reportsList");
                            if (!reports.length) { list.innerHTML = `<p class="empty-state">No expense reports yet.</p>`; return; }
                            list.innerHTML = reports.map(r => `
                                <div class="report-card">
                                    <div class="report-card__header">
                                        <span class="report-card__title">${escHtml(r.title || "Expense Report")}</span>
                                        <span class="badge badge--${r.status}">${r.status}</span>
                                    </div>
                                    <div class="report-card__meta">
                                        <span>${escHtml(r.emp_name || "Unknown")} · ${escHtml(r.emp_dept || "Unknown")}</span>
                                        <span>${r.date_range_start} → ${r.date_range_end}</span>
                                        <span>${r.item_count} transactions · <strong>$${Number(r.total_amount).toFixed(2)}</strong></span>
                                    </div>
                                    <p class="report-card__policy">${escHtml(r.policy_summary || "")}</p>
                                    ${r.status === "pending" && this.state.account === "Admin" ? `
                                    <div class="report-card__actions">
                                        <button class="btn btn--decision btn--approve" data-report="${r.id}" data-action="approved">
                                            <svg class="btn__icon" viewBox="0 0 24 24" aria-hidden="true">
                                                <path d="M20 6L9 17l-5-5"></path>
                                            </svg>
                                            <span class="btn__label">Approve</span>
                                        </button>
                                        <button class="btn btn--decision btn--deny" data-report="${r.id}" data-action="denied">
                                            <svg class="btn__icon" viewBox="0 0 24 24" aria-hidden="true">
                                                <path d="M18 6L6 18M6 6l12 12"></path>
                                            </svg>
                                            <span class="btn__label">Deny</span>
                                        </button>
                                    </div>` : ""}
                                </div>
                            `).join("");
                            list.querySelectorAll("[data-report]").forEach(btn => {
                                btn.addEventListener("click", () => {
                                    apiFetch(`/api/reports/${btn.dataset.report}/decide`, {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ action: btn.dataset.action }),
                                    }).then(() => loadReports());
                                });
                            });
                        })
                        .catch(() => { view.querySelector("#reportsList").innerHTML = `<p class="empty-state">Failed to load reports.</p>`; });
                };

                loadReports();

                if (this.state.account === "Admin") {
                    const refreshEmployeePicker = this.enhanceSelectControl(view, "#reportEmployee");
                    apiFetch("/api/employees")
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
                            refreshEmployeePicker?.();
                        });

                    const endDate = new Date().toISOString().split("T")[0];
                    const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
                    const startInput = view.querySelector("#reportStart");
                    const endInput = view.querySelector("#reportEnd");
                    if (startInput) {
                        this.enhanceDateInput(startInput);
                        this.setDateInputValue(startInput, startDate);
                    }
                    if (endInput) {
                        this.enhanceDateInput(endInput);
                        this.setDateInputValue(endInput, endDate);
                    }

                    view.querySelector("#generateBtn")?.addEventListener("click", async () => {
                        const empSel = view.querySelector("#reportEmployee");
                        const empId = empSel?.value;
                        const start = this.getDateInputValue(view.querySelector("#reportStart"));
                        const end = this.getDateInputValue(view.querySelector("#reportEnd"));
                        if (!empId || !start || !end) { alert("Please select an employee and date range."); return; }
                        const btn = view.querySelector("#generateBtn");
                        const reportsListEl = view.querySelector("#reportsList");
                        if (reportsListEl) reportsListEl.innerHTML = uxLoadingHtml("Generating reports…");
                        btn.disabled = true;
                        btn.textContent = "Generating…";
                        try {
                            const res = await apiFetch("/api/reports/generate", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ employee_id: parseInt(empId), date_start: start, date_end: end }),
                            });
                            if (!res.ok) throw new Error(await res.text());
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
                return;
            }
            if (routeId !== DEFAULT_ROUTE) {
                return;
            }
            const form = view.querySelector('[data-role="prompt-form"]');
            const input = view.querySelector("#talkPrompt");
            const stopBtn = view.querySelector(".stop-button");
            const resetBtn = view.querySelector(".talk-reset-btn");
            if (!form || !input) {
                return;
            }
            const threadEl = view.querySelector("#talkThread");
            if (threadEl) this._bindTalkThreadEdgeMasks(threadEl);
            resetBtn?.addEventListener("click", () => this.resetTalkChat(view));
            stopBtn?.addEventListener("click", () => {
                if (this.state.talkStreaming && this._talkAbortController) {
                    this._talkAbortController.abort();
                }
            });
            // Load existing conversation history
            const self = this;
            const sessionId = getSessionId();
            const thread = view.querySelector("#talkThread");
            apiFetch(`/api/chat/history/${sessionId}`)
                .then(r => r.json())
                .then(history => {
                    // Clear thread to avoid double-render with hydrateTalkThread
                    thread.replaceChildren();
                    if (!history.length) return;
                    if (!self.state.talkHasMessage) {
                        self.state.talkHasMessage = true;
                        view.querySelector(".talk-page")?.classList.add("has-message");
                        if (thread) thread.style.overflowY = "auto";
                    }
                    let lastUserQuery = "";
                    for (const msg of history) {
                        if (msg.role === "user") {
                            lastUserQuery = msg.content;
                            self.appendMessage(thread, "user", msg.content);
                        } else {
                            self.appendMessage(thread, "ai", msg.content);
                            let chartCfg = null;
                            if (msg.chart_config) {
                                try { chartCfg = JSON.parse(msg.chart_config); } catch {}
                            } else {
                                // Legacy fallback: extract from old markdown code block format
                                const match = msg.content.match(/```apexcharts\s*([\s\S]*?)```/);
                                if (match) try { chartCfg = JSON.parse(match[1].trim()); } catch {}
                            }
                            if (chartCfg) self.appendChart(thread, chartCfg, lastUserQuery);
                        }
                    }
                })
                .catch(() => {});
            form.addEventListener("submit", async (e) => {
                e.preventDefault();
                if (this.state.talkStreaming) return;
                await this.sendTalkPrompt(view, input.value);
            });
            view.querySelectorAll("[data-talk-suggestion]").forEach((btn) => {
                btn.addEventListener("click", () => {
                    const prompt = btn.getAttribute("data-talk-suggestion") ?? "";
                    void this.sendTalkPrompt(view, prompt);
                });
            });
            input.addEventListener("keydown", (e) => {
                if (e.key !== "Enter" || e.shiftKey) {
                    return;
                }
                e.preventDefault();
                if (this.state.talkStreaming) return;
                form.requestSubmit();
            });
        }


        enhanceSelectControl(view, selector) {
            const select = view.querySelector(selector);
            if (!select) return null;

            if (typeof select._uxPickerRefresh === "function") {
                select._uxPickerRefresh();
                return select._uxPickerRefresh;
            }

            this._pickerSeq += 1;
            const listId = `ux-picker-list-${this._pickerSeq}`;
            const wrapper = document.createElement("div");
            wrapper.className = "ux-picker";
            wrapper.dataset.selectId = select.id || "";

            select.classList.add("ux-select-native");
            select.insertAdjacentElement("afterend", wrapper);

            const button = document.createElement("button");
            button.type = "button";
            button.className = "ux-picker__button";
            button.setAttribute("aria-haspopup", "listbox");
            button.setAttribute("aria-expanded", "false");
            button.setAttribute("aria-controls", listId);

            const buttonLabel = document.createElement("span");
            buttonLabel.className = "ux-picker__label";
            button.appendChild(buttonLabel);

            const popover = document.createElement("div");
            popover.className = "ux-picker__popover";
            const list = document.createElement("ul");
            list.className = "ux-picker__list";
            list.id = listId;
            list.setAttribute("role", "listbox");
            popover.appendChild(list);

            wrapper.append(select, button, popover);
            this._pickerRoots.add(wrapper);
            if (!this._pickerPointerBound) {
                document.addEventListener("pointerdown", this._onPickerPointerDown);
                this._pickerPointerBound = true;
            }

            let optionButtons = [];

            const setOpen = (open) => {
                wrapper.classList.toggle("is-open", open);
                button.setAttribute("aria-expanded", String(open));
            };

            const applyValue = (value, index) => {
                if (Number.isInteger(index) && select.selectedIndex !== index) {
                    select.selectedIndex = index;
                } else if (select.value !== value) {
                    select.value = value;
                } else {
                    return;
                }
                select.dispatchEvent(new Event("input", { bubbles: true }));
                select.dispatchEvent(new Event("change", { bubbles: true }));
            };

            const syncSelectedState = () => {
                const selected = select.options[select.selectedIndex] ?? select.options[0];
                buttonLabel.textContent = selected?.textContent?.trim() || "Select option";
                optionButtons.forEach((optBtn) => {
                    const active = optBtn.dataset.value === select.value;
                    optBtn.classList.toggle("is-selected", active);
                    optBtn.setAttribute("aria-selected", String(active));
                });
            };

            const focusSelectedOrFirst = () => {
                const selectedBtn = optionButtons.find((btn) => btn.dataset.value === select.value);
                (selectedBtn ?? optionButtons[0])?.focus();
            };

            const buildOptions = () => {
                const options = Array.from(select.options);
                list.innerHTML = options.map((opt, i) => `
                    <li class="ux-picker__item" role="presentation">
                        <button
                            type="button"
                            role="option"
                            class="ux-picker__option"
                            data-value="${escHtml(opt.value)}"
                            data-index="${i}"
                            aria-selected="false"
                        >${escHtml(opt.textContent || "")}</button>
                    </li>
                `).join("");
                optionButtons = Array.from(list.querySelectorAll(".ux-picker__option"));
                optionButtons.forEach((optBtn) => {
                    optBtn.addEventListener("click", () => {
                        const idx = Number.parseInt(optBtn.dataset.index ?? "", 10);
                        applyValue(optBtn.dataset.value ?? "", Number.isNaN(idx) ? undefined : idx);
                        syncSelectedState();
                        setOpen(false);
                        button.focus({ preventScroll: true });
                    });
                });
                syncSelectedState();
            };

            button.addEventListener("click", () => {
                const open = !wrapper.classList.contains("is-open");
                setOpen(open);
                if (open) focusSelectedOrFirst();
            });

            button.addEventListener("keydown", (e) => {
                if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                    e.preventDefault();
                    setOpen(true);
                    focusSelectedOrFirst();
                }
            });

            list.addEventListener("keydown", (e) => {
                if (!optionButtons.length) return;
                const idx = optionButtons.indexOf(document.activeElement);
                if (e.key === "Escape") {
                    e.preventDefault();
                    setOpen(false);
                    button.focus({ preventScroll: true });
                    return;
                }
                if (e.key === "ArrowDown") {
                    e.preventDefault();
                    const nextIdx = idx < 0 ? 0 : Math.min(idx + 1, optionButtons.length - 1);
                    optionButtons[nextIdx]?.focus();
                    return;
                }
                if (e.key === "ArrowUp") {
                    e.preventDefault();
                    const prevIdx = idx < 0 ? optionButtons.length - 1 : Math.max(idx - 1, 0);
                    optionButtons[prevIdx]?.focus();
                    return;
                }
                if (e.key === "Home") {
                    e.preventDefault();
                    optionButtons[0]?.focus();
                    return;
                }
                if (e.key === "End") {
                    e.preventDefault();
                    optionButtons[optionButtons.length - 1]?.focus();
                    return;
                }
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    const active = document.activeElement;
                    if (active?.classList.contains("ux-picker__option")) {
                        active.click();
                    }
                }
            });

            select.addEventListener("change", syncSelectedState);
            const refresh = () => {
                buildOptions();
            };
            select._uxPickerRefresh = refresh;
            buildOptions();
            return refresh;
        }

        enhanceDateInput(input) {
            if (!input || input.dataset.uxCalendarBound === "1") return;
            input.dataset.uxCalendarBound = "1";
            input.readOnly = true;

            const open = () => this.openCalendarPopup(input);
            input.addEventListener("click", open);
            input.addEventListener("focus", open);
            input.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
                    e.preventDefault();
                    open();
                }
            });
        }

        setDateInputValue(input, iso) {
            if (!input) return;
            const safe = isIsoDate(iso) ? iso : "";
            input.dataset.isoDate = safe;
            input.value = safe ? isoToDisplayDate(safe) : "";
        }

        getDateInputValue(input) {
            if (!input) return "";
            const ds = input.dataset.isoDate || "";
            if (isIsoDate(ds)) return ds;
            const parsed = displayToIsoDate(input.value);
            if (parsed) {
                this.setDateInputValue(input, parsed);
                return parsed;
            }
            return "";
        }

        ensureCalendarRoot() {
            if (this._calendarRoot?.isConnected) return;
            const root = document.createElement("div");
            root.className = "ux-calendar";
            root.innerHTML = `
                <div class="ux-calendar__header">
                    <button type="button" class="ux-calendar__nav" data-cal-nav="-1" aria-label="Previous month">‹</button>
                    <div class="ux-calendar__title" id="uxCalendarTitle"></div>
                    <button type="button" class="ux-calendar__nav" data-cal-nav="1" aria-label="Next month">›</button>
                </div>
                <div class="ux-calendar__weekdays"></div>
                <div class="ux-calendar__grid"></div>
                <div class="ux-calendar__foot">
                    <button type="button" class="ux-calendar__action" data-cal-action="clear">Clear</button>
                    <button type="button" class="ux-calendar__action" data-cal-action="today">Today</button>
                </div>
            `;
            const weekdays = root.querySelector(".ux-calendar__weekdays");
            weekdays.innerHTML = CALENDAR_WEEKDAYS.map((d) => `<span>${d}</span>`).join("");

            root.addEventListener("click", (e) => {
                const nav = e.target.closest("[data-cal-nav]");
                if (nav) {
                    const delta = Number.parseInt(nav.dataset.calNav, 10) || 0;
                    const d = new Date(this._calendarYear, this._calendarMonth + delta, 1);
                    this._calendarYear = d.getFullYear();
                    this._calendarMonth = d.getMonth();
                    this.renderCalendarPopup();
                    this.positionCalendarPopup();
                    return;
                }
                const dayBtn = e.target.closest("[data-cal-iso]");
                if (dayBtn && this._calendarInput) {
                    this.setDateInputValue(this._calendarInput, dayBtn.dataset.calIso || "");
                    this.closeCalendarPopup();
                    this._calendarInput.focus({ preventScroll: true });
                    return;
                }
                const action = e.target.closest("[data-cal-action]")?.dataset.calAction;
                if (!action || !this._calendarInput) return;
                if (action === "clear") {
                    this.setDateInputValue(this._calendarInput, "");
                    this.closeCalendarPopup();
                    return;
                }
                if (action === "today") {
                    const todayIso = new Date().toISOString().slice(0, 10);
                    this.setDateInputValue(this._calendarInput, todayIso);
                    this.closeCalendarPopup();
                }
            });

            document.body.appendChild(root);
            this._calendarRoot = root;
        }

        openCalendarPopup(input) {
            if (!input) return;
            this.ensureCalendarRoot();
            this._calendarInput = input;
            const baseIso = this.getDateInputValue(input) || new Date().toISOString().slice(0, 10);
            const base = new Date(`${baseIso}T12:00:00`);
            this._calendarYear = base.getFullYear();
            this._calendarMonth = base.getMonth();
            this.renderCalendarPopup();
            this._calendarRoot.classList.add("is-open");
            this.positionCalendarPopup();
        }

        closeCalendarPopup() {
            if (!this._calendarRoot) return;
            this._calendarRoot.classList.remove("is-open");
        }

        positionCalendarPopup() {
            if (!this._calendarRoot || !this._calendarInput) return;
            const inputRect = this._calendarInput.getBoundingClientRect();
            const rootRect = this._calendarRoot.getBoundingClientRect();
            const margin = 8;
            let left = inputRect.left;
            let top = inputRect.bottom + 6;

            if (left + rootRect.width > window.innerWidth - margin) {
                left = window.innerWidth - rootRect.width - margin;
            }
            if (left < margin) left = margin;

            const spaceBelow = window.innerHeight - inputRect.bottom;
            const spaceAbove = inputRect.top;
            if (spaceBelow < rootRect.height + 10 && spaceAbove > rootRect.height + 10) {
                top = inputRect.top - rootRect.height - 6;
            }

            this._calendarRoot.style.left = `${Math.round(left)}px`;
            this._calendarRoot.style.top = `${Math.round(top)}px`;
        }

        renderCalendarPopup() {
            if (!this._calendarRoot || !this._calendarInput) return;
            const title = this._calendarRoot.querySelector("#uxCalendarTitle");
            const grid = this._calendarRoot.querySelector(".ux-calendar__grid");
            const selectedIso = this.getDateInputValue(this._calendarInput);
            const todayIso = new Date().toISOString().slice(0, 10);

            title.textContent = `${CALENDAR_MONTHS[this._calendarMonth]} ${this._calendarYear}`;

            const first = new Date(this._calendarYear, this._calendarMonth, 1);
            const firstWeekday = first.getDay();
            const daysInMonth = new Date(this._calendarYear, this._calendarMonth + 1, 0).getDate();
            const daysInPrev = new Date(this._calendarYear, this._calendarMonth, 0).getDate();
            const cells = [];

            for (let i = firstWeekday - 1; i >= 0; i -= 1) {
                const day = daysInPrev - i;
                const d = new Date(this._calendarYear, this._calendarMonth - 1, day);
                const iso = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
                cells.push({ iso, day, outside: true });
            }
            for (let day = 1; day <= daysInMonth; day += 1) {
                const iso = `${this._calendarYear}-${pad2(this._calendarMonth + 1)}-${pad2(day)}`;
                cells.push({ iso, day, outside: false });
            }
            while (cells.length < 42) {
                const day = cells.length - (firstWeekday + daysInMonth) + 1;
                const d = new Date(this._calendarYear, this._calendarMonth + 1, day);
                const iso = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
                cells.push({ iso, day, outside: true });
            }

            grid.innerHTML = cells.map((c) => {
                const cls = [
                    "ux-calendar__day",
                    c.outside ? "is-outside" : "",
                    c.iso === selectedIso ? "is-selected" : "",
                    c.iso === todayIso ? "is-today" : "",
                ].filter(Boolean).join(" ");
                return `<button type="button" class="${cls}" data-cal-iso="${c.iso}" aria-label="${c.iso}">${c.day}</button>`;
            }).join("");
        }


        attachPolicyHandlers(view, section) {
            if (section === "rules") {
                this._attachPolicyRules(view);
                return;
            }
            this._attachPolicyViolations(view);
        }

        _attachPolicyRules(view) {
            const stored = readStoredPolicyRules();
            const rulesData = stored ? [...stored] : [...POLICY_RULES];
            const rulesList   = view.querySelector("#rulesList");
            const addRuleBtn  = view.querySelector("[data-action='add-rule']");
            if (!rulesList) return;
            const DEL_SVG  = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 4.5h10M6 4.5V3h4v1.5M5 4.5l.7 8h4.6l.7-8"/></svg>`;

            const persistRules = () => savePolicyRules(rulesData);

            // ── Rules list ─────────────────────────────────────────────
            const ruleRowIndex = (li) => [...rulesList.querySelectorAll(".rule-row")].indexOf(li);

            const renumberRuleRows = () => {
                rulesList.querySelectorAll(".rule-row").forEach((row, i) => {
                    row.querySelector(".rule-row__num").textContent = String(i + 1);
                    row.querySelector(".rule-row__input").setAttribute("aria-label", `Rule ${i + 1}`);
                });
            };

            const createRuleRow = (dataIndex) => {
                const li = document.createElement("li");
                li.className = "rule-row";

                const num = document.createElement("span");
                num.className = "rule-row__num";
                num.setAttribute("aria-hidden", "true");
                num.textContent = String(dataIndex + 1);

                const inp = document.createElement("div");
                inp.className = "rule-row__input";
                inp.contentEditable = "plaintext-only";
                inp.setAttribute("role", "textbox");
                inp.setAttribute("spellcheck", "false");
                inp.setAttribute("aria-label", `Rule ${dataIndex + 1}`);
                inp.setAttribute("aria-multiline", "true");
                inp.textContent = rulesData[dataIndex] ?? "";

                const del = document.createElement("button");
                del.type = "button";
                del.className = "rule-row__del";
                del.setAttribute("aria-label", "Delete rule");
                del.title = "Delete rule";
                del.innerHTML = DEL_SVG;

                del.addEventListener("click", () => {
                    const idx = ruleRowIndex(li);
                    if (idx < 0) return;
                    rulesData.splice(idx, 1);
                    li.remove();
                    renumberRuleRows();
                    persistRules();
                });

                inp.addEventListener("blur", () => {
                    const idx = ruleRowIndex(li);
                    if (idx < 0) return;
                    const val = inp.innerText.trim();
                    if (val) {
                        rulesData[idx] = val;
                    } else {
                        rulesData.splice(idx, 1);
                        li.remove();
                        renumberRuleRows();
                    }
                    persistRules();
                });

                inp.addEventListener("keydown", (e) => {
                    if (e.key !== "Enter" || e.shiftKey) return;
                    e.preventDefault();
                    const idx = ruleRowIndex(li);
                    if (idx < 0) return;
                    rulesData[idx] = inp.innerText.trim() || rulesData[idx];
                    const next = li.nextElementSibling;
                    if (next?.classList.contains("rule-row")) {
                        next.querySelector(".rule-row__input").focus();
                    } else {
                        rulesData.splice(idx + 1, 0, "");
                        const nu = createRuleRow(idx + 1);
                        li.after(nu);
                        renumberRuleRows();
                        nu.querySelector(".rule-row__input").focus();
                    }
                    persistRules();
                });

                li.append(num, inp, del);
                return li;
            };

            const renderRules = () => {
                rulesList.innerHTML = "";
                rulesData.forEach((_, i) => {
                    rulesList.appendChild(createRuleRow(i));
                });
            };

            addRuleBtn?.addEventListener("click", () => {
                rulesData.push("");
                rulesList.appendChild(createRuleRow(rulesData.length - 1));
                rulesList.querySelector(".rule-row:last-child .rule-row__input")?.focus();
                persistRules();
            });

            renderRules();
            if (!stored) {
                persistRules();
            }
        }

        _attachPolicyViolations(view) {
            const cs = {
                subtab: "violations",
                vSort: { key: "date", dir: "desc" },
                vFilter: { severity: null },
                lSort: { key: "violations", dir: "desc" },
                lFilter: { dept: null },
            };

            const toolbar     = view.querySelector("#complianceToolbar");
            const body        = view.querySelector("#complianceBody");
            if (!toolbar || !body) return;

            const dismissedIds = new Set();

            let violationsData = [];
            let leaderboardData = [];

            const fmtAmt  = (n) => `$${n.toLocaleString("en-US")}`;
            const fmtDate = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
            const sevOrder = { high: 0, med: 1, low: 2 };
            const sevLabel = { high: "High", med: "Medium", low: "Low" };
            const SORT_SVG = `<svg class="vt__sort-icon" width="9" height="6" viewBox="0 0 9 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 1l3.5 4 3.5-4"/></svg>`;

            // ── Compliance ─────────────────────────────────────────────
            const makeSortTh = (label, key, sortState) => {
                const th = document.createElement("th");
                if (key) {
                    th.dataset.sort = key;
                    if (sortState.key === key) {
                        th.classList.add("is-sorted");
                        if (sortState.dir === "asc") th.classList.add("sort-asc");
                    }
                    th.addEventListener("click", () => {
                        sortState.dir = sortState.key === key && sortState.dir === "desc" ? "asc" : "desc";
                        sortState.key = key;
                        renderBody();
                    });
                }
                th.innerHTML = label + (key ? SORT_SVG : "");
                return th;
            };

            const buildViolationsTable = () => {
                const rows = violationsData
                    .filter(v => !dismissedIds.has(v.id))
                    .filter(v => !cs.vFilter.severity || v.severity === cs.vFilter.severity)
                    .sort((a, b) => {
                        const k = cs.vSort.key, d = cs.vSort.dir;
                        let va = a[k], vb = b[k];
                        if (k === "severity") { va = sevOrder[a.severity]; vb = sevOrder[b.severity]; }
                        if (k === "date")     { va = +new Date(a.date); vb = +new Date(b.date); }
                        return d === "asc" ? (va < vb ? -1 : va > vb ? 1 : 0) : (va > vb ? -1 : va < vb ? 1 : 0);
                    });

                const table = document.createElement("table");
                table.className = "vt";
                const thead = document.createElement("thead");
                thead.className = "vt__head";
                const htr = document.createElement("tr");
                [["Employee","employee"],["Amount","amount"],["Merchant","merchant"],["Date","date"],["Notes",null],["Severity","severity"]]
                    .forEach(([lbl, key]) => htr.appendChild(makeSortTh(lbl, key, cs.vSort)));
                thead.appendChild(htr);
                table.appendChild(thead);

                const tbody = document.createElement("tbody");
                tbody.className = "vt__body";

                if (!rows.length) {
                    const tr = document.createElement("tr");
                    const td = document.createElement("td");
                    td.colSpan = 6;
                    td.className = "vt__empty";
                    td.textContent = "No violations match the current filter.";
                    tr.appendChild(td);
                    tbody.appendChild(tr);
                } else {
                    rows.forEach((v) => {
                        const tr = document.createElement("tr");
                        tr.className = "is-clickable";
                        tr.addEventListener("click", () => openViolationDialog(v));

                        const tdE = document.createElement("td");
                        tdE.append(
                            Object.assign(document.createElement("div"), { className: "vt__name", textContent: v.employee }),
                            Object.assign(document.createElement("div"), { className: "vt__sub",  textContent: v.dept })
                        );

                        const tdA = Object.assign(document.createElement("td"), { className: "vt__amount", textContent: fmtAmt(v.amount) });
                        const tdM = Object.assign(document.createElement("td"), { textContent: v.merchant });

                        const tdD = document.createElement("td");
                        tdD.style.cssText = "white-space:nowrap;font-size:0.82rem;color:var(--color-text-secondary)";
                        tdD.textContent = fmtDate(v.date);

                        const tdN = document.createElement("td");
                        tdN.appendChild(
                            Object.assign(document.createElement("div"), { className: "vt__notes-col", textContent: v.note })
                        );

                        const tdS = document.createElement("td");
                        const badge = document.createElement("span");
                        badge.className = `sev-badge sev-badge--${v.severity}`;
                        badge.textContent = sevLabel[v.severity];
                        tdS.appendChild(badge);

                        tr.append(tdE, tdA, tdM, tdD, tdN, tdS);
                        tbody.appendChild(tr);
                    });
                }
                table.appendChild(tbody);
                return table;
            };

            const buildLeaderboardTable = () => {
                const rows = leaderboardData
                    .filter(r => !cs.lFilter.dept || r.dept === cs.lFilter.dept)
                    .sort((a, b) => {
                        const k = cs.lSort.key, d = cs.lSort.dir;
                        const va = a[k], vb = b[k];
                        return d === "asc" ? (va < vb ? -1 : va > vb ? 1 : 0) : (va > vb ? -1 : va < vb ? 1 : 0);
                    });

                const table = document.createElement("table");
                table.className = "lb";
                const thead = document.createElement("thead");
                thead.className = "lb__head";
                const htr = document.createElement("tr");
                [["#",null],["Employee","employee"],["Department","dept"],["Violations","violations"],["Total $","totalAmount"],["Breakdown",null]]
                    .forEach(([lbl, key]) => htr.appendChild(makeSortTh(lbl, key, cs.lSort)));
                thead.appendChild(htr);
                table.appendChild(thead);

                const tbody = document.createElement("tbody");
                tbody.className = "lb__body";
                rows.forEach((emp, i) => {
                    const tr = document.createElement("tr");

                    const tdRk = document.createElement("td");
                    tdRk.className = `lb__rank${i < 3 ? ` lb__rank--${i + 1}` : ""}`;
                    tdRk.textContent = i + 1;

                    const tdE = document.createElement("td");
                    tdE.appendChild(Object.assign(document.createElement("div"), { className: "lb__name", textContent: emp.employee }));

                    const tdD = Object.assign(document.createElement("td"), { className: "lb__dept",   textContent: emp.dept });
                    const tdC = Object.assign(document.createElement("td"), { className: "lb__count",  textContent: emp.violations });
                    const tdA = Object.assign(document.createElement("td"), { className: "lb__amount", textContent: fmtAmt(emp.totalAmount) });

                    const tdB = document.createElement("td");
                    const bd = document.createElement("div");
                    bd.className = "lb__breakdown";
                    [["highCount","high"],["medCount","med"],["lowCount","low"]].forEach(([prop, sev]) => {
                        if (!emp[prop]) return;
                        const b = document.createElement("span");
                        b.className = `sev-badge sev-badge--${sev}`;
                        b.textContent = `${emp[prop]} ${sevLabel[sev]}`;
                        bd.appendChild(b);
                    });
                    tdB.appendChild(bd);

                    tr.append(tdRk, tdE, tdD, tdC, tdA, tdB);
                    tbody.appendChild(tr);
                });
                table.appendChild(tbody);
                return table;
            };

            const renderToolbar = () => {
                toolbar.innerHTML = "";
                if (cs.subtab === "violations") {
                    [["All", null], ["High", "high"], ["Medium", "med"], ["Low", "low"]].forEach(([label, key]) => {
                        const btn = Object.assign(document.createElement("button"), {
                            type: "button",
                            className: "pc-filter-chip" + (cs.vFilter.severity === key ? " is-active" : ""),
                            textContent: label,
                        });
                        btn.addEventListener("click", () => {
                            cs.vFilter.severity = key;
                            renderToolbar();
                            renderBody();
                        });
                        toolbar.appendChild(btn);
                    });
                } else {
                    const depts = [...new Set(leaderboardData.map(r => r.dept))].sort();
                    [null, ...depts].forEach(dept => {
                        const btn = Object.assign(document.createElement("button"), {
                            type: "button",
                            className: "pc-filter-chip" + (cs.lFilter.dept === dept ? " is-active" : ""),
                            textContent: dept ?? "All Depts",
                        });
                        btn.addEventListener("click", () => {
                            cs.lFilter.dept = dept;
                            renderToolbar();
                            renderBody();
                        });
                        toolbar.appendChild(btn);
                    });
                }
            };

            const renderBody = () => {
                body.innerHTML = "";
                body.appendChild(cs.subtab === "violations" ? buildViolationsTable() : buildLeaderboardTable());
            };

            const CLOSE_SVG = `<svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><line x1="1" y1="1" x2="13" y2="13"/><line x1="13" y1="1" x2="1" y2="13"/></svg>`;
            const EMAIL_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="m22 6-10 7L2 6"/></svg>`;
            const CHECK_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`;

            const makeBackdrop = (opts = {}) => {
                const { nested = false, onBeforeClose } = opts;
                const backdrop = document.createElement("div");
                backdrop.className = "dlg-backdrop" + (nested ? " dlg-backdrop--nested" : "");
                const close = () => {
                    onBeforeClose?.();
                    backdrop.classList.add("is-closing");
                    setTimeout(() => backdrop.remove(), 155);
                };
                backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });
                return { backdrop, close };
            };

            const openViolationDialog = (viol) => {
                let violEsc;
                const { backdrop, close } = makeBackdrop({
                    onBeforeClose: () => {
                        if (violEsc) document.removeEventListener("keydown", violEsc);
                    },
                });

                const dlg = document.createElement("div");
                dlg.className = "dlg";
                dlg.setAttribute("role", "dialog");
                dlg.setAttribute("aria-modal", "true");

                // Head
                const head = document.createElement("div");
                head.className = "dlg__head";
                const titleEl = document.createElement("h3");
                titleEl.className = "dlg__title";
                const badge = document.createElement("span");
                badge.className = `sev-badge sev-badge--${viol.severity}`;
                badge.textContent = sevLabel[viol.severity];
                titleEl.append("Violation ", badge);
                const closeBtn = document.createElement("button");
                closeBtn.type = "button";
                closeBtn.className = "dlg__close";
                closeBtn.setAttribute("aria-label", "Close");
                closeBtn.innerHTML = CLOSE_SVG;
                closeBtn.addEventListener("click", close);
                head.append(titleEl, closeBtn);

                // Body
                const dlgBody = document.createElement("div");
                dlgBody.className = "dlg__body";

                const grid = document.createElement("div");
                grid.className = "dlg__meta-grid";
                [["Employee", viol.employee], ["Department", viol.dept], ["Merchant", viol.merchant], ["Amount", fmtAmt(viol.amount)], ["Date", fmtDate(viol.date)]]
                    .forEach(([lbl, val]) => {
                        const f = document.createElement("div");
                        f.className = "dlg__field";
                        const l = document.createElement("span");
                        l.className = "dlg__label";
                        l.textContent = lbl;
                        const v2 = document.createElement("span");
                        v2.className = "dlg__value";
                        v2.textContent = val;
                        f.append(l, v2);
                        grid.appendChild(f);
                    });

                const ruleBlock = document.createElement("div");
                ruleBlock.className = "dlg__rule-block";
                const rl = document.createElement("span");
                rl.className = "dlg__label";
                rl.textContent = "Rule Violated";
                const rv = document.createElement("div");
                rv.className = "dlg__value dlg__value--quoted-rule";
                rv.textContent = `\u201C${viol.rule}\u201D`;
                const nl = document.createElement("span");
                nl.className = "dlg__label";
                nl.style.marginTop = "0.4rem";
                nl.textContent = "Note";
                const nv = document.createElement("div");
                nv.style.cssText = "font-size:0.82rem;color:var(--color-text-secondary);font-style:italic;line-height:1.45";
                nv.textContent = viol.note;
                ruleBlock.append(rl, rv, nl, nv);

                dlgBody.append(grid, ruleBlock);

                // Footer
                const foot = document.createElement("div");
                foot.className = "dlg__foot";

                const reprimandBtn = document.createElement("button");
                reprimandBtn.type = "button";
                reprimandBtn.className = "dlg__btn dlg__btn--notify";
                reprimandBtn.setAttribute("aria-label", "Notify employee by email");
                reprimandBtn.innerHTML = `${EMAIL_SVG}<span>Notify Employee</span>`;
                reprimandBtn.addEventListener("click", async () => {
                    reprimandBtn.disabled = true;
                    reprimandBtn.innerHTML = `${EMAIL_SVG}<span>Sending\u2026</span>`;
                    try {
                        const res = await apiFetch(`/api/compliance/notify/${viol.id}`, { method: "POST" });
                        if (!res.ok) {
                            const data = await res.json().catch(() => ({}));
                            throw new Error(data.error || "Failed to send");
                        }
                        reprimandBtn.innerHTML = `${CHECK_SVG}<span>Sent</span>`;
                    } catch (err) {
                        reprimandBtn.disabled = false;
                        reprimandBtn.innerHTML = `${EMAIL_SVG}<span>Retry</span>`;
                        alert(err.message || "Could not send notification email.");
                    }
                });

                const dismissBtn = document.createElement("button");
                dismissBtn.type = "button";
                dismissBtn.className = "dlg__btn dlg__btn--dismiss";
                dismissBtn.textContent = "Mark as not violation";
                dismissBtn.addEventListener("click", () => {
                    openDismissDialog(viol, close);
                });

                foot.append(reprimandBtn, dismissBtn);
                dlg.append(head, dlgBody, foot);
                backdrop.appendChild(dlg);

                violEsc = (e) => {
                    if (e.key !== "Escape") return;
                    close();
                };
                document.addEventListener("keydown", violEsc);
                document.body.appendChild(backdrop);
                closeBtn.focus();
            };

            const openDismissDialog = (viol, closeViolation) => {
                let dismissEsc;
                const { backdrop, close } = makeBackdrop({
                    nested: true,
                    onBeforeClose: () => {
                        if (dismissEsc) document.removeEventListener("keydown", dismissEsc, true);
                    },
                });

                dismissEsc = (e) => {
                    if (e.key !== "Escape") return;
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    close();
                };
                document.addEventListener("keydown", dismissEsc, true);

                const dlg = document.createElement("div");
                dlg.className = "dlg";
                dlg.setAttribute("role", "dialog");
                dlg.setAttribute("aria-modal", "true");

                const head = document.createElement("div");
                head.className = "dlg__head";
                const titleEl = document.createElement("h3");
                titleEl.className = "dlg__title";
                titleEl.textContent = "Dismiss Violation";
                const closeBtn = document.createElement("button");
                closeBtn.type = "button";
                closeBtn.className = "dlg__close";
                closeBtn.setAttribute("aria-label", "Close");
                closeBtn.innerHTML = CLOSE_SVG;
                closeBtn.addEventListener("click", close);
                head.append(titleEl, closeBtn);

                const dlgBody = document.createElement("div");
                dlgBody.className = "dlg__body";

                const desc = document.createElement("p");
                desc.className = "dlg__desc";
                desc.textContent = `You're dismissing ${viol.employee}'s ${fmtAmt(viol.amount)} charge at ${viol.merchant}. Attach a note so future reviewers understand why this was cleared.`;

                const noteField = document.createElement("div");
                noteField.className = "dlg__field";
                const noteLabel = document.createElement("label");
                noteLabel.className = "dlg__label";
                noteLabel.setAttribute("for", "dismiss-note-input");
                noteLabel.textContent = "Note (optional)";
                const noteArea = document.createElement("textarea");
                noteArea.id = "dismiss-note-input";
                noteArea.className = "dlg__note-area";
                noteArea.setAttribute("autocomplete", "off");
                noteArea.setAttribute("spellcheck", "false");
                noteArea.placeholder = "e.g. Pre-approved verbally by CFO — awaiting written confirmation…";
                noteField.append(noteLabel, noteArea);

                dlgBody.append(desc, noteField);

                const foot = document.createElement("div");
                foot.className = "dlg__foot";

                const cancelBtn = document.createElement("button");
                cancelBtn.type = "button";
                cancelBtn.className = "dlg__btn";
                cancelBtn.textContent = "Cancel";
                cancelBtn.addEventListener("click", close);

                const confirmBtn = document.createElement("button");
                confirmBtn.type = "button";
                confirmBtn.className = "dlg__btn dlg__btn--confirm";
                confirmBtn.textContent = "Confirm Dismiss";
                confirmBtn.addEventListener("click", () => {
                    dismissedIds.add(viol.id);
                    close();
                    closeViolation();
                    renderBody();
                });

                foot.append(cancelBtn, confirmBtn);
                dlg.append(head, dlgBody, foot);
                backdrop.appendChild(dlg);

                const onEsc = (e) => { if (e.key === "Escape") { close(); document.removeEventListener("keydown", onEsc); } };
                document.addEventListener("keydown", onEsc);
                document.body.appendChild(backdrop);
                noteArea.focus();
            };

            // Subtab switching
            view.querySelectorAll("[data-subtab]").forEach(stab => {
                stab.addEventListener("click", () => {
                    view.querySelectorAll("[data-subtab]").forEach(s => {
                        const a = s === stab;
                        s.classList.toggle("is-active", a);
                        s.setAttribute("aria-selected", String(a));
                    });
                    cs.subtab = stab.dataset.subtab;
                    renderToolbar();
                    renderBody();
                });
            });

            renderToolbar();
            renderBody();

            const refreshComplianceData = async () => {
                const [violationsRes, leaderboardRes] = await Promise.all([
                    apiFetch("/api/compliance/violations"),
                    apiFetch("/api/compliance/leaderboard"),
                ]);
                if (!violationsRes.ok || !leaderboardRes.ok) {
                    throw new Error("Failed to reload compliance data.");
                }
                const violations = await violationsRes.json();
                const leaderboard = await leaderboardRes.json();
                violationsData = violations.map(v => ({
                    id: v.id,
                    employee: v.employee_name,
                    dept: v.department,
                    amount: Number(v.amount),
                    merchant: v.merchant || "",
                    date: v.date || "",
                    rule: v.rule_text || "",
                    severity: v.severity,
                    note: v.note || v.ai_reasoning || "",
                }));
                leaderboardData = leaderboard.map(e => ({
                    employee: e.employee,
                    dept: e.dept,
                    violations: e.violations,
                    totalAmount: Number(e.totalAmount),
                    highCount: e.highCount || 0,
                    medCount: e.medCount || 0,
                    lowCount: e.lowCount || 0,
                }));
                renderToolbar();
                renderBody();
            };

            refreshComplianceData().catch(() => {});

            // Wire up scan button (Admin only)
            const scanBtn = view.querySelector("#scanBtn");
            if (scanBtn) {
                scanBtn.addEventListener("click", async () => {
                    scanBtn.disabled = true;
                    scanBtn.textContent = "Scanning\u2026";
                    try {
                        const res = await apiFetch("/api/compliance/scan", { method: "POST" });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || "Scan failed");
                        await refreshComplianceData();
                        scanBtn.textContent = "Scan Complete";
                        setTimeout(() => {
                            scanBtn.disabled = false;
                            scanBtn.textContent = "Run Compliance Scan";
                        }, 1200);
                    } catch (err) {
                        scanBtn.disabled = false;
                        scanBtn.textContent = "Scan Failed \u2014 Retry";
                        alert(err?.message || "Compliance scan failed.");
                    }
                });
            }
        }
    }

    const root = document.querySelector(".app-layout");
    if (root) {
        new App(root).init();
    }
})();
