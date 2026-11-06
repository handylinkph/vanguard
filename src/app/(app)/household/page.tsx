import Link from "next/link";
import { Users, PawPrint, Link2, Trash2 } from "lucide-react";
import { requireUser, getMyHouseholds } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, PageHeader, Badge, Button, Input, Field, Select, Alert } from "@/components/ui";
import { ActionForm, InlineAction, SubmitButton } from "@/components/ui/form";
import { CopyButton } from "@/components/ui/copy-button";
import { HouseholdFields } from "@/components/household/household-form";
import { MemberFields } from "@/components/household/member-form";
import { createHousehold, updateHousehold, addDependent, updateMember, removeMember, setMemberRole, addPet, removePet, createInvite, revokeInvite, leaveHousehold } from "./actions";
import type { HouseholdMember } from "@/lib/types";
import { fmtDate } from "@/lib/utils";

export const metadata = { title: "Household" };

const AGE: Record<string, string> = { infant: "Infant", child: "Child", teen: "Teen", adult: "Adult", senior: "Older adult" };

export default async function HouseholdPage({ searchParams }: { searchParams: Promise<{ id?: string; new?: string; error?: string }> }) {
  const sp = await searchParams;
  const { supabase, user } = await requireUser();
  const mine = await getMyHouseholds();

  if (mine.length === 0 || sp.new) {
    return (
      <>
        <PageHeader title="Set up your household" description="Your household profile helps Vanguard size your kits, tailor your plan and share it with family members you invite." />
        <Card><CardContent className="pt-5"><ActionForm action={createHousehold}><HouseholdFields /></ActionForm></CardContent></Card>
      </>
    );
  }

  const current = mine.find((m) => m.household.id === sp.id) ?? mine[0];
  const h = current.household;
  const isAdmin = current.role === "admin";
  const [{ data: members }, { data: pets }, { data: invites }] = await Promise.all([
    supabase.from("household_members").select("*").eq("household_id", h.id).order("created_at"),
    supabase.from("household_pets").select("*").eq("household_id", h.id),
    isAdmin ? supabase.from("household_invites").select("*").eq("household_id", h.id).is("accepted_at", null).gt("expires_at", new Date().toISOString()) : Promise.resolve({ data: [] }),
  ]);
  const list = (members ?? []) as HouseholdMember[];

  return (
    <>
      <PageHeader title={h.name} eyebrow="Household" description={[h.barangay, h.city, h.region].filter(Boolean).join(", ") || "Location not set"}
        actions={<>
          {mine.length > 1 && <form className="flex gap-2"><Select name="id" defaultValue={h.id} aria-label="Switch household">{mine.map((m) => <option key={m.household.id} value={m.household.id}>{m.household.name}</option>)}</Select><Button variant="outline">Switch</Button></form>}
          <Link href="/household?new=1" className="text-sm text-brand-700 underline self-center">New household</Link>
        </>} />

      {sp.error && <Alert tone="error" className="mb-4">{sp.error.slice(0, 200)}</Alert>}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Users className="size-4" />Members ({list.length})</CardTitle>
              <CardDescription>Account holders can view shared plans and kits. Dependents are people in your care who don&apos;t have an account.</CardDescription></CardHeader>
            <CardContent>
              <ul className="divide-y divide-line">
                {list.map((m) => (
                  <li key={m.id} className="py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{m.display_name} {m.user_id === user.id && <span className="text-xs text-muted">(you)</span>}</p>
                        <p className="text-xs text-muted">{[m.relationship, AGE[m.age_group]].filter(Boolean).join(" · ")}{m.responsibilities ? ` · ${m.responsibilities}` : ""}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone={m.role === "admin" ? "navy" : m.role === "member" ? "blue" : "neutral"}>{m.role === "dependent" ? "Dependent" : m.role === "admin" ? "Administrator" : "Member"}</Badge>
                        {m.needs_assistance && <Badge tone="amber">Needs assistance</Badge>}
                        {isAdmin && m.user_id && m.user_id !== user.id && (
                          <InlineAction action={setMemberRole} hidden={{ id: m.id, role: m.role === "admin" ? "member" : "admin" }}>
                            <Button variant="ghost" size="sm">{m.role === "admin" ? "Make member" : "Make admin"}</Button>
                          </InlineAction>
                        )}
                        {isAdmin && m.user_id !== user.id && (
                          <InlineAction action={removeMember} hidden={{ id: m.id }} confirm={`Remove ${m.display_name} from the household?`}>
                            <Button variant="ghost" size="icon" aria-label={`Remove ${m.display_name}`}><Trash2 /></Button>
                          </InlineAction>
                        )}
                      </div>
                    </div>
                    {(isAdmin || m.user_id === user.id) && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-brand-700">Edit details</summary>
                        <div className="mt-3"><ActionForm action={updateMember}><MemberFields householdId={h.id} m={m} submit="Save" /></ActionForm></div>
                      </details>
                    )}
                    {m.care_notes && <p className="mt-1 rounded bg-surface p-2 text-xs">Care notes: {m.care_notes}</p>}
                  </li>
                ))}
              </ul>
              {isAdmin && (
                <details className="mt-4 rounded-lg border border-line p-4">
                  <summary className="cursor-pointer text-sm font-medium">Add a dependent (child, older adult, or anyone without an account)</summary>
                  <div className="mt-3"><ActionForm action={addDependent} resetOnSuccess><MemberFields householdId={h.id} /></ActionForm></div>
                </details>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><PawPrint className="size-4" />Pets</CardTitle></CardHeader>
            <CardContent>
              {(pets ?? []).length === 0 ? <p className="text-sm text-muted">No pets recorded.</p> : (
                <ul className="mb-3 flex flex-wrap gap-2">{pets!.map((p) => (
                  <li key={p.id} className="flex items-center gap-1 rounded-full border border-line px-3 py-1 text-sm">{p.name}{p.species ? ` (${p.species})` : ""}
                    {isAdmin && <InlineAction action={removePet} hidden={{ id: p.id }}><button aria-label={`Remove ${p.name}`} className="ml-1 text-muted hover:text-red-600">×</button></InlineAction>}</li>
                ))}</ul>
              )}
              {isAdmin && (
                <ActionForm action={addPet} resetOnSuccess className="mt-2 flex flex-wrap items-end gap-2">
                  <input type="hidden" name="household_id" value={h.id} />
                  <Field label="Name" htmlFor="pet-name"><Input id="pet-name" name="name" required maxLength={60} className="w-40" /></Field>
                  <Field label="Species" htmlFor="pet-species"><Input id="pet-species" name="species" maxLength={40} className="w-32" placeholder="Dog, cat…" /></Field>
                  <SubmitButton size="sm" variant="outline">Add pet</SubmitButton>
                </ActionForm>
              )}
            </CardContent>
          </Card>

          {isAdmin && (
            <Card>
              <CardHeader><CardTitle>Household details</CardTitle></CardHeader>
              <CardContent><ActionForm action={updateHousehold}><input type="hidden" name="id" value={h.id} /><HouseholdFields h={h} /></ActionForm></CardContent>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-6">
          {isAdmin && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Link2 className="size-4" />Invite family members</CardTitle>
                <CardDescription>Create a private link. Anyone with the link can join until it&apos;s used or expires (7 days).</CardDescription></CardHeader>
              <CardContent className="flex flex-col gap-3">
                <ActionForm action={createInvite} className="flex flex-col gap-2">
                  <input type="hidden" name="household_id" value={h.id} />
                  <Field label="Role" htmlFor="inv-role"><Select id="inv-role" name="role"><option value="member">Member — can view shared plans and update kits</option><option value="admin">Administrator — can manage household</option></Select></Field>
                  <Field label="Note (optional)" htmlFor="inv-note"><Input id="inv-note" name="note" maxLength={200} placeholder="e.g. For Tita Rosa" /></Field>
                  <SubmitButton size="sm">Create invitation link</SubmitButton>
                </ActionForm>
                {(invites ?? []).map((i) => (
                  <div key={i.id} className="rounded-lg border border-line p-3 text-xs">
                    <p className="font-medium">{i.note || "Invitation"} · {i.role}</p>
                    <p className="text-muted">Expires {fmtDate(i.expires_at)}</p>
                    <div className="mt-2 flex gap-2"><CopyButton text={`/invite/household/${i.token}`} />
                      <InlineAction action={revokeInvite} hidden={{ id: i.id }}><Button variant="ghost" size="sm">Revoke</Button></InlineAction></div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          <Alert tone="info" title="Privacy">Household details are visible only to household members. Vanguard administrators cannot view your household information.</Alert>
          <InlineAction action={leaveHousehold} hidden={{ household_id: h.id }} confirm="Leave this household? You'll lose access to its shared plans and kits.">
            <Button variant="ghost" size="sm" className="text-red-700">Leave household</Button>
          </InlineAction>
        </div>
      </div>
    </>
  );
}
