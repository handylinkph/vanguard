import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { PageHeader, Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui";
import { ActionForm } from "@/components/ui/form";
import { ResourceFields } from "@/components/admin/forms";
import { saveResource } from "../actions";
import { LIB_CATEGORIES } from "@/content/library";
import { fmtDate, todayISO } from "@/lib/utils";

export default async function Content() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("resources").select("id, slug, title, category, published, reviewed_on, review_due_on, updated_at").order("updated_at", { ascending: false });
  return (
    <>
      <PageHeader title="Resource library management" description="Create, review and publish educational resources. Every resource needs a source and review date." />
      <Card className="mb-6"><CardContent className="overflow-x-auto pt-5">
        <table className="w-full text-sm"><thead><tr className="border-b border-line text-left text-xs text-muted"><th className="py-2">Title</th><th>Category</th><th>Status</th><th>Reviewed</th><th>Review due</th></tr></thead>
          <tbody>{(data ?? []).map((r) => (
            <tr key={r.id} className="border-b border-line/60"><td className="py-2"><Link href={`/admin/content/${r.id}`} className="font-medium text-brand-700 underline">{r.title}</Link></td>
              <td>{LIB_CATEGORIES[r.category]}</td><td>{r.published ? <Badge tone="green">Published</Badge> : <Badge>Draft</Badge>}</td>
              <td className="text-xs">{fmtDate(r.reviewed_on)}</td><td className="text-xs">{r.review_due_on && r.review_due_on < todayISO() ? <Badge tone="amber">Overdue {fmtDate(r.review_due_on)}</Badge> : fmtDate(r.review_due_on)}</td></tr>))}</tbody></table>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>New resource</CardTitle></CardHeader><CardContent><ActionForm action={saveResource}><ResourceFields /></ActionForm></CardContent></Card>
    </>
  );
}
