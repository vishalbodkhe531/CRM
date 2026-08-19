import crypto from "crypto";
import fs from "fs";
import path from "path";
import { Client } from "pg";
import { env } from "../config/env";

const MIGRATIONS_DIR = path.resolve(__dirname, "../../prisma/migrations");

/** Pooler in session mode: transaction mode cannot run DDL transactions. */
const sessionUrl = (env.DATABASE_URL ?? "")
  .replace(":6543", ":5432")
  .replace(/\?pgbouncer=true/, "");

async function main() {
  const client = new Client({ connectionString: sessionUrl });
  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        "id"                    VARCHAR(36) PRIMARY KEY NOT NULL,
        "checksum"              VARCHAR(64) NOT NULL,
        "finished_at"           TIMESTAMPTZ,
        "migration_name"        VARCHAR(255) NOT NULL,
        "logs"                  TEXT,
        "rolled_back_at"        TIMESTAMPTZ,
        "started_at"            TIMESTAMPTZ NOT NULL DEFAULT now(),
        "applied_steps_count"   INTEGER NOT NULL DEFAULT 0
      );
    `);

    const applied = await client.query<{ migration_name: string }>(
      `SELECT migration_name FROM "_prisma_migrations" WHERE rolled_back_at IS NULL`,
    );
    const appliedNames = new Set(applied.rows.map((row) => row.migration_name));

    const all = fs
      .readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();

    const pending = all.filter((name) => {
      const sqlPath = path.join(MIGRATIONS_DIR, name, "migration.sql");
      return !appliedNames.has(name) && fs.existsSync(sqlPath);
    });

    if (!pending.length) {
      console.log("No pending migrations.");
      return;
    }

    for (const name of pending) {
      const sqlPath = path.join(MIGRATIONS_DIR, name, "migration.sql");
      const sql = fs.readFileSync(sqlPath, "utf8");
      const checksum = crypto.createHash("sha256").update(sql).digest("hex");

      process.stdout.write(`Applying ${name} ... `);

      // DDL plus its bookkeeping row commit together, so a failure cannot leave
      // the database changed but unrecorded.
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          `INSERT INTO "_prisma_migrations"
             (id, checksum, migration_name, started_at, finished_at, applied_steps_count)
           VALUES ($1, $2, $3, now(), now(), 1)`,
          [crypto.randomUUID(), checksum, name],
        );
        await client.query("COMMIT");
        console.log("done");
      } catch (error) {
        await client.query("ROLLBACK");
        console.log("FAILED");
        throw error;
      }
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
