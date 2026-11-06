import { requireAdmin } from "@/lib/auth";
import { PageHeader, Card, CardContent, CardHeader, CardTitle, Badge, Button, Alert } from "@/components/ui";
import { InlineAction } from "@/components/ui/form";
import { resolveReport } from "@/app/(app)/community/actions";
import { setGroupStatus } from "../actions";
import { fmtDate } from "@/lib/utils";

export default async function Moderation() {
  const { supabase } = await requireAdmin();
  const [{ data: reports }, { data: groups }] = await Promise.all([supabase.rpc("admin_reported_content"), supabase.rpc("admin_list_groups")]);
  type R = { report_id: string; group_name: string; target_type: string; reason: string; status: string; content: string | null; created_at: string };
  type G = { id: string; name: string; area: string | null; status: string; members: number; open_reports: number; created_at: string };
  return (
    <>
      <PageHeader title="Community moderation" description="Review reported posts and comments. Moderators can only see content that has been reported — not the rest of a group's private discussion." />
      <Card className="mb-6"><CardHeader><CardTitle>Reports</CardTitle></CardHeader><CardContent>
        {((reports ?? []) as R[]).length === 0 ? <p className="text-sm text-muted">No reports.</p> : <ul className="flex flex-col gap-3">{(reports as R[]).map((r) => (
          <li key={r.report_id} className="rounded-lg border border-line p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2"><Badge tone={r.status === "open" ? "amber" : "neutral"}>{r.status}</Badge><Badge>{r.target_type}</Badge><span className="text-xs text-muted">{r.group_name} · {fmtDate(r.created_at)}</span></div>
            <p className="mt-2"><strong>Reason:</strong> {r.reason}</p>
            <blockquote className="mt-2 whitespace-pre-wrap rounded bg-surface p-2 text-xs">{r.content ?? "(content deleted)"}</blockquote>
            {r.status === "open" && <div className="mt-2 flex gap-2">
              <InlineAction action={resolveReport} hidden={{ id: r.report_id, action: "hide" }}><Button size="sm" variant="destructive">Hide content</Button></InlineAction>
              <InlineAction action={resolveReport} hidden={{ id: r.report_id, action: "dismiss" }}><Button size="sm" variant="outline">Dismiss</Button></InlineAction></div>}
          </li>))}</ul>}
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Groups</CardTitle></CardHeader><CardContent>
        <Alert tone="info" className="mb-3">Suspending a group makes it read-only for members. Use for policy violations.</Alert>
        <table className="w-full text-sm"><thead><tr className="border-b border-line text-left text-xs text-muted"><th className="py-2">Group</th><th>Members</th><th>Open reports</th><th>Status</th><th /></tr></thead>
          <tbody>{((groups ?? []) as G[]).map((g) => (
            <tr key={g.id} className="border-b border-line/60"><td className="py-2">{g.name}<span className="block text-xs text-muted">{g.area}</span></td><td>{g.members}</td><td>{g.open_reports}</td>
              <td><Badge tone={g.status === "active" ? "green" : "red"}>{g.status}</Badge></td>
              <td className="text-right"><InlineAction action={setGroupStatus} hidden={{ id: g.id, status: g.status === "active" ? "suspended" : "active" }} confirm={`${g.status === "active" ? "Suspend" : "Reinstate"} this group?`}><Button size="sm" variant="ghost">{g.status === "active" ? "Suspend" : "Reinstate"}</Button></InlineAction></td></tr>))}</tbody></table>
      </CardContent></Card>
    </>
  );
}
