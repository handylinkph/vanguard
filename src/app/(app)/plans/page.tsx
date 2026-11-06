import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { Card, PageHeader, Badge, ButtonLink, EmptyState, Progress } from "@/components/ui";
import { HAZARD_LABEL } from "@/content/guides";
import { fmtDate } from "@/lib/utils";

export const metadata = { title: "Emergency plans" };

export default async function PlansPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view = "current" } = await searchParams;
  const { supabase, user } = await requireUser();
  let q = supabase.from("emergency_plans").select("id, title, hazard, status, plan_type, owner_id, shared_with_household, updated_at, review_on, plan_checklist_items(done)").order("updated_at", { ascending: false });
  q = view === "archived" ? q.eq("status", "archived") : q.neq("status", "archived");
  const { data } = await q;
  const plans = data ?? [];
  return (
    <>
      <PageHeader title="Emergency plans" description="Personal and household plans with meeting places, evacuation destinations, responsibilities and checklists."
        actions={<ButtonLink href="/plans/new"><Plus />New plan</ButtonLink>} />
      <div className="mb-4 flex gap-2 text-sm" role="tablist">
        {["current", "archived"].map((v) => <Link key={v} href={`/plans?view=${v}`} role="tab" aria-selected={view === v} className={`rounded-full px-3 py-1 ${view === v ? "bg-navy text-white" : "bg-white border border-line"}`}>{v === "current" ? "Current" : "Archived"}</Link>)}
      </div>
      {plans.length === 0 ? <EmptyState icon={<ClipboardList />} title={view === "archived" ? "No archived plans" : "No plans yet"} description="Start from a template for typhoons, earthquakes, fires and more." action={view !== "archived" ? <ButtonLink href="/plans/new">Create a plan</ButtonLink> : undefined} /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => {
            const items = (p.plan_checklist_items ?? []) as { done: boolean }[];
            const pct = items.length ? (items.filter((i) => i.done).length / items.length) * 100 : 0;
            return (
              <Link key={p.id} href={`/plans/${p.id}`}><Card className="h-full p-5 transition hover:border-brand-500">
                <div className="flex flex-wrap gap-2">
                  <Badge tone={p.status === "active" ? "green" : p.status === "draft" ? "amber" : "neutral"}>{p.status}</Badge>
                  <Badge tone="blue">{HAZARD_LABEL[p.hazard] ?? p.hazard}</Badge>
                  {p.owner_id !== user.id ? <Badge>Shared with you</Badge> : p.shared_with_household ? <Badge>Shared</Badge> : null}
                </div>
                <h2 className="mt-3 font-semibold">{p.title}</h2>
                <p className="text-xs text-muted">{p.plan_type === "household" ? "Household plan" : "Personal plan"} · updated {fmtDate(p.updated_at)}</p>
                <Progress value={pct} className="mt-4" label={`${p.title} checklist progress`} />
                <p className="mt-1 text-xs text-muted">{Math.round(pct)}% of checklist · review {fmtDate(p.review_on)}</p>
              </Card></Link>
            );
          })}
        </div>
      )}
    </>
  );
}
