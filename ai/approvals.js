// ai/approvals.js
const Anthropic = require('@anthropic-ai/sdk');
const { APPROVAL_TOOLS, executeTool } = require('./tools');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PARSE_SYSTEM = `You are an expense request parser. Extract structured information from a free-text employee expense request.
Return a JSON object with these exact keys:
- parsed_name: string (employee's full name)
- parsed_department: string (department if mentioned, otherwise "Unknown")
- parsed_purpose: string (concise description of what the expense is for)
- parsed_amount: number (dollar amount, or 0 if not specified)

Return ONLY valid JSON, no other text.`;

const CONTEXT_SYSTEM = `You are an AI expense advisor for a finance team. Given a pre-approval request, gather context and provide a recommendation.

Steps:
1. Use get_schema and run_query to find the employee in the database by name
2. Use get_employee_history to get their recent transactions and violation history
3. Use get_department_budget to check the department's current budget status
4. Use get_policy_rules to verify if the request aligns with policy
5. Return a structured recommendation with:
   - A context summary (2-3 sentences about the employee and their history)
   - Budget status (remaining budget in their department)
   - Violation history summary
   - Clear APPROVE or DENY recommendation with reasoning
   - A short note (1 sentence) suitable for the approval record`;

async function parseRequest(rawRequest) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    system: PARSE_SYSTEM,
    messages: [{ role: 'user', content: rawRequest }],
  });
  const text = response.content.find(b => b.type === 'text')?.text || '{}';
  try {
    return JSON.parse(text);
  } catch {
    return { parsed_name: 'Unknown', parsed_department: 'Unknown', parsed_purpose: rawRequest.slice(0, 100), parsed_amount: 0 };
  }
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

  const text = response.content.find(b => b.type === 'text')?.text || '';
  const noteMatch = text.match(/note[:\s]+([^.!?\n]+[.!?])/i);
  const shortNote = noteMatch ? noteMatch[1].trim() : text.split(/[.!?]/)[0].trim() + '.';

  return { recommendation: text, shortNote };
}

module.exports = { parseRequest, generateRecommendation };
