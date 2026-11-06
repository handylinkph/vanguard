import { Card, CardContent, PageHeader } from "@/components/ui";
import { ActionForm } from "@/components/ui/form";
import { IncidentFields } from "@/components/incident-form";
import { saveIncident } from "../actions";
export const metadata = { title: "New incident record" };
export default function NewIncident() {
  return (<><PageHeader title="New incident record" description="Private to you. You can attach photos and documents after saving." />
    <Card className="max-w-3xl"><CardContent className="pt-5"><ActionForm action={saveIncident}><IncidentFields /></ActionForm></CardContent></Card></>);
}
