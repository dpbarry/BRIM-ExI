const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DB_BASE = path.join(ROOT, "exi.db");
const DB_FILES = [DB_BASE, `${DB_BASE}-shm`, `${DB_BASE}-wal`];

function removeIfExists(filePath) {
  if (!fs.existsSync(filePath)) return;
  fs.rmSync(filePath, { force: true });
  console.log(`Removed ${path.basename(filePath)}`);
}

async function main() {
  for (const filePath of DB_FILES) removeIfExists(filePath);

  const { initDb } = require("../db");
  const { runSeed } = require("../seed");

  initDb();
  await runSeed();

  console.log("Local server database rebuilt and seeded.");
}

main().catch((err) => {
  console.error("Failed to rebuild local database:", err);
  process.exit(1);
});
