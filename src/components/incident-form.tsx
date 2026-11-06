import { Field, Input, Select, Textarea } from "@/components/ui";
import { FieldError, SubmitButton } from "@/components/ui/form";
import { Repeater } from "@/components/forms/repeater";

export const INCIDENT_CATS: Record<string, string> = { typhoon: "Typhoon", flood: "Flood", earthquake: "Earthquake", volcano: "Volcanic activity", landslide: "Landslide", fire: "Fire", tsunami: "Tsunami", power_outage: "Power outage", medical: "Medical", other: "Other" };

export interface IncidentRow { id: string; category: string; title: string; occurred_on: string; ended_on: string | null; location_text: string | null; description: string | null; damage_description: string | null; estimated_damage_php: number | null; recovery_tasks: { task: string; done: boolean }[]; tags: string[] }

export function IncidentFields({ r }: { r?: IncidentRow }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {r && <input type="hidden" name="id" value={r.id} />}
      <Field label="Title" htmlFor="title" className="sm:col-span-2"><Input id="title" name="title" defaultValue={r?.title} required maxLength={200} placeholder="e.g. Typhoon flooding in kitchen" /><FieldError name="title" /></Field>
      <Field label="Category" htmlFor="category"><Select id="category" name="category" defaultValue={r?.category ?? "typhoon"}>{Object.entries(INCIDENT_CATS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
      <Field label="Location" htmlFor="location_text"><Input id="location_text" name="location_text" defaultValue={r?.location_text ?? ""} maxLength={300} /></Field>
      <Field label="Date it happened" htmlFor="occurred_on"><Input id="occurred_on" name="occurred_on" type="date" defaultValue={r?.occurred_on} required /><FieldError name="occurred_on" /></Field>
      <Field label="End date (optional)" htmlFor="ended_on"><Input id="ended_on" name="ended_on" type="date" defaultValue={r?.ended_on ?? ""} /></Field>
      <Field label="What happened" htmlFor="description" className="sm:col-span-2"><Textarea id="description" name="description" defaultValue={r?.description ?? ""} maxLength={10000} /></Field>
      <Field label="Property damage" htmlFor="damage_description" className="sm:col-span-2"><Textarea id="damage_description" name="damage_description" defaultValue={r?.damage_description ?? ""} maxLength={5000} placeholder="Rooms, items, vehicles affected" /></Field>
      <Field label="Estimated damage (₱)" htmlFor="estimated_damage_php"><Input id="estimated_damage_php" name="estimated_damage_php" type="number" min={0} step="0.01" defaultValue={r?.estimated_damage_php ?? ""} /><FieldError name="estimated_damage_php" /></Field>
      <Field label="Tags (comma separated)" htmlFor="tags"><Input id="tags" name="tags" defaultValue={r?.tags.join(", ") ?? ""} placeholder="insurance, roof" /></Field>
      <div className="sm:col-span-2"><p className="mb-2 text-sm font-medium">Recovery tasks</p>
        <Repeater prefix="rt" addLabel="Add task" initial={(r?.recovery_tasks ?? []).map((t) => ({ task: t.task, done: t.done ? "done" : "todo" }))}
          columns={[{ name: "task", label: "Task", placeholder: "File insurance claim; replace mattress" }, { name: "done", label: "Status", type: "select", options: [{ value: "todo", label: "To do" }, { value: "done", label: "Done" }] }]} /></div>
      <div className="sm:col-span-2"><SubmitButton>Save record</SubmitButton></div>
    </div>
  );
}
