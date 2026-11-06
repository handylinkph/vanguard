import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { PageHeader, Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui";
import { ActionForm } from "@/components/ui/form";
import { ServiceFields } from "@/components/admin/forms";
import { saveService } from "../actions";
import { SERVICE_CATEGORIES } from "@/content/library";
import { fmtDate } from "@/lib/utils";

export default async function ServicesAdmin() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("services").select("id, name, category, scope, city, verification, last_reviewed_on, published").order("category").order("name");
  return (
    <>
      <PageHeader title="Services directory management" description="Curate hotlines and facilities. Record the source and review date for every listing; never imply real-time availability." />
      <Card className="mb-6"><CardContent className="overflow-x-auto pt-5">
        <table className="w-full text-sm"><thead><tr className="border-b border-line text-left text-xs text-muted"><th className="py-2">Name</th><th>Category</th><th>Scope</th><th>Verification</th><th>Reviewed</th><th>Status</th></tr></thead>
          <tbody>{(data ?? []).map((s) => (
            <tr key={s.id} className="border-b border-line/60"><td className="py-2"><Link className="font-medium text-brand-700 underline" href={`/admin/services/${s.id}`}>{s.name}</Link><span className="block text-xs text-muted">{s.city}</span></td>
              <td>{SERVICE_CATEGORIES[s.category]}</td><td>{s.scope}</td><td><Badge tone={s.verification === "verified" ? "green" : "amber"}>{s.verification}</Badge></td><td className="text-xs">{fmtDate(s.last_reviewed_on)}</td><td>{s.published ? "Published" : "Hidden"}</td></tr>))}</tbody></table>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>New listing</CardTitle></CardHeader><CardContent><ActionForm action={saveService}><ServiceFields /></ActionForm></CardContent></Card>
    </>
  );
}
