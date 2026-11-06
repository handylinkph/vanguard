import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { PageHeader, Card, CardContent, Button } from "@/components/ui";
import { ActionForm, InlineAction } from "@/components/ui/form";
import { ResourceFields } from "@/components/admin/forms";
import { saveResource, deleteContent } from "../../actions";
import type { Resource } from "@/lib/types";

export default async function EditResource({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("resources").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  return (
    <>
      <PageHeader title={`Edit: ${data.title}`} actions={<><Link href={`/library/${data.slug}`} className="text-sm text-brand-700 underline self-center">Preview</Link>
        <InlineAction action={deleteContent} hidden={{ table: "resources", id }} confirm="Delete this resource?"><Button variant="ghost" className="text-red-700">Delete</Button></InlineAction></>} />
      <Card><CardContent className="pt-5"><ActionForm action={saveResource}><ResourceFields r={data as Resource} /></ActionForm></CardContent></Card>
    </>
  );
}
