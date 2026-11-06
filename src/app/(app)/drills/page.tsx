import Link from "next/link";
import { Timer, Trash2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, PageHeader, Badge, Button, Field, Input, Select, Alert, ButtonLink } from "@/components/ui";
import { ActionForm, InlineAction, SubmitButton } from "@/components/ui/form";
import { scenarios, getScenario } from "@/content/scenarios";
import { HAZARD_LABEL } from "@/content/guides";
import { scheduleDrill, deleteSchedule } from "./actions";
import { fmtDate } from "@/lib/utils";

export const metadata = { title: "Drills & simulations" };

export default async function Drills({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const sp = await searchParams;
  const { supabase, user } = await requireUser();
  const [{ data: runs }, { data: schedules }] = await Promise.all([
    supabase.from("drill_runs").select("id, scenario_key, mode, score, max_score, completed_at, duration_seconds, participants, user_id").order("completed_at", { ascending: false }).limit(30),
    supabase.from("drill_schedules").select("*").eq("done", false).order("scheduled_for"),
  ]);
  return (
    <>
      <PageHeader title="Drills & simulations" description="Practise decisions in short scenarios, and run real household drills with a timer and checklist. For learning only — not a certification." />
      {sp.saved && <Alert tone="success" className="mb-4">Drill recorded. Nice work keeping your household practised.</Alert>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {scenarios.map((s) => (
          <Card key={s.key} className="flex flex-col p-5">
            <div className="flex gap-2"><Badge tone="blue">{HAZARD_LABEL[s.hazard]}</Badge><Badge>{s.minutes} min</Badge></div>
            <h2 className="mt-3 font-semibold">{s.title}</h2><p className="mt-1 flex-1 text-sm text-muted">{s.summary}</p>
            <div className="mt-4 flex flex-wrap gap-2"><ButtonLink href={`/drills/${s.key}`} size="sm">Start simulation</ButtonLink><ButtonLink href={`/drills/${s.key}?mode=household`} size="sm" variant="outline">Household drill</ButtonLink></div>
          </Card>))}
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>Practice history</CardTitle></CardHeader><CardContent>
          {(runs ?? []).length === 0 ? <p className="text-sm text-muted">No drills yet.</p> : (
            <ul className="divide-y divide-line">{runs!.map((r) => {
              const s = getScenario(r.scenario_key); const pct = r.max_score ? Math.round((r.score / r.max_score) * 100) : 0;
              return (<li key={r.id} className="flex items-center justify-between py-2 text-sm">
                <span><span className="font-medium">{s?.title ?? r.scenario_key}</span><span className="ml-2 text-xs text-muted">{r.mode === "simulation" ? "Simulation" : `Household drill · ${r.participants ?? "?"} people`} · {fmtDate(r.completed_at)}{r.user_id !== user.id ? " · by household member" : ""}</span></span>
                <span className="flex items-center gap-2">{r.duration_seconds ? <span className="text-xs text-muted"><Timer className="mr-1 inline size-3" />{Math.round(r.duration_seconds / 60 * 10) / 10} min</span> : null}<Badge tone={pct >= 80 ? "green" : pct >= 50 ? "blue" : "amber"}>{pct}%</Badge></span>
              </li>);
            })}</ul>)}
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Scheduled drills</CardTitle></CardHeader><CardContent className="flex flex-col gap-4">
          {(schedules ?? []).length > 0 && <ul className="divide-y divide-line">{schedules!.map((d) => (
            <li key={d.id} className="flex items-center justify-between py-2 text-sm"><span><span className="font-medium">{getScenario(d.scenario_key)?.title}</span> · {fmtDate(d.scheduled_for)}{d.notes ? ` · ${d.notes}` : ""}</span>
              <span className="flex gap-1"><Link href={`/drills/${d.scenario_key}?mode=household`} className="text-brand-700 underline">Run</Link>
                <InlineAction action={deleteSchedule} hidden={{ id: d.id }}><Button variant="ghost" size="icon" aria-label="Delete schedule"><Trash2 /></Button></InlineAction></span></li>))}</ul>}
          <ActionForm action={scheduleDrill} resetOnSuccess className="grid gap-3 sm:grid-cols-2">
            <Field label="Drill" htmlFor="sk"><Select id="sk" name="scenario_key">{scenarios.map((s) => <option key={s.key} value={s.key}>{s.title}</option>)}</Select></Field>
            <Field label="Date" htmlFor="sf"><Input id="sf" name="scheduled_for" type="date" required /></Field>
            <Field label="Notes" htmlFor="sn" className="sm:col-span-2"><Input id="sn" name="notes" maxLength={300} placeholder="e.g. After Sunday lunch, whole family" /></Field>
            <SubmitButton size="sm" className="self-start">Schedule drill</SubmitButton>
          </ActionForm>
        </CardContent></Card>
      </div>
    </>
  );
}
