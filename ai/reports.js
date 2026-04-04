const Anthropic = require('@anthropic-ai/sdk');
const { REPORT_TOOLS, executeTool } = require('./tools');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PARSE_FILTERS_PROMPT = `You extract optional expense-report filters from natural language.
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

function parseJsonObject(rawText) {
  const text = String(rawText || '').trim();
  const stripped = text
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  const attempts = [stripped];
  const firstBrace = stripped.indexOf('{');
  const lastBrace = stripped.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    attempts.push(stripped.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of attempts) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch {}
  }
  throw new Error('Model returned invalid filter JSON.');
}

function normalizeFilters(raw) {
  const employee_names = Array.isArray(raw?.employee_names)
    ? raw.employee_names.map((s) => String(s || '').trim()).filter(Boolean)
    : [];
  const departments = Array.isArray(raw?.departments)
    ? raw.departments.map((s) => String(s || '').trim()).filter(Boolean)
    : [];
  const date_start = String(raw?.date_start || '').trim();
  const date_end = String(raw?.date_end || '').trim();
  const statusRaw = String(raw?.request_status || 'all').trim().toLowerCase();
  const request_status = ['pending', 'completed', 'all'].includes(statusRaw) ? statusRaw : 'all';
  const notes = String(raw?.notes || '').trim();
  return { employee_names, departments, date_start, date_end, request_status, notes };
}

function parseJsonArray(rawText) {
  const text = String(rawText || '').trim();
  const stripped = text
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  const attempts = [stripped];
  const firstBracket = stripped.indexOf('[');
  const lastBracket = stripped.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    attempts.push(stripped.slice(firstBracket, lastBracket + 1));
  }

  for (const candidate of attempts) {
    try {
      const parsed = JSON.parse(candidate);
      if (!Array.isArray(parsed)) continue;
      return parsed.map((group) => ({
        title: String(group?.title || 'Expense Report').trim() || 'Expense Report',
        date_range_start: String(group?.date_range_start || '').trim(),
        date_range_end: String(group?.date_range_end || '').trim(),
        total_amount: Number(group?.total_amount) || 0,
        policy_summary: String(group?.policy_summary || '').trim(),
        transaction_ids: Array.isArray(group?.transaction_ids)
          ? group.transaction_ids.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)
          : [],
      }));
    } catch {}
  }
  throw new Error('Model returned invalid report JSON.');
}

async function parseReportFilters(prompt, options = {}) {
  const text = String(prompt || '').trim();
  if (!text) {
    return {
      employee_names: [],
      departments: [],
      date_start: '',
      date_end: '',
      request_status: 'all',
      notes: '',
    };
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      employee_names: [],
      departments: [],
      date_start: '',
      date_end: '',
      request_status: 'all',
      notes: '',
    };
  }

  const employeeOptions = Array.isArray(options.employeeNames) ? options.employeeNames : [];
  const departmentOptions = Array.isArray(options.departments) ? options.departments : [];
  const todayIso = String(options.todayIso || new Date().toISOString().slice(0, 10));

  const userMsg = [
    `Today: ${todayIso}`,
    `Allowed employee names: ${employeeOptions.join(', ') || '(none)'}`,
    `Allowed departments: ${departmentOptions.join(', ') || '(none)'}`,
    '',
    `User prompt: ${text}`,
  ].join('\n');

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 700,
    system: PARSE_FILTERS_PROMPT,
    messages: [{ role: 'user', content: userMsg }],
  });

  const contentText = response.content.find((b) => b.type === 'text')?.text || '{}';
  return normalizeFilters(parseJsonObject(contentText));
}

async function generateReports(employeeId, dateStart, dateEnd) {
  const userMsg = `Generate expense reports for employee ID ${employeeId} for transactions between ${dateStart} and ${dateEnd}.`;
  const messages = [{ role: 'user', content: userMsg }];
  let response;
  let iterations = 0;

  while (iterations < 15) {
    iterations++;
    response = await client.messages.create(
      {
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: REPORTS_SYSTEM_PROMPT,
        tools: REPORT_TOOLS,
        messages,
      },
      { timeout: 60000 }
    );

    if (response.stop_reason === 'end_turn') break;

    if (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter((b) => b.type === 'tool_use');
      messages.push({ role: 'assistant', content: response.content });
      const toolResults = toolUseBlocks.map((block) => ({
        type: 'tool_result',
        tool_use_id: block.id,
        content: JSON.stringify(executeTool(block.name, block.input)),
      }));
      messages.push({ role: 'user', content: toolResults });
      continue;
    }
    break;
  }

  const contentText = response.content.find((b) => b.type === 'text')?.text || '[]';
  return parseJsonArray(contentText);
}

module.exports = { parseReportFilters, generateReports };
