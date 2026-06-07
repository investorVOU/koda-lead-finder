/**
 * Run all Supabase migrations in order against the linked project.
 * Uses the EU West session pooler (IPv4) since the direct DB host is IPv6 only.
 *
 * Usage: node scripts/migrate.mjs
 */
import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const client = new pg.Client({
  host: "aws-0-eu-west-1.pooler.supabase.com",
  port: 5432,
  database: "postgres",
  user: "postgres.hpfirxvqvyfnijocohga",
  password: "high)Jg@gxV-447",
  ssl: { rejectUnauthorized: false },
});

const migrationsDir = path.join(__dirname, "../supabase/migrations");
const files = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

console.log(`\nConnecting to Supabase...`);
await client.connect();
console.log(`✓ Connected\n`);
console.log(`Found ${files.length} migration file(s):\n`);
files.forEach((f) => console.log("  •", f));
console.log("");

for (const file of files) {
  const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
  process.stdout.write(`Running ${file} ... `);
  try {
    await client.query(sql);
    console.log("✓");
  } catch (err) {
    const isExists =
      err.code === "42710" ||
      err.code === "42P07" ||
      err.code === "42723" ||
      err.message?.includes("already exists");
    if (isExists) {
      console.log(`⚠ skipped (already exists)`);
    } else {
      console.log(`✗\n\nError: ${err.message}`);
      await client.end();
      process.exit(1);
    }
  }
}

await client.end();
console.log("\n✓ All migrations complete.");
