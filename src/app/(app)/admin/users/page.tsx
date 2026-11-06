import { requireAdmin } from "@/lib/auth";
import { PageHeader, Card, CardContent, Input, Button, Badge, buttonVariants } from "@/components/ui";
import { InlineAction } from "@/components/ui/form";
import { setUser } from "../actions";
import { fmtDate } from "@/lib/utils";
import { Download } from "lucide-react";

export default async function Users({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const sp = await searchParams; const page = Math.max(0, Number(sp.page ?? 0));
  const { supabase, user } = await requireAdmin();
  const { data, error } = await supabase.rpc("admin_list_users", { p_search: sp.q ?? null, p_limit: 50, p_offset: page * 50 });
  type U = { id: string; email: string; full_name: string | null; platform_role: string; disabled: boolean; created_at: string; last_sign_in_at: string | null };
  const users = (data ?? []) as U[];
  return (
    <>
      <PageHeader title="Users & roles" description="Manage platform roles and account status. Household roles, group coordinators and organization admins are managed by those owners." actions={<a href="/admin/export?kind=users" download className={buttonVariants({ variant: "outline" })}><Download />Export CSV</a>} />
      <form className="mb-4 flex gap-2" role="search"><label htmlFor="q" className="sr-only">Search users</label><Input id="q" name="q" defaultValue={sp.q} placeholder="Search name or email" className="max-w-xs" /><Button variant="outline">Search</Button></form>
      {error && <p className="text-sm text-red-700">{error.message}</p>}
      <Card><CardContent className="overflow-x-auto pt-5">
        <table className="w-full text-sm"><thead><tr className="border-b border-line text-left text-xs text-muted"><th className="py-2">User</th><th>Role</th><th>Status</th><th>Joined</th><th>Last sign-in</th><th /></tr></thead>
          <tbody>{users.map((u) => (
            <tr key={u.id} className="border-b border-line/60">
              <td className="py-2"><p className="font-medium">{u.full_name || "—"}</p><p className="text-xs text-muted">{u.email}</p></td>
              <td><Badge tone={u.platform_role === "platform_admin" ? "navy" : "neutral"}>{u.platform_role === "platform_admin" ? "Platform admin" : "User"}</Badge></td>
              <td>{u.disabled ? <Badge tone="red">Disabled</Badge> : <Badge tone="green">Active</Badge>}</td>
              <td className="text-xs">{fmtDate(u.created_at)}</td><td className="text-xs">{fmtDate(u.last_sign_in_at)}</td>
              <td className="text-right">{u.id !== user.id && <div className="flex justify-end gap-1">
                <InlineAction action={setUser} hidden={{ id: u.id, role: u.platform_role === "platform_admin" ? "user" : "platform_admin", disabled: String(u.disabled) }} confirm={u.platform_role === "platform_admin" ? "Remove platform admin role?" : "Grant platform admin role?"}><Button size="sm" variant="ghost">{u.platform_role === "platform_admin" ? "Revoke admin" : "Make admin"}</Button></InlineAction>
                <InlineAction action={setUser} hidden={{ id: u.id, role: u.platform_role, disabled: String(!u.disabled) }} confirm={u.disabled ? "Re-enable this account?" : "Disable this account? They will be signed out."}><Button size="sm" variant="ghost" className={u.disabled ? "" : "text-red-700"}>{u.disabled ? "Enable" : "Disable"}</Button></InlineAction>
              </div>}</td>
            </tr>))}</tbody></table>
        <div className="mt-3 flex justify-between text-sm">{page > 0 ? <a href={`?q=${sp.q ?? ""}&page=${page - 1}`} className="text-brand-700 underline">Previous</a> : <span />}{users.length === 50 && <a href={`?q=${sp.q ?? ""}&page=${page + 1}`} className="text-brand-700 underline">Next</a>}</div>
      </CardContent></Card>
    </>
  );
}
