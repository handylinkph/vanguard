import Link from "next/link";
import { notFound } from "next/navigation";
import { Printer, Download, Copy, Archive, CheckCircle2, Trash2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, PageHeader, Badge, Button, ButtonLink, Field, Input, Select, Textarea, Alert, Progress, buttonVariants } from "@/components/ui";
import { ActionForm, InlineAction, SubmitButton, FieldError } from "@/components/ui/form";
import { Repeater } from "@/components/forms/repeater";
import { PlanChecklist } from "@/components/plans/checklist";
import { HAZARD_LABEL, getGuide } from "@/content/guides";
import { saveSection, addChecklistItem, deleteChecklistItem, updatePlanMeta, setPlanStatus, duplicatePlan, deletePlan } from "../actions";
import type { Plan, PlanItem } from "@/lib/types";
import { cn, fmtDate } from "@/lib/utils";

const STEPS = [
  { key: "meeting", label: "Meeting places" },
  { key: "evacuation", label: "Evacuation" },
  { key: "responsibilities", label: "Responsibilities" },
  { key: "communication", label: "Communication" },
  { key: "checklist", label: "Checklist" },
  { key: "review", label: "Review & share" },
];

export default async function PlanPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ step?: string }> }) {
  const { id } = await params;
  const { step = "review" } = await searchParams;
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from("emergency_plans").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const plan = data as Plan;
  const [{ data: itemsData }, { data: canEditData }, { data: members }] = await Promise.all([
    supabase.from("plan_checklist_items").select("*").eq("plan_id", id).order("sort").order("label"),
    supabase.rpc("can_edit_plan", { pid: id }),
    plan.household_id ? supabase.from("household_members").select("display_name, age_group, needs_assistance").eq("household_id", plan.household_id) : Promise.resolve({ data: [] }),
  ]);
  const items = (itemsData ?? []) as PlanItem[];
  const canEdit = Boolean(canEditData);
  const isOwner = plan.owner_id === user.id;
  const s = plan.sections ?? {};
  const pct = items.length ? (items.filter((i) => i.done).length / items.length) * 100 : 0;
  const guide = getGuide(plan.hazard === "all" ? "general" : plan.hazard);
  const peopleOptions = [{ value: "", label: "Anyone" }, ...(members ?? []).map((m) => ({ value: m.display_name, label: m.display_name }))];
  const hidden = (st: string) => <><input type="hidden" name="plan_id" value={plan.id} /><input type="hidden" name="step" value={st} /></>;
  const saveButtons = (
    <div className="flex flex-wrap gap-2 pt-2">
      <SubmitButton name="continue" value="1">Save & continue</SubmitButton>
      <SubmitButton variant="outline">Save</SubmitButton>
    </div>
  );

  return (
    <>
      <PageHeader title={plan.title} eyebrow={`${plan.plan_type === "household" ? "Household" : "Personal"} plan · ${HAZARD_LABEL[plan.hazard] ?? plan.hazard}`}
        description={<span className="flex flex-wrap items-center gap-2"><Badge tone={plan.status === "active" ? "green" : plan.status === "draft" ? "amber" : "neutral"}>{plan.status}</Badge>
          {!isOwner && <Badge>Shared with you{canEdit ? " · you can edit" : " · view & tick checklist"}</Badge>}
          <span>Updated {fmtDate(plan.updated_at)}</span></span>}
        actions={<>
          <ButtonLink href={`/plans/${plan.id}/print`} variant="outline"><Printer />Print</ButtonLink>
          <a href={`/plans/${plan.id}/download?format=html`} className={buttonVariants({ variant: "outline" })} download><Download />Download</a>
        </>} />

      {plan.status === "draft" && canEdit && (
        <Alert tone="warning" className="mb-4">This plan is a draft. When you&apos;ve filled it in, activate it so it counts toward your readiness and shows on your dashboard.</Alert>
      )}

      <nav aria-label="Plan steps" className="mb-6 overflow-x-auto">
        <ol className="flex min-w-max gap-1">
          {STEPS.map((st, i) => (
            <li key={st.key}>
              <Link href={`/plans/${plan.id}?step=${st.key}`} aria-current={step === st.key ? "step" : undefined}
                className={cn("flex items-center gap-2 rounded-full px-3 py-1.5 text-sm", step === st.key ? "bg-navy text-white" : "bg-white border border-line hover:bg-surface")}>
                <span className={cn("grid size-5 place-items-center rounded-full text-xs", i < plan.current_step ? "bg-accent text-white" : step === st.key ? "bg-white/20" : "bg-surface")}>{i < plan.current_step ? "✓" : i + 1}</span>{st.label}
              </Link>
            </li>
          ))}
        </ol>
      </nav>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {step === "meeting" && (
            <Card><CardHeader><CardTitle>Where will you meet if you&apos;re separated?</CardTitle>
              <CardDescription>Choose one place near home (e.g. a neighbour&apos;s gate) and one outside the neighbourhood (e.g. a relative&apos;s house or a church) in case you can&apos;t get home.</CardDescription></CardHeader>
              <CardContent>{canEdit ? (
                <ActionForm action={saveSection} className="flex flex-col gap-3">{hidden("meeting")}
                  <Repeater prefix="mp" addLabel="Add meeting place" initial={(s.meeting_places ?? []).map((m) => ({ ...m, address: m.address ?? "" }))} columns={[
                    { name: "name", label: "Place" }, { name: "address", label: "Address / landmark" },
                    { name: "kind", label: "Type", type: "select", options: [{ value: "near", label: "Near home" }, { value: "far", label: "Outside neighbourhood" }] }]} />
                  {saveButtons}
                </ActionForm>) : <ReadList rows={(s.meeting_places ?? []).map((m) => `${m.name}${m.address ? " — " + m.address : ""}`)} />}
              </CardContent></Card>
          )}

          {step === "evacuation" && (
            <Card><CardHeader><CardTitle>Evacuation destinations</CardTitle>
              <CardDescription>Record your barangay&apos;s designated evacuation area (ask your barangay hall or MDRRMO) and an alternative such as a relative&apos;s home on higher ground. Vanguard does not verify evacuation site status.</CardDescription></CardHeader>
              <CardContent>{canEdit ? (
                <ActionForm action={saveSection} className="flex flex-col gap-3">{hidden("evacuation")}
                  <Repeater prefix="ev" addLabel="Add destination" initial={(s.evacuation_destinations ?? []).map((e) => ({ name: e.name, address: e.address ?? "", route: e.route ?? "", notes: e.notes ?? "" }))} columns={[
                    { name: "name", label: "Destination" }, { name: "address", label: "Address" }, { name: "route", label: "Route", placeholder: "Via main road, avoid creek" }, { name: "notes", label: "Notes" }]} />
                  {saveButtons}
                </ActionForm>) : <ReadList rows={(s.evacuation_destinations ?? []).map((e) => `${e.name}${e.route ? " — route: " + e.route : ""}`)} />}
              </CardContent></Card>
          )}

          {step === "responsibilities" && (
            <Card><CardHeader><CardTitle>Who does what?</CardTitle>
              <CardDescription>Give everyone a job, and make sure each child, older adult, person needing assistance and pet has someone responsible for them.</CardDescription></CardHeader>
              <CardContent>
                {(members ?? []).some((m) => m.needs_assistance || ["infant", "child", "senior"].includes(m.age_group)) && (
                  <Alert tone="info" className="mb-3">Your household includes: {(members ?? []).filter((m) => m.needs_assistance || ["infant", "child", "senior"].includes(m.age_group)).map((m) => m.display_name).join(", ")}. Assign someone to help each of them.</Alert>
                )}
                {canEdit ? (
                  <ActionForm action={saveSection} className="flex flex-col gap-3">{hidden("responsibilities")}
                    <Repeater prefix="rs" addLabel="Add responsibility" initial={(s.responsibilities ?? []).map((r) => ({ person: r.person, task: r.task }))} columns={[
                      { name: "person", label: "Person", type: peopleOptions.length > 1 ? "select" : "text", options: peopleOptions }, { name: "task", label: "Responsibility", placeholder: "Grab go-bags; carry baby; turn off main switch" }]} />
                    <Field label="Special considerations" htmlFor="sc"><Textarea id="sc" name="special_considerations" defaultValue={s.special_considerations ?? ""} maxLength={2000} placeholder="Medicines to bring, mobility aids, pets, etc." /></Field>
                    {saveButtons}
                  </ActionForm>) : <ReadList rows={(s.responsibilities ?? []).map((r) => `${r.person || "Anyone"}: ${r.task}`)} />}
              </CardContent></Card>
          )}

          {step === "communication" && (
            <Card><CardHeader><CardTitle>Communication plan</CardTitle>
              <CardDescription>Networks get congested in emergencies. Agree on one out-of-area contact everyone texts, and how you&apos;ll check in.</CardDescription></CardHeader>
              <CardContent>{canEdit ? (
                <ActionForm action={saveSection} className="flex flex-col gap-3">{hidden("communication")}
                  <Field label="Out-of-area contact (name and number)" htmlFor="ooa"><Input id="ooa" name="out_of_area_contact" defaultValue={s.communication?.out_of_area_contact ?? ""} maxLength={200} placeholder="Tita Rosa (Iloilo) 0917…" /></Field>
                  <Field label="How will you check in?" htmlFor="cim"><Textarea id="cim" name="check_in_method" defaultValue={s.communication?.check_in_method ?? ""} maxLength={500} placeholder="Text 'SAFE + location' to Tita Rosa; she updates the family group chat." /></Field>
                  <Field label="Family code word (optional)" htmlFor="cw" hint="For verifying who is allowed to pick up children."><Input id="cw" name="code_words" defaultValue={s.communication?.code_words ?? ""} maxLength={200} /></Field>
                  <Field label="Other notes" htmlFor="cn"><Textarea id="cn" name="comm_notes" defaultValue={s.communication?.notes ?? ""} maxLength={2000} /></Field>
                  <p className="text-xs text-muted">Your saved <Link className="underline" href="/contacts">emergency contacts</Link> are added to printed and downloaded copies automatically.</p>
                  {saveButtons}
                </ActionForm>) : <ReadList rows={[s.communication?.out_of_area_contact, s.communication?.check_in_method].filter(Boolean) as string[]} />}
              </CardContent></Card>
          )}

          {step === "checklist" && (
            <Card><CardHeader><CardTitle>Preparedness checklist</CardTitle><CardDescription>Tick items as you complete them — works offline too.</CardDescription></CardHeader>
              <CardContent>
                <PlanChecklist items={items} planId={plan.id} canDelete={canEdit} onDelete={canEdit ? deleteChecklistItem : undefined} />
                {canEdit && (
                  <ActionForm action={addChecklistItem} resetOnSuccess className="mt-4 grid gap-2 rounded-lg border border-dashed border-line p-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
                    <input type="hidden" name="plan_id" value={plan.id} />
                    <Field label="New task" htmlFor="nt"><Input id="nt" name="label" required maxLength={300} /><FieldError name="label" /></Field>
                    <Field label="Phase" htmlFor="np"><Select id="np" name="phase"><option value="before">Before</option><option value="during">During</option><option value="after">After</option></Select></Field>
                    <Field label="Assigned to" htmlFor="na"><Input id="na" name="assigned_to" maxLength={120} /></Field>
                    <SubmitButton size="sm">Add</SubmitButton>
                  </ActionForm>
                )}
                <div className="mt-4"><ButtonLink href={`/plans/${plan.id}?step=review`} variant="outline">Continue to review</ButtonLink></div>
              </CardContent></Card>
          )}

          {step === "review" && (
            <div className="flex flex-col gap-6">
              <Card><CardHeader><CardTitle>Summary</CardTitle></CardHeader>
                <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
                  <Summary label="Meeting places" n={s.meeting_places?.length ?? 0} href="meeting" id={plan.id} />
                  <Summary label="Evacuation destinations" n={s.evacuation_destinations?.length ?? 0} href="evacuation" id={plan.id} />
                  <Summary label="Responsibilities" n={s.responsibilities?.length ?? 0} href="responsibilities" id={plan.id} />
                  <Summary label="Out-of-area contact" n={s.communication?.out_of_area_contact ? 1 : 0} href="communication" id={plan.id} />
                  <div className="sm:col-span-2"><p className="mb-1 font-medium">Checklist</p><Progress value={pct} /><p className="mt-1 text-xs text-muted">{Math.round(pct)}% complete</p></div>
                </CardContent></Card>
              {canEdit && (
                <Card><CardHeader><CardTitle>Plan details & sharing</CardTitle></CardHeader>
                  <CardContent>
                    <ActionForm action={updatePlanMeta} className="flex flex-col gap-3">
                      <input type="hidden" name="id" value={plan.id} />
                      <Field label="Plan name" htmlFor="t"><Input id="t" name="title" defaultValue={plan.title} required maxLength={160} /></Field>
                      <Field label="Review by" htmlFor="rv" hint="Vanguard adds a reminder to your dashboard."><Input id="rv" name="review_on" type="date" defaultValue={plan.review_on ?? ""} /></Field>
                      {isOwner && plan.household_id && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="shared_with_household" defaultChecked={plan.shared_with_household} />Share with household members</label>}
                      <Field label="Notes" htmlFor="nn"><Textarea id="nn" name="notes" defaultValue={s.notes ?? ""} maxLength={4000} /></Field>
                      <SubmitButton size="sm">Save details</SubmitButton>
                    </ActionForm>
                  </CardContent></Card>
              )}
              <div className="flex flex-wrap gap-2">
                {canEdit && plan.status !== "active" && <InlineAction action={setPlanStatus} hidden={{ id: plan.id, status: "active" }}><Button variant="accent"><CheckCircle2 />Activate plan</Button></InlineAction>}
                {canEdit && plan.status !== "archived" && <InlineAction action={setPlanStatus} hidden={{ id: plan.id, status: "archived" }}><Button variant="outline"><Archive />Archive</Button></InlineAction>}
                {canEdit && plan.status === "archived" && <InlineAction action={setPlanStatus} hidden={{ id: plan.id, status: "draft" }}><Button variant="outline">Restore</Button></InlineAction>}
                <InlineAction action={duplicatePlan} hidden={{ id: plan.id }}><Button variant="outline"><Copy />Duplicate</Button></InlineAction>
                <a href={`/plans/${plan.id}/download?format=json`} className={buttonVariants({ variant: "ghost" })} download>Export JSON</a>
                {isOwner && <InlineAction action={deletePlan} hidden={{ id: plan.id }} confirm="Delete this plan permanently?"><Button variant="ghost" className="text-red-700"><Trash2 />Delete</Button></InlineAction>}
              </div>
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          {guide && (
            <Card><CardHeader><CardTitle className="text-sm">Related guidance: {guide.title}</CardTitle></CardHeader>
              <CardContent className="text-sm"><ul className="list-disc space-y-1 pl-5 text-muted">{guide.before.slice(0, 4).map((b) => <li key={b}>{b}</li>)}</ul>
                <Link href={`/guides/${guide.key}`} className="mt-2 inline-block text-brand-700 underline">Read the full guide</Link></CardContent></Card>
          )}
          <Alert tone="education">This is your household&apos;s own plan. It does not replace instructions from your LGU or national agencies.</Alert>
        </aside>
      </div>
    </>
  );
}

function ReadList({ rows }: { rows: string[] }) {
  return rows.length ? <ul className="list-disc space-y-1 pl-5 text-sm">{rows.map((r, i) => <li key={i}>{r}</li>)}</ul> : <p className="text-sm text-muted">Not filled in yet.</p>;
}
function Summary({ label, n, href, id }: { label: string; n: number; href: string; id: string }) {
  return (
    <Link href={`/plans/${id}?step=${href}`} className="flex items-center justify-between rounded-lg border border-line p-3 hover:bg-surface">
      <span>{label}</span>{n > 0 ? <Badge tone="green">{n} added</Badge> : <Badge tone="amber">Missing</Badge>}
    </Link>
  );
}
