import { getMyHouseholds } from "@/lib/auth";
import { Card, CardContent, PageHeader, Field, Input, Select, Alert } from "@/components/ui";
import { ActionForm, SubmitButton, FieldError } from "@/components/ui/form";
import { PLAN_TEMPLATES } from "@/content/templates";
import { createPlan } from "../actions";

export const metadata = { title: "New emergency plan" };

export default async function NewPlan() {
  const households = await getMyHouseholds();
  return (
    <>
      <PageHeader title="Create an emergency plan" eyebrow="Step 1 of 6 · Basics" description="Choose a template. You'll then walk through meeting places, evacuation, responsibilities, communication and a checklist." />
      <Card className="max-w-2xl"><CardContent className="pt-5">
        <ActionForm action={createPlan} className="flex flex-col gap-4">
          <Field label="Plan name" htmlFor="title"><Input id="title" name="title" required maxLength={160} defaultValue="Our household emergency plan" /><FieldError name="title" /></Field>
          <fieldset>
            <legend className="text-sm font-medium">Template</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {PLAN_TEMPLATES.map((t, i) => (
                <label key={t.key} className="flex cursor-pointer gap-3 rounded-lg border border-line p-3 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
                  <input type="radio" name="template" value={t.key} defaultChecked={i === 0} className="mt-1" />
                  <span><span className="block text-sm font-medium">{t.title}</span><span className="block text-xs text-muted">{t.description}</span></span>
                </label>
              ))}
            </div>
          </fieldset>
          <Field label="Main hazard" htmlFor="hazard" hint="Used for filtering and to suggest related guidance.">
            <Select id="hazard" name="hazard" defaultValue="all">
              <option value="all">All hazards</option><option value="typhoon">Typhoon</option><option value="flood">Flood</option><option value="earthquake">Earthquake</option>
              <option value="volcano">Volcanic eruption</option><option value="landslide">Landslide</option><option value="fire">Fire</option><option value="tsunami">Tsunami</option>
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Plan type" htmlFor="plan_type"><Select id="plan_type" name="plan_type" defaultValue={households.length ? "household" : "personal"}><option value="household">Household plan</option><option value="personal">Personal plan</option></Select></Field>
            <Field label="Household" htmlFor="household_id">
              <Select id="household_id" name="household_id" defaultValue={households[0]?.household.id ?? ""}>
                <option value="">None</option>
                {households.map((h) => <option key={h.household.id} value={h.household.id}>{h.household.name}</option>)}
              </Select>
            </Field>
          </div>
          {households.length === 0 && <Alert tone="info">Tip: <a className="underline" href="/household">set up your household</a> to share plans with family members.</Alert>}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="shared_with_household" defaultChecked />Share with household members (they can view it and tick off checklist items)</label>
          <SubmitButton>Create plan and continue</SubmitButton>
        </ActionForm>
      </CardContent></Card>
    </>
  );
}
