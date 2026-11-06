"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { parseForm, formToObject, reqText, optText, optDate, optMoney, dbError, uuid, type ActionResult } from "@/lib/actions";
import { zipRows } from "@/lib/rows";

const CATS = ["typhoon", "flood", "earthquake", "volcano", "landslide", "fire", "tsunami", "power_outage", "medical", "other"] as const;
const Incident = z.object({
  id: z.string().uuid().optional(),
  category: z.enum(CATS), title: reqText(200, "Title"),
  occurred_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the date"), ended_on: optDate,
  location_text: optText(300), description: optText(10000), damage_description: optText(5000), estimated_damage_php: optMoney,
  tags: z.string().optional().transform((v) => (v ? v.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 10).map((t) => t.slice(0, 40)) : [])),
});

export async function saveIncident(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(Incident, fd); if (p.error) return p.error;
  const { supabase, user } = await requireUser();
  const obj = formToObject(fd);
  const recovery_tasks = zipRows(obj, "rt", ["task", "done"], "task").map((r) => ({ task: r.task, done: r.done === "done" }));
  const { id, ...row } = p.data;
  if (id) {
    const { error } = await supabase.from("incident_records").update({ ...row, recovery_tasks }).eq("id", id);
    if (error) return dbError(error);
    revalidatePath(`/incidents/${id}`);
    redirect(`/incidents/${id}`);
  }
  const newId = crypto.randomUUID();
  const { error } = await supabase.from("incident_records").insert({ id: newId, user_id: user.id, ...row, recovery_tasks });
  if (error) return dbError(error);
  redirect(`/incidents/${newId}`);
}

export async function toggleRecoveryTask(fd: FormData) {
  const { supabase } = await requireUser();
  const id = String(fd.get("id")); const idx = Number(fd.get("idx"));
  const { data } = await supabase.from("incident_records").select("recovery_tasks").eq("id", id).single();
  if (!data) return;
  const tasks = (data.recovery_tasks as { task: string; done: boolean }[]).map((t, i) => (i === idx ? { ...t, done: !t.done } : t));
  await supabase.from("incident_records").update({ recovery_tasks: tasks }).eq("id", id);
  revalidatePath(`/incidents/${id}`);
}

const ALLOWED = new Map([["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"], ["application/pdf", "pdf"]]);
const MAX = 10 * 1024 * 1024;

/** Validates magic bytes so a renamed executable can't be stored as an "image". */
function sniff(buf: Uint8Array): string | null {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && buf[8] === 0x57 && buf[9] === 0x45) return "image/webp";
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return "application/pdf";
  return null;
}

export async function uploadAttachment(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const incidentId = uuid.safeParse(fd.get("incident_id"));
  const file = fd.get("file");
  if (!incidentId.success || !(file instanceof File) || file.size === 0) return { error: "Choose a file to upload." };
  if (file.size > MAX) return { error: "Files must be 10 MB or smaller." };
  const buf = new Uint8Array(await file.arrayBuffer());
  const type = sniff(buf);
  if (!type || !ALLOWED.has(type)) return { error: "Only JPG, PNG, WEBP images and PDF documents are allowed." };
  const { supabase, user } = await requireUser();
  const { data: inc } = await supabase.from("incident_records").select("id").eq("id", incidentId.data).maybeSingle();
  if (!inc) return { error: "Record not found." };
  const { count } = await supabase.from("incident_attachments").select("id", { count: "exact", head: true }).eq("incident_id", incidentId.data);
  if ((count ?? 0) >= 20) return { error: "Each record can have up to 20 attachments." };
  const safeName = file.name.replace(/[^\w.\- ]+/g, "_").slice(0, 120) || `file.${ALLOWED.get(type)}`;
  const path = `${user.id}/${incidentId.data}/${crypto.randomUUID()}.${ALLOWED.get(type)}`;
  const { error } = await supabase.storage.from("incident-files").upload(path, buf, { contentType: type, upsert: false });
  if (error) return { error: `Upload failed: ${error.message}` };
  const { error: e2 } = await supabase.from("incident_attachments").insert({ incident_id: incidentId.data, user_id: user.id, storage_path: path, file_name: safeName, mime_type: type, size_bytes: file.size });
  if (e2) { await supabase.storage.from("incident-files").remove([path]); return dbError(e2); }
  revalidatePath(`/incidents/${incidentId.data}`);
  return { ok: true, message: "File attached." };
}

export async function deleteAttachment(fd: FormData) {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("incident_attachments").select("storage_path, incident_id").eq("id", String(fd.get("id"))).maybeSingle();
  if (!data) return;
  await supabase.storage.from("incident-files").remove([data.storage_path]);
  await supabase.from("incident_attachments").delete().eq("id", String(fd.get("id")));
  revalidatePath(`/incidents/${data.incident_id}`);
}

export async function deleteIncident(fd: FormData) {
  const { supabase } = await requireUser();
  const id = String(fd.get("id"));
  const { data: files } = await supabase.from("incident_attachments").select("storage_path").eq("incident_id", id);
  if (files?.length) await supabase.storage.from("incident-files").remove(files.map((f) => f.storage_path));
  await supabase.from("incident_records").delete().eq("id", id);
  redirect("/incidents");
}
