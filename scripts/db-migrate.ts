import "dotenv/config";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import mysql from "mysql2/promise";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

async function main() {
  const host = requireEnv("DATABASE_HOST");
  const port = process.env.DATABASE_PORT ? Number(process.env.DATABASE_PORT) : 3306;
  const user = requireEnv("DATABASE_USER");
  const password = requireEnv("DATABASE_PASSWORD");
  const database = requireEnv("DATABASE_NAME");

  const migrationsDir = resolve(process.cwd(), "src", "db", "migrations");
  const migrationFiles = readdirSync(migrationsDir)
    .filter((f) => f.toLowerCase().endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));

  if (migrationFiles.length === 0) {
    console.log(`No migrations found in ${migrationsDir}`);
    return;
  }

  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database,
    multipleStatements: true
  });

  try {
    for (const file of migrationFiles) {
      const fullPath = resolve(migrationsDir, file);
      const sql = readFileSync(fullPath, "utf8");
      console.log(`Applying migration: ${file}`);
      await connection.query(sql);
    }

    console.log("Migrations applied successfully.");
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

