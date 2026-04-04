const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const ROOT = path.resolve(__dirname, "..");
const DB_PATH = path.join(ROOT, "exi.db");
const OUT_DIR = path.join(ROOT, "cloudflare-worker", "seed");
const OUT_PATH = path.join(OUT_DIR, "seed-data.sql");

const TABLES = [
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

function sqlLiteral(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "boolean") return value ? "1" : "0";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function main() {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`Missing database: ${DB_PATH}`);
  }
  const db = new Database(DB_PATH, { readonly: true });
  const lines = [];

  for (const table of [...TABLES].reverse()) {
    lines.push(`DELETE FROM ${table};`);
  }

  for (const table of TABLES) {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
    const rows = db.prepare(`SELECT * FROM ${table}`).all();
    if (!rows.length) continue;
    const colSql = cols.map((c) => `"${c}"`).join(", ");
    for (const row of rows) {
      const valSql = cols.map((c) => sqlLiteral(row[c])).join(", ");
      lines.push(`INSERT INTO ${table} (${colSql}) VALUES (${valSql});`);
    }
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_PATH, lines.join("\n"), "utf8");
  db.close();
  console.log(`Wrote ${OUT_PATH}`);
}

main();
