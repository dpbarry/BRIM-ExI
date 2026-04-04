const Anthropic = require('@anthropic-ai/sdk');
const { getDb } = require('../db');
const { CHAT_TOOLS, executeTool } = require('./tools');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are ExI, a financial intelligence assistant for a corporate finance team. You have access to a SQLite expense database.

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
- Currency: all amounts are pre-normalized to CAD. Use the amount column directly — do not apply conversion_rate.
- Employees: John Smith, Sarah Chen, Marcus Webb, Dylan Park, Priya Nair, James Okafor, Aisha Mensah, Tom Vasquez, Kenji Tanaka, Rachel Torres.
- Departments: Sales, Marketing, Engineering, Logistics, Finance, Operations, HR.`;

function buildApexConfig({ chart_type, title, subtitle, categories = [], series = [], value_prefix = '', value_suffix = '' }) {
  const PALETTE = ['#00b8e6', '#0082ad', '#5bc4de', '#34d399', '#f59e0b', '#f87171', '#a78bfa', '#88d4ec'];
  const isDonut = chart_type === 'donut';
  const isHorizontal = chart_type === 'horizontalBar';
  const isLine = chart_type === 'line' || chart_type === 'area';

  const fmtTooltip = (val) => {
    if (typeof val !== 'number' || isNaN(val)) return String(val);
    return `${value_prefix}${val.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${value_suffix}`;
  };

  const fmtAxis = (val) => {
    if (typeof val !== 'number' || isNaN(val)) return String(val);
    const abs = Math.abs(val);
    let str;
    if (abs >= 1_000_000) str = (val / 1_000_000).toFixed(1) + 'M';
    else if (abs >= 1_000) str = (val / 1_000).toFixed(1) + 'k';
    else str = val.toLocaleString('en-CA', { maximumFractionDigits: 1 });
    return `${value_prefix}${str}${value_suffix}`;
  };

  const base = {
    chart: {
      type: isDonut ? 'donut' : isHorizontal ? 'bar' : chart_type,
      height: 300,
      toolbar: { show: false },
      fontFamily: 'inherit',
      animations: { enabled: true, speed: 380, animateGradually: { enabled: false } },
      background: 'transparent',
    },
    colors: PALETTE,
    title: {
      text: title || '',
      style: { fontSize: '13px', fontWeight: '600' },
    },
    ...(subtitle ? { subtitle: { text: subtitle, style: { fontSize: '11px' } } } : {}),
    dataLabels: { enabled: false },
    grid: { borderColor: 'rgba(130,130,130,0.12)', strokeDashArray: 3 },
    tooltip: { y: { formatter: fmtTooltip } },
    legend: { fontSize: '12px' },
    // _meta is ignored by ApexCharts but used by the frontend to re-apply
    // formatters after JSON round-trip (functions are stripped by JSON.stringify)
    _meta: { value_prefix, value_suffix, chart_type },
  };

  if (isDonut) {
    return {
      ...base,
      series: series[0]?.data ?? [],
      labels: categories,
      legend: { position: 'bottom', fontSize: '12px' },
      plotOptions: { pie: { donut: { size: '60%' } } },
      dataLabels: {
        enabled: true,
        formatter: (val) => `${Number(val).toFixed(1)}%`,
        style: { fontSize: '11px' },
        dropShadow: { enabled: false },
      },
      tooltip: { y: { formatter: fmtTooltip } },
    };
  }

  if (isHorizontal) {
    return {
      ...base,
      series: series.map(s => ({ name: s.name, data: s.data })),
      xaxis: {
        categories,
        labels: { formatter: fmtAxis, style: { fontSize: '11px' } },
      },
      yaxis: { labels: { style: { fontSize: '12px' } } },
      plotOptions: { bar: { horizontal: true, borderRadius: 3, barHeight: '55%' } },
    };
  }

  return {
    ...base,
    series: series.map(s => ({ name: s.name, data: s.data })),
    xaxis: {
      categories,
      labels: {
        style: { fontSize: '11px' },
        rotate: categories.length > 7 ? -35 : 0,
        rotateAlways: false,
      },
    },
    yaxis: { labels: { formatter: fmtAxis } },
    ...(isLine ? {} : {
      plotOptions: { bar: { borderRadius: 4, columnWidth: categories.length > 7 ? '75%' : '52%' } },
    }),
    stroke: isLine ? { curve: 'smooth', width: 2.5 } : { show: false },
    ...(chart_type === 'area' ? {
      fill: {
        type: 'gradient',
        gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.04, stops: [0, 100] },
      },
    } : {}),
    ...(isLine ? { markers: { size: 4, hover: { size: 6 } } } : {}),
  };
}

async function runChatLoop(sessionId, userMessage) {
  const db = getDb();

  const history = db.prepare(
    'SELECT role, content FROM conversation_history WHERE session_id = ? ORDER BY created_at ASC'
  ).all(sessionId);

  const messages = [
    ...history.map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: userMessage },
  ];

  let response;
  let iterations = 0;
  const MAX_ITERATIONS = 12;
  let capturedChartSpec = null;

  while (iterations < MAX_ITERATIONS) {
    iterations++;
    response = await client.messages.create(
      {
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        tools: CHAT_TOOLS,
        messages,
      },
      { timeout: 60000 }
    );

    if (response.stop_reason === 'end_turn') break;

    if (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');
      messages.push({ role: 'assistant', content: response.content });

      const toolResults = toolUseBlocks.map(block => {
        // Intercept produce_chart — capture it, acknowledge it, don't execute
        if (block.name === 'produce_chart') {
          if (!capturedChartSpec) capturedChartSpec = block.input;
          return {
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify({ rendered: true }),
          };
        }
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
  let text = (textBlock?.text || '').trim();

  if (!text) {
    text = iterations >= MAX_ITERATIONS
      ? "I wasn't able to complete this analysis. Please try a more specific question."
      : "I couldn't find an answer for that. Try rephrasing your question.";
  }

  // Build a complete, validated ApexCharts config from the structured spec
  let chartConfig = null;
  if (capturedChartSpec) {
    try {
      chartConfig = buildApexConfig(capturedChartSpec);
    } catch {
      chartConfig = null;
    }
  }

  // Persist — store clean text and chart config separately
  const chartJson = chartConfig ? JSON.stringify(chartConfig) : null;
  db.prepare(
    'INSERT INTO conversation_history (session_id, role, content) VALUES (?, ?, ?)'
  ).run(sessionId, 'user', userMessage);
  db.prepare(
    'INSERT INTO conversation_history (session_id, role, content, chart_config) VALUES (?, ?, ?, ?)'
  ).run(sessionId, 'assistant', text, chartJson);

  return { text, chartConfig };
}

module.exports = { runChatLoop };
