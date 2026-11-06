import { requireUser, getMyHouseholds } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, PageHeader, Field, Input, Button, Alert } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { questionsFor, CATEGORY_LABEL } from "@/lib/assessment";
import { guides } from "@/content/guides";
import { submitAssessment } from "../actions";

export const metadata = { title: "Take the assessment" };

export default async function TakeAssessment({ searchParams }: { searchParams: Promise<{ hazards?: string | string[]; region?: string; city?: string }> }) {
  const sp = await searchParams;
  const { profile } = await requireUser();
  const hh = (await getMyHouseholds())[0]?.household;
  const selected = sp.hazards === undefined ? null : (Array.isArray(sp.hazards) ? sp.hazards : [sp.hazards]);

  if (!selected) {
    return (
      <>
        <PageHeader title="Step 1 · Your location and hazards" description="Choose the hazards you want to prepare for. If unsure, ask your barangay or MDRRMO which hazards affect your area." />
        <Card className="max-w-2xl"><CardContent className="pt-5">
          <form className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Region / Province" htmlFor="region"><Input id="region" name="region" defaultValue={hh?.region ?? profile.region ?? ""} maxLength={80} /></Field>
              <Field label="City / Municipality" htmlFor="city"><Input id="city" name="city" defaultValue={hh?.city ?? profile.city ?? ""} maxLength={80} /></Field>
            </div>
            <fieldset><legend className="text-sm font-medium">Hazards to prepare for</legend>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {guides.filter((g) => g.key !== "general").map((g) => (
                  <label key={g.key} className="flex items-center gap-2 rounded-lg border border-line p-2 text-sm has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
                    <input type="checkbox" name="hazards" value={g.key} defaultChecked={["typhoon", "flood", "earthquake"].includes(g.key) || (g.key === "tsunami" && !!hh?.near_coast) || (g.key === "landslide" && !!hh?.near_slope)} />{g.title}
                  </label>))}
              </div>
              <input type="hidden" name="hazards" value="general" />
            </fieldset>
            <Alert tone="education">Location is used only to label your assessment. Vanguard does not have verified hazard maps for your address, so it measures preparedness rather than predicting exposure.</Alert>
            <Button className="self-start">Continue</Button>
          </form>
        </CardContent></Card>
      </>
    );
  }

  const hazards = selected.filter((h) => h !== "general");
  const qs = questionsFor(hazards);
  const cats = [...new Set(qs.map((q) => q.category))];
  return (
    <>
      <PageHeader title="Step 2 · Preparedness questions" description={`${qs.length} questions. Answer honestly — this is for you.`} />
      <ActionForm action={submitAssessment} className="flex flex-col gap-5">
        <input type="hidden" name="hazards" value={hazards.join(",")} />
        <input type="hidden" name="region" value={sp.region ?? ""} /><input type="hidden" name="city" value={sp.city ?? ""} />
        {cats.map((c) => (
          <Card key={c}><CardHeader><CardTitle>{CATEGORY_LABEL[c]}</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              {qs.filter((q) => q.category === c).map((q) => (
                <fieldset key={q.id} className="border-b border-line pb-4 last:border-0 last:pb-0">
                  <legend className="text-sm font-medium">{q.text}</legend>
                  {q.help && <p className="text-xs text-muted">{q.help}</p>}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {([["yes", "Yes"], ["partly", "Partly"], ["no", "No"], ["na", "Not applicable"]] as const).map(([v, l]) => (
                      <label key={v} className="flex cursor-pointer items-center gap-2 rounded-full border border-line px-3 py-1.5 text-sm has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
                        <input type="radio" name={`q_${q.id}`} value={v} required />{l}
                      </label>))}
                  </div>
                </fieldset>))}
            </CardContent></Card>))}
        <SubmitButton size="lg" className="self-start" pendingText="Calculating…">See my results</SubmitButton>
      </ActionForm>
    </>
  );
}
