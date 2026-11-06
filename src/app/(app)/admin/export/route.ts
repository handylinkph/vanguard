import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const csv = (rows: Record<string, unknown>[]) => {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const cell = (v: unknown) => { const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v); return /[",\n]/.test(s) || /^[=+\-@]/.test(s) ? `"${s.replace(/^([=+\-@])/, "'$1").replace(/"/g, '""')}"` : s; };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\n");
};

export async function GET(req: Request) {
  const kind = new URL(req.url).searchParams.get("kind");
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: isAdmin } = await supabase.rpc("is_platform_admin");
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let rows: Record<string, unknown>[] = [];
  if (kind === "metrics") { const { data } = await supabase.rpc("admin_metrics"); rows = Object.entries(data ?? {}).filter(([k]) => k !== "signups_by_day").map(([metric, value]) => ({ metric, value })); }
  else if (kind === "users") { const { data } = await supabase.rpc("admin_list_users", { p_search: null, p_limit: 200, p_offset: 0 }); rows = data ?? []; }
  else if (kind === "audit") { const { data } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(5000); rows = data ?? []; }
  else return NextResponse.json({ error: "Unknown export" }, { status: 400 });
  return new NextResponse(csv(rows), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="vanguard-${kind}-${new Date().toISOString().slice(0, 10)}.csv"`, "cache-control": "no-store" } });
}
