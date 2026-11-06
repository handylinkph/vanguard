import { Phone, Trash2, Printer } from "lucide-react";
import { requireUser, getMyHouseholds } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, PageHeader, Badge, Button, Input, Field, Select, Textarea, EmptyState } from "@/components/ui";
import { ActionForm, InlineAction, SubmitButton, FieldError } from "@/components/ui/form";
import { PrintButton } from "@/components/ui/copy-button";
import { saveContact, deleteContact } from "./actions";
import type { Contact } from "@/lib/types";

export const metadata = { title: "Emergency contacts" };

function ContactFields({ c, households }: { c?: Contact; households: { id: string; name: string }[] }) {
  const p = c?.id ?? "new";
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {c && <input type="hidden" name="id" value={c.id} />}
      <Field label="Name" htmlFor={`${p}-n`}><Input id={`${p}-n`} name="name" defaultValue={c?.name} required maxLength={120} /><FieldError name="name" /></Field>
      <Field label="Relationship" htmlFor={`${p}-r`}><Input id={`${p}-r`} name="relationship" defaultValue={c?.relationship ?? ""} maxLength={60} placeholder="e.g. Brother, Barangay captain" /></Field>
      <Field label="Phone" htmlFor={`${p}-p`}><Input id={`${p}-p`} name="phone" type="tel" defaultValue={c?.phone} required maxLength={40} placeholder="09XX XXX XXXX" /><FieldError name="phone" /></Field>
      <Field label="Alternate phone" htmlFor={`${p}-a`}><Input id={`${p}-a`} name="alt_phone" type="tel" defaultValue={c?.alt_phone ?? ""} maxLength={40} /></Field>
      <Field label="Email" htmlFor={`${p}-e`}><Input id={`${p}-e`} name="email" type="email" defaultValue={c?.email ?? ""} maxLength={200} /><FieldError name="email" /></Field>
      <Field label="Share with" htmlFor={`${p}-h`}>
        <Select id={`${p}-h`} name="household_id" defaultValue={c?.household_id ?? ""}>
          <option value="">Only me</option>
          {households.map((h) => <option key={h.id} value={h.id}>Household: {h.name}</option>)}
        </Select>
      </Field>
      <Field label="Priority (lower shows first)" htmlFor={`${p}-pr`}><Input id={`${p}-pr`} name="priority" type="number" min={0} max={1000} defaultValue={c?.priority ?? 100} /></Field>
      <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" name="is_out_of_area" defaultChecked={c?.is_out_of_area} />Out-of-area check-in contact</label>
      <Field label="Notes" htmlFor={`${p}-no`} className="sm:col-span-2"><Textarea id={`${p}-no`} name="notes" defaultValue={c?.notes ?? ""} maxLength={500} className="min-h-16" /></Field>
      <div className="sm:col-span-2"><SubmitButton size="sm">{c ? "Save changes" : "Add contact"}</SubmitButton></div>
    </div>
  );
}

export default async function ContactsPage() {
  const { supabase } = await requireUser();
  const households = (await getMyHouseholds()).map((m) => m.household);
  const { data } = await supabase.from("emergency_contacts").select("*").order("priority").order("name");
  const contacts = (data ?? []) as Contact[];
  const hhName = (id: string | null) => households.find((h) => h.id === id)?.name;

  return (
    <>
      <PageHeader title="Emergency contacts" description="Keep the people you'll need to reach in one place. Saved contacts are available offline." actions={<PrintButton label="Print contact card" />} />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          {contacts.length === 0 ? <EmptyState icon={<Phone />} title="No contacts yet" description="Add family, an out-of-area relative, your barangay and your doctor." /> : (
            <ul className="flex flex-col gap-3">
              {contacts.map((c) => (
                <li key={c.id}><Card className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{c.name} {c.relationship && <span className="font-normal text-muted">· {c.relationship}</span>}</p>
                      <p className="mt-1 flex flex-wrap gap-3 text-sm">
                        <a href={`tel:${c.phone.replace(/\s/g, "")}`} className="text-brand-700 underline">{c.phone}</a>
                        {c.alt_phone && <a href={`tel:${c.alt_phone.replace(/\s/g, "")}`} className="text-brand-700 underline">{c.alt_phone}</a>}
                        {c.email && <a href={`mailto:${c.email}`} className="text-brand-700 underline">{c.email}</a>}
                      </p>
                      <div className="mt-2 flex gap-2">
                        {c.is_out_of_area && <Badge tone="green">Out-of-area contact</Badge>}
                        {c.household_id ? <Badge tone="blue">Shared · {hhName(c.household_id) ?? "Household"}</Badge> : <Badge>Private</Badge>}
                      </div>
                    </div>
                    <InlineAction action={deleteContact} hidden={{ id: c.id }} confirm={`Delete ${c.name}?`} className="no-print">
                      <Button variant="ghost" size="icon" aria-label={`Delete ${c.name}`}><Trash2 /></Button>
                    </InlineAction>
                  </div>
                  <details className="no-print mt-2"><summary className="cursor-pointer text-xs text-brand-700">Edit</summary>
                    <div className="mt-3"><ActionForm action={saveContact}><ContactFields c={c} households={households} /></ActionForm></div></details>
                </Card></li>
              ))}
            </ul>
          )}
        </div>
        <Card className="no-print lg:col-span-2 self-start">
          <CardHeader><CardTitle>Add a contact</CardTitle></CardHeader>
          <CardContent><ActionForm action={saveContact} resetOnSuccess><ContactFields households={households} /></ActionForm></CardContent>
        </Card>
      </div>
      <p className="mt-6 hidden text-xs print:block"><Printer className="inline size-3" /> National emergency hotline: 911 · Printed from Vanguard</p>
    </>
  );
}
