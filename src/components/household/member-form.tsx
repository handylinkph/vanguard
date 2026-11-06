import { Input, Field, Select, Textarea } from "@/components/ui";
import { FieldError, SubmitButton } from "@/components/ui/form";
import type { HouseholdMember } from "@/lib/types";

export function MemberFields({ householdId, m, submit = "Add person" }: { householdId: string; m?: HouseholdMember; submit?: string }) {
  const p = m ? `m-${m.id}` : "new";
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="household_id" value={householdId} />
      {m && <input type="hidden" name="id" value={m.id} />}
      <Field label="Name" htmlFor={`${p}-name`}><Input id={`${p}-name`} name="display_name" defaultValue={m?.display_name} required maxLength={120} /><FieldError name="display_name" /></Field>
      <Field label="Relationship" htmlFor={`${p}-rel`}><Input id={`${p}-rel`} name="relationship" defaultValue={m?.relationship ?? ""} maxLength={60} placeholder="e.g. Daughter" /></Field>
      <Field label="Age group" htmlFor={`${p}-age`}>
        <Select id={`${p}-age`} name="age_group" defaultValue={m?.age_group ?? "adult"}>
          <option value="infant">Infant (0–2)</option><option value="child">Child (3–12)</option><option value="teen">Teen (13–17)</option><option value="adult">Adult</option><option value="senior">Older adult (60+)</option>
        </Select>
      </Field>
      <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" name="needs_assistance" defaultChecked={m?.needs_assistance} />Needs assistance to evacuate</label>
      <Field label="Emergency responsibilities" htmlFor={`${p}-resp`} className="sm:col-span-2"><Input id={`${p}-resp`} name="responsibilities" defaultValue={m?.responsibilities ?? ""} maxLength={500} placeholder="e.g. Brings the go-bags; checks on Lola" /></Field>
      <Field label="Care notes (optional, visible only to household members)" htmlFor={`${p}-care`} className="sm:col-span-2" hint="Only add what helps in an emergency. Avoid detailed medical information.">
        <Textarea id={`${p}-care`} name="care_notes" defaultValue={m?.care_notes ?? ""} maxLength={500} className="min-h-16" />
      </Field>
      <div className="sm:col-span-2"><SubmitButton size="sm">{submit}</SubmitButton></div>
    </div>
  );
}
