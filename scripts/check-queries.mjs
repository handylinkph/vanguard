// Static check: every supabase .from("table").select("columns") / .rpc("fn") / .eq("col") in src/
// must reference tables, columns and functions that exist in the migrated schema.
// Usage: node scripts/check-queries.mjs  (requires the local test database built by `npm run test:db`)
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import pg from "pg";

const DB = process.env.TEST_DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/vanguard_test";
const files = [];
(function walk(d) { for (const f of readdirSync(d)) { const p = path.join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.(ts|tsx)$/.test(f)) files.push(p); } })("src");

const c = new pg.Client({ connectionString: DB }); await c.connect();
const cols = new Map();
for (const r of (await c.query("select table_name, column_name from information_schema.columns where table_schema = 'public'")).rows) {
  if (!cols.has(r.table_name)) cols.set(r.table_name, new Set()); cols.get(r.table_name).add(r.column_name);
}
const fns = new Set((await c.query("select proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'")).rows.map((r) => r.proname));
await c.end();

const problems = [];
function splitTop(s) { const out = []; let depth = 0, cur = ""; for (const ch of s) { if (ch === "(") depth++; if (ch === ")") depth--; if (ch === "," && depth === 0) { out.push(cur.trim()); cur = ""; } else cur += ch; } if (cur.trim()) out.push(cur.trim()); return out; }
function checkSelect(table, sel, where) {
  if (!cols.has(table)) { problems.push(`${where}: unknown table ${table}`); return; }
  for (const part of splitTop(sel)) {
    if (part === "*" ) continue;
    const m = part.match(/^([a-z_]+)(?:!\w+)?\((.*)\)$/s);
    if (m) { if (m[2].trim() === "count") continue; checkSelect(m[1], m[2], where); continue; }
    const col = part.split(":").pop().trim();
    if (!cols.get(table).has(col)) problems.push(`${where}: ${table}.${col} does not exist`);
  }
}
for (const f of files) {
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(/\.from\("([a-z_]+)"\)((?:\s*\.[a-zA-Z]+\([^()]*(?:\([^()]*\)[^()]*)*\))*)/g)) {
    const table = m[1]; const chain = m[2]; const where = `${f}:${src.slice(0, m.index).split("\n").length}`;
    if (["incident-files"].includes(table)) continue;
    const sel = chain.match(/\.select\("([^"]*)"/); if (sel) checkSelect(table, sel[1], where);
    for (const e of chain.matchAll(/\.(?:eq|neq|lt|lte|gt|gte|in|is|contains|order|ilike)\("([a-z_]+)"/g))
      if (cols.has(table) && !cols.get(table).has(e[1])) problems.push(`${where}: filter/order column ${table}.${e[1]} does not exist`);
    if (!cols.has(table)) problems.push(`${where}: unknown table ${table}`);
  }
  for (const m of src.matchAll(/\.rpc\("([a-z_]+)"/g)) if (!fns.has(m[1])) problems.push(`${f}: unknown function ${m[1]}`);
}
if (problems.length) { console.error([...new Set(problems)].join("\n")); process.exit(1); }
console.log(`Query check passed: ${files.length} files scanned against ${cols.size} tables and ${fns.size} functions.`);
