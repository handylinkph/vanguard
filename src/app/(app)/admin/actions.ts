"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/admin";
import { parseForm, optText, checkbox, dbError, type ActionResult } from "@/lib/actions";

export async function setUser(fd: FormData) {
  const { supabase } = await requireAdmin();
  const uid = String(fd.get("id"));
  const disabled = fd.get("disabled") === "true";
  await supabase.rpc("admin_set_user", { p_user: uid, p_role: String(fd.get("role")), p_disabled: disabled });
  // Also ban at the auth layer when a service key is configured (prevents new sessions).
  const admin = createServiceClient();
  if (admin) await admin.auth.admin.updateUserById(uid, { ban_duration: disabled ? "876000h" : "none" });
  revalidatePath("/admin/users");
}

const ResourceSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().trim().regex(/^[a-z0-9-]{3,100}$/, "Use 3–100 lowercase letters, numbers and dashes"),
  title: z.string().trim().min(3, "Title is required").max(200), summary: z.string().trim().min(1, "Summary is required").max(500), body: z.string().max(50000).default(""),
  category: z.enum(["guide", "procedure", "checklist", "household", "health", "finance", "business", "school", "community"]),
  hazards: z.array(z.string()).optional().default([]), language: z.enum(["en", "fil", "ceb", "hil"]),
  download_url: z.string().trim().optional().transform((v) => v || null).refine((v) => !v || v.startsWith("https://"), "Must start with https://"),
  source_name: z.string().trim().min(1, "Source is required").max(200),
  source_url: z.string().trim().optional().transform((v) => v || null).refine((v) => !v || v.startsWith("https://"), "Must start with https://"),
  reviewed_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a review date"),
  review_due_on: z.string().optional().transform((v) => v || null), published: checkbox,
});

export async function saveResource(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(ResourceSchema, fd); if (p.error) return p.error;
  const { supabase, user } = await requireAdmin();
  const { id, ...row } = p.data;
  const { error } = id ? await supabase.from("resources").update(row).eq("id", id) : await supabase.from("resources").insert({ ...row, created_by: user.id });
  if (error) return dbError(error);
  revalidatePath("/admin/content"); revalidatePath("/library");
  if (!id) redirect("/admin/content");
  return { ok: true, message: "Saved." };
}

const ServiceSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, "Name is required").max(200), category: z.enum(["hotline", "hospital", "clinic", "fire", "police", "evacuation", "drrmo", "other"]),
  phone: optText(60), alt_phone: optText(60), address: optText(300), region: optText(80), city: optText(80), scope: z.enum(["national", "regional", "local"]),
  lat: z.string().optional().transform((v) => (v ? Number(v) : null)).refine((v) => v === null || (v >= -90 && v <= 90), "Invalid latitude"),
  lng: z.string().optional().transform((v) => (v ? Number(v) : null)).refine((v) => v === null || (v >= -180 && v <= 180), "Invalid longitude"),
  source_name: z.string().trim().min(1, "Source is required").max(200),
  source_url: z.string().trim().optional().transform((v) => v || null).refine((v) => !v || v.startsWith("https://"), "Must start with https://"),
  verification: z.enum(["verified", "unverified"]), last_reviewed_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a review date"), notes: optText(500), published: checkbox,
});

export async function saveService(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(ServiceSchema, fd); if (p.error) return p.error;
  const { supabase } = await requireAdmin();
  const { id, ...row } = p.data;
  const { error } = id ? await supabase.from("services").update(row).eq("id", id) : await supabase.from("services").insert(row);
  if (error) return dbError(error);
  revalidatePath("/admin/services"); revalidatePath("/services");
  if (!id) redirect("/admin/services");
  return { ok: true, message: "Saved." };
}

export async function deleteContent(fd: FormData) {
  const { supabase } = await requireAdmin();
  const table = String(fd.get("table")); if (!["resources", "services"].includes(table)) return;
  await supabase.from(table).delete().eq("id", String(fd.get("id")));
  redirect(table === "resources" ? "/admin/content" : "/admin/services");
}

export async function setOrgStatus(fd: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.rpc("admin_set_org_status", { p_org: String(fd.get("id")), p_status: fd.get("status") === "suspended" ? "suspended" : "active" });
  revalidatePath("/admin/organizations");
}

export async function setGroupStatus(fd: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.rpc("admin_set_group_status", { p_group: String(fd.get("id")), p_status: fd.get("status") === "suspended" ? "suspended" : "active" });
  revalidatePath("/admin/moderation");
}

export async function saveSetting(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase, user } = await requireAdmin();
  const key = String(fd.get("key")); const raw = String(fd.get("value"));
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return { error: "Value must be valid JSON (e.g. true, 30, \"text\")." }; }
  const { error } = await supabase.from("app_settings").update({ value, updated_by: user.id, updated_at: new Date().toISOString() }).eq("key", key);
  if (error) return dbError(error);
  revalidatePath("/admin/settings");
  return { ok: true, message: `Saved ${key}.` };
}
