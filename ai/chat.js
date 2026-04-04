const Anthropic = require('@anthropic-ai/sdk');
const { getDb } = require('../db');
const { CHAT_TOOLS, executeTool } = require('./tools');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are ExI, an AI-powered expense intelligence assistant for a financial team. You have access to a company's full transaction history, employee records, policy rules, and department budgets in a SQLite database.

When answering questions:
1. First use get_schema to understand relevant tables
2. Use run_query to fetch exactly the data needed — craft precise SQL
3. Always respond with BOTH a text summary AND an ApexCharts configuration when the answer involves numbers or comparisons
4. For the chart, choose the most appropriate type: bar for comparisons, pie/donut for proportions, line for trends over time
5. Return the ApexCharts config as valid JSON in a code block tagged \`\`\`apexcharts

Important data notes:
- Dates stored as YYYY-MM-DD strings. Data covers Aug 2025 – Mar 2026.
- Currency: conversion_rate = 0 means amount is already CAD; otherwise multiply amount × conversion_rate to get CAD.
- Always convert to CAD when summing across currencies.
- Employee names: John Smith, Sarah Chen, Marcus Webb, Dylan Park, Priya Nair, James Okafor, Aisha Mensah, Tom Vasquez, Kenji Tanaka, Rachel Torres
- Departments: Sales, Marketing, Engineering, Logistics, Finance, Operations, HR`;

async function runChatLoop(sessionId, userMessage) {
  const db = getDb();

  // Load conversation history
  const history = db.prepare(
    'SELECT role, content FROM conversation_history WHERE session_id = ? ORDER BY created_at ASC'
  ).all(sessionId);

  const messages = [
    ...history.map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: userMessage },
  ];

  // Agentic loop
  let response;
  let iterations = 0;
  const MAX_ITERATIONS = 15;

  while (iterations < MAX_ITERATIONS) {
    iterations++;
    response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: CHAT_TOOLS,
      messages,
    });

    if (response.stop_reason === 'end_turn') break;

    if (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');
      messages.push({ role: 'assistant', content: response.content });

      const toolResults = toolUseBlocks.map(block => {
        let result;
        try {
          result = executeTool(block.name, block.input);
        } catch (err) {
          result = { error: err.message };
        }
        return {
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(result),
        };
      });
      messages.push({ role: 'user', content: toolResults });
    } else {
      break;
    }
  }

  const textBlock = response.content.find(b => b.type === 'text');
  const rawText = textBlock ? textBlock.text : '';

  // Extract ApexCharts config if present
  let chartConfig = null;
  const chartMatch = rawText.match(/```apexcharts\s*([\s\S]*?)```/);
  if (chartMatch) {
    try {
      chartConfig = JSON.parse(chartMatch[1].trim());
    } catch {
      chartConfig = null;
    }
  }

  // Strip the apexcharts code block from the displayed text
  const cleanText = rawText.replace(/```apexcharts[\s\S]*?```/g, '').trim();

  // Persist conversation
  db.prepare('INSERT INTO conversation_history (session_id, role, content) VALUES (?, ?, ?)').run(sessionId, 'user', userMessage);
  db.prepare('INSERT INTO conversation_history (session_id, role, content) VALUES (?, ?, ?)').run(sessionId, 'assistant', rawText);

  return { text: cleanText, chartConfig };
}

module.exports = { runChatLoop };
