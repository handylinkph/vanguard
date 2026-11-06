import Link from "next/link";
import { notFound } from "next/navigation";
import { Trash2, CheckSquare, Square, Printer } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, PageHeader, Badge, Button, ButtonLink, Field, Input, Select, Textarea, Alert, Progress, Stat } from "@/components/ui";
import { ActionForm, InlineAction, SubmitButton } from "@/components/ui/form";
import { CopyButton } from "@/components/ui/copy-button";
import { ORG_TEMPLATES } from "@/content/templates";
import { orgReadiness } from "@/lib/org";
import * as A from "../actions";
import { fmtDate, daysAgoISO } from "@/lib/utils";

const TABS = ["overview", "plans", "checklists", "assignments", "facilities", "contacts", "drills", "members"] as const;
const LISTS: Record<string, string> = { evacuation: "Evacuation", continuity: "Continuity", supplies: "Supplies & equipment", communication: "Communication" };

export default async function OrgPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; plan?: string }> }) {
  const { id } = await params; const sp = await searchParams; const tab = (TABS as readonly string[]).includes(sp.tab ?? "") ? sp.tab! : "overview";
  const { supabase, user } = await requireUser();
  const { data: org } = await supabase.from("organizations").select("*").eq("id", id).maybeSingle();
  if (!org) notFound();
  const yearAgo = daysAgoISO(365).slice(0, 10);
  const [members, plans, checklist, assignments, facilities, contacts, drills] = await Promise.all([
    supabase.from("org_members").select("user_id, role, display_name, title").eq("org_id", id).order("joined_at"),
    supabase.from("org_plans").select("*").eq("org_id", id).order("updated_at", { ascending: false }),
    supabase.from("org_checklist_items").select("*").eq("org_id", id).order("sort"),
    supabase.from("org_assignments").select("*").eq("org_id", id).order("status").order("due_on"),
    supabase.from("org_facilities").select("*").eq("org_id", id).order("name"),
    supabase.from("org_contacts").select("*").eq("org_id", id).order("name"),
    supabase.from("org_drills").select("*").eq("org_id", id).order("scheduled_for", { ascending: false }),
  ]);
  const me = (members.data ?? []).find((m) => m.user_id === user.id);
  if (!me) notFound();
  const isAdmin = me.role === "admin" && org.status === "active";
  const nameOf = (uid: string | null) => (members.data ?? []).find((m) => m.user_id === uid)?.display_name ?? "Unassigned";
  const r = orgReadiness({
    activePlans: (plans.data ?? []).filter((p) => p.status === "active").length,
    checklistDone: (checklist.data ?? []).filter((c) => c.done).length, checklistTotal: checklist.data?.length ?? 0,
    assignmentsDone: (assignments.data ?? []).filter((a) => a.status === "done").length, assignmentsTotal: assignments.data?.length ?? 0,
    drillsLast12m: (drills.data ?? []).filter((d) => d.completed_on && d.completed_on >= yearAgo).length,
    facilities: facilities.data?.length ?? 0, contacts: contacts.data?.length ?? 0,
  });
  const del = (table: string, rowId: string) => isAdmin && <InlineAction action={A.deleteOrgRow} hidden={{ table, id: rowId, org_id: id }} confirm="Delete this item?"><Button size="icon" variant="ghost" aria-label="Delete"><Trash2 /></Button></InlineAction>;

  return (
    <>
      <PageHeader title={org.name} eyebrow={`${org.org_type === "school" ? "School" : "Business"}${org.sector ? ` · ${org.sector}` : ""}${org.city ? ` · ${org.city}` : ""}`}
        actions={<><Badge tone={me.role === "admin" ? "navy" : "neutral"}>You: {me.role}</Badge><ButtonLink href={`/organizations/${id}/report`} variant="outline"><Printer />Readiness report</ButtonLink></>} />
      {org.status !== "active" && <Alert tone="error" className="mb-4">This organization is suspended by platform administrators. Records are read-only.</Alert>}
      <nav className="mb-5 flex flex-wrap gap-2" aria-label="Organization sections">{TABS.map((t) => (
        <Link key={t} href={`/organizations/${id}?tab=${t}`} aria-current={tab === t ? "page" : undefined} className={`rounded-full px-3 py-1.5 text-sm capitalize ${tab === t ? "bg-navy text-white" : "border border-line bg-white"}`}>{t}</Link>))}</nav>

      {tab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1"><CardContent className="pt-6"><p className="text-sm text-muted">Organizational readiness</p><p className="text-5xl font-semibold text-navy">{r.overall}%</p><Progress value={r.overall} className="mt-3" />
            <p className="mt-2 text-xs text-muted">Completion-based tracking of plans, checklists, assignments, drills and records. Not a safety certification.</p></CardContent></Card>
          <Card className="lg:col-span-2"><CardHeader><CardTitle>Breakdown</CardTitle></CardHeader><CardContent className="flex flex-col gap-3">
            {r.parts.map((p) => <div key={p.label}><div className="flex justify-between text-sm"><span>{p.label}</span><span>{p.value}%</span></div><Progress value={p.value} label={p.label} /></div>)}
          </CardContent></Card>
          <div className="grid grid-cols-2 gap-3 lg:col-span-3 lg:grid-cols-4">
            <Stat label="Members" value={members.data?.length ?? 0} /><Stat label="Plans" value={plans.data?.length ?? 0} sub={`${(plans.data ?? []).filter((p) => p.status === "active").length} active`} />
            <Stat label="Open assignments" value={(assignments.data ?? []).filter((a) => a.status !== "done").length} /><Stat label="Upcoming drills" value={(drills.data ?? []).filter((d) => !d.completed_on).length} />
          </div>
        </div>
      )}

      {tab === "plans" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-4 lg:col-span-2">
            {(plans.data ?? []).length === 0 && <p className="text-sm text-muted">No plans yet.</p>}
            {(plans.data ?? []).map((p) => (
              <Card key={p.id}><CardHeader><div className="flex items-center justify-between"><CardTitle>{p.title}</CardTitle><div className="flex items-center gap-2"><Badge tone={p.status === "active" ? "green" : "amber"}>{p.status}</Badge>{del("org_plans", p.id)}</div></div>
                <p className="text-xs text-muted">Updated {fmtDate(p.updated_at)}{p.review_on ? ` · review ${fmtDate(p.review_on)}` : ""}</p></CardHeader>
                <CardContent>{isAdmin ? (
                  <details open={sp.plan === p.id}><summary className="cursor-pointer text-sm text-brand-700">Edit plan</summary>
                    <ActionForm action={A.saveOrgPlan} className="mt-3 flex flex-col gap-3">
                      <input type="hidden" name="id" value={p.id} /><input type="hidden" name="org_id" value={id} />
                      <div className="grid gap-3 sm:grid-cols-3"><Field label="Title" htmlFor={`t-${p.id}`}><Input id={`t-${p.id}`} name="title" defaultValue={p.title} /></Field>
                        <Field label="Status" htmlFor={`s-${p.id}`}><Select id={`s-${p.id}`} name="status" defaultValue={p.status}><option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option></Select></Field>
                        <Field label="Review by" htmlFor={`r-${p.id}`}><Input id={`r-${p.id}`} name="review_on" type="date" defaultValue={p.review_on ?? ""} /></Field></div>
                      {Object.entries(p.sections as Record<string, string>).map(([k, v]) => (
                        <Field key={k} label={k} htmlFor={`${p.id}-${k}`}><Textarea id={`${p.id}-${k}`} name={`sec:${k}`} defaultValue={v} maxLength={8000} /></Field>))}
                      <SubmitButton size="sm" className="self-start">Save plan</SubmitButton>
                    </ActionForm></details>
                ) : (
                  <div className="flex flex-col gap-3 text-sm">{Object.entries(p.sections as Record<string, string>).map(([k, v]) => <div key={k}><p className="font-medium">{k}</p><p className="whitespace-pre-wrap text-muted">{v || "—"}</p></div>)}</div>
                )}</CardContent></Card>))}
          </div>
          {isAdmin && <Card className="self-start"><CardHeader><CardTitle>New plan from template</CardTitle></CardHeader><CardContent>
            <ActionForm action={A.createOrgPlan} className="flex flex-col gap-3"><input type="hidden" name="org_id" value={id} />
              <Field label="Template" htmlFor="tk"><Select id="tk" name="template_key">{ORG_TEMPLATES.filter((t) => t.for.includes(org.org_type)).map((t) => <option key={t.key} value={t.key}>{t.title}</option>)}</Select></Field>
              <Field label="Title" htmlFor="pt"><Input id="pt" name="title" required maxLength={200} defaultValue={`${org.name} emergency plan`} /></Field>
              <SubmitButton size="sm">Create plan</SubmitButton></ActionForm></CardContent></Card>}
        </div>
      )}

      {tab === "checklists" && (
        <div className="grid gap-6 lg:grid-cols-2">
          {Object.entries(LISTS).map(([key, label]) => {
            const items = (checklist.data ?? []).filter((c) => c.list_key === key);
            return (
              <Card key={key}><CardHeader><CardTitle>{label} checklist</CardTitle><p className="text-xs text-muted">{items.filter((i) => i.done).length}/{items.length} complete</p></CardHeader><CardContent>
                <ul className="flex flex-col gap-2">{items.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2">
                    {isAdmin ? <InlineAction action={A.toggleOrgChecklist} hidden={{ id: c.id, org_id: id, done: String(c.done) }}><button className="flex items-center gap-2 text-left text-sm" aria-pressed={c.done}>{c.done ? <CheckSquare className="size-5 text-accent" /> : <Square className="size-5 text-muted" />}<span className={c.done ? "line-through text-muted" : ""}>{c.label}</span></button></InlineAction>
                      : <span className="flex items-center gap-2 text-sm">{c.done ? <CheckSquare className="size-5 text-accent" /> : <Square className="size-5 text-muted" />}{c.label}</span>}
                    {del("org_checklist_items", c.id)}</li>))}</ul>
                {isAdmin && <ActionForm action={A.addOrgChecklist} resetOnSuccess className="mt-3 flex gap-2"><input type="hidden" name="org_id" value={id} /><input type="hidden" name="list_key" value={key} />
                  <label htmlFor={`add-${key}`} className="sr-only">New item</label><Input id={`add-${key}`} name="label" required maxLength={300} placeholder="New item" /><SubmitButton size="sm" variant="outline">Add</SubmitButton></ActionForm>}
              </CardContent></Card>);
          })}
        </div>
      )}

      {tab === "assignments" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2"><CardHeader><CardTitle>Preparedness assignments</CardTitle></CardHeader><CardContent>
            <ul className="divide-y divide-line">{(assignments.data ?? []).map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <div><p className="font-medium">{a.title}</p><p className="text-xs text-muted">{nameOf(a.assignee_id)}{a.due_on ? ` · due ${fmtDate(a.due_on)}` : ""}</p></div>
                <div className="flex items-center gap-1"><Badge tone={a.status === "done" ? "green" : "neutral"}>{a.status.replace("_", " ")}</Badge>
                  {(isAdmin || a.assignee_id === user.id) && a.status !== "done" && <InlineAction action={A.setAssignmentStatus} hidden={{ id: a.id, org_id: id, status: a.status === "open" ? "in_progress" : "done" }}><Button size="sm" variant="outline">{a.status === "open" ? "Start" : "Done"}</Button></InlineAction>}
                  {del("org_assignments", a.id)}</div>
              </li>))}</ul>
            {(assignments.data ?? []).length === 0 && <p className="text-sm text-muted">No assignments.</p>}
          </CardContent></Card>
          {isAdmin && <Card className="self-start"><CardHeader><CardTitle>Assign a task</CardTitle></CardHeader><CardContent>
            <ActionForm action={A.saveAssignment} resetOnSuccess className="flex flex-col gap-3"><input type="hidden" name="org_id" value={id} />
              <Field label="Task" htmlFor="at"><Input id="at" name="title" required maxLength={200} placeholder="Inspect fire extinguishers on 2F" /></Field>
              <Field label="Assignee" htmlFor="aa"><Select id="aa" name="assignee_id"><option value="">Unassigned</option>{(members.data ?? []).map((m) => <option key={m.user_id} value={m.user_id}>{m.display_name}</option>)}</Select></Field>
              <Field label="Due" htmlFor="ad"><Input id="ad" name="due_on" type="date" /></Field>
              <SubmitButton size="sm">Assign</SubmitButton></ActionForm></CardContent></Card>}
        </div>
      )}

      {tab === "facilities" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-4 lg:col-span-2">{(facilities.data ?? []).map((f) => (
            <Card key={f.id}><CardHeader><div className="flex justify-between"><CardTitle>{f.name}</CardTitle>{del("org_facilities", f.id)}</div><p className="text-xs text-muted">{f.address}{f.occupancy ? ` · occupancy ${f.occupancy}` : ""}{f.floors ? ` · ${f.floors} floors` : ""}</p></CardHeader>
              <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
                <div><p className="font-medium">Assembly points</p><p className="whitespace-pre-wrap text-muted">{f.assembly_points || "—"}</p></div>
                <div><p className="font-medium">Evacuation routes</p><p className="whitespace-pre-wrap text-muted">{f.evacuation_routes || "—"}</p></div>
                <div><p className="font-medium">Safety equipment</p><p className="whitespace-pre-wrap text-muted">{f.equipment || "—"}</p></div>
                <div><p className="font-medium">Notes</p><p className="whitespace-pre-wrap text-muted">{f.notes || "—"}</p></div>
              </CardContent></Card>))}
            {(facilities.data ?? []).length === 0 && <p className="text-sm text-muted">No facility records.</p>}</div>
          {isAdmin && <Card className="self-start"><CardHeader><CardTitle>Add facility</CardTitle></CardHeader><CardContent>
            <ActionForm action={A.saveFacility} resetOnSuccess className="flex flex-col gap-3"><input type="hidden" name="org_id" value={id} />
              <Field label="Building / site name" htmlFor="fn"><Input id="fn" name="name" required maxLength={200} /></Field>
              <Field label="Address" htmlFor="fa"><Input id="fa" name="address" maxLength={300} /></Field>
              <div className="grid grid-cols-2 gap-2"><Field label="Occupancy" htmlFor="fo"><Input id="fo" name="occupancy" type="number" min={0} /></Field><Field label="Floors" htmlFor="ff"><Input id="ff" name="floors" type="number" min={0} /></Field></div>
              <Field label="Assembly points" htmlFor="fap"><Textarea id="fap" name="assembly_points" maxLength={1000} className="min-h-16" /></Field>
              <Field label="Evacuation routes" htmlFor="fer"><Textarea id="fer" name="evacuation_routes" maxLength={2000} className="min-h-16" /></Field>
              <Field label="Safety equipment" htmlFor="fe"><Textarea id="fe" name="equipment" maxLength={2000} className="min-h-16" placeholder="Extinguishers, alarms, first aid kits…" /></Field>
              <SubmitButton size="sm">Add facility</SubmitButton></ActionForm></CardContent></Card>}
        </div>
      )}

      {tab === "contacts" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2"><CardHeader><CardTitle>Emergency contact directory</CardTitle></CardHeader><CardContent>
            <ul className="divide-y divide-line">{(contacts.data ?? []).map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2 text-sm"><span><span className="font-medium">{c.name}</span>{c.role && <span className="text-muted"> · {c.role}</span>}{c.is_external && <Badge className="ml-1">External</Badge>}</span>
                <span className="flex items-center gap-3">{c.phone && <a className="text-brand-700 underline" href={`tel:${c.phone.replace(/[^\d+]/g, "")}`}>{c.phone}</a>}{c.email && <a className="text-brand-700 underline" href={`mailto:${c.email}`}>{c.email}</a>}{del("org_contacts", c.id)}</span></li>))}</ul>
            {(contacts.data ?? []).length === 0 && <p className="text-sm text-muted">No contacts.</p>}
          </CardContent></Card>
          {isAdmin && <Card className="self-start"><CardHeader><CardTitle>Add contact</CardTitle></CardHeader><CardContent>
            <ActionForm action={A.saveOrgContact} resetOnSuccess className="flex flex-col gap-3"><input type="hidden" name="org_id" value={id} />
              <Field label="Name" htmlFor="cn"><Input id="cn" name="name" required maxLength={120} /></Field>
              <Field label="Role" htmlFor="cr"><Input id="cr" name="role" maxLength={120} placeholder="Floor warden, School nurse, BFP station" /></Field>
              <Field label="Phone" htmlFor="cp"><Input id="cp" name="phone" type="tel" maxLength={40} /></Field>
              <Field label="Email" htmlFor="ce"><Input id="ce" name="email" type="email" maxLength={200} /></Field>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_external" />External (agency, supplier, etc.)</label>
              <SubmitButton size="sm">Add contact</SubmitButton></ActionForm></CardContent></Card>}
        </div>
      )}

      {tab === "drills" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-3 lg:col-span-2">{(drills.data ?? []).map((d) => (
            <Card key={d.id}><CardContent className="pt-5 text-sm">
              <div className="flex justify-between"><p className="font-medium">{d.title} <Badge tone="blue">{d.drill_type}</Badge></p>{del("org_drills", d.id)}</div>
              <p className="text-xs text-muted">Scheduled {fmtDate(d.scheduled_for)}{d.completed_on ? ` · completed ${fmtDate(d.completed_on)} · ${d.participants ?? 0} participants${d.evacuation_minutes ? ` · evacuated in ${d.evacuation_minutes} min` : ""}` : ""}</p>
              {d.observations && <p className="mt-2 whitespace-pre-wrap">{d.observations}</p>}
              {!d.completed_on && isAdmin && (
                <details className="mt-2"><summary className="cursor-pointer text-brand-700">Record results</summary>
                  <ActionForm action={A.completeOrgDrill} className="mt-2 grid gap-2 sm:grid-cols-3"><input type="hidden" name="id" value={d.id} /><input type="hidden" name="org_id" value={id} />
                    <Field label="Date" htmlFor={`dc-${d.id}`}><Input id={`dc-${d.id}`} name="completed_on" type="date" required defaultValue={d.scheduled_for} /></Field>
                    <Field label="Participants" htmlFor={`dp-${d.id}`}><Input id={`dp-${d.id}`} name="participants" type="number" min={0} required /></Field>
                    <Field label="Evacuation time (min)" htmlFor={`dm-${d.id}`}><Input id={`dm-${d.id}`} name="evacuation_minutes" type="number" min={0} step="0.1" /></Field>
                    <Field label="Observations & improvements" htmlFor={`do-${d.id}`} className="sm:col-span-3"><Textarea id={`do-${d.id}`} name="observations" maxLength={3000} /></Field>
                    <SubmitButton size="sm" className="self-start">Save results</SubmitButton></ActionForm></details>)}
            </CardContent></Card>))}
            {(drills.data ?? []).length === 0 && <p className="text-sm text-muted">No drills yet.</p>}</div>
          {isAdmin && <Card className="self-start"><CardHeader><CardTitle>Schedule a drill</CardTitle></CardHeader><CardContent>
            <ActionForm action={A.saveOrgDrill} resetOnSuccess className="flex flex-col gap-3"><input type="hidden" name="org_id" value={id} />
              <Field label="Title" htmlFor="dt"><Input id="dt" name="title" required maxLength={200} placeholder="Q1 earthquake drill" /></Field>
              <Field label="Type" htmlFor="dty"><Select id="dty" name="drill_type">{["earthquake", "fire", "flood", "typhoon", "tsunami", "lockdown", "other"].map((t) => <option key={t} value={t}>{t}</option>)}</Select></Field>
              <Field label="Date" htmlFor="dd"><Input id="dd" name="scheduled_for" type="date" required /></Field>
              <SubmitButton size="sm">Schedule</SubmitButton></ActionForm></CardContent></Card>}
        </div>
      )}

      {tab === "members" && <Members orgId={id} isAdmin={isAdmin} userId={user.id} members={members.data ?? []} />}
    </>
  );
}

async function Members({ orgId, isAdmin, userId, members }: { orgId: string; isAdmin: boolean; userId: string; members: { user_id: string; role: string; display_name: string; title: string | null }[] }) {
  const { supabase } = await requireUser();
  const invites = isAdmin ? (await supabase.from("org_invites").select("*").eq("org_id", orgId).gt("expires_at", new Date().toISOString())).data ?? [] : [];
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2"><CardHeader><CardTitle>Members ({members.length})</CardTitle><p className="text-sm text-muted">Members can view plans, checklists and drills and update their own assignments. Administrators manage everything.</p></CardHeader><CardContent>
        <ul className="divide-y divide-line">{members.map((m) => (
          <li key={m.user_id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
            <span>{m.display_name}{m.user_id === userId && " (you)"} <Badge tone={m.role === "admin" ? "navy" : "neutral"}>{m.role}</Badge></span>
            <span className="flex gap-1">{isAdmin && m.user_id !== userId && <>
              <InlineAction action={A.setOrgMemberRole} hidden={{ org_id: orgId, user_id: m.user_id, role: m.role === "admin" ? "member" : "admin" }}><Button size="sm" variant="ghost">{m.role === "admin" ? "Make member" : "Make admin"}</Button></InlineAction>
              <InlineAction action={A.removeOrgMember} hidden={{ org_id: orgId, user_id: m.user_id }} confirm={`Remove ${m.display_name}?`}><Button size="sm" variant="ghost" className="text-red-700">Remove</Button></InlineAction></>}
              {m.user_id === userId && <InlineAction action={A.removeOrgMember} hidden={{ org_id: orgId, user_id: m.user_id }} confirm="Leave this organization?"><Button size="sm" variant="ghost">Leave</Button></InlineAction>}</span>
          </li>))}</ul></CardContent></Card>
      {isAdmin && <Card className="self-start"><CardHeader><CardTitle>Invite members</CardTitle></CardHeader><CardContent className="flex flex-col gap-3">
        <ActionForm action={A.createOrgInvite} className="flex flex-col gap-2"><input type="hidden" name="org_id" value={orgId} />
          <Field label="Role" htmlFor="ir"><Select id="ir" name="role"><option value="member">Member</option><option value="admin">Administrator</option></Select></Field>
          <Field label="Max uses" htmlFor="im"><Input id="im" name="max_uses" type="number" min={1} max={2000} defaultValue={50} /></Field>
          <SubmitButton size="sm">Create link</SubmitButton></ActionForm>
        {invites.map((i) => <div key={i.id} className="flex items-center justify-between rounded-lg border border-line p-2 text-xs"><span>{i.role} · {i.uses}/{i.max_uses}</span><CopyButton text={`/invite/org/${i.token}`} /></div>)}
      </CardContent></Card>}
    </div>
  );
}
