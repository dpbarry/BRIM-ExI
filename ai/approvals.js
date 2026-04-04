// ai/approvals.js
const Anthropic = require('@anthropic-ai/sdk');
const { APPROVAL_TOOLS, executeTool } = require('./tools');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 5 });

const PARSE_SYSTEM = `You are an expense request parser. Extract structured information from a free-text employee expense request.
Return a JSON object with these exact keys:
- parsed_name: string (employee's full name; if they say "I'm John" or "My name is Jane", use that name)
- parsed_department: string (department if mentioned, otherwise "Unknown")
- parsed_purpose: string (concise description of what the expense is for)
- parsed_amount: number (numeric dollar amount only — no $ sign, no commas; e.g. "$1,200" → 1200, "1200 CAD" → 1200, "five hundred dollars" → 500; use 0 only if truly no amount is mentioned)

Return ONLY valid JSON with no markdown, no code fences, no extra text.`;

const CONTEXT_SYSTEM = `You are a finance AI reviewing pre-approval expense requests.

Use tools as needed: get_schema, run_query (to locate the employee), get_employee_history, get_department_budget, get_policy_rules. Use tools for facts only—do not paste tool JSON or long raw query results into your answer.

When finished, reply with exactly ONE plain-text paragraph and nothing else—no labels, no second section, no "note" line.

The paragraph must:
- Open with exactly "Recommend APPROVE." or "Recommend DENY." (including the period), then continue immediately.
- Add only the most important facts (max 3 facts): policy fit/mismatch, amount vs threshold or budget, and risk history only if decisive.
- Be concise and direct: 2-3 short sentences total, under 65 words.
- Do not include process language (for example: "I now have everything needed", "analysis", "key findings", or "based on my review").

Never output: RECOMMENDATION:, NOTE:, Analysis, headings, lists, markdown (** or #), emojis, or multiple paragraphs.`;

function stripCodeFences(value) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
}

function sanitizePlainParagraph(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let s = raw.replace(/\r\n/g, '\n').trim();
  s = s.replace(/```[\s\S]*?```/g, ' ');
  s = s.replace(/^#{1,6}\s*[^\n]+\n?/gm, ' ');
  s = s.replace(/\*\*([^*]+)\*\*/g, '$1');
  s = s.replace(/\*([^*\n]+)\*/g, '$1');
  s = s.replace(/`([^`]+)`/g, '$1');
  s = s.replace(/^\s*[-*•]\s+/gm, '');
  s = s.replace(/^\s*\d+\.\s+/gm, '');
  s = s.replace(/[✓✗✅❌📜]+/gu, '');
  s = s.replace(/\s+/g, ' ').trim();
  if (s.length > 900) {
    s = `${s.slice(0, 900).replace(/\s+\S*$/, '')}…`;
  }
  return s;
}

function compactRecommendation(raw) {
  let s = sanitizePlainParagraph(raw);
  s = s.replace(/^i now have everything needed[^.?!]*[.?!]\s*/i, '');
  s = s.replace(/^based on (my|the) review[^.?!]*[.?!]\s*/i, '');
  s = s.replace(/^key findings:\s*/i, '');
  s = s.replace(/^overall,\s*/i, '');

  const sentenceMatches = s
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map((x) => x.trim())
    .filter(Boolean);
  let selected = sentenceMatches.slice(0, 3);
  let limited = selected.join(' ');
  if (!limited) limited = s.trim();

  if (!/^Recommend (APPROVE|DENY)\./i.test(limited)) {
    const denySignal = /\b(deny|reject|decline|fails?|violation|mismatch|over(?:\s|-)?budget|retroactive|non[- ]compliant)\b/i.test(limited);
    limited = `${denySignal ? 'Recommend DENY.' : 'Recommend APPROVE.'} ${limited}`.trim();
  }

  // If we accidentally stop on a dangling amount token, include one more sentence.
  if (/\$\d[\d,]*(?:\.\d{1,2})?\.$/.test(limited) && sentenceMatches.length > selected.length) {
    limited = `${limited} ${sentenceMatches[selected.length]}`.trim();
  }

  if (limited.length > 420) {
    limited = limited.slice(0, 420).replace(/\s+\S*$/, '').trim();
  }
  if (!/[.!?]$/.test(limited)) limited = `${limited}.`;
  return limited;
}

function parseRecommendationOutput(text) {
  let full = String(text || '').trim();
  const recMatch = full.match(/RECOMMENDATION\s*:\s*([\s\S]*?)(?=\n\s*NOTE\s*:|$)/i);
  const noteMatch = full.match(/\bNOTE\s*:\s*([\s\S]+)$/i);
  if (recMatch || noteMatch) {
    const parts = [recMatch?.[1]?.trim(), noteMatch?.[1]?.trim()].filter(Boolean);
    full = parts.join(' ');
  } else {
    full = full.replace(/^\s*RECOMMENDATION\s*:\s*/i, '').replace(/^\s*NOTE\s*:\s*/i, '').trim();
  }
  full = compactRecommendation(full);
  if (!full) full = 'No recommendation generated.';
  return { recommendation: full, shortNote: full };
}

function parseFirstJsonObject(value) {
  const stripped = stripCodeFences(value);
  try {
    return JSON.parse(stripped);
  } catch {}

  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(stripped.slice(start, end + 1));
  } catch {
    return null;
  }
}

function extractFallbackAmount(rawRequest) {
  const text = String(rawRequest || '');
  const patterns = [
    /\$\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)/i,
    /\b([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)\s*(?:cad|usd|dollars?)\b/i,
    /\bamount\s*(?:is|of|:)?\s*\$?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const numeric = Number(match[1].replace(/,/g, ''));
    if (Number.isFinite(numeric) && numeric >= 0) return numeric;
  }
  return 0;
}

function normalizeParsedRequest(parsed, rawRequest) {
  const fallbackAmount = extractFallbackAmount(rawRequest);
  const amount = Number(parsed?.parsed_amount);
  const safeAmount =
    Number.isFinite(amount) && amount > 0
      ? amount
      : fallbackAmount;

  return {
    parsed_name: String(parsed?.parsed_name || 'Unknown').trim() || 'Unknown',
    parsed_department: String(parsed?.parsed_department || 'Unknown').trim() || 'Unknown',
    parsed_purpose:
      String(parsed?.parsed_purpose || '').trim() ||
      String(rawRequest || '').slice(0, 140) ||
      'Expense request',
    parsed_amount: safeAmount,
  };
}

async function parseRequest(rawRequest) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    system: PARSE_SYSTEM,
    messages: [{ role: 'user', content: rawRequest }],
  });
  const text = response.content.find(b => b.type === 'text')?.text || '{}';
  const parsed = parseFirstJsonObject(text);
  return normalizeParsedRequest(parsed, rawRequest);
}

async function generateRecommendation(submission) {
  const userMsg = `Please review this expense request and provide a recommendation:

Employee: ${submission.parsed_name} (${submission.parsed_department})
Purpose: ${submission.parsed_purpose}
Amount: $${submission.parsed_amount}

Original request: "${submission.raw_request}"`;

  const messages = [{ role: 'user', content: userMsg }];
  let response;
  let iterations = 0;

  while (iterations < 15) {
    iterations++;
    response = await client.messages.create(
      {
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: CONTEXT_SYSTEM,
        tools: APPROVAL_TOOLS,
        messages,
      },
      { timeout: 60000 }
    );

    if (response.stop_reason === 'end_turn') break;

    if (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');
      messages.push({ role: 'assistant', content: response.content });
      const toolResults = toolUseBlocks.map(block => ({
        type: 'tool_result',
        tool_use_id: block.id,
        content: JSON.stringify(executeTool(block.name, block.input)),
      }));
      messages.push({ role: 'user', content: toolResults });
    } else {
      break;
    }
  }

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('\n\n')
    .trim();
  return parseRecommendationOutput(text);
}

module.exports = { parseRequest, generateRecommendation };
