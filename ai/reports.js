const Anthropic = require('@anthropic-ai/sdk');
const { REPORT_TOOLS, executeTool } = require('./tools');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are an expense report generator for an SMB finance team.
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

async function generateReports(employeeId, dateStart, dateEnd) {
  const userMsg = `Generate expense reports for employee ID ${employeeId} for transactions between ${dateStart} and ${dateEnd}.`;
  const messages = [{ role: 'user', content: userMsg }];
  let response;
  let iterations = 0;

  while (iterations < 15) {
    iterations++;
    response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: REPORT_TOOLS,
      messages,
    });

    if (response.stop_reason === 'end_turn') break;

    if (response.stop_reason === 'tool_use') {
      messages.push({ role: 'assistant', content: response.content });
      const toolResults = response.content
        .filter(b => b.type === 'tool_use')
        .map(b => ({
          type: 'tool_result',
          tool_use_id: b.id,
          content: JSON.stringify(executeTool(b.name, b.input)),
        }));
      messages.push({ role: 'user', content: toolResults });
    } else {
      break;
    }
  }

  const text = response.content.find(b => b.type === 'text')?.text || '[]';
  return JSON.parse(text);
}

module.exports = { generateReports };
