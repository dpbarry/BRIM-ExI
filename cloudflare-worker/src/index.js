const VALID_TABLES = [
  "employees",
  "transactions",
  "policy_rules",
  "violations",
  "submissions",
  "saved_charts",
  "conversation_history",
  "expense_reports",
  "expense_report_items",
  "department_budgets",
];

const SHARED_TOOLS = [
  {
    name: "get_schema",
    description:
      "Get the column names, types, and 3 sample rows for a database table. Call this before run_query to understand what data is available.",
    input_schema: {
      type: "object",
      properties: {
        table_name: { type: "string", description: "Name of the SQLite table" },
      },
      required: ["table_name"],
    },
  },
  {
    name: "run_query",
    description: "Execute a read-only SELECT SQL query against the database. Only SELECT statements are permitted.",
    input_schema: {
      type: "object",
      properties: {
        sql: { type: "string", description: "A valid SQLite SELECT statement" },
      },
      required: ["sql"],
    },
  },
  {
    name: "get_policy_rules",
    description: "Retrieve all company expense policy rules.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
];

const CHAT_TOOLS = [
  ...SHARED_TOOLS,
  {
    name: "produce_chart",
    description:
      "Render a chart in the chat window. Call this once after getting query results, when the data is best understood visually. Do not call it for single-value or yes/no answers.",
    input_schema: {
      type: "object",
      properties: {
        chart_type: { type: "string", enum: ["bar", "horizontalBar", "line", "area", "donut"] },
        title: { type: "string" },
        subtitle: { type: "string" },
        categories: { type: "array", items: { type: "string" } },
        series: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              data: { type: "array", items: { type: "number" } },
            },
            required: ["name", "data"],
          },
        },
        value_prefix: { type: "string" },
        value_suffix: { type: "string" },
      },
      required: ["chart_type", "title", "categories", "series"],
    },
  },
  {
    name: "save_chart",
    description: "Save a chart to the Saved Visuals Gallery for quick future access.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        original_query: { type: "string" },
        chart_config_json: { type: "string" },
      },
      required: ["title", "original_query", "chart_config_json"],
    },
  },
];

const APPROVAL_TOOLS = [
  ...SHARED_TOOLS,
  {
    name: "get_employee_history",
    description: "Get an employee's transaction history for the last 90 days plus their violation count and severity breakdown.",
    input_schema: {
      type: "object",
      properties: {
        employee_id: { type: "integer" },
      },
      required: ["employee_id"],
    },
  },
  {
    name: "get_department_budget",
    description: "Get the budget vs actual spend for a department in the current quarter.",
    input_schema: {
      type: "object",
      properties: {
        department: { type: "string" },
      },
      required: ["department"],
    },
  },
];

const COMPLIANCE_TOOLS = [
  ...SHARED_TOOLS,
  {
    name: "flag_violation",
    description: "Record a policy violation discovered during the compliance scan.",
    input_schema: {
      type: "object",
      properties: {
        employee_id: { type: "integer" },
        transaction_id: { type: "integer" },
        rule_id: { type: "integer" },
        amount: { type: "number" },
        merchant: { type: "string" },
        date: { type: "string" },
        severity: { type: "string", enum: ["high", "med", "low"] },
        note: { type: "string" },
        reasoning: { type: "string" },
      },
      required: ["employee_id", "transaction_id", "rule_id", "amount", "merchant", "date", "severity", "note", "reasoning"],
    },
  },
];

const REPORT_TOOLS = [...SHARED_TOOLS];

const CHAT_SYSTEM_PROMPT = `You are ExI, a financial intelligence assistant for a corporate finance team. You have access to a SQLite expense database.

WORKFLOW — follow this order every time:
1. Call get_schema to inspect a table before querying it (skip if you already know the schema).
2. Call run_query with precise SQL to fetch the data you need.
3. Write your response in plain prose, then call produce_chart if the data warrants visualization.

STRICT RESPONSE FORMAT — no exceptions:
- Plain prose only. Zero markdown: no bold (**), no italics (*), no headers (#), no horizontal rules (---), no bullet points (- or *), no numbered lists, no pipe tables.
- 2 to 4 sentences maximum. Lead with the most important number or finding. Write like you are briefing an executive — direct, no filler.
- If the answer involves comparisons, rankings, trends, or proportions across multiple values, call produce_chart exactly once after your prose.
- Do not call produce_chart for single-value answers or yes/no questions.

CHART SELECTION:
- bar → comparing amounts across departments, categories, or merchants
- horizontalBar → ranked lists of employees or items by amount
- line → monthly or weekly trends over time
- area → cumulative or filled trend
- donut → showing percentage breakdown of a whole

DATA NOTES:
- Dates stored as YYYY-MM-DD strings. Dataset covers Aug 2025 to Mar 2026.
- Currency: conversion_rate = 0 means amount is already CAD. Otherwise CAD = amount × conversion_rate. Always aggregate in CAD.
- Employees: John Smith, Sarah Chen, Marcus Webb, Dylan Park, Priya Nair, James Okafor, Aisha Mensah, Tom Vasquez, Kenji Tanaka, Rachel Torres.
- Departments: Sales, Marketing, Engineering, Logistics, Finance, Operations, HR.`;

const COMPLIANCE_SYSTEM_PROMPT = `You are a compliance officer AI for an SMB expense management platform. Your job is to scan employee transactions against company expense policy and flag violations.

Instructions:
1. Use get_policy_rules() to load all rules
2. Use run_query() to fetch recent transactions per employee (last 60 days)
3. Analyse each employee's transactions as a cluster — look for patterns, not just individual amounts
4. Flag violations using flag_violation() — be contextually aware:
   - Two charges of $490 at the same vendor on the same day is likely split-purchase fraud
   - Hotel bookings direct (MCC 7011) may violate the travel portal requirement
5. Only flag clear violations — do not flag ambiguous transactions
6. After scanning, return a brief summary of what you found`;

const REPORTS_SYSTEM_PROMPT = `You are an expense report generator for an SMB finance team.
Given an employee and date range, analyze their transactions and group them into logical expense reports.

Steps:
1. Use run_query to get the employee's transactions in the date range
2. Group transactions into logical clusters:
   - Same city + consecutive dates → a trip report (name it: "Trip to [City] — [Date Range]")
   - Recurring merchants (SaaS, subscriptions) → one report per service
   - Everything else → group by category (Meals, Travel, Office Supplies, etc.)
3. For each group, check get_policy_rules and note any compliance concerns
4. Return ONLY a JSON array (no markdown, no explanation):
[
  {
    "title": "...",
    "date_range_start": "YYYY-MM-DD",
    "date_range_end": "YYYY-MM-DD",
    "total_amount": 123.45,
    "policy_summary": "...",
    "transaction_ids": [1, 2, 3]
  }
]`;

const APPROVAL_PARSE_SYSTEM = `You are an expense request parser. Extract structured information from a free-text employee expense request.
Return a JSON object with these exact keys:
- parsed_name: string (employee's full name)
- parsed_department: string (department if mentioned, otherwise "Unknown")
- parsed_purpose: string (concise description of what the expense is for)
- parsed_amount: number (dollar amount, or 0 if not specified)

Return ONLY valid JSON, no other text.`;

const APPROVAL_CONTEXT_SYSTEM = `You are a finance AI reviewing pre-approval expense requests.

Use tools as needed: get_schema, run_query (to locate the employee), get_employee_history, get_department_budget, get_policy_rules. Use tools for facts only—do not paste tool JSON or long raw query results into your answer.

When finished, reply with exactly ONE plain-text paragraph and nothing else—no labels, no second section, no "note" line.

The paragraph must:
- Open with exactly "Recommend APPROVE." or "Recommend DENY." (including the period), then continue immediately.
- Add only the most important facts (max 3 facts): policy fit/mismatch, amount vs threshold or budget, and risk history only if decisive.
- Be concise and direct: 2-3 short sentences total, under 65 words.
- Do not include process language (for example: "I now have everything needed", "analysis", "key findings", or "based on my review").

Never output: RECOMMENDATION:, NOTE:, Analysis, headings, lists, markdown (** or #), emojis, or multiple paragraphs.`;

const REPORT_FILTER_PARSE_SYSTEM = `You extract optional expense-report filters from natural language.
Return JSON only (no markdown, no prose) with this exact shape:
{
  "employee_names": ["..."],
  "departments": ["..."],
  "date_start": "YYYY-MM-DD or empty",
  "date_end": "YYYY-MM-DD or empty",
  "request_status": "pending|completed|all",
  "notes": "short interpretation"
}

Rules:
- "completed" means approved + denied.
- If a value is unknown, return empty string/array.
- Keep dates ISO only.
- Prefer exact names from provided options.
- Never invent employees/departments not in provided options.`;

function normalizeText(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((x) => stableStringify(x)).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
}

function parseMaybeJson(value) {
  if (value && typeof value === "object") return value;
  if (typeof value !== "string") return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function getChartSignature(originalQuery, chartConfigInput) {
  const q = normalizeText(originalQuery);
  const cfg = stableStringify(parseMaybeJson(chartConfigInput));
  return `${q}::${cfg}`;
}

function escHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatCurrency(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "$0";
  const hasCents = Math.abs(amount % 1) > 0.000001;
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

function getCurrentQuarter() {
  const now = new Date();
  return `${now.getFullYear()}-Q${Math.ceil((now.getMonth() + 1) / 3)}`;
}

function isIsoDate(v) {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function stripCodeFences(value) {
  if (typeof value !== "string") return "";
  return value.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
}

function parseFirstJsonObject(value) {
  const stripped = stripCodeFences(value);
  try {
    return JSON.parse(stripped);
  } catch {}
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(stripped.slice(start, end + 1));
  } catch {
    return null;
  }
}

function extractFallbackAmount(rawRequest) {
  const text = String(rawRequest || "");
  const patterns = [
    /\$\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)/i,
    /\b([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)\s*(?:cad|usd|dollars?)\b/i,
    /\bamount\s*(?:is|of|:)?\s*\$?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (!m) continue;
    const n = Number(m[1].replace(/,/g, ""));
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return 0;
}

function normalizeParsedRequest(parsed, rawRequest) {
  const fallbackAmount = extractFallbackAmount(rawRequest);
  const amount = Number(parsed?.parsed_amount);
  const safeAmount = Number.isFinite(amount) && amount > 0 ? amount : fallbackAmount;
  return {
    parsed_name: String(parsed?.parsed_name || "Unknown").trim() || "Unknown",
    parsed_department: String(parsed?.parsed_department || "Unknown").trim() || "Unknown",
    parsed_purpose: String(parsed?.parsed_purpose || "").trim() || String(rawRequest || "").slice(0, 140) || "Expense request",
    parsed_amount: safeAmount,
  };
}

function sanitizePlainParagraph(raw) {
  if (!raw || typeof raw !== "string") return "";
  let s = raw.replace(/\r\n/g, "\n").trim();
  s = s.replace(/```[\s\S]*?```/g, " ");
  s = s.replace(/^#{1,6}\s*[^\n]+\n?/gm, " ");
  s = s.replace(/\*\*([^*]+)\*\*/g, "$1");
  s = s.replace(/\*([^*\n]+)\*/g, "$1");
  s = s.replace(/`([^`]+)`/g, "$1");
  s = s.replace(/^\s*[-*•]\s+/gm, "");
  s = s.replace(/^\s*\d+\.\s+/gm, "");
  s = s.replace(/[✓✗✅❌📜]+/gu, "");
  s = s.replace(/\s+/g, " ").trim();
  if (s.length > 900) s = `${s.slice(0, 900).replace(/\s+\S*$/, "")}…`;
  return s;
}

function compactRecommendation(raw) {
  let s = sanitizePlainParagraph(raw);
  s = s.replace(/^i now have everything needed[^.?!]*[.?!]\s*/i, "");
  s = s.replace(/^based on (my|the) review[^.?!]*[.?!]\s*/i, "");
  s = s.replace(/^key findings:\s*/i, "");
  s = s.replace(/^overall,\s*/i, "");
  const sentenceMatches = s
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map((x) => x.trim())
    .filter(Boolean);
  const selected = sentenceMatches.slice(0, 3);
  let limited = selected.join(" ");
  if (!limited) limited = s.trim();
  if (!/^Recommend (APPROVE|DENY)\./i.test(limited)) {
    const denySignal = /\b(deny|reject|decline|fails?|violation|mismatch|over(?:\s|-)?budget|retroactive|non[- ]compliant)\b/i.test(
      limited
    );
    limited = `${denySignal ? "Recommend DENY." : "Recommend APPROVE."} ${limited}`.trim();
  }
  if (/\$\d[\d,]*(?:\.\d{1,2})?\.$/.test(limited) && sentenceMatches.length > selected.length) {
    limited = `${limited} ${sentenceMatches[selected.length]}`.trim();
  }
  if (limited.length > 420) limited = limited.slice(0, 420).replace(/\s+\S*$/, "").trim();
  if (!/[.!?]$/.test(limited)) limited = `${limited}.`;
  return limited;
}

function parseRecommendationOutput(text) {
  let full = String(text || "").trim();
  const recMatch = full.match(/RECOMMENDATION\s*:\s*([\s\S]*?)(?=\n\s*NOTE\s*:|$)/i);
  const noteMatch = full.match(/\bNOTE\s*:\s*([\s\S]+)$/i);
  if (recMatch || noteMatch) {
    const parts = [recMatch?.[1]?.trim(), noteMatch?.[1]?.trim()].filter(Boolean);
    full = parts.join(" ");
  } else {
    full = full.replace(/^\s*RECOMMENDATION\s*:\s*/i, "").replace(/^\s*NOTE\s*:\s*/i, "").trim();
  }
  full = compactRecommendation(full);
  if (!full) full = "No recommendation generated.";
  return { recommendation: full, shortNote: full };
}

function parseReportArray(rawText) {
  const text = String(rawText || "").trim();
  const stripped = text.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  const attempts = [stripped];
  const first = stripped.indexOf("[");
  const last = stripped.lastIndexOf("]");
  if (first !== -1 && last > first) attempts.push(stripped.slice(first, last + 1));
  for (const candidate of attempts) {
    try {
      const parsed = JSON.parse(candidate);
      if (!Array.isArray(parsed)) continue;
      return parsed.map((group) => ({
        title: String(group?.title || "Expense Report").trim() || "Expense Report",
        date_range_start: String(group?.date_range_start || "").trim(),
        date_range_end: String(group?.date_range_end || "").trim(),
        total_amount: Number(group?.total_amount) || 0,
        policy_summary: String(group?.policy_summary || "").trim(),
        transaction_ids: Array.isArray(group?.transaction_ids)
          ? group.transaction_ids.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)
          : [],
      }));
    } catch {}
  }
  throw new Error("Model returned invalid report JSON.");
}

function normalizeReportFilterParse(raw) {
  const employee_names = Array.isArray(raw?.employee_names)
    ? raw.employee_names.map((s) => String(s || "").trim()).filter(Boolean)
    : [];
  const departments = Array.isArray(raw?.departments)
    ? raw.departments.map((s) => String(s || "").trim()).filter(Boolean)
    : [];
  const date_start = String(raw?.date_start || "").trim();
  const date_end = String(raw?.date_end || "").trim();
  const statusRaw = String(raw?.request_status || "all").trim().toLowerCase();
  const request_status = ["pending", "completed", "all"].includes(statusRaw) ? statusRaw : "all";
  const notes = String(raw?.notes || "").trim();
  return { employee_names, departments, date_start, date_end, request_status, notes };
}

function parsePromptDateIso(text, todayIso = "") {
  const input = String(text || "");
  const t = input.toLowerCase();
  const today = isIsoDate(todayIso) ? new Date(`${todayIso}T12:00:00`) : new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const addDays = (base, n) => {
    const d = new Date(base);
    d.setDate(d.getDate() + n);
    return d;
  };
  const addMonths = (base, n) => {
    const d = new Date(base);
    d.setMonth(d.getMonth() + n);
    return d;
  };
  if (/\btoday\b/.test(t)) return fmt(startOfToday);
  if (/\btomorrow\b/.test(t)) return fmt(addDays(startOfToday, 1));
  const inDays = t.match(/\bin\s+(\d+)\s+days?\b/);
  if (inDays) return fmt(addDays(startOfToday, Number(inDays[1]) || 0));
  const inWeeks = t.match(/\bin\s+(\d+)\s+weeks?\b/);
  if (inWeeks) return fmt(addDays(startOfToday, (Number(inWeeks[1]) || 0) * 7));
  if (/\bnext\s+month\b/.test(t)) return fmt(addMonths(startOfToday, 1));
  const isoMatch = input.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoMatch && isIsoDate(isoMatch[1])) return isoMatch[1];
  return "";
}

function heuristicParseReportFilters(prompt, options = {}) {
  const text = String(prompt || "").trim();
  if (!text) {
    return { employee_names: [], departments: [], date_start: "", date_end: "", request_status: "all", notes: "" };
  }
  const lower = text.toLowerCase();
  const employeeOptions = Array.isArray(options.employeeNames) ? options.employeeNames : [];
  const departmentOptions = Array.isArray(options.departments) ? options.departments : [];
  const employee_names = employeeOptions.filter((name) => {
    const n = String(name || "").trim();
    if (!n) return false;
    const nLower = n.toLowerCase();
    return lower.includes(nLower) || lower.includes(nLower.split(" ")[0]);
  });
  const departments = departmentOptions.filter((dept) => lower.includes(String(dept || "").toLowerCase()));
  const request_status = /\b(pending|open)\b/.test(lower)
    ? "pending"
    : /\b(completed|complete|approved|denied|closed)\b/.test(lower)
      ? "completed"
      : "all";
  let date_start = "";
  let date_end = "";
  const between = text.match(/\bbetween\s+(\d{4}-\d{2}-\d{2})\s+(?:and|to)\s+(\d{4}-\d{2}-\d{2})\b/i);
  if (between && isIsoDate(between[1]) && isIsoDate(between[2])) {
    date_start = between[1];
    date_end = between[2];
  } else {
    const fromTo = text.match(/\bfrom\s+(\d{4}-\d{2}-\d{2})\s+(?:to|until|through)\s+(\d{4}-\d{2}-\d{2})\b/i);
    if (fromTo && isIsoDate(fromTo[1]) && isIsoDate(fromTo[2])) {
      date_start = fromTo[1];
      date_end = fromTo[2];
    } else {
      if (/\blast\s+7\s+days\b/i.test(text)) {
        const todayIso = parsePromptDateIso("today", options.todayIso);
        date_end = todayIso;
        const d = new Date(`${todayIso}T12:00:00`);
        d.setDate(d.getDate() - 7);
        date_start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      } else if (/\blast\s+30\s+days\b/i.test(text)) {
        const todayIso = parsePromptDateIso("today", options.todayIso);
        date_end = todayIso;
        const d = new Date(`${todayIso}T12:00:00`);
        d.setDate(d.getDate() - 30);
        date_start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      }
    }
  }
  return {
    employee_names,
    departments,
    date_start: isIsoDate(date_start) ? date_start : "",
    date_end: isIsoDate(date_end) ? date_end : "",
    request_status,
    notes: "Heuristic parse applied.",
  };
}

function parseDepartments(value) {
  if (Array.isArray(value)) {
    return value.map((v) => String(v || "").trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value.split(",").map((v) => v.trim()).filter(Boolean);
  }
  return [];
}

function sanitizeEmail(value) {
  const raw = String(value || "").trim();
  return raw || "";
}

function normalizePdfFilters(payload, parsed = {}) {
  const explicitDepartments = parseDepartments(payload.departments);
  const parsedDepartments = Array.isArray(parsed.departments) ? parsed.departments : [];
  const departments = explicitDepartments.length ? explicitDepartments : parsedDepartments;
  const date_start = isIsoDate(payload.date_start) ? String(payload.date_start) : (isIsoDate(parsed.date_start) ? String(parsed.date_start) : "");
  const date_end = isIsoDate(payload.date_end) ? String(payload.date_end) : (isIsoDate(parsed.date_end) ? String(parsed.date_end) : "");
  return {
    prompt: String(payload.prompt || "").trim(),
    employee_id: Number(payload.employee_id) || null,
    employee_names: Array.isArray(parsed.employee_names) ? parsed.employee_names : [],
    departments,
    date_start,
    date_end,
    notes: String(parsed.notes || "").trim(),
  };
}

function buildSubmissionWhere(filters, employeeIds) {
  const where = [];
  const params = [];
  if (employeeIds.length > 0) {
    where.push(`s.employee_id IN (${employeeIds.map(() => "?").join(",")})`);
    params.push(...employeeIds);
  }
  if (filters.departments.length > 0) {
    where.push(`COALESCE(NULLIF(s.parsed_department, ''), e.department) IN (${filters.departments.map(() => "?").join(",")})`);
    params.push(...filters.departments);
  }
  if (isIsoDate(filters.date_start)) {
    where.push("date(s.created_at) >= ?");
    params.push(filters.date_start);
  }
  if (isIsoDate(filters.date_end)) {
    where.push("date(s.created_at) <= ?");
    params.push(filters.date_end);
  }
  return { whereClause: where.length ? `WHERE ${where.join(" AND ")}` : "", params };
}

async function resolveEmployeeIdsForPdf(env, explicitEmployeeId, parsedEmployeeNames) {
  const ids = new Set();
  const numeric = Number(explicitEmployeeId);
  if (Number.isInteger(numeric) && numeric > 0) ids.add(numeric);
  const names = Array.isArray(parsedEmployeeNames) ? parsedEmployeeNames : [];
  if (!names.length) return [...ids];
  const all = await d1All(env, "SELECT id, name FROM employees");
  for (const name of names) {
    const needle = String(name || "").trim().toLowerCase();
    if (!needle) continue;
    const exact = all.find((e) => String(e.name || "").trim().toLowerCase() === needle);
    const fuzzy = all.find((e) => String(e.name || "").trim().toLowerCase().includes(needle));
    const match = exact || fuzzy;
    if (match?.id) ids.add(Number(match.id));
  }
  return [...ids];
}

async function listSubmissionRows(env, filters, employeeIds, mode) {
  const { whereClause, params } = buildSubmissionWhere(filters, employeeIds);
  const statusClause = mode === "pending" ? "s.status = 'pending'" : "s.status IN ('approved', 'denied')";
  const combinedWhere = whereClause ? `${whereClause} AND ${statusClause}` : `WHERE ${statusClause}`;
  return d1All(
    env,
    `SELECT
      s.id,
      s.status,
      s.parsed_name,
      s.parsed_department,
      s.parsed_purpose,
      s.parsed_amount,
      s.created_at,
      s.decided_at,
      e.name AS emp_name,
      e.department AS emp_dept
    FROM submissions s
    LEFT JOIN employees e ON s.employee_id = e.id
    ${combinedWhere}
    ORDER BY datetime(s.created_at) DESC`,
    params
  );
}

function escapePdfText(value) {
  return String(value || "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .trim();
}

// ── Styled multi-page PDF builder ──────────────────────────────────────────
function buildStyledPdfBytes(pendingRows, completedRows, filtersData) {
  const PAGE_W = 612, PAGE_H = 792;
  const M = 46;                          // margin
  const CW = PAGE_W - M * 2;            // content width = 520
  const HDR_H = 56;                      // header band height
  const CONTENT_TOP = HDR_H + 14;       // screen Y where body starts = 70
  const CONTENT_BOTTOM = 760;           // screen Y where body ends (above footer)
  const dateStamp = new Date().toISOString().slice(0, 10);

  // PDF Y = page_height - screen_Y  (PDF origin is bottom-left)
  function Y(sY) { return PAGE_H - sY; }

  // Convert hex color to PDF RGB triplet string
  function rgb(hex) {
    const h = hex.replace("#", "");
    return [
      (parseInt(h.slice(0, 2), 16) / 255).toFixed(3),
      (parseInt(h.slice(2, 4), 16) / 255).toFixed(3),
      (parseInt(h.slice(4, 6), 16) / 255).toFixed(3),
    ].join(" ");
  }

  // PDF drawing primitives (each returns a content-stream op string)
  const g = {
    fillRect(x, sY, w, h, color) {
      return `q ${rgb(color)} rg ${x} ${Y(sY + h)} ${w} ${h} re f Q`;
    },
    line(x1, sY1, x2, sY2, color, lw) {
      return `q ${rgb(color)} RG ${lw || 0.5} w ${x1} ${Y(sY1)} m ${x2} ${Y(sY2)} l S Q`;
    },
    // sY = screen Y of text BASELINE
    text(str, x, sY, font, size, color) {
      const safe = escapePdfText(str);
      if (!safe) return "";
      return `q BT ${rgb(color)} rg /${font} ${size} Tf 1 0 0 1 ${x} ${Y(sY)} Tm (${safe}) Tj ET Q`;
    },
  };

  // Approximate Helvetica text width (em ≈ 0.52 × size for mixed text)
  function tw(str, size) { return str.length * 0.52 * size; }
  function textRight(str, rightX, sY, font, size, color) {
    return g.text(str, Math.max(M, rightX - tw(str, size)), sY, font, size, color);
  }

  // ── Page accumulator ──────────────────────────────────────────────────────
  const pages = [];
  let cur = [];      // ops for current page
  let cy = CONTENT_TOP; // cursor: screen Y from top

  function emit(op) { if (op) cur.push(op); }

  function headerOps() {
    return [
      g.fillRect(0, 0, PAGE_W, HDR_H, "#003d5c"),                                     // navy band
      g.text("BRIM ExI", M, 22, "F2", 13, "#ffffff"),                                  // brand
      g.text("Expense Request Report", 300, 19, "F1", 10.5, "#7dd3fc"),               // title
      g.text(`Generated ${dateStamp}`, 400, 38, "F1", 7.5, "#93c5fd"),                // date
    ];
  }

  function footerOps(pageNum, total) {
    const txt = `BRIM ExI  |  Confidential  |  Page ${pageNum} of ${total}`;
    return [
      g.line(M, PAGE_H - 26, PAGE_W - M, PAGE_H - 26, "#e2e8f0", 0.4),
      g.text(txt, Math.max(M, (PAGE_W - tw(txt, 7.5)) / 2), PAGE_H - 14, "F1", 7.5, "#64748b"),
    ];
  }

  function newPage() {
    pages.push(cur);
    cur = [];
    cy = CONTENT_TOP;
    headerOps().forEach((op) => cur.push(op));
  }

  function ensureSpace(h) { if (cy + h > CONTENT_BOTTOM) newPage(); }

  // ── Start first page ──────────────────────────────────────────────────────
  headerOps().forEach((op) => cur.push(op));

  // Summary stats box
  const allRows = [...pendingRows, ...completedRows];
  const tAmt = allRows.reduce((s, r) => s + (Number(r.parsed_amount) || 0), 0);
  const pAmt = pendingRows.reduce((s, r) => s + (Number(r.parsed_amount) || 0), 0);
  const dAmt = completedRows.reduce((s, r) => s + (Number(r.parsed_amount) || 0), 0);
  const BOX_H = 66;

  emit(g.fillRect(M, cy, CW, BOX_H, "#e8f6fb"));
  emit(g.fillRect(M, cy, 3, BOX_H, "#0891b2"));
  [
    { label: "TOTAL REQUESTS", count: allRows.length, amt: tAmt },
    { label: "PENDING",        count: pendingRows.length, amt: pAmt },
    { label: "COMPLETED",      count: completedRows.length, amt: dAmt },
  ].forEach((col, i) => {
    const x = M + i * (CW / 3) + 18;
    emit(g.text(col.label, x, cy + 13, "F1", 6.5, "#64748b"));
    emit(g.text(String(col.count), x, cy + 30, "F2", 19, "#0f172a"));
    emit(g.text(formatCurrency(col.amt), x, cy + 49, "F1", 8.5, "#334155"));
  });
  cy += BOX_H + 12;

  // Filter strip
  const bits = [];
  if (filtersData.employee_label) bits.push(`Employee: ${filtersData.employee_label}`);
  if (Array.isArray(filtersData.departments) && filtersData.departments.length)
    bits.push(`Depts: ${filtersData.departments.join(", ")}`);
  if (filtersData.date_start) bits.push(`From: ${filtersData.date_start}`);
  if (filtersData.date_end)   bits.push(`To: ${filtersData.date_end}`);
  if (bits.length) {
    emit(g.text(`Filters: ${bits.join("  |  ")}`, M, cy + 9, "F1", 8, "#64748b"));
    cy += 18;
  }

  // ── Section renderer ──────────────────────────────────────────────────────
  function renderSection(rows, title) {
    cy += 8;
    ensureSpace(40);

    // Section header bar + title + count badge
    emit(g.fillRect(M, cy, 3, 22, "#0891b2"));
    emit(g.text(title, M + 10, cy + 16, "F2", 11.5, "#0f172a"));
    const cntStr = String(rows.length);
    const bW = Math.max(26, cntStr.length * 7 + 12);
    const bX = PAGE_W - M - bW;
    emit(g.fillRect(bX, cy + 2, bW, 17, rows.length > 0 ? "#0891b2" : "#94a3b8"));
    emit(g.text(cntStr, bX + (bW - tw(cntStr, 8)) / 2, cy + 13, "F2", 8, "#ffffff"));
    cy += 28;
    emit(g.line(M, cy, PAGE_W - M, cy, "#e2e8f0", 0.5));
    cy += 8;

    if (!rows.length) {
      emit(g.text("No requests in this section.", M + 8, cy + 10, "F1", 10, "#64748b"));
      cy += 26;
      return;
    }

    rows.forEach((row, idx) => {
      const ROW_H = 52;
      ensureSpace(ROW_H);

      const employee = row.emp_name || row.parsed_name || "Unknown";
      const dept     = row.emp_dept  || row.parsed_department || "-";
      const status   = String(row.status || "pending").toLowerCase();
      const date     = String(row.created_at || "").slice(0, 10);
      const decided  = row.decided_at ? String(row.decided_at).slice(0, 10) : null;
      const rawPurp  = String(row.parsed_purpose || "-");
      const purpose  = rawPurp.length > 82 ? rawPurp.slice(0, 79) + "..." : rawPurp;
      const amount   = formatCurrency(row.parsed_amount);

      // Alt-row background
      if (idx % 2 === 0) emit(g.fillRect(M, cy, CW, ROW_H - 1, "#f8fafc"));

      // Row index
      emit(g.text(String(idx + 1).padStart(2, "0"), M + 4, cy + 16, "F1", 8, "#64748b"));

      // Left column: name / dept+date / purpose
      const nameX = M + 24;
      emit(g.text(employee, nameX, cy + 15, "F2", 10, "#0f172a"));
      emit(g.text(`${dept}  |  ${date}`, nameX, cy + 27, "F1", 8, "#64748b"));
      emit(g.text(purpose, nameX, cy + 39, "F1", 8.5, "#334155"));

      // Right column: amount + status badge
      emit(textRight(amount, PAGE_W - M - 2, cy + 15, "F2", 12, "#0f172a"));

      let sbg, sfg;
      if (status === "approved") { sbg = "#dcfce7"; sfg = "#166534"; }
      else if (status === "denied") { sbg = "#fee2e2"; sfg = "#7f1d1d"; }
      else { sbg = "#fef9c3"; sfg = "#92400e"; }
      const BADGE_W = 60;
      const badgeX = PAGE_W - M - BADGE_W;
      emit(g.fillRect(badgeX, cy + 27, BADGE_W, 13, sbg));
      const stxt = status.toUpperCase();
      emit(g.text(stxt, badgeX + (BADGE_W - tw(stxt, 6.5)) / 2, cy + 36, "F2", 6.5, sfg));
      if (decided) {
        emit(g.text(`Decided ${decided}`, badgeX, cy + 44, "F1", 6.5, "#64748b"));
      }

      cy += ROW_H;
      emit(g.line(M, cy - 1, PAGE_W - M, cy - 1, "#e2e8f0", 0.3));
    });

    // Section total
    const sTotal = rows.reduce((s, r) => s + (Number(r.parsed_amount) || 0), 0);
    cy += 8;
    emit(textRight(`Section total:  ${formatCurrency(sTotal)}`, PAGE_W - M, cy + 2, "F2", 9, "#0f172a"));
    cy += 20;
  }

  renderSection(pendingRows, "Pending Requests");
  renderSection(completedRows, "Completed Requests");
  pages.push(cur); // flush last page

  // Add footers to all pages
  const totalPgs = pages.length;
  pages.forEach((pg, i) => footerOps(i + 1, totalPgs).forEach((op) => pg.push(op)));

  return assemblePdfPages(pages);
}

function assemblePdfPages(pageContents) {
  const N = pageContents.length;
  // Object IDs: 1=Catalog, 2=Pages, 3..N+2=Page objs, N+3..2N+2=Content streams, 2N+3=Helv, 2N+4=HelvBold
  const fontHId = 3 + N * 2;
  const fontBId = 3 + N * 2 + 1;
  const total   = fontBId;

  const obj = {};
  obj[1] = `<< /Type /Catalog /Pages 2 0 R >>`;
  obj[2] = `<< /Type /Pages /Kids [${Array.from({ length: N }, (_, i) => `${3 + i} 0 R`).join(" ")}] /Count ${N} >>`;
  for (let i = 0; i < N; i++) {
    const pId = 3 + i, cId = 3 + N + i;
    obj[pId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontHId} 0 R /F2 ${fontBId} 0 R >> >> /Contents ${cId} 0 R >>`;
    const stream = pageContents[i].join("\n") + "\n";
    obj[cId] = `<< /Length ${stream.length} >>\nstream\n${stream}endstream`;
  }
  obj[fontHId] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`;
  obj[fontBId] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`;

  let pdf = "%PDF-1.4\n";
  const off = {};
  for (let id = 1; id <= total; id++) {
    off[id] = pdf.length;
    pdf += `${id} 0 obj\n${obj[id]}\nendobj\n`;
  }
  const xOff = pdf.length;
  pdf += `xref\n0 ${total + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= total; id++) pdf += `${String(off[id]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${total + 1} /Root 1 0 R >>\nstartxref\n${xOff}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

function uint8ToBase64(bytes) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    let part = "";
    for (let j = 0; j < chunk.length; j++) part += String.fromCharCode(chunk[j]);
    binary += part;
  }
  return btoa(binary);
}

function buildApexConfig({ chart_type, title, subtitle, categories = [], series = [], value_prefix = "", value_suffix = "" }) {
  const PALETTE = ["#00b8e6", "#0082ad", "#5bc4de", "#34d399", "#f59e0b", "#f87171", "#a78bfa", "#88d4ec"];
  const isDonut = chart_type === "donut";
  const isHorizontal = chart_type === "horizontalBar";
  const isLine = chart_type === "line" || chart_type === "area";
  const fmtTooltip = (val) =>
    typeof val === "number" && !isNaN(val)
      ? `${value_prefix}${val.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${value_suffix}`
      : String(val);
  const fmtAxis = (val) => {
    if (typeof val !== "number" || isNaN(val)) return String(val);
    const abs = Math.abs(val);
    const str = abs >= 1_000_000 ? `${(val / 1_000_000).toFixed(1)}M` : abs >= 1_000 ? `${(val / 1_000).toFixed(1)}k` : val.toLocaleString("en-CA", { maximumFractionDigits: 1 });
    return `${value_prefix}${str}${value_suffix}`;
  };
  const base = {
    chart: {
      type: isDonut ? "donut" : isHorizontal ? "bar" : chart_type,
      height: 300,
      toolbar: { show: false },
      fontFamily: "inherit",
      animations: { enabled: true, speed: 380, animateGradually: { enabled: false } },
      background: "transparent",
    },
    colors: PALETTE,
    title: { text: title || "", style: { fontSize: "13px", fontWeight: "600" } },
    ...(subtitle ? { subtitle: { text: subtitle, style: { fontSize: "11px" } } } : {}),
    dataLabels: { enabled: false },
    grid: { borderColor: "rgba(130,130,130,0.12)", strokeDashArray: 3 },
    tooltip: { y: { formatter: fmtTooltip } },
    legend: { fontSize: "12px" },
  };
  if (isDonut) {
    return {
      ...base,
      series: series[0]?.data ?? [],
      labels: categories,
      legend: { position: "bottom", fontSize: "12px" },
      plotOptions: { pie: { donut: { size: "60%" } } },
      dataLabels: { enabled: true, formatter: (val) => `${Number(val).toFixed(1)}%`, style: { fontSize: "11px" }, dropShadow: { enabled: false } },
      tooltip: { y: { formatter: fmtTooltip } },
    };
  }
  if (isHorizontal) {
    return {
      ...base,
      series: series.map((s) => ({ name: s.name, data: s.data })),
      xaxis: { categories, labels: { formatter: fmtAxis, style: { fontSize: "11px" } } },
      yaxis: { labels: { style: { fontSize: "12px" } } },
      plotOptions: { bar: { horizontal: true, borderRadius: 3, barHeight: "55%" } },
    };
  }
  return {
    ...base,
    series: series.map((s) => ({ name: s.name, data: s.data })),
    xaxis: {
      categories,
      labels: { style: { fontSize: "11px" }, rotate: categories.length > 7 ? -35 : 0, rotateAlways: false },
    },
    yaxis: { labels: { formatter: fmtAxis } },
    ...(isLine ? {} : { plotOptions: { bar: { borderRadius: 4, columnWidth: categories.length > 7 ? "75%" : "52%" } } }),
    stroke: isLine ? { curve: "smooth", width: 2.5 } : { show: false },
    ...(chart_type === "area"
      ? {
          fill: {
            type: "gradient",
            gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.04, stops: [0, 100] },
          },
        }
      : {}),
    ...(isLine ? { markers: { size: 4, hover: { size: 6 } } } : {}),
  };
}

async function d1All(env, sql, params = []) {
  const result = await env.DB.prepare(sql).bind(...params).all();
  return result?.results || [];
}

async function d1First(env, sql, params = []) {
  return env.DB.prepare(sql).bind(...params).first();
}

async function d1Run(env, sql, params = []) {
  return env.DB.prepare(sql).bind(...params).run();
}

async function callAnthropic(env, payload, timeoutMs = 60000) {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error("Server is missing ANTHROPIC_API_KEY.");
  }
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort("timeout"), timeoutMs);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: ac.signal,
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || data?.message || `Anthropic HTTP ${res.status}`);
    }
    return data;
  } finally {
    clearTimeout(t);
  }
}

async function executeTool(env, name, input) {
  if (name === "get_schema") {
    const { table_name } = input || {};
    if (!VALID_TABLES.includes(table_name)) {
      return { error: `Unknown table: ${table_name}. Available: ${VALID_TABLES.join(", ")}` };
    }
    const tableInfo = await d1All(env, `PRAGMA table_info(${table_name})`);
    const samples = await d1All(env, `SELECT * FROM ${table_name} LIMIT 3`);
    return { columns: tableInfo.map((c) => ({ name: c.name, type: c.type })), sample_rows: samples };
  }

  if (name === "run_query") {
    const sql = String(input?.sql || "");
    if (!/^\s*select\b/i.test(sql)) {
      return { error: "Only SELECT queries are permitted." };
    }
    try {
      const rows = await d1All(env, sql);
      const limited = rows.slice(0, 200);
      return { rows: limited, count: rows.length, truncated: rows.length > 200 };
    } catch (err) {
      return { error: err.message };
    }
  }

  if (name === "get_policy_rules") {
    return { rules: await d1All(env, "SELECT * FROM policy_rules") };
  }

  if (name === "save_chart") {
    const { title, original_query, chart_config_json } = input || {};
    const incomingSignature = getChartSignature(original_query || title, chart_config_json);
    const existingRows = await d1All(env, "SELECT id, title, original_query, chart_config_json FROM saved_charts");
    const existing = existingRows.find((row) => getChartSignature(row.original_query || row.title, row.chart_config_json) === incomingSignature);
    if (existing) return { saved: true, id: existing.id, alreadySaved: true };
    const r = await d1Run(env, "INSERT INTO saved_charts (title, original_query, chart_config_json) VALUES (?, ?, ?)", [title, original_query, chart_config_json]);
    return { saved: true, id: r?.meta?.last_row_id };
  }

  if (name === "get_employee_history") {
    const employee_id = Number(input?.employee_id);
    const txns = await d1All(
      env,
      "SELECT * FROM transactions WHERE employee_id = ? AND transaction_date >= date('now', '-90 days') ORDER BY transaction_date DESC",
      [employee_id]
    );
    const violations = await d1All(
      env,
      "SELECT severity, COUNT(*) as count FROM violations WHERE employee_id = ? GROUP BY severity",
      [employee_id]
    );
    const employee = await d1First(env, "SELECT * FROM employees WHERE id = ?", [employee_id]);
    if (!employee) return { error: `Employee with id ${employee_id} not found` };
    return { employee, recent_transactions: txns, violation_summary: violations };
  }

  if (name === "get_department_budget") {
    const department = String(input?.department || "");
    const currentPeriod = getCurrentQuarter();
    let budget = await d1First(env, "SELECT * FROM department_budgets WHERE department = ? AND period = ?", [department, currentPeriod]);
    if (!budget) {
      budget = await d1First(env, "SELECT * FROM department_budgets WHERE department = ? ORDER BY period DESC LIMIT 1", [department]);
    }
    if (!budget) return { error: `No budget data found for department: ${department}` };
    return {
      ...budget,
      remaining: Number(budget.budget_amount) - Number(budget.spent_amount),
      note:
        budget.period !== currentPeriod
          ? `Using most recent available period (${budget.period}); current quarter (${currentPeriod}) not yet seeded`
          : undefined,
    };
  }

  if (name === "flag_violation") {
    const { employee_id, transaction_id, rule_id, amount, merchant, date, severity, note, reasoning } = input || {};
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ""))) {
      return { error: `Invalid date format: "${date}". Expected YYYY-MM-DD.` };
    }
    const existing = await d1First(env, "SELECT id FROM violations WHERE transaction_id = ? AND rule_id = ?", [transaction_id, rule_id]);
    if (existing) return { skipped: true, reason: "Violation already recorded" };
    const r = await d1Run(
      env,
      "INSERT INTO violations (employee_id, transaction_id, rule_id, amount, merchant, date, severity, note, ai_reasoning) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [employee_id, transaction_id, rule_id, amount, merchant, date, severity, note, reasoning]
    );
    return { flagged: true, id: r?.meta?.last_row_id };
  }

  return { error: `Unknown tool: ${name}` };
}

async function runToolLoop(env, { system, tools, messages, maxIterations = 15, maxTokens = 2048, timeoutMs = 60000, model = "claude-sonnet-4-6" }) {
  let response = null;
  let iterations = 0;
  const convo = [...messages];
  while (iterations < maxIterations) {
    iterations++;
    response = await callAnthropic(
      env,
      {
        model,
        max_tokens: maxTokens,
        system,
        tools,
        messages: convo,
      },
      timeoutMs
    );
    if (response.stop_reason === "end_turn") break;
    if (response.stop_reason === "tool_use") {
      const toolUseBlocks = (response.content || []).filter((b) => b.type === "tool_use");
      convo.push({ role: "assistant", content: response.content });
      const toolResults = [];
      for (const block of toolUseBlocks) {
        const result = await executeTool(env, block.name, block.input);
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: JSON.stringify(result),
        });
      }
      convo.push({ role: "user", content: toolResults });
      continue;
    }
    break;
  }
  return response;
}

async function runChatLoop(env, sessionId, userMessage) {
  const history = await d1All(env, "SELECT role, content FROM conversation_history WHERE session_id = ? ORDER BY created_at ASC", [sessionId]);
  const messages = [...history.map((h) => ({ role: h.role, content: h.content })), { role: "user", content: userMessage }];
  let response;
  let iterations = 0;
  const MAX_ITERATIONS = 12;
  let capturedChartSpec = null;
  const convo = [...messages];

  while (iterations < MAX_ITERATIONS) {
    iterations++;
    response = await callAnthropic(
      env,
      {
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        system: CHAT_SYSTEM_PROMPT,
        tools: CHAT_TOOLS,
        messages: convo,
      },
      60000
    );
    if (response.stop_reason === "end_turn") break;
    if (response.stop_reason === "tool_use") {
      const toolUseBlocks = (response.content || []).filter((b) => b.type === "tool_use");
      convo.push({ role: "assistant", content: response.content });
      const toolResults = [];
      for (const block of toolUseBlocks) {
        if (block.name === "produce_chart") {
          if (!capturedChartSpec) capturedChartSpec = block.input;
          toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify({ rendered: true }) });
          continue;
        }
        const result = await executeTool(env, block.name, block.input);
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(result) });
      }
      convo.push({ role: "user", content: toolResults });
      continue;
    }
    break;
  }

  const textBlock = (response.content || []).find((b) => b.type === "text");
  let text = String(textBlock?.text || "").trim();
  if (!text) {
    text =
      iterations >= MAX_ITERATIONS
        ? "I wasn't able to complete this analysis. Please try a more specific question."
        : "I couldn't find an answer for that. Try rephrasing your question.";
  }
  let chartConfig = null;
  if (capturedChartSpec) {
    try {
      chartConfig = buildApexConfig(capturedChartSpec);
    } catch {}
  }
  const chartJson = chartConfig ? JSON.stringify(chartConfig) : null;
  await d1Run(env, "INSERT INTO conversation_history (session_id, role, content) VALUES (?, ?, ?)", [sessionId, "user", userMessage]);
  await d1Run(env, "INSERT INTO conversation_history (session_id, role, content, chart_config) VALUES (?, ?, ?, ?)", [
    sessionId,
    "assistant",
    text,
    chartJson,
  ]);
  return { text, chartConfig };
}

async function parseRequestAI(env, rawRequest) {
  const response = await callAnthropic(env, {
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    system: APPROVAL_PARSE_SYSTEM,
    messages: [{ role: "user", content: rawRequest }],
  });
  const text = (response.content || []).find((b) => b.type === "text")?.text || "{}";
  const parsed = parseFirstJsonObject(text);
  return normalizeParsedRequest(parsed, rawRequest);
}

async function generateRecommendationAI(env, submission) {
  const userMsg = `Please review this expense request and provide a recommendation:

Employee: ${submission.parsed_name} (${submission.parsed_department})
Purpose: ${submission.parsed_purpose}
Amount: ${formatCurrency(submission.parsed_amount)}

Original request: "${submission.raw_request}"`;
  const response = await runToolLoop(env, {
    system: APPROVAL_CONTEXT_SYSTEM,
    tools: APPROVAL_TOOLS,
    messages: [{ role: "user", content: userMsg }],
    maxIterations: 15,
    maxTokens: 2048,
    timeoutMs: 60000,
    model: "claude-sonnet-4-6",
  });
  const text = (response.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n\n")
    .trim();
  return parseRecommendationOutput(text);
}

async function runComplianceScanAI(env) {
  const response = await runToolLoop(env, {
    system: COMPLIANCE_SYSTEM_PROMPT,
    tools: COMPLIANCE_TOOLS,
    messages: [{ role: "user", content: "Please run a full compliance scan on all employee transactions from the last 60 days." }],
    maxIterations: 20,
    maxTokens: 4096,
    timeoutMs: 120000,
    model: "claude-sonnet-4-6",
  });
  return (response.content || []).find((b) => b.type === "text")?.text || "Compliance scan complete.";
}

async function generateReportsAI(env, employeeId, dateStart, dateEnd) {
  const userMsg = `Generate expense reports for employee ID ${employeeId} for transactions between ${dateStart} and ${dateEnd}.`;
  const response = await runToolLoop(env, {
    system: REPORTS_SYSTEM_PROMPT,
    tools: REPORT_TOOLS,
    messages: [{ role: "user", content: userMsg }],
    maxIterations: 15,
    maxTokens: 4096,
    timeoutMs: 60000,
    model: "claude-sonnet-4-5",
  });
  const text = (response.content || []).find((b) => b.type === "text")?.text || "[]";
  return parseReportArray(text);
}

async function parseReportFiltersAI(env, prompt, options = {}) {
  const text = String(prompt || "").trim();
  if (!text || !env.ANTHROPIC_API_KEY) {
    return heuristicParseReportFilters(text, options);
  }
  const employeeOptions = Array.isArray(options.employeeNames) ? options.employeeNames : [];
  const departmentOptions = Array.isArray(options.departments) ? options.departments : [];
  const todayIso = String(options.todayIso || new Date().toISOString().slice(0, 10));
  const userMsg = [
    `Today: ${todayIso}`,
    `Allowed employee names: ${employeeOptions.join(", ") || "(none)"}`,
    `Allowed departments: ${departmentOptions.join(", ") || "(none)"}`,
    "",
    `User prompt: ${text}`,
  ].join("\n");
  try {
    const response = await callAnthropic(env, {
      model: "claude-sonnet-4-6",
      max_tokens: 700,
      system: REPORT_FILTER_PARSE_SYSTEM,
      messages: [{ role: "user", content: userMsg }],
    });
    const contentText = (response.content || []).find((b) => b.type === "text")?.text || "{}";
    const parsed = parseFirstJsonObject(contentText) || {};
    const normalized = normalizeReportFilterParse(parsed);
    const hasAnyField =
      normalized.employee_names.length ||
      normalized.departments.length ||
      normalized.date_start ||
      normalized.date_end ||
      (normalized.notes && normalized.notes.length > 0);
    if (hasAnyField) return normalized;
  } catch {}
  return heuristicParseReportFilters(text, options);
}

async function sendApprovalEmail(env, submission, recommendation, token) {
  if (!env.RESEND_API_KEY || !env.FINANCE_EMAIL) return;
  const baseUrl = env.BASE_URL || env.WORKER_PUBLIC_URL || "";
  const approveUrl = `${baseUrl}/api/approvals/decide?token=${encodeURIComponent(token)}&action=approve`;
  const denyUrl = `${baseUrl}/api/approvals/decide?token=${encodeURIComponent(token)}&action=deny`;
  const formattedAmount = formatCurrency(submission.parsed_amount);
  const html = `
  <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:2rem">
    <h2 style="color:#0f172a">Expense Pre-Approval Request</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:1.5rem">
      <tr><td style="padding:6px 0;color:#64748b;width:140px">Employee</td><td><strong>${escHtml(submission.parsed_name)}</strong> (${escHtml(
        submission.parsed_department
      )})</td></tr>
      <tr><td style="padding:6px 0;color:#64748b">Purpose</td><td>${escHtml(submission.parsed_purpose)}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b">Amount</td><td><strong>${escHtml(formattedAmount)}</strong></td></tr>
    </table>
    <div style="background:#f8fafc;border-radius:8px;padding:1.25rem;margin-bottom:1.5rem">
      <h3 style="margin:0 0 0.75rem;color:#0f172a">Recommendation</h3>
      <p style="margin:0;white-space:pre-wrap;color:#334155">${escHtml(recommendation)}</p>
    </div>
    <div style="display:flex;gap:12px">
      <a href="${approveUrl}" style="display:inline-block;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;text-decoration:none;background:#16a34a;color:#fff">✓ Approve</a>
      <a href="${denyUrl}" style="display:inline-block;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;text-decoration:none;background:#dc2626;color:#fff">✗ Deny</a>
    </div>
  </div>`;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: env.RESEND_FROM || "ExI Approvals <approvals@resend.dev>",
      to: [env.FINANCE_EMAIL],
      subject: `[Action Required] Expense Request — ${submission.parsed_name} — ${formattedAmount}`,
      html,
    }),
  });
}

async function sendExpenseReportPdfEmail(env, { to, filename, pdfBase64, counts, filters }) {
  if (!env.RESEND_API_KEY) return;
  const filterBits = [];
  if (filters?.employee) filterBits.push(`Employee: ${filters.employee}`);
  if (Array.isArray(filters?.departments) && filters.departments.length) {
    filterBits.push(`Departments: ${filters.departments.join(", ")}`);
  }
  if (filters?.date_start) filterBits.push(`From: ${filters.date_start}`);
  if (filters?.date_end) filterBits.push(`To: ${filters.date_end}`);
  const filterText = filterBits.length ? filterBits.join(" | ") : "No filters applied";
  const html = `
  <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:2rem">
    <h2 style="color:#0f172a;margin:0 0 0.5rem">Expense Request Report</h2>
    <p style="color:#334155;margin:0 0 0.9rem">Attached is your generated PDF report.</p>
    <ul style="margin:0;padding-left:1.2rem;color:#334155">
      <li><strong>Pending requests:</strong> ${Number(counts?.pending) || 0}</li>
      <li><strong>Completed requests:</strong> ${Number(counts?.completed) || 0}</li>
    </ul>
    <p style="margin-top:1rem;font-size:0.85rem;color:#64748b">${escHtml(filterText)}</p>
  </div>`;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: env.RESEND_FROM_REPORTS || env.RESEND_FROM || "ExI Reports <approvals@resend.dev>",
      to: [to],
      subject: `Expense request PDF (${Number(counts?.pending) || 0} pending, ${Number(counts?.completed) || 0} completed)`,
      html,
      attachments: [
        {
          filename: filename || "expense-request-report.pdf",
          content: String(pdfBase64 || ""),
        },
      ],
    }),
  });
}

function corsHeaders(request, env) {
  const reqOrigin = request.headers.get("Origin") || "";
  const rawAllowed = String(env.CORS_ORIGIN || "*").trim();
  const allowedList = rawAllowed
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  const allowsAll = allowedList.includes("*");
  const allowOrigin = allowsAll
    ? "*"
    : allowedList.includes(reqOrigin)
      ? reqOrigin
      : "";
  return {
    "Access-Control-Allow-Origin": allowOrigin || (allowsAll ? "*" : (allowedList[0] || "")),
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function jsonResponse(request, env, status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders(request, env) },
  });
}

function htmlResponse(request, env, status, html) {
  return new Response(html, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", ...corsHeaders(request, env) },
  });
}

async function parseBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function badRequest(request, env, error) {
  return jsonResponse(request, env, 400, { error });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }

    try {
      if (pathname === "/health" || pathname === "/api/health") {
        return jsonResponse(request, env, 200, { ok: true });
      }

      if (pathname === "/api/employees" && request.method === "GET") {
        const employees = await d1All(env, "SELECT id, name, department FROM employees ORDER BY name");
        return jsonResponse(request, env, 200, employees);
      }

      if (pathname === "/api/chat" && request.method === "POST") {
        const body = await parseBody(request);
        const message = String(body?.message || "");
        const session_id = String(body?.session_id || "");
        if (!message || !session_id) return badRequest(request, env, "message and session_id required");
        if (message.length > 4000) return badRequest(request, env, "Message too long (max 4000 characters).");
        const result = await runChatLoop(env, session_id, message);
        return jsonResponse(request, env, 200, result);
      }

      if (pathname === "/api/chat/saved-charts" && request.method === "GET") {
        const charts = await d1All(env, "SELECT * FROM saved_charts ORDER BY created_at DESC");
        return jsonResponse(request, env, 200, charts);
      }

      if (pathname === "/api/chat/saved-charts" && request.method === "POST") {
        const body = await parseBody(request);
        const { title, original_query, chart_config_json, ai_response } = body || {};
        if (!title || !chart_config_json) return badRequest(request, env, "title and chart_config_json required");
        const incomingSignature = getChartSignature(original_query || title, chart_config_json);
        const rows = await d1All(env, "SELECT id, title, original_query, chart_config_json FROM saved_charts");
        const existing = rows.find((row) => getChartSignature(row.original_query || row.title, row.chart_config_json) === incomingSignature);
        if (existing) return jsonResponse(request, env, 200, { saved: true, id: existing.id, alreadySaved: true });
        const r = await d1Run(
          env,
          "INSERT INTO saved_charts (title, original_query, chart_config_json, ai_response) VALUES (?, ?, ?, ?)",
          [title, original_query || title, chart_config_json, ai_response || null]
        );
        return jsonResponse(request, env, 200, { saved: true, id: r?.meta?.last_row_id });
      }

      if (pathname === "/api/chat/saved-charts" && request.method === "DELETE") {
        const body = await parseBody(request);
        const { title, original_query, chart_config_json } = body || {};
        if (!chart_config_json) return badRequest(request, env, "chart_config_json required");
        const signature = getChartSignature(original_query || title, chart_config_json);
        const rows = await d1All(env, "SELECT id, title, original_query, chart_config_json FROM saved_charts");
        const matches = rows.filter((row) => getChartSignature(row.original_query || row.title, row.chart_config_json) === signature);
        for (const row of matches) {
          await d1Run(env, "DELETE FROM saved_charts WHERE id = ?", [row.id]);
        }
        return jsonResponse(request, env, 200, { removed: true, count: matches.length });
      }

      if (/^\/api\/chat\/history\/[^/]+$/.test(pathname) && request.method === "GET") {
        const sessionId = decodeURIComponent(pathname.split("/").pop());
        const history = await d1All(
          env,
          "SELECT role, content, chart_config, created_at FROM conversation_history WHERE session_id = ? ORDER BY created_at ASC",
          [sessionId]
        );
        return jsonResponse(request, env, 200, history);
      }

      if (/^\/api\/chat\/history\/[^/]+$/.test(pathname) && request.method === "DELETE") {
        const sessionId = decodeURIComponent(pathname.split("/").pop());
        await d1Run(env, "DELETE FROM conversation_history WHERE session_id = ?", [sessionId]);
        return jsonResponse(request, env, 200, { cleared: true });
      }

      if (pathname === "/api/approvals/decide" && request.method === "GET") {
        const token = url.searchParams.get("token");
        const action = url.searchParams.get("action");
        if (!token || !["approve", "deny"].includes(action || "")) {
          return htmlResponse(request, env, 400, "Invalid link.");
        }
        const submission = await d1First(env, "SELECT * FROM submissions WHERE decision_token = ?", [token]);
        if (!submission) {
          return htmlResponse(
            request,
            env,
            200,
            `<html><body style="font-family:sans-serif;padding:2rem"><h2>Link already used or expired.</h2><p>Please check the web app for the current status.</p></body></html>`
          );
        }
        const status = action === "approve" ? "approved" : "denied";
        await d1Run(env, "UPDATE submissions SET status = ?, decided_at = datetime('now'), decision_token = NULL WHERE id = ?", [
          status,
          submission.id,
        ]);
        return htmlResponse(
          request,
          env,
          200,
          `<html><body style="font-family:sans-serif;padding:2rem;max-width:480px;margin:auto"><h2 style="color:${
            status === "approved" ? "#16a34a" : "#dc2626"
          }">Request ${status.charAt(0).toUpperCase() + status.slice(1)}</h2><p><strong>${escHtml(
            submission.parsed_name
          )}</strong>'s request for <strong>${escHtml(formatCurrency(submission.parsed_amount))}</strong> (${escHtml(
            submission.parsed_purpose
          )}) has been <strong>${status}</strong>.</p><p style="color:#6b7280;font-size:0.875rem">You can close this tab.</p></body></html>`
        );
      }

      if (pathname === "/api/approvals" && request.method === "GET") {
        const status = url.searchParams.get("status") || "pending";
        const rows =
          status === "all"
            ? await d1All(
                env,
                "SELECT s.*, e.name as emp_name, e.department as emp_dept FROM submissions s LEFT JOIN employees e ON s.employee_id = e.id ORDER BY s.created_at DESC"
              )
            : await d1All(
                env,
                "SELECT s.*, e.name as emp_name, e.department as emp_dept FROM submissions s LEFT JOIN employees e ON s.employee_id = e.id WHERE s.status = ? ORDER BY s.created_at DESC",
                [status]
              );
        return jsonResponse(request, env, 200, rows);
      }

      if (pathname === "/api/approvals/parse" && request.method === "POST") {
        const body = await parseBody(request);
        const raw_request = String(body?.raw_request || "").trim();
        if (!raw_request) return badRequest(request, env, "raw_request required");
        let parsed;
        try {
          parsed = await parseRequestAI(env, raw_request);
        } catch {
          parsed = normalizeParsedRequest({}, raw_request);
        }
        return jsonResponse(request, env, 200, parsed);
      }

      if (pathname === "/api/approvals" && request.method === "POST") {
        const body = await parseBody(request);
        const raw_request = String(body?.raw_request || "");
        if (!raw_request) return badRequest(request, env, "raw_request required");
        let parsed = null;
        const hasClientParsedName = String(body?.parsed_name || "").trim().length > 0;
        if (hasClientParsedName) {
          parsed = normalizeParsedRequest(
            {
              parsed_name: body?.parsed_name,
              parsed_department: body?.parsed_department,
              parsed_purpose: body?.parsed_purpose,
              parsed_amount: body?.parsed_amount,
            },
            raw_request
          );
        } else {
          try {
            parsed = await parseRequestAI(env, raw_request);
          } catch {
            parsed = normalizeParsedRequest({}, raw_request);
          }
        }
        const firstName = (parsed.parsed_name || "").split(" ")[0];
        const employee = await d1First(env, "SELECT * FROM employees WHERE name LIKE ? LIMIT 1", [`%${firstName}%`]);
        const token = crypto.randomUUID();
        const subInsert = await d1Run(
          env,
          "INSERT INTO submissions (employee_id, raw_request, parsed_name, parsed_department, parsed_purpose, parsed_amount, status, decision_token) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)",
          [
            employee?.id ?? null,
            raw_request,
            parsed.parsed_name,
            parsed.parsed_department !== "Unknown" ? parsed.parsed_department : employee?.department ?? "Unknown",
            parsed.parsed_purpose,
            parsed.parsed_amount,
            token,
          ]
        );
        const subId = subInsert?.meta?.last_row_id;
        const submission = await d1First(env, "SELECT * FROM submissions WHERE id = ?", [subId]);
        generateRecommendationAI(env, submission)
          .then(({ recommendation }) => sendApprovalEmail(env, submission, recommendation, token))
          .catch(() => {});
        return jsonResponse(request, env, 200, { success: true, id: subId, parsed });
      }

      if (/^\/api\/approvals\/\d+$/.test(pathname) && request.method === "GET") {
        const id = Number(pathname.split("/").pop());
        const submission = await d1First(env, "SELECT * FROM submissions WHERE id = ?", [id]);
        if (!submission) return jsonResponse(request, env, 404, { error: "Not found" });
        const { recommendation, shortNote } = await generateRecommendationAI(env, submission);
        return jsonResponse(request, env, 200, { ...submission, recommendation, shortNote });
      }

      if (/^\/api\/approvals\/\d+\/decide$/.test(pathname) && request.method === "POST") {
        const id = Number(pathname.split("/")[3]);
        const body = await parseBody(request);
        const action = String(body?.action || "");
        const note = body?.note || null;
        if (!["approved", "denied"].includes(action)) return badRequest(request, env, "action must be approved or denied");
        await d1Run(env, "UPDATE submissions SET status = ?, note = ?, decided_at = datetime('now'), decision_token = NULL WHERE id = ?", [
          action,
          note,
          id,
        ]);
        return jsonResponse(request, env, 200, { success: true, status: action });
      }

      if (pathname === "/api/compliance/violations" && request.method === "GET") {
        const violations = await d1All(
          env,
          `SELECT v.*, e.name as employee_name, e.department
           FROM violations v
           JOIN employees e ON v.employee_id = e.id
           ORDER BY CASE v.severity WHEN 'high' THEN 1 WHEN 'med' THEN 2 ELSE 3 END, v.amount DESC`
        );
        return jsonResponse(request, env, 200, violations);
      }

      if (pathname === "/api/compliance/leaderboard" && request.method === "GET") {
        const leaderboard = await d1All(
          env,
          `SELECT
             e.id, e.name as employee, e.department as dept,
             COUNT(v.id) as violations,
             COALESCE(SUM(v.amount), 0) as totalAmount,
             SUM(CASE WHEN v.severity = 'high' THEN 1 ELSE 0 END) as highCount,
             SUM(CASE WHEN v.severity = 'med'  THEN 1 ELSE 0 END) as medCount,
             SUM(CASE WHEN v.severity = 'low'  THEN 1 ELSE 0 END) as lowCount
           FROM employees e
           LEFT JOIN violations v ON e.id = v.employee_id
           GROUP BY e.id
           HAVING violations > 0
           ORDER BY violations DESC, totalAmount DESC`
        );
        return jsonResponse(request, env, 200, leaderboard);
      }

      if (pathname === "/api/compliance/scan" && request.method === "POST") {
        const summary = await runComplianceScanAI(env);
        return jsonResponse(request, env, 200, { success: true, summary });
      }

      if (pathname === "/api/reports/filters/meta" && request.method === "GET") {
        const employees = await d1All(env, "SELECT id, name, department FROM employees ORDER BY name ASC");
        const deptRows = await d1All(
          env,
          "SELECT DISTINCT department FROM employees WHERE department IS NOT NULL AND department != '' ORDER BY department ASC"
        );
        return jsonResponse(request, env, 200, {
          employees,
          departments: deptRows.map((d) => d.department),
        });
      }

      if (pathname === "/api/reports/filters/parse" && request.method === "POST") {
        const body = await parseBody(request);
        const prompt = String(body?.prompt || "").trim();
        const employees = await d1All(env, "SELECT name FROM employees ORDER BY name ASC");
        const deptRows = await d1All(
          env,
          "SELECT DISTINCT department FROM employees WHERE department IS NOT NULL AND department != '' ORDER BY department ASC"
        );
        const parsed = await parseReportFiltersAI(env, prompt, {
          employeeNames: employees.map((e) => e.name),
          departments: deptRows.map((d) => d.department),
          todayIso: new Date().toISOString().slice(0, 10),
        });
        return jsonResponse(request, env, 200, parsed);
      }

      if (pathname === "/api/reports/pdf" && request.method === "POST") {
        const body = await parseBody(request);
        const employeesMeta = await d1All(env, "SELECT id, name, department FROM employees ORDER BY name ASC");
        const departmentsMetaRows = await d1All(
          env,
          "SELECT DISTINCT department FROM employees WHERE department IS NOT NULL AND department != '' ORDER BY department ASC"
        );
        const departmentsMeta = departmentsMetaRows.map((d) => d.department);

        let parsed = { employee_names: [], departments: [], date_start: "", date_end: "", request_status: "all", notes: "" };
        if (String(body?.prompt || "").trim()) {
          parsed = await parseReportFiltersAI(env, body.prompt, {
            employeeNames: employeesMeta.map((e) => e.name),
            departments: departmentsMeta,
            todayIso: new Date().toISOString().slice(0, 10),
          });
        }
        const filters = normalizePdfFilters(body || {}, parsed);
        if (filters.date_start && filters.date_end && filters.date_start > filters.date_end) {
          return badRequest(request, env, "date_start must be before or equal to date_end.");
        }

        const employeeIds = await resolveEmployeeIdsForPdf(env, filters.employee_id, filters.employee_names);
        const selectedEmployee = employeesMeta.find((e) => Number(e.id) === Number(filters.employee_id));
        const employeeLabel = selectedEmployee?.name || filters.employee_names[0] || "";
        const pendingRows = await listSubmissionRows(env, filters, employeeIds, "pending");
        const completedRows = await listSubmissionRows(env, filters, employeeIds, "completed");

        const dateStamp = new Date().toISOString().slice(0, 10);
        const pdfBytes = buildStyledPdfBytes(pendingRows, completedRows, {
          employee_label: employeeLabel,
          departments: filters.departments,
          date_start: filters.date_start,
          date_end: filters.date_end,
        });
        const pdfBase64 = uint8ToBase64(pdfBytes);
        const filename = `expense-request-report-${dateStamp}.pdf`;
        const emailTo = sanitizeEmail(body?.email_to || "");
        let emailed = false;
        if (emailTo) {
          await sendExpenseReportPdfEmail(env, {
            to: emailTo,
            filename,
            pdfBase64,
            counts: { pending: pendingRows.length, completed: completedRows.length },
            filters: {
              employee: employeeLabel || "",
              departments: filters.departments,
              date_start: filters.date_start,
              date_end: filters.date_end,
            },
          });
          emailed = true;
        }

        return jsonResponse(request, env, 200, {
          filename,
          pdf_base64: pdfBase64,
          email_sent: emailed,
          counts: {
            pending: pendingRows.length,
            completed: completedRows.length,
            total: pendingRows.length + completedRows.length,
          },
          applied_filters: {
            employee_id: filters.employee_id,
            employee_label: employeeLabel || "",
            departments: filters.departments,
            date_start: filters.date_start,
            date_end: filters.date_end,
            prompt_notes: filters.notes,
          },
        });
      }

      if (pathname === "/api/reports" && request.method === "GET") {
        const status = url.searchParams.get("status") || "all";
        const base = `SELECT r.*, e.name as emp_name, e.department as emp_dept,
            COUNT(ri.id) as item_count
            FROM expense_reports r
            JOIN employees e ON r.employee_id = e.id
            LEFT JOIN expense_report_items ri ON ri.report_id = r.id`;
        const query = status === "all" ? `${base} GROUP BY r.id ORDER BY r.created_at DESC` : `${base} WHERE r.status = ? GROUP BY r.id ORDER BY r.created_at DESC`;
        const rows = status === "all" ? await d1All(env, query) : await d1All(env, query, [status]);
        return jsonResponse(request, env, 200, rows);
      }

      if (pathname === "/api/reports/generate" && request.method === "POST") {
        const body = await parseBody(request);
        const employee_id = Number(body?.employee_id);
        const date_start = String(body?.date_start || "");
        const date_end = String(body?.date_end || "");
        if (!employee_id || !date_start || !date_end) return badRequest(request, env, "employee_id, date_start, date_end required");
        if (!isIsoDate(date_start) || !isIsoDate(date_end)) return badRequest(request, env, "date_start and date_end must be YYYY-MM-DD.");
        if (date_start > date_end) return badRequest(request, env, "date_start must be before or equal to date_end.");
        const reportGroups = await generateReportsAI(env, employee_id, date_start, date_end);
        if (!Array.isArray(reportGroups) || reportGroups.length === 0) {
          return badRequest(request, env, "No report groups generated for this range.");
        }
        const created = [];
        for (const group of reportGroups) {
          const r = await d1Run(
            env,
            "INSERT INTO expense_reports (employee_id, title, date_range_start, date_range_end, total_amount, policy_summary) VALUES (?, ?, ?, ?, ?, ?)",
            [employee_id, group.title, group.date_range_start, group.date_range_end, group.total_amount, group.policy_summary]
          );
          const reportId = r?.meta?.last_row_id;
          created.push(reportId);
          for (const txId of group.transaction_ids || []) {
            await d1Run(env, "INSERT INTO expense_report_items (report_id, transaction_id) VALUES (?, ?)", [reportId, txId]);
          }
        }
        return jsonResponse(request, env, 200, { created: created.length, ids: created });
      }

      if (/^\/api\/reports\/\d+\/decide$/.test(pathname) && request.method === "POST") {
        const id = Number(pathname.split("/")[3]);
        const body = await parseBody(request);
        const action = String(body?.action || "");
        if (!["approved", "denied"].includes(action)) return badRequest(request, env, "action must be approved or denied");
        await d1Run(env, "UPDATE expense_reports SET status = ? WHERE id = ?", [action, id]);
        return jsonResponse(request, env, 200, { success: true, status: action });
      }

      return jsonResponse(request, env, 404, { error: "Not found" });
    } catch (err) {
      const msg = err?.message || "Unknown error";
      return jsonResponse(request, env, 500, { error: msg });
    }
  },
};
