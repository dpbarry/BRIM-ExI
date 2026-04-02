(() => {
    const STORAGE = {
        route: "exi.route",
        account: "exi.account",
        talkHasMessage: "exi.talk.hasMessage",
        theme: "exi.theme",
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
        "talk-to-data": `<svg class="sidebar-item__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7.5A3.5 3.5 0 0 1 8.5 4h7A3.5 3.5 0 0 1 19 7.5v4A3.5 3.5 0 0 1 15.5 15H11l-3.8 3.5c-.6.5-1.2.1-1.2-.6V15.4A3.4 3.4 0 0 1 5 12.1z"/><path d="M9 9.5h6M9 12h4"/></svg>`,
        "policy-compliance": `<svg class="sidebar-item__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 3.6v5.2c0 4.4-3 7.8-7 9.2-4-1.4-7-4.8-7-9.2V6.6z"/><path d="M9.3 12.1l1.8 1.8 3.6-3.6"/></svg>`,
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
                    <div class="talk-page__splash" aria-live="polite">
                        <p class="talk-page__kicker">Brim Intel</p>
                        <p class="talk-page__headline">Ask your data anything.</p>
                    </div>
                    <div class="talk-page__thread" id="talkThread" aria-live="polite"></div>
                    <section class="composer" aria-label="Talk to your data composer">
                        <form class="composer__card" data-role="prompt-form">
                            <label class="sr-only" for="talkPrompt">Type your question</label>
                            <textarea id="talkPrompt" class="composer__input" placeholder="Ask a question about your data..." rows="4"></textarea>
                            <div class="composer__actions">
                                <button type="submit" class="send-button" aria-label="Send prompt">
                                    <svg class="send-button__icon" viewBox="0 0 24 24" aria-hidden="true">
                                        <path d="M5 11.5 19.5 4 13 19.5l-2.2-5.8z"/>
                                        <path d="M10.8 13.7 19.4 4.1"/>
                                    </svg>
                                </button>
                            </div>
                        </form>
                    </section>
                    </div>
                </section>`,
        },
        {
            id: "policy-compliance",
            title: "Policy Compliance Engine",
            navLabel: "Policy compliance engine",
            render: () => centeredTitle("Policy Compliance Engine"),
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

    class App {
        constructor(root) {
            this.root = root;
            this.routeStage = root.querySelector("#routeStage");
            this.sidebarNav = root.querySelector("#sidebarNav");
            this.themeToggle = root.querySelector("#themeToggle");
            this.accountDock = root.querySelector("#accountDock");
            this.accountInitial = root.querySelector("#accountInitial");
            this.accountPanel = root.querySelector("#accountPanel");
            this.reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
            this.state = {
                currentRoute: "",
                account: normalizeAccount(store.get(STORAGE.account)),
                talkHasMessage: false,
            };
            this.onDocPointerDown = this.onDocPointerDown.bind(this);
            this.onKeydown = this.onKeydown.bind(this);
        }

        init() {
            this.applyTheme(readStoredTheme());
            this.buildSidebar();
            this.buildAccountMenu();
            this.bindShell();
            this.syncAccountUi();
            this.resolveInitialRoute();
            window.addEventListener("hashchange", () => this.renderFromHash());
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

        buildSidebar() {
            this.sidebarNav.innerHTML = routes
                .map(
                    (r) => `
                <button type="button" class="sidebar-item" data-route="${r.id}" aria-label="${r.navLabel}" title="${r.navLabel}">
                    ${icons[r.id] ?? ""}
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
            this.accountInitial.textContent = this.state.account.charAt(0).toUpperCase();
            this.accountOptions.forEach((opt) => {
                const active = opt.dataset.account === this.state.account;
                opt.classList.toggle("is-active", active);
                opt.setAttribute("aria-checked", String(active));
            });
        }

        resolveInitialRoute() {
            const fromHash = parseHashRoute();
            const fromStore = store.get(STORAGE.route);
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
            let id = parseHashRoute();
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
            const next = document.createElement("div");
            next.className = "route-view";
            next.dataset.route = route.id;
            next.innerHTML = route.render(this.state);
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
            msg.scrollIntoView({ behavior: "smooth", block: "end" });
            return msg;
        }

        appendLoading(thread) {
            const msg = document.createElement("div");
            msg.className = "msg msg--ai";
            msg.innerHTML = `<div class="msg__bubble msg__loading"><span></span><span></span><span></span></div>`;
            thread.appendChild(msg);
            msg.scrollIntoView({ behavior: "smooth", block: "end" });
            return msg;
        }

        attachRouteHandlers(view, routeId) {
            if (routeId !== DEFAULT_ROUTE) {
                return;
            }
            const form = view.querySelector('[data-role="prompt-form"]');
            const input = view.querySelector("#talkPrompt");
            const sendBtn = view.querySelector(".send-button");
            if (!form || !input) {
                return;
            }
            form.addEventListener("submit", async (e) => {
                e.preventDefault();
                const text = input.value.trim();
                if (!text) {
                    return;
                }

                const thread = view.querySelector("#talkThread");

                if (!this.state.talkHasMessage) {
                    this.state.talkHasMessage = true;
                    view.querySelector(".talk-page")?.classList.add("has-message");
                    const onExpanded = (e) => {
                        if (e.propertyName !== "flex-grow") return;
                        thread.removeEventListener("transitionend", onExpanded);
                        thread.style.overflowY = "auto";
                    };
                    thread.addEventListener("transitionend", onExpanded);
                }

                input.value = "";
                input.focus();
                if (sendBtn) sendBtn.disabled = true;

                this.appendMessage(thread, "user", text);
                const loadingEl = this.appendLoading(thread);

                await new Promise((r) => setTimeout(r, 1400 + Math.random() * 600));
                loadingEl.remove();
                this.appendMessage(thread, "ai", "This is a placeholder response. Connect the model API here.");

                if (sendBtn) sendBtn.disabled = false;
                input.focus();
            });
            input.addEventListener("keydown", (e) => {
                if (e.key !== "Enter" || e.shiftKey) {
                    return;
                }
                e.preventDefault();
                form.requestSubmit();
            });
        }
    }

    const root = document.querySelector(".app-layout");
    if (root) {
        new App(root).init();
    }
})();
