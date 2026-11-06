import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { planDocumentHtml } from "@/lib/plan-export";
import type { Plan, PlanItem, Contact } from "@/lib/types";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const format = new URL(req.url).searchParams.get("format") ?? "html";
  const supabase = await createClient();
  const { data: plan } = await supabase.from("emergency_plans").select("*").eq("id", id).maybeSingle();
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const [{ data: items }, { data: contacts }] = await Promise.all([
    supabase.from("plan_checklist_items").select("*").eq("plan_id", id).order("sort"),
    supabase.from("emergency_contacts").select("*").order("priority"),
  ]);
  const slug = (plan.title as string).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50) || "plan";
  if (format === "json") {
    return new NextResponse(JSON.stringify({ plan, checklist: items, contacts, exported_at: new Date().toISOString() }, null, 2), {
      headers: { "content-type": "application/json", "content-disposition": `attachment; filename="${slug}.json"`, "cache-control": "no-store" },
    });
  }
  return new NextResponse(planDocumentHtml(plan as Plan, (items ?? []) as PlanItem[], (contacts ?? []) as Contact[]), {
    headers: { "content-type": "text/html; charset=utf-8", "content-disposition": `attachment; filename="${slug}.html"`, "cache-control": "no-store" },
  });
}
