import Link from "next/link";
import { FileText, Plus, Download, Lock } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { Card, PageHeader, Badge, ButtonLink, EmptyState, Input, Select, Button, Alert, buttonVariants } from "@/components/ui";
import { INCIDENT_CATS } from "@/components/incident-form";
import { fmtDate, php } from "@/lib/utils";

export const metadata = { title: "My incident records" };

export default async function Incidents({ searchParams }: { searchParams: Promise<{ q?: string; category?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireUser();
  let q = supabase.from("incident_records").select("id, title, category, occurred_on, location_text, estimated_damage_php, recovery_tasks, incident_attachments(count)").order("occurred_on", { ascending: false });
  if (sp.category) q = q.eq("category", sp.category);
  if (sp.q) { const t = sp.q.replace(/[%,()]/g, " ").slice(0, 80); q = q.or(`title.ilike.%${t}%,description.ilike.%${t}%,location_text.ilike.%${t}%,damage_description.ilike.%${t}%`); }
  const { data } = await q;
  return (
    <>
      <PageHeader title="My incident records" description="A private journal of disasters and incidents that affected you — for insurance, assistance applications and your own recovery."
        actions={<><a href="/incidents/export?format=json" download className={buttonVariants({ variant: "outline" })}><Download />Export all</a><ButtonLink href="/incidents/new"><Plus />New record</ButtonLink></>} />
      <Alert tone="info" className="mb-4"><Lock className="mr-1 inline size-4" /><strong>Private by default.</strong> Only you can see these records — not household members, groups or Vanguard administrators. They are personal notes, not official reports, and are never sent to any agency.</Alert>
      <form className="mb-4 flex flex-wrap gap-2" role="search">
        <label htmlFor="q" className="sr-only">Search</label><Input id="q" name="q" defaultValue={sp.q} placeholder="Search records" className="max-w-xs" />
        <label htmlFor="cat" className="sr-only">Category</label>
        <Select id="cat" name="category" defaultValue={sp.category ?? ""} className="w-44"><option value="">All categories</option>{Object.entries(INCIDENT_CATS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
        <Button variant="outline">Search</Button>
      </form>
      {(data ?? []).length === 0 ? <EmptyState icon={<FileText />} title="No records" description="Record what happened, damage, photos and recovery tasks." action={<ButtonLink href="/incidents/new">Create a record</ButtonLink>} /> : (
        <ul className="flex flex-col gap-3">{data!.map((r) => {
          const tasks = (r.recovery_tasks ?? []) as { done: boolean }[];
          const files = (r.incident_attachments as unknown as { count: number }[])?.[0]?.count ?? 0;
          return (
            <li key={r.id}><Link href={`/incidents/${r.id}`}><Card className="flex flex-wrap items-center justify-between gap-3 p-4 hover:border-brand-500">
              <div><p className="font-medium">{r.title}</p><p className="text-xs text-muted">{fmtDate(r.occurred_on)}{r.location_text ? ` · ${r.location_text}` : ""}</p></div>
              <div className="flex flex-wrap gap-2"><Badge tone="blue">{INCIDENT_CATS[r.category]}</Badge>{r.estimated_damage_php != null && <Badge>{php(r.estimated_damage_php)}</Badge>}
                {tasks.length > 0 && <Badge tone={tasks.every((t) => t.done) ? "green" : "amber"}>{tasks.filter((t) => t.done).length}/{tasks.length} tasks</Badge>}{files > 0 && <Badge>{files} file(s)</Badge>}</div>
            </Card></Link></li>);
        })}</ul>)}
    </>
  );
}
