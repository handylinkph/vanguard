import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Trash2, Paperclip, CheckSquare, Square } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, PageHeader, Badge, Button, ButtonLink, Field, Input } from "@/components/ui";
import { ActionForm, InlineAction, SubmitButton } from "@/components/ui/form";
import { PrintButton } from "@/components/ui/copy-button";
import { INCIDENT_CATS } from "@/components/incident-form";
import { uploadAttachment, deleteAttachment, deleteIncident, toggleRecoveryTask } from "../actions";
import { fmtDate, php } from "@/lib/utils";

export default async function IncidentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const { data: r } = await supabase.from("incident_records").select("*").eq("id", id).maybeSingle();
  if (!r) notFound();
  const [{ data: files }, { data: expenses }] = await Promise.all([
    supabase.from("incident_attachments").select("*").eq("incident_id", id).order("created_at"),
    supabase.from("expenses").select("amount_php, description, spent_on").eq("incident_id", id),
  ]);
  const signed = files?.length ? (await supabase.storage.from("incident-files").createSignedUrls(files.map((f) => f.storage_path), 600)).data ?? [] : [];
  const urlFor = (path: string) => signed.find((s) => s.path === path)?.signedUrl ?? undefined;
  const tasks = (r.recovery_tasks ?? []) as { task: string; done: boolean }[];
  const spent = (expenses ?? []).reduce((a, e) => a + Number(e.amount_php), 0);
  return (
    <>
      <PageHeader title={r.title} eyebrow={`${INCIDENT_CATS[r.category]} · ${fmtDate(r.occurred_on)}${r.ended_on ? ` – ${fmtDate(r.ended_on)}` : ""}`} description={r.location_text ?? undefined}
        actions={<><PrintButton /><ButtonLink href={`/incidents/${id}/edit`} variant="outline"><Pencil />Edit</ButtonLink>
          <InlineAction action={deleteIncident} hidden={{ id }} confirm="Delete this record and its files permanently?"><Button variant="ghost" className="text-red-700"><Trash2 />Delete</Button></InlineAction></>} />
      <p className="mb-4 text-xs text-muted">Personal record — not an official emergency report. Private to you.</p>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card><CardHeader><CardTitle>What happened</CardTitle></CardHeader><CardContent className="whitespace-pre-wrap text-sm">{r.description || <span className="text-muted">No description.</span>}</CardContent></Card>
          <Card><CardHeader><CardTitle>Property damage</CardTitle></CardHeader><CardContent className="text-sm">
            <p className="whitespace-pre-wrap">{r.damage_description || <span className="text-muted">None recorded.</span>}</p>
            <p className="mt-2"><strong>Estimated damage:</strong> {php(r.estimated_damage_php)}</p>
            <p><strong>Recovery expenses recorded:</strong> {php(spent)} <Link className="text-brand-700 underline" href={`/finance?tab=expenses&incident=${id}`}>Add expense</Link></p>
          </CardContent></Card>
          <Card><CardHeader><CardTitle>Recovery tasks</CardTitle></CardHeader><CardContent>
            {tasks.length === 0 ? <p className="text-sm text-muted">No tasks. <Link className="underline" href={`/incidents/${id}/edit`}>Add some</Link>.</p> :
              <ul className="flex flex-col gap-2">{tasks.map((t, i) => (
                <li key={i}><InlineAction action={toggleRecoveryTask} hidden={{ id, idx: String(i) }}><button className="flex items-center gap-2 text-left text-sm" aria-pressed={t.done}>
                  {t.done ? <CheckSquare className="size-5 text-accent" /> : <Square className="size-5 text-muted" />}<span className={t.done ? "line-through text-muted" : ""}>{t.task}</span></button></InlineAction></li>))}</ul>}
          </CardContent></Card>
        </div>
        <Card className="self-start"><CardHeader><CardTitle className="flex items-center gap-2"><Paperclip className="size-4" />Photos & documents</CardTitle></CardHeader><CardContent className="flex flex-col gap-3">
          <ul className="grid grid-cols-2 gap-2">{(files ?? []).map((f) => {
            const url = urlFor(f.storage_path);
            return (<li key={f.id} className="rounded-lg border border-line p-2 text-xs">
              {f.mime_type.startsWith("image/") && url ? <a href={url} target="_blank" rel="noopener noreferrer">{/* Signed, short-lived private URLs; next/image optimisation would proxy private files. */}{/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={f.file_name} className="h-24 w-full rounded object-cover" /></a>
                : <a href={url} target="_blank" rel="noopener noreferrer" className="block truncate text-brand-700 underline">{f.file_name}</a>}
              <div className="mt-1 flex justify-between"><span className="truncate">{(f.size_bytes / 1024).toFixed(0)} KB</span>
                <InlineAction action={deleteAttachment} hidden={{ id: f.id }} confirm="Delete this file?"><button className="text-red-700">Delete</button></InlineAction></div>
            </li>);
          })}</ul>
          <ActionForm action={uploadAttachment} resetOnSuccess className="flex flex-col gap-2">
            <input type="hidden" name="incident_id" value={id} />
            <Field label="Add file" htmlFor="file" hint="JPG, PNG, WEBP or PDF, up to 10 MB. Stored privately."><Input id="file" name="file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required className="py-1.5" /></Field>
            <SubmitButton size="sm" pendingText="Uploading…">Upload</SubmitButton>
          </ActionForm>
          {(r.tags as string[]).length > 0 && <div className="flex flex-wrap gap-1">{(r.tags as string[]).map((t) => <Badge key={t}>{t}</Badge>)}</div>}
        </CardContent></Card>
      </div>
    </>
  );
}
