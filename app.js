(() => {
    const STORAGE = {
        route: "exi.route",
        account: "exi.account",
        talkHasMessage: "exi.talk.hasMessage",
        talkMessages: "exi.talk.messages",
        theme: "exi.theme",
        sidebarExpanded: "exi.sidebarExpanded",
        policyRules: "exi.policyRules",
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
        "data-gallery": `<svg class="sidebar-item__icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5.5" rx="7" ry="2.5" fill="none"/><path d="M5 5.5v4c0 1.38 3.13 2.5 7 2.5s7-1.12 7-2.5v-4" fill="none"/><path d="M5 9.5v4c0 1.38 3.13 2.5 7 2.5s7-1.12 7-2.5v-4" fill="none"/><path d="M5 13.5V18c0 1.38 3.13 2.5 7 2.5s7-1.12 7-2.5v-4.5" fill="none"/></svg>`,
        "policy-rules": `<svg class="sidebar-item__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 3.6v5.2c0 4.4-3 7.8-7 9.2-4-1.4-7-4.8-7-9.2V6.6z"/><path d="M9.3 12.1l1.8 1.8 3.6-3.6"/></svg>`,
        "policy-violations": `<svg class="sidebar-item__icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round"><path d="M11.4 5.25 3.8 18.75Q3.2 19.8 4.4 19.8H19.6Q20.8 19.8 20.2 18.75L12.6 5.25Q12 4.2 11.4 5.25Z"/><path d="M12 10v4.2"/><circle cx="12" cy="17.2" r="0.95" fill="currentColor" stroke="none"/></svg>`,
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
                        <form class="composer__card" data-role="prompt-form">
                            <label class="sr-only" for="talkPrompt">Type your question</label>
                            <textarea id="talkPrompt" class="composer__input" placeholder="Type your question here..." rows="1"></textarea>
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
            id: "data-gallery",
            title: "Saved visuals",
            navLabel: "Saved charts and graphs",
            render: () => `
                <section class="page cg-page">
                    <div class="cg-wrap">
                        <header class="cg-head">
                            <h1 class="cg-title">Saved visuals</h1>
                            <p class="cg-lead">Pinned charts from chat will land here.</p>
                        </header>
                        <div class="cg-grid" id="chartGalleryGrid" role="list" aria-label="Chart gallery"></div>
                        <dialog class="cg-dialog" id="chartGalleryDialog" aria-labelledby="cgDialogTitle">
                            <div class="cg-dialog__chrome">
                                <h2 id="cgDialogTitle" class="cg-dialog__title"></h2>
                                <button type="button" class="cg-dialog__close" data-cg-close aria-label="Close">
                                    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                                </button>
                            </div>
                            <div class="cg-dialog__body">
                                <div class="cg-dialog__stage"><canvas id="chartGalleryDialogCanvas" aria-hidden="true"></canvas></div>
                            </div>
                        </dialog>
                    </div>
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
            render: () => `
                <section class="page pc-page">
                    <div class="pc-wrap">
                        <div class="pc-panel">
                            <div class="pc-panel__head pc-panel__head--row pc-panel__head--violations">
                                <div class="pc-view-tabs" role="tablist" aria-label="Compliance views">
                                    <button type="button" class="pc-view-tab is-active" data-subtab="violations" role="tab" aria-selected="true">
                                        <svg class="pc-view-tab__icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round"><path d="M11.4 5.25 3.8 18.75Q3.2 19.8 4.4 19.8H19.6Q20.8 19.8 20.2 18.75L12.6 5.25Q12 4.2 11.4 5.25Z"/><path d="M12 10v4.2"/><circle cx="12" cy="17.2" r="0.95" fill="currentColor" stroke="none"/></svg>
                                        Violations
                                    </button>
                                    <button type="button" class="pc-view-tab" data-subtab="leaderboard" role="tab" aria-selected="false">
                                        <svg class="pc-view-tab__icon" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1.5" y="9" width="3.5" height="5.5" rx="0.5"/><rect x="6.25" y="5.5" width="3.5" height="9" rx="0.5"/><rect x="11" y="2" width="3.5" height="12.5" rx="0.5"/></svg>
                                        By employee
                                    </button>
                                </div>
                                <div class="pc-toolbar" id="complianceToolbar"></div>
                            </div>
                            <div class="compliance-body" id="complianceBody"></div>
                        </div>
                    </div>
                </section>`,
        },
        {
            id: "pre-approval",
            title: "AI Pre-Approval Workflow",
            navLabel: "AI pre-approval workflow",
            render: () => centeredTitle("AI Pre-Approval Workflow"),
        },
        {
            id: "expense-reports",
            title: "Expense Report Generation",
            navLabel: "Expense report generation",
            render: () => centeredTitle("Expense Report Generation"),
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

    function chartThemeFromCss() {
        const r = document.documentElement;
        const s = getComputedStyle(r);
        const pick = (name, fb) => {
            const v = s.getPropertyValue(name).trim();
            return v || fb;
        };
        return {
            text: pick("--color-text", "#0a0a0b"),
            muted: pick("--color-text-muted", "#8b939c"),
            border: pick("--color-border", "#d2d8de"),
            accent: pick("--color-accent", "#00b8e6"),
            accentActive: pick("--color-accent-active", "#0082ad"),
            bg: pick("--color-bg", "#ffffff"),
        };
    }

    function chartFills(t, n) {
        const base = [t.accent, t.accentActive, "#5bc4de", "#88d4ec", "#b3e8f5"];
        return base.slice(0, n);
    }

    function withAlpha(cssColor, a) {
        const c = (cssColor || "").trim();
        const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c);
        if (hex) {
            let h = hex[1];
            if (h.length === 3) h = h.split("").map((x) => x + x).join("");
            const n = parseInt(h, 16);
            return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
        }
        const rgb = c.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
        if (rgb) return `rgba(${rgb[1]},${rgb[2]},${rgb[3]},${a})`;
        return c;
    }

    function chartGalleryConfig(itemId, compact) {
        const t = chartThemeFromCss();
        const axis = (extra = {}) => ({
            ticks: { color: t.muted, font: { size: compact ? 9 : 12 } },
            grid: { color: `${t.border}55` },
            border: { color: t.border },
            ...extra,
        });
        const legend = {
            labels: { color: t.muted, font: { size: compact ? 10 : 12 } },
            display: !compact,
        };
        const anim = compact ? false : { duration: 520, easing: "easeOutQuart" };
        const thumbStatic = compact
            ? {
                  events: [],
                  plugins: { tooltip: { enabled: false } },
              }
            : {};

        if (itemId === "spend-dept") {
            return {
                type: "bar",
                data: {
                    labels: ["Sales", "Engineering", "Marketing", "Operations", "Finance"],
                    datasets: [
                        {
                            label: "Spend ($k)",
                            data: [418, 305, 268, 192, 148],
                            backgroundColor: chartFills(t, 5),
                            borderColor: t.border,
                            borderWidth: 1,
                            borderRadius: compact ? 4 : 8,
                        },
                    ],
                },
                options: {
                    ...thumbStatic,
                    responsive: true,
                    maintainAspectRatio: true,
                    aspectRatio: compact ? 1.35 : 1.6,
                    animation: anim,
                    plugins: { ...thumbStatic.plugins, legend },
                    scales: {
                        x: axis(),
                        y: { ...axis(), beginAtZero: true, ticks: { ...axis().ticks, callback: (v) => `$${v}k` } },
                    },
                },
            };
        }
        if (itemId === "expense-trend") {
            return {
                type: "line",
                data: {
                    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
                    datasets: [
                        {
                            label: "Submitted reports",
                            data: [124, 142, 138, 165, 158, 181],
                            borderColor: t.accent,
                            backgroundColor: withAlpha(t.accent, 0.14),
                            fill: true,
                            tension: 0.38,
                            pointRadius: compact ? 0 : 4,
                            pointHoverRadius: compact ? 0 : 6,
                            borderWidth: compact ? 2 : 2.5,
                        },
                    ],
                },
                options: {
                    ...thumbStatic,
                    responsive: true,
                    maintainAspectRatio: true,
                    aspectRatio: compact ? 1.35 : 1.7,
                    animation: anim,
                    plugins: { ...thumbStatic.plugins, legend },
                    scales: {
                        x: axis(),
                        y: { ...axis(), beginAtZero: true },
                    },
                },
            };
        }
        if (itemId === "category-mix") {
            return {
                type: "doughnut",
                data: {
                    labels: ["Travel", "Meals", "SaaS & tools", "Office", "Other"],
                    datasets: [
                        {
                            data: [32, 24, 22, 12, 10],
                            backgroundColor: chartFills(t, 5),
                            borderColor: t.bg,
                            borderWidth: 2,
                            hoverOffset: compact ? 0 : 12,
                        },
                    ],
                },
                options: {
                    ...thumbStatic,
                    responsive: true,
                    maintainAspectRatio: true,
                    aspectRatio: compact ? 1 : 1.05,
                    animation: anim,
                    plugins: { ...thumbStatic.plugins, legend: { ...legend, position: compact ? "bottom" : "right" } },
                    cutout: compact ? "58%" : "52%",
                },
            };
        }
        if (itemId === "risk-radar") {
            return {
                type: "radar",
                data: {
                    labels: ["Policy fit", "Documentation", "Timing", "Amount risk", "Vendor"],
                    datasets: [
                        {
                            label: "Health score",
                            data: [82, 76, 88, 71, 79],
                            borderColor: t.accent,
                            backgroundColor: withAlpha(t.accent, 0.22),
                            pointBackgroundColor: t.accent,
                            pointBorderColor: t.bg,
                            borderWidth: compact ? 1.5 : 2,
                            pointHoverRadius: compact ? 0 : 4,
                        },
                    ],
                },
                options: {
                    ...thumbStatic,
                    responsive: true,
                    maintainAspectRatio: true,
                    aspectRatio: compact ? 1 : 1.2,
                    animation: anim,
                    plugins: { ...thumbStatic.plugins, legend },
                    scales: {
                        r: {
                            angleLines: { color: `${t.border}88` },
                            grid: { color: `${t.border}55` },
                            pointLabels: { color: t.muted, font: { size: compact ? 9 : 11 } },
                            ticks: { display: false, backdropColor: "transparent" },
                            suggestedMin: 0,
                            suggestedMax: 100,
                        },
                    },
                },
            };
        }
        return null;
    }

    const CHART_GALLERY_ITEMS = [
        { id: "spend-dept", title: "Spend by department", subtitle: "Sample Q1 totals (USD thousands)" },
        { id: "expense-trend", title: "Expense volume trend", subtitle: "Submitted reports per month" },
        { id: "category-mix", title: "Category mix", subtitle: "Share of T&E by type" },
        { id: "risk-radar", title: "Risk profile", subtitle: "Sample compliance dimensions" },
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
            this._disposeChartGallery = null;
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
                return;
            }
            panel.classList.remove("account-dock__panel--placed");
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    this.positionAccountPanel();
                    panel.classList.add("account-dock__panel--placed");
                });
            });
        }

        buildSidebar() {
            this.sidebarNav.innerHTML = routes
                .map(
                    (r) => `
                <button type="button" class="sidebar-item" data-route="${r.id}" aria-label="${r.navLabel}" title="${r.navLabel}">
                    ${icons[r.id] ?? ""}
                    <span class="sidebar-item__label" aria-hidden="true">${r.navLabel}</span>
                </button>`
                )
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
            });
        }

        onDocPointerDown(event) {
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
            this.accountDock?.removeAttribute("open");
        }

        setAccount(name) {
            const next = normalizeAccount(name);
            this.state.account = next;
            store.set(STORAGE.account, next);
            this.syncAccountUi();
            this.accountDock.removeAttribute("open");
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
            this._disposeChartGallery?.();
            this._disposeChartGallery = null;
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

        hydrateTalkThread(view) {
            const thread = view.querySelector("#talkThread");
            if (!thread) return;
            if (this.state.talkHasMessage) thread.style.overflowY = "auto";
            for (const msg of this.state.talkMessages) {
                this.appendMessage(thread, msg.role, msg.text);
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

        async _runStream(loadingEl, signal) {
            const FAKE = "This is a placeholder response. Connect the model API here.";
            const chars = [...FAKE];
            let thread = null;
            let firstChar = true;
            let scrollTick = 0;
            for (let i = 0; i < chars.length; i++) {
                if (signal.aborted) throw Object.assign(new Error(), { name: "AbortError" });
                if (i > 0) {
                    const step = 7 + Math.random() * 9 + (chars[i - 1] === " " ? 4 : 0);
                    await new Promise((r) => setTimeout(r, step));
                }
                if (signal.aborted) throw Object.assign(new Error(), { name: "AbortError" });
                const ch = chars[i];
                if (firstChar) {
                    firstChar = false;
                    thread = loadingEl.parentElement;
                    loadingEl.remove();
                    const bubble = this._appendStreamingBubble(thread, "");
                    this._talkStreamBubble = bubble;
                }
                this.state.talkStreamText += ch;
                if (this._talkStreamBubble) {
                    this._talkStreamBubble.textContent = this.state.talkStreamText;
                    if ((scrollTick++ & 3) === 0) this._checkStreamScroll();
                }
            }
            this._checkStreamScroll();
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

            try {
                await this._runStream(loadingEl, this._talkAbortController.signal);
            } catch (err) {
                if (err.name !== "AbortError") throw err;
            }

            loadingEl.remove();

            const finalText = this.state.talkStreamText || null;
            const streamBubble = this._talkStreamBubble;
            this.state.talkStreaming = false;
            this.state.talkStreamText = "";
            this._talkAbortController = null;
            this._talkStreamBubble = null;

            const currentView = this._getTalkView();
            this._setTalkStreamingUi(currentView, false);
            const currentThread = currentView?.querySelector("#talkThread");

            if (finalText) {
                this.state.talkMessages.push({ role: "ai", text: finalText });
                this._saveTalkMessages();
                if (streamBubble?.isConnected) {
                    if (streamBubble.textContent !== finalText) {
                        streamBubble.textContent = finalText;
                    }
                    streamBubble.classList.remove("msg__bubble--streaming");
                } else if (currentThread) {
                    this.appendMessage(currentThread, "ai", finalText);
                }
            } else if (streamBubble?.isConnected) {
                streamBubble.closest(".msg")?.remove();
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
            if (routeId === "data-gallery") {
                this.attachChartGalleryHandlers(view);
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

        attachChartGalleryHandlers(view) {
            const grid = view.querySelector("#chartGalleryGrid");
            const dialog = view.querySelector("#chartGalleryDialog");
            const dialogCanvas = view.querySelector("#chartGalleryDialogCanvas");
            const dialogTitle = view.querySelector("#cgDialogTitle");
            const ChartCtor = typeof Chart !== "undefined" ? Chart : null;
            const thumbCharts = [];
            let dialogChart = null;
            const ac = new AbortController();
            const { signal } = ac;

            const destroyDialogChart = () => {
                if (dialogChart) {
                    dialogChart.destroy();
                    dialogChart = null;
                }
            };

            const cloneCfg = (cfg) => {
                try {
                    return structuredClone(cfg);
                } catch {
                    return JSON.parse(JSON.stringify(cfg));
                }
            };

            const openDialog = (item) => {
                if (!ChartCtor || !dialog || !dialogCanvas || !dialogTitle) return;
                destroyDialogChart();
                dialogTitle.textContent = item.title;
                const cfg = chartGalleryConfig(item.id, false);
                if (!cfg) return;
                dialogChart = new ChartCtor(dialogCanvas, cloneCfg(cfg));
                dialog.showModal();
            };

            const dispose = () => {
                ac.abort();
                destroyDialogChart();
                thumbCharts.splice(0).forEach((c) => c.destroy());
            };
            this._disposeChartGallery = dispose;

            if (!grid) return;

            if (!ChartCtor) {
                grid.innerHTML =
                    '<p class="cg-fallback">Chart.js could not be loaded. Check your network and refresh.</p>';
                return;
            }

            CHART_GALLERY_ITEMS.forEach((item) => {
                const card = document.createElement("article");
                card.className = "cg-card";
                card.setAttribute("role", "listitem");
                card.tabIndex = 0;
                card.dataset.chartId = item.id;
                card.innerHTML = `
                    <div class="cg-card__preview"><canvas aria-hidden="true"></canvas></div>
                    <div class="cg-card__meta">
                        <h3 class="cg-card__title">${item.title}</h3>
                        <p class="cg-card__sub">${item.subtitle}</p>
                    </div>`;
                const canvas = card.querySelector("canvas");
                const cfg = chartGalleryConfig(item.id, true);
                if (cfg && canvas) {
                    thumbCharts.push(new ChartCtor(canvas, cloneCfg(cfg)));
                }
                const activate = () => openDialog(item);
                card.addEventListener("click", activate, { signal });
                card.addEventListener("keydown", (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        activate();
                    }
                }, { signal });
                grid.appendChild(card);
            });

            dialog?.addEventListener("close", destroyDialogChart, { signal });
            dialog?.querySelector("[data-cg-close]")?.addEventListener(
                "click",
                () => dialog.close(),
                { signal }
            );
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
                const rows = VIOLATIONS_DATA
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
                const rows = LEADERBOARD_DATA
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
                    const depts = [...new Set(LEADERBOARD_DATA.map(r => r.dept))].sort();
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
                reprimandBtn.className = "dlg__btn dlg__btn--reprimand";
                reprimandBtn.setAttribute("aria-label", "Reprimand by email");
                reprimandBtn.innerHTML = `${EMAIL_SVG}<span>Reprimand</span>`;
                reprimandBtn.addEventListener("click", () => {
                    reprimandBtn.innerHTML = `${CHECK_SVG}<span>Sent</span>`;
                    reprimandBtn.disabled = true;
                });

                const dismissBtn = document.createElement("button");
                dismissBtn.type = "button";
                dismissBtn.className = "dlg__btn dlg__btn--dismiss";
                dismissBtn.textContent = "Dismiss";
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
        }
    }

    const root = document.querySelector(".app-layout");
    if (root) {
        new App(root).init();
    }
})();
