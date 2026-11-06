import Link from "next/link";
import { Building2, School } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, PageHeader, Badge, Field, Input, Select, EmptyState } from "@/components/ui";
import { ActionForm, SubmitButton, FieldError } from "@/components/ui/form";
import { createOrg } from "./actions";

export const metadata = { title: "Businesses & schools" };

export default async function Orgs() {
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from("org_members").select("role, organizations(id, name, org_type, city, status)").eq("user_id", user.id);
  const orgs = (data ?? []).map((r) => ({ role: r.role, o: r.organizations as unknown as { id: string; name: string; org_type: string; city: string | null; status: string } }));
  return (
    <>
      <PageHeader title="Emergency planning for businesses & schools" description="Organizational plans, facility records, evacuation checklists, assignments and drills — with a readiness dashboard for administrators." />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {orgs.length === 0 ? <EmptyState icon={<Building2 />} title="No organizations yet" description="Create one for your business or school, or open an invitation link from your administrator." /> : (
            <ul className="grid gap-3 sm:grid-cols-2">{orgs.map(({ role, o }) => (
              <li key={o.id}><Link href={`/organizations/${o.id}`}><Card className="h-full p-5 hover:border-brand-500">
                <div className="flex gap-2">{o.org_type === "school" ? <Badge tone="blue"><School className="size-3" />School</Badge> : <Badge tone="blue"><Building2 className="size-3" />Business</Badge>}<Badge tone={role === "admin" ? "navy" : "neutral"}>{role}</Badge>{o.status !== "active" && <Badge tone="red">Suspended</Badge>}</div>
                <h2 className="mt-2 font-semibold">{o.name}</h2>{o.city && <p className="text-xs text-muted">{o.city}</p>}
              </Card></Link></li>))}</ul>)}
        </div>
        <Card className="self-start"><CardHeader><CardTitle>Register an organization</CardTitle></CardHeader><CardContent>
          <ActionForm action={createOrg} className="flex flex-col gap-3">
            <Field label="Organization name" htmlFor="on"><Input id="on" name="name" required maxLength={200} /><FieldError name="name" /></Field>
            <Field label="Type" htmlFor="ot"><Select id="ot" name="org_type"><option value="business">Business / workplace</option><option value="school">School</option></Select></Field>
            <Field label="Sector / level" htmlFor="os"><Input id="os" name="sector" maxLength={100} placeholder="e.g. Retail, Elementary" /></Field>
            <Field label="Address" htmlFor="oa"><Input id="oa" name="address" maxLength={300} /></Field>
            <div className="grid grid-cols-2 gap-2"><Field label="City" htmlFor="oc"><Input id="oc" name="city" maxLength={80} /></Field><Field label="People" htmlFor="oh"><Input id="oh" name="headcount" type="number" min={0} /></Field></div>
            <SubmitButton size="sm">Create</SubmitButton>
          </ActionForm>
          <p className="mt-3 text-xs text-muted">You&apos;ll become the organization&apos;s preparedness administrator. Vanguard does not provide official emergency coordination.</p>
        </CardContent></Card>
      </div>
    </>
  );
}
