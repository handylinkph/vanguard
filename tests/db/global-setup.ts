// Builds a fresh database from the REAL migrations (plus a local Supabase shim) before DB tests.
import { Client } from "pg";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

export const DB_URL = process.env.TEST_DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/vanguard_test";

export default async function setup() {
  const admin = new Client({ connectionString: DB_URL.replace(/\/[^/]+$/, "/postgres") });
  await admin.connect();
  await admin.query("drop database if exists vanguard_test with (force)");
  await admin.query("create database vanguard_test");
  await admin.end();
  const db = new Client({ connectionString: DB_URL });
  await db.connect();
  const root = path.resolve(__dirname, "../..");
  await db.query(readFileSync(path.join(root, "supabase/tests/supabase_shim.sql"), "utf8"));
  const dir = path.join(root, "supabase/migrations");
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) await db.query(readFileSync(path.join(dir, f), "utf8"));
  await db.query(readFileSync(path.join(root, "supabase/seed.sql"), "utf8"));
  await db.end();
}
