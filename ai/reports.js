const Anthropic = require('@anthropic-ai/sdk');

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

module.exports = { parseReportFilters };
