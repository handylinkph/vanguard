import { requireAdmin } from "@/lib/auth";
import { PageHeader, Card, CardContent, Badge } from "@/components/ui";

export default async function Errors() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("error_events").select("*").order("created_at", { ascending: false }).limit(200);
  return (
    <>
      <PageHeader title="System errors" description="Recent client and server errors (latest 200). Error reports contain technical details only." />
      <Card><CardContent className="pt-5">{(data ?? []).length === 0 ? <p className="text-sm text-muted">No errors recorded.</p> : (
        <ul className="divide-y divide-line">{data!.map((e) => (
          <li key={e.id} className="py-2 text-sm"><div className="flex flex-wrap items-center gap-2"><Badge tone={e.source === "server" ? "red" : "amber"}>{e.source}</Badge><span className="font-mono text-xs text-muted">{new Date(e.created_at).toLocaleString("en-PH")}</span><span className="text-xs text-muted">{e.path}</span></div>
            <p className="mt-1">{e.message}</p>{e.detail && <details><summary className="cursor-pointer text-xs text-brand-700">Details</summary><pre className="mt-1 overflow-x-auto rounded bg-surface p-2 text-xs">{e.detail}</pre></details>}</li>))}</ul>)}
      </CardContent></Card>
    </>
  );
}
