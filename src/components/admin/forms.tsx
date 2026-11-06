import { Field, Input, Select, Textarea } from "@/components/ui";
import { FieldError, SubmitButton } from "@/components/ui/form";
import { LIB_CATEGORIES, SERVICE_CATEGORIES } from "@/content/library";
import { guides } from "@/content/guides";
import type { Resource, Service } from "@/lib/types";
import { todayISO, addDaysISO } from "@/lib/utils";

export function ResourceFields({ r }: { r?: Resource }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {r && <input type="hidden" name="id" value={r.id} />}
      <Field label="Title" htmlFor="title" className="sm:col-span-2"><Input id="title" name="title" defaultValue={r?.title} required maxLength={200} /><FieldError name="title" /></Field>
      <Field label="Slug (URL)" htmlFor="slug"><Input id="slug" name="slug" defaultValue={r?.slug} required pattern="[a-z0-9-]{3,100}" /><FieldError name="slug" /></Field>
      <Field label="Category" htmlFor="category"><Select id="category" name="category" defaultValue={r?.category ?? "guide"}>{Object.entries(LIB_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
      <Field label="Summary" htmlFor="summary" className="sm:col-span-2"><Textarea id="summary" name="summary" defaultValue={r?.summary} required maxLength={500} className="min-h-16" /><FieldError name="summary" /></Field>
      <Field label="Body (Markdown: ## headings, - lists, **bold**, [links](https://…))" htmlFor="body" className="sm:col-span-2"><Textarea id="body" name="body" defaultValue={r?.body} maxLength={50000} className="min-h-64 font-mono text-xs" /></Field>
      <fieldset className="sm:col-span-2"><legend className="text-sm font-medium">Hazards</legend><div className="mt-1 flex flex-wrap gap-3 text-sm">
        {guides.map((g) => <label key={g.key} className="flex items-center gap-1"><input type="checkbox" name="hazards[]" value={g.key} defaultChecked={r?.hazards.includes(g.key)} />{g.title}</label>)}</div></fieldset>
      <Field label="Language" htmlFor="language"><Select id="language" name="language" defaultValue={r?.language ?? "en"}><option value="en">English</option><option value="fil">Filipino</option><option value="ceb">Cebuano</option><option value="hil">Hiligaynon</option></Select></Field>
      <Field label="Download URL (https, optional)" htmlFor="download_url"><Input id="download_url" name="download_url" defaultValue={r?.download_url ?? ""} /><FieldError name="download_url" /></Field>
      <Field label="Source name" htmlFor="source_name"><Input id="source_name" name="source_name" defaultValue={r?.source_name} required maxLength={200} /><FieldError name="source_name" /></Field>
      <Field label="Source URL (https)" htmlFor="source_url"><Input id="source_url" name="source_url" defaultValue={r?.source_url ?? ""} /><FieldError name="source_url" /></Field>
      <Field label="Reviewed on" htmlFor="reviewed_on"><Input id="reviewed_on" name="reviewed_on" type="date" defaultValue={r?.reviewed_on ?? todayISO()} required /></Field>
      <Field label="Next review due" htmlFor="review_due_on"><Input id="review_due_on" name="review_due_on" type="date" defaultValue={r?.review_due_on ?? addDaysISO(365)} /></Field>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="published" defaultChecked={r?.published ?? false} />Published (visible to everyone)</label>
      <div className="sm:col-span-2"><SubmitButton>Save resource</SubmitButton></div>
    </div>
  );
}

export function ServiceFields({ s }: { s?: Service }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {s && <input type="hidden" name="id" value={s.id} />}
      <Field label="Name" htmlFor="name" className="sm:col-span-2"><Input id="name" name="name" defaultValue={s?.name} required maxLength={200} /><FieldError name="name" /></Field>
      <Field label="Category" htmlFor="category"><Select id="category" name="category" defaultValue={s?.category ?? "hospital"}>{Object.entries(SERVICE_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
      <Field label="Scope" htmlFor="scope"><Select id="scope" name="scope" defaultValue={s?.scope ?? "local"}><option value="national">National</option><option value="regional">Regional</option><option value="local">Local</option></Select></Field>
      <Field label="Phone" htmlFor="phone"><Input id="phone" name="phone" defaultValue={s?.phone ?? ""} maxLength={60} /></Field>
      <Field label="Alternate phone" htmlFor="alt_phone"><Input id="alt_phone" name="alt_phone" defaultValue={s?.alt_phone ?? ""} maxLength={60} /></Field>
      <Field label="Address" htmlFor="address" className="sm:col-span-2"><Input id="address" name="address" defaultValue={s?.address ?? ""} maxLength={300} /></Field>
      <Field label="City" htmlFor="city"><Input id="city" name="city" defaultValue={s?.city ?? ""} /></Field>
      <Field label="Region" htmlFor="region"><Input id="region" name="region" defaultValue={s?.region ?? ""} /></Field>
      <Field label="Latitude" htmlFor="lat"><Input id="lat" name="lat" type="number" step="any" defaultValue={s?.lat ?? ""} /><FieldError name="lat" /></Field>
      <Field label="Longitude" htmlFor="lng"><Input id="lng" name="lng" type="number" step="any" defaultValue={s?.lng ?? ""} /><FieldError name="lng" /></Field>
      <Field label="Source name" htmlFor="source_name"><Input id="source_name" name="source_name" defaultValue={s?.source_name} required maxLength={200} /><FieldError name="source_name" /></Field>
      <Field label="Source URL (https)" htmlFor="source_url"><Input id="source_url" name="source_url" defaultValue={s?.source_url ?? ""} /><FieldError name="source_url" /></Field>
      <Field label="Verification" htmlFor="verification" hint="Mark verified only after confirming directly with the facility or official source."><Select id="verification" name="verification" defaultValue={s?.verification ?? "unverified"}><option value="unverified">Unverified</option><option value="verified">Verified</option></Select></Field>
      <Field label="Last reviewed" htmlFor="last_reviewed_on"><Input id="last_reviewed_on" name="last_reviewed_on" type="date" defaultValue={s?.last_reviewed_on ?? todayISO()} required /></Field>
      <Field label="Notes" htmlFor="notes" className="sm:col-span-2"><Textarea id="notes" name="notes" defaultValue={s?.notes ?? ""} maxLength={500} className="min-h-16" /></Field>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="published" defaultChecked={s?.published ?? true} />Published</label>
      <div className="sm:col-span-2"><SubmitButton>Save listing</SubmitButton></div>
    </div>
  );
}
