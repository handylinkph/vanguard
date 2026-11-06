import { requireAdmin } from "@/lib/auth";
import { PageHeader, Stat, Card, CardContent, CardHeader, CardTitle, Alert, buttonVariants } from "@/components/ui";
import { Download } from "lucide-react";

export const metadata = { title: "Admin console" };

export default async function AdminHome() {
  const { supabase } = await requireAdmin();
  const { data: m, error } = await supabase.rpc("admin_metrics");
  if (error || !m) return <Alert tone="error">Could not load metrics: {error?.message}</Alert>;
  const days = (m.signups_by_day as { day: string; count: number }[]) ?? [];
  const max = Math.max(1, ...days.map((d) => d.count));
  return (
    <>
      <PageHeader title="Administration" description="Aggregated platform metrics. Private household, plan, incident and financial contents are not accessible from this console."
        actions={<a href="/admin/export?kind=metrics" download className={buttonVariants({ variant: "outline" })}><Download />Export metrics CSV</a>} />
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Activity</h2>
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Users" value={m.users_total} sub={`+${m.users_new_7d} this week · +${m.users_new_30d} this month`} />
        <Stat label="Households" value={m.households} /><Stat label="AI questions (7d)" value={m.ai_messages_7d} /><Stat label="Errors (7d)" value={m.errors_7d} />
      </div>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Aggregated preparedness</h2>
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Plans" value={m.plans_total} sub={`${m.plans_active} active`} /><Stat label="Kits" value={m.kits_total} sub={`${m.kit_items_ready_pct}% avg essential coverage`} />
        <Stat label="Assessments" value={m.assessments_total} sub={`avg latest score ${m.assessment_avg_score}% (opted-in users)`} /><Stat label="Drills (30d)" value={m.drills_30d} />
      </div>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Community & content</h2>
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Groups" value={m.groups} sub={`${m.open_reports} open reports`} /><Stat label="Organizations" value={m.organizations} />
        <Stat label="Published resources" value={m.resources_published} sub={`${m.resources_review_overdue} overdue for review`} /><Stat label="Directory listings" value={m.services_listed} />
      </div>
      <Card><CardHeader><CardTitle>Sign-ups, last 30 days</CardTitle></CardHeader><CardContent>
        {days.length === 0 ? <p className="text-sm text-muted">No sign-ups in this period.</p> : (
          <div className="flex h-32 items-end gap-1" role="img" aria-label="Daily sign-ups chart">{days.map((d) => (
            <div key={d.day} className="flex flex-1 flex-col items-center gap-1" title={`${d.day}: ${d.count}`}><div className="w-full rounded-t bg-brand-500" style={{ height: `${(d.count / max) * 100}%`, minHeight: 2 }} /></div>))}</div>)}
      </CardContent></Card>
    </>
  );
}
