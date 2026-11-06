import { requireAdmin } from "@/lib/auth";
import { PageHeader, Card, CardContent, buttonVariants } from "@/components/ui";
import { Download } from "lucide-react";

export default async function Audit() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(300);
  const actorIds = [...new Set((data ?? []).map((a) => a.actor_id).filter(Boolean))];
  const { data: users } = actorIds.length ? await supabase.rpc("admin_list_users", { p_search: null, p_limit: 200, p_offset: 0 }) : { data: [] };
  const who = (id: string | null) => ((users ?? []) as { id: string; email: string }[]).find((u) => u.id === id)?.email ?? (id ? id.slice(0, 8) : "system");
  return (
    <>
      <PageHeader title="Audit log" description="Administrative and content-management actions (latest 300)." actions={<a href="/admin/export?kind=audit" download className={buttonVariants({ variant: "outline" })}><Download />Export CSV</a>} />
      <Card><CardContent className="overflow-x-auto pt-5">
        <table className="w-full text-sm"><thead><tr className="border-b border-line text-left text-xs text-muted"><th className="py-2">When</th><th>Who</th><th>Action</th><th>Target</th><th>Details</th></tr></thead>
          <tbody>{(data ?? []).map((a) => (
            <tr key={a.id} className="border-b border-line/60 align-top"><td className="py-2 font-mono text-xs">{new Date(a.created_at).toLocaleString("en-PH")}</td><td className="text-xs">{who(a.actor_id)}</td><td>{a.action}</td><td className="text-xs">{a.target_type} {a.target_id?.slice(0, 8)}</td><td className="font-mono text-xs">{JSON.stringify(a.details)}</td></tr>))}</tbody></table>
      </CardContent></Card>
    </>
  );
}
