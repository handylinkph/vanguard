import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { Card, CardContent, PageHeader } from "@/components/ui";
import { ActionForm } from "@/components/ui/form";
import { IncidentFields, type IncidentRow } from "@/components/incident-form";
import { saveIncident } from "../../actions";
export default async function EditIncident({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const { data } = await supabase.from("incident_records").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  return (<><PageHeader title="Edit incident record" />
    <Card className="max-w-3xl"><CardContent className="pt-5"><ActionForm action={saveIncident}><IncidentFields r={data as IncidentRow} /></ActionForm></CardContent></Card></>);
}
