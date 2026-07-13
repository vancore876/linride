import { readFile } from "node:fs/promises";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;
const migrationPath = process.argv[2];

if (!connectionString || !migrationPath) {
  console.error("Usage: DATABASE_URL=... node scripts/run-migration.mjs <migration.sql>");
  process.exit(1);
}

const sql = await readFile(migrationPath, "utf8");
const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000
});

try {
  await client.connect();
  await client.query("begin");
  await client.query(sql);
  await client.query("commit");
  console.log(`Applied ${migrationPath}`);
} catch (error) {
  await client.query("rollback").catch(() => undefined);
  console.error("MIGRATION_FAILED:", error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
