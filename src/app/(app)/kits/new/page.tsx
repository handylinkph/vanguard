import { getMyHouseholds, requireUser } from "@/lib/auth";
import { Card, CardContent, PageHeader, Field, Input, Select } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { KIT_TYPES, type KitType } from "@/lib/kits";
import { createKit } from "../actions";

export const metadata = { title: "Build a kit" };

export default async function NewKit({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  const initialType = (type && type in KIT_TYPES ? type : "three_day") as KitType;
  const { supabase } = await requireUser();
  const households = await getMyHouseholds();
  const hh = households[0]?.household;
  const counts = { adults: 1, children: 0, infants: 0, seniors: 0, pets: 0 };
  let assist = false;
  if (hh) {
    const [{ data: members }, { count: pets }] = await Promise.all([
      supabase.from("household_members").select("age_group, needs_assistance").eq("household_id", hh.id),
      supabase.from("household_pets").select("id", { count: "exact", head: true }).eq("household_id", hh.id),
    ]);
    counts.adults = (members ?? []).filter((m) => m.age_group === "adult" || m.age_group === "teen").length;
    counts.children = (members ?? []).filter((m) => m.age_group === "child").length;
    counts.infants = (members ?? []).filter((m) => m.age_group === "infant").length;
    counts.seniors = (members ?? []).filter((m) => m.age_group === "senior").length;
    counts.pets = pets ?? 0;
    assist = (members ?? []).some((m) => m.needs_assistance);
  }
  return (
    <>
      <PageHeader title="Build an emergency kit" description={hh ? `Pre-filled from your household “${hh.name}”. Adjust as needed.` : "Tell us who the kit is for and we'll recommend items and quantities."} />
      <Card className="max-w-3xl"><CardContent className="pt-5">
        <ActionForm action={createKit} className="flex flex-col gap-5">
          <fieldset>
            <legend className="text-sm font-medium">Kit type</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {(Object.entries(KIT_TYPES) as [KitType, (typeof KIT_TYPES)[KitType]][]).map(([k, v]) => (
                <label key={k} className="flex cursor-pointer gap-3 rounded-lg border border-line p-3 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
                  <input type="radio" name="kit_type" value={k} defaultChecked={k === initialType} className="mt-1" />
                  <span><span className="block text-sm font-medium">{v.label}</span><span className="block text-xs text-muted">{v.description}</span></span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Kit name" htmlFor="name" className="sm:col-span-2"><Input id="name" name="name" required maxLength={120} defaultValue={KIT_TYPES[initialType].label} /></Field>
            <Field label="Days to cover" htmlFor="days" hint="7-day kits use 7."><Input id="days" name="days" type="number" min={1} max={30} defaultValue={initialType === "seven_day" ? 7 : 3} /></Field>
          </div>
          <fieldset>
            <legend className="text-sm font-medium">Who is this kit for?</legend>
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {([["adults", "Adults & teens"], ["children", "Children"], ["infants", "Infants"], ["seniors", "Older adults"], ["pets", "Pets"]] as const).map(([k, l]) => (
                <Field key={k} label={l} htmlFor={k}><Input id={k} name={k} type="number" min={0} max={50} defaultValue={counts[k]} /></Field>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-sm font-medium">Special needs to include</legend>
            <div className="mt-2 flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" name="needs[]" value="medications" />Maintenance medicines</label>
              <label className="flex items-center gap-2"><input type="checkbox" name="needs[]" value="accessibility" defaultChecked={assist} />Accessibility / assistive devices</label>
            </div>
            <p className="mt-1 text-xs text-muted">Infant, child, older-adult and pet items are added automatically from the counts above.</p>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Share with household" htmlFor="household_id">
              <Select id="household_id" name="household_id" defaultValue={hh?.id ?? ""}><option value="">Only me</option>{households.map((h) => <option key={h.household.id} value={h.household.id}>{h.household.name}</option>)}</Select>
            </Field>
            <Field label="Where is it stored?" htmlFor="location_note"><Input id="location_note" name="location_note" maxLength={200} placeholder="e.g. Under the stairs" /></Field>
          </div>
          <SubmitButton>Create kit with recommended items</SubmitButton>
        </ActionForm>
      </CardContent></Card>
    </>
  );
}
