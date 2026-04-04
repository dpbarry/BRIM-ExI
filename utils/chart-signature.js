function normalizeText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

function parseChartConfig(configInput) {
  if (configInput && typeof configInput === 'object') return configInput;
  if (typeof configInput !== 'string') return {};
  try {
    return JSON.parse(configInput);
  } catch {
    return {};
  }
}

function getChartSignature(originalQuery, chartConfigInput) {
  const normalizedQuery = normalizeText(originalQuery);
  const parsedConfig = parseChartConfig(chartConfigInput);
  const normalizedConfig = stableStringify(parsedConfig);
  return `${normalizedQuery}::${normalizedConfig}`;
}

module.exports = { getChartSignature };
