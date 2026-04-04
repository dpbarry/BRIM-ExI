// ai/compliance.js
const Anthropic = require('@anthropic-ai/sdk');
const { COMPLIANCE_TOOLS, executeTool } = require('./tools');
const { getDb } = require('../db');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a compliance officer AI for an SMB expense management platform. Your job is to scan employee transactions against company expense policy and flag violations.

Instructions:
1. Use get_policy_rules() to load all rules
2. Use run_query() to fetch recent transactions per employee (last 60 days)
3. Analyse each employee's transactions as a cluster — look for patterns, not just individual amounts
4. Flag violations using flag_violation() — be contextually aware:
   - Two charges of $490 at the same vendor on the same day is likely split-purchase fraud
   - Hotel bookings direct (MCC 7011) may violate the travel portal requirement
5. Only flag clear violations — do not flag ambiguous transactions
6. After scanning, return a brief summary of what you found`;

const MAX_ITERATIONS = 12;

async function runComplianceScan() {
  const db = getDb();
  const scanned = db.prepare('SELECT DISTINCT transaction_id FROM violations').all();
  const scannedIds = scanned.map(r => r.transaction_id);
  const exclusionNote = scannedIds.length > 0
    ? `\n\nThese transaction IDs are already flagged — do NOT re-flag them: [${scannedIds.join(', ')}]. Focus only on transactions NOT in this list.`
    : '';

  const messages = [{ role: 'user', content: `Please run a compliance scan on employee transactions from the last 60 days.${exclusionNote}` }];

  let response;
  let iterations = 0;

  while (iterations < MAX_ITERATIONS) {
    iterations++;
    response = await client.messages.create(
      {
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools: COMPLIANCE_TOOLS,
        messages,
      },
      { timeout: 120000 }
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

  const textBlock = response.content.find(b => b.type === 'text');
  return textBlock ? textBlock.text : 'Compliance scan complete.';
}

module.exports = { runComplianceScan };
