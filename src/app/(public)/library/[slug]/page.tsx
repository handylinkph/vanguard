import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { Card, CardContent, PageHeader, Badge, EducationalNotice, Alert, buttonVariants } from "@/components/ui";
import { SaveButton } from "@/components/save-button";
import { PrintButton } from "@/components/ui/copy-button";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { renderMarkdown } from "@/lib/markdown";
import { fmtDate } from "@/lib/utils";
import { LIB_CATEGORIES } from "@/content/library";
import { HAZARD_LABEL } from "@/content/guides";

export default async function ResourcePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isSupabaseConfigured) notFound();
  const supabase = await createClient();
  const { data: r } = await supabase.from("resources").select("*").eq("slug", slug).maybeSingle();
  if (!r) notFound();
  const session = await getSession();
  const saved = session ? !!(await session.supabase.from("saved_items").select("item_key").eq("item_type", "resource").eq("item_key", slug).maybeSingle()).data : false;
  const overdue = r.review_due_on && r.review_due_on < new Date().toISOString().slice(0, 10);
  return (
    <>
      <PageHeader eyebrow={LIB_CATEGORIES[r.category]} title={r.title} description={r.summary}
        actions={<><SaveButton type="resource" itemKey={r.slug} title={r.title} saved={saved} path={`/library/${slug}`} signedIn={!!session} /><PrintButton />
          {r.download_url && <a href={r.download_url} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "outline" })}><Download />Download</a>}</>} />
      {!r.published && <Alert tone="warning" className="mb-4">Unpublished draft — visible to administrators only.</Alert>}
      <EducationalNotice className="mb-6" />
      <div className="mb-4 flex flex-wrap gap-2">{(r.hazards as string[]).map((h) => <Badge key={h} tone="blue">{HAZARD_LABEL[h] ?? h}</Badge>)}</div>
      <Card><CardContent className="prose-v pt-5 text-sm" dangerouslySetInnerHTML={{ __html: renderMarkdown(r.body) }} /></Card>
      <Card className="mt-4"><CardContent className="pt-5 text-sm">
        <p><strong>Source:</strong> {r.source_url ? <a href={r.source_url} target="_blank" rel="noopener noreferrer" className="text-brand-700 underline">{r.source_name}</a> : r.source_name}</p>
        <p className="text-muted">Last reviewed {fmtDate(r.reviewed_on)}{r.review_due_on ? ` · next review due ${fmtDate(r.review_due_on)}` : ""}{overdue ? " (overdue)" : ""}</p>
      </CardContent></Card>
    </>
  );
}
