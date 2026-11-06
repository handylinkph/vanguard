import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, PageHeader, Field, Input, Textarea, Alert } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { Simulation } from "@/components/drills/simulation";
import { DrillTimer } from "@/components/drills/timer";
import { getScenario } from "@/content/scenarios";
import { getGuide } from "@/content/guides";
import { saveHouseholdDrill } from "../actions";

export default async function DrillPage({ params, searchParams }: { params: Promise<{ key: string }>; searchParams: Promise<{ mode?: string }> }) {
  const { key } = await params; const { mode } = await searchParams;
  const s = getScenario(key); if (!s) notFound();
  const guide = getGuide(s.hazard);
  if (mode === "household") {
    return (
      <>
        <PageHeader eyebrow="Household drill" title={s.title} description="Run a real practice with your household. Start the timer, act out the plan, then record what happened." />
        <Alert tone="warning" className="mb-4">Practise safely: do not use real fire, do not block roads, and tell neighbours if your drill may cause concern. This is not a certification.</Alert>
        <ActionForm action={saveHouseholdDrill} className="grid gap-6 lg:grid-cols-2">
          <input type="hidden" name="scenario_key" value={s.key} />
          <Card><CardHeader><CardTitle>1 · Timer</CardTitle></CardHeader><CardContent><DrillTimer /></CardContent></Card>
          <Card><CardHeader><CardTitle>2 · Drill checklist</CardTitle></CardHeader><CardContent className="flex flex-col gap-2">
            {s.drillChecklist.map((c, i) => <label key={c} className="flex items-start gap-2 text-sm"><input type="checkbox" name="check" value={i} className="mt-0.5" />{c}</label>)}
          </CardContent></Card>
          <Card className="lg:col-span-2"><CardHeader><CardTitle>3 · Reflection</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-[160px_1fr]">
            <Field label="Participants" htmlFor="pp"><Input id="pp" name="participants" type="number" min={1} max={500} defaultValue={2} /></Field>
            <Field label="What went well? What will you improve?" htmlFor="rf"><Textarea id="rf" name="reflection" maxLength={2000} placeholder="e.g. Took 4 minutes to find the flashlight — move it next to the door." /></Field>
            <SubmitButton className="self-start">Save drill record</SubmitButton>
          </CardContent></Card>
        </ActionForm>
      </>
    );
  }
  return (
    <>
      <PageHeader eyebrow="Decision simulation" title={s.title} description={s.summary} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2"><Simulation scenario={s} /></div>
        {guide && <Alert tone="education" title="Educational practice">Feedback reflects general preparedness guidance. Read the <a className="underline" href={`/guides/${guide.key}`}>{guide.title} guide</a> for more.</Alert>}
      </div>
    </>
  );
}
