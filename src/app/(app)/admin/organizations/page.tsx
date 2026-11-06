import { requireAdmin } from "@/lib/auth";
import { PageHeader, Card, CardContent, Badge, Button } from "@/components/ui";
import { InlineAction } from "@/components/ui/form";
import { setOrgStatus } from "../actions";
import { fmtDate } from "@/lib/utils";

export default async function OrgAdmin() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.rpc("admin_list_orgs");
  type O = { id: string; name: string; org_type: string; status: string; city: string | null; members: number; drills_completed: number; created_at: string };
  return (
    <>
      <PageHeader title="Organizational accounts" description="Businesses and schools using Vanguard. Administrators see account-level information only, not plan contents." />
      <Card><CardContent className="overflow-x-auto pt-5">
        <table className="w-full text-sm"><thead><tr className="border-b border-line text-left text-xs text-muted"><th className="py-2">Organization</th><th>Type</th><th>Members</th><th>Drills completed</th><th>Created</th><th>Status</th><th /></tr></thead>
          <tbody>{((data ?? []) as O[]).map((o) => (
            <tr key={o.id} className="border-b border-line/60"><td className="py-2 font-medium">{o.name}<span className="block text-xs font-normal text-muted">{o.city}</span></td><td>{o.org_type}</td><td>{o.members}</td><td>{o.drills_completed}</td><td className="text-xs">{fmtDate(o.created_at)}</td>
              <td><Badge tone={o.status === "active" ? "green" : "red"}>{o.status}</Badge></td>
              <td className="text-right"><InlineAction action={setOrgStatus} hidden={{ id: o.id, status: o.status === "active" ? "suspended" : "active" }} confirm={`${o.status === "active" ? "Suspend" : "Reinstate"} ${o.name}?`}><Button size="sm" variant="ghost">{o.status === "active" ? "Suspend" : "Reinstate"}</Button></InlineAction></td></tr>))}</tbody></table>
        {(data ?? []).length === 0 && <p className="text-sm text-muted">No organizations yet.</p>}
      </CardContent></Card>
    </>
  );
}
