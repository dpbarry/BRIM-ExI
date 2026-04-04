-- Intentionally a no-op.
-- Existing remote databases may already contain these columns, and SQLite
-- does not support ALTER TABLE ... ADD COLUMN IF NOT EXISTS safely here.
-- Fresh databases get the columns from 0001_init.sql.
CREATE TABLE IF NOT EXISTS _migration_0002_noop_marker (
  id INTEGER PRIMARY KEY
);
DROP TABLE _migration_0002_noop_marker;
