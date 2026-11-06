import Link from "next/link";
import { MessagesSquare } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, PageHeader, Badge, Field, Input, Textarea, EmptyState, Alert } from "@/components/ui";
import { ActionForm, SubmitButton, FieldError } from "@/components/ui/form";
import { createGroup } from "./actions";

export const metadata = { title: "Community" };

export default async function Community() {
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from("group_members").select("role, groups(id, name, area, description, status)").eq("user_id", user.id);
  const groups = (data ?? []).map((r) => ({ role: r.role, g: r.groups as unknown as { id: string; name: string; area: string | null; description: string | null; status: string } }));
  return (
    <>
      <PageHeader title="Community preparedness" description="Prepare together with neighbours, your purok, church or homeowners' association: shared checklists, tasks, events and discussions." />
      <Alert tone="info" className="mb-6">Groups are for preparedness activities. They are not for rescue requests or live emergency coordination — in an emergency call 911 and follow your LGU.</Alert>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {groups.length === 0 ? <EmptyState icon={<MessagesSquare />} title="You're not in any groups yet" description="Create one, or ask a coordinator for an invitation link." /> : (
            <ul className="grid gap-3 sm:grid-cols-2">{groups.map(({ role, g }) => (
              <li key={g.id}><Link href={`/community/${g.id}`}><Card className="h-full p-5 hover:border-brand-500">
                <div className="flex gap-2"><Badge tone={role === "member" ? "neutral" : "navy"}>{role}</Badge>{g.status !== "active" && <Badge tone="red">Suspended</Badge>}</div>
                <h2 className="mt-2 font-semibold">{g.name}</h2>{g.area && <p className="text-xs text-muted">{g.area}</p>}
                {g.description && <p className="mt-2 line-clamp-2 text-sm text-muted">{g.description}</p>}
              </Card></Link></li>))}</ul>)}
        </div>
        <Card className="self-start"><CardHeader><CardTitle>Create a group</CardTitle></CardHeader><CardContent>
          <ActionForm action={createGroup} className="flex flex-col gap-3">
            <Field label="Group name" htmlFor="gn"><Input id="gn" name="name" required maxLength={120} placeholder="Purok 3 Preparedness Circle" /><FieldError name="name" /></Field>
            <Field label="Area" htmlFor="ga"><Input id="ga" name="area" maxLength={120} placeholder="Brgy. Mandalagan, Bacolod" /></Field>
            <Field label="Description" htmlFor="gd"><Textarea id="gd" name="description" maxLength={2000} /></Field>
            <SubmitButton size="sm">Create group</SubmitButton>
          </ActionForm>
          <p className="mt-3 text-xs text-muted">You&apos;ll be the group owner and community coordinator.</p>
        </CardContent></Card>
      </div>
    </>
  );
}
