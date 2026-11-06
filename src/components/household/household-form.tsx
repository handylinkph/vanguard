import { Input, Field, Select, Textarea } from "@/components/ui";
import { FieldError, SubmitButton } from "@/components/ui/form";
import type { Household } from "@/lib/types";

export function HouseholdFields({ h }: { h?: Partial<Household> }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Household name" htmlFor="name" className="sm:col-span-2"><Input id="name" name="name" defaultValue={h?.name ?? ""} required maxLength={120} placeholder="e.g. Santos Family" /><FieldError name="name" /></Field>
      <Field label="Region / Province" htmlFor="region"><Input id="region" name="region" defaultValue={h?.region ?? ""} maxLength={80} placeholder="e.g. Negros Occidental" /></Field>
      <Field label="City / Municipality" htmlFor="city"><Input id="city" name="city" defaultValue={h?.city ?? ""} maxLength={80} placeholder="e.g. Bacolod City" /></Field>
      <Field label="Barangay (optional)" htmlFor="barangay"><Input id="barangay" name="barangay" defaultValue={h?.barangay ?? ""} maxLength={80} /></Field>
      <Field label="Type of home" htmlFor="dwelling_type">
        <Select id="dwelling_type" name="dwelling_type" defaultValue={h?.dwelling_type ?? "house"}>
          <option value="house">House</option><option value="apartment">Apartment</option><option value="condominium">Condominium</option><option value="boarding">Boarding house / dormitory</option><option value="other">Other</option>
        </Select>
      </Field>
      <Field label="Number of floors" htmlFor="floors"><Input id="floors" name="floors" type="number" min={0} max={200} defaultValue={h?.floors ?? 1} /></Field>
      <fieldset className="sm:col-span-2">
        <legend className="text-sm font-medium">Surroundings (self-reported, optional)</legend>
        <div className="mt-2 flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" name="near_coast" defaultChecked={!!h?.near_coast} />Near the coast</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="near_river" defaultChecked={!!h?.near_river} />Near a river or creek</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="near_slope" defaultChecked={!!h?.near_slope} />On or below a slope</label>
        </div>
      </fieldset>
      <Field label="Notes" htmlFor="notes" className="sm:col-span-2"><Textarea id="notes" name="notes" defaultValue={h?.notes ?? ""} maxLength={2000} /></Field>
      <div className="sm:col-span-2"><SubmitButton>Save household</SubmitButton></div>
    </div>
  );
}
