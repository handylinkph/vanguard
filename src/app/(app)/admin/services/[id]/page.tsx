import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { PageHeader, Card, CardContent, Button } from "@/components/ui";
import { ActionForm, InlineAction } from "@/components/ui/form";
import { ServiceFields } from "@/components/admin/forms";
import { saveService, deleteContent } from "../../actions";
import type { Service } from "@/lib/types";

export default async function EditService({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("services").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  return (
    <>
      <PageHeader title={`Edit: ${data.name}`} actions={<InlineAction action={deleteContent} hidden={{ table: "services", id }} confirm="Delete this listing?"><Button variant="ghost" className="text-red-700">Delete</Button></InlineAction>} />
      <Card><CardContent className="pt-5"><ActionForm action={saveService}><ServiceFields s={data as Service} /></ActionForm></CardContent></Card>
    </>
  );
}
