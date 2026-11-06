import { Client } from "pg";
import { randomUUID } from "node:crypto";

const DB_URL = process.env.TEST_DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/vanguard_test";
let client: Client | null = null;

export async function db() {
  if (!client) { client = new Client({ connectionString: DB_URL }); await client.connect(); }
  return client;
}
export async function closeDb() { await client?.end(); client = null; }

/** Creates an auth user (fires the real signup trigger). */
export async function createUser(name = "Test User", opts: { admin?: boolean } = {}) {
  const c = await db();
  const id = randomUUID();
  await c.query("insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)", [id, `${id.slice(0, 8)}@example.test`, { full_name: name }]);
  if (opts.admin) await c.query("update public.profiles set platform_role = 'platform_admin' where id = $1", [id]);
  return id;
}

/** Runs queries as an authenticated user under RLS (like PostgREST does), inside a transaction. */
export async function as<T>(userId: string | null, fn: (q: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }>) => Promise<T>): Promise<T> {
  const c = await db();
  await c.query("begin");
  try {
    await c.query(`set local role ${userId ? "authenticated" : "anon"}`);
    await c.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(userId ? { sub: userId, role: "authenticated" } : { role: "anon" })]);
    const res = await fn((sql, params) => c.query(sql, params as unknown[]));
    await c.query("commit");
    return res;
  } catch (e) {
    await c.query("rollback");
    throw e;
  }
}

/** Expects the callback to throw (e.g., RLS violation or trigger exception). */
export async function rejects(p: Promise<unknown>, match?: RegExp) {
  try { await p; } catch (e) {
    if (match && !match.test(String((e as Error).message))) throw new Error(`Expected error matching ${match}, got: ${(e as Error).message}`);
    return (e as Error).message;
  }
  throw new Error("Expected operation to fail, but it succeeded");
}
export { randomUUID };
