"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { parseForm, formToObject, reqText, optText, optDate, dbError, uuid, type ActionResult } from "@/lib/actions";
import { ORG_TEMPLATES } from "@/content/templates";
import { logActivity } from "@/lib/activity";

const rv = (id: string) => revalidatePath(`/organizations/${id}`);

export async function createOrg(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(z.object({ name: z.string().trim().min(2, "Name is required").max(200), org_type: z.enum(["business", "school"]), sector: optText(100), address: optText(300), region: optText(80), city: optText(80), headcount: z.coerce.number().int().min(0).max(1000000).optional() }), fd); if (p.error) return p.error;
  const { supabase, user } = await requireUser();
  const id = crypto.randomUUID();
  const { error } = await supabase.from("organizations").insert({ id, ...p.data, created_by: user.id });
  if (error) return dbError(error);
  const tpl = ORG_TEMPLATES.find((t) => t.for.includes(p.data.org_type) && t.key !== "fire-evacuation")!;
  await supabase.from("org_checklist_items").insert(tpl.checklist.map((c, i) => ({ org_id: id, list_key: c.list, label: c.label, sort: i })));
  await logActivity(supabase, user.id, "organization", `Created ${p.data.org_type} “${p.data.name}”`, `/organizations/${id}`);
  redirect(`/organizations/${id}`);
}

export async function acceptOrgInvite(fd: FormData) {
  const { supabase } = await requireUser();
  const token = String(fd.get("token"));
  const { data, error } = await supabase.rpc("accept_org_invite", { p_token: token });
  if (error) redirect(`/invite/org/${token}?error=${encodeURIComponent(error.message)}`);
  redirect(`/organizations/${data}`);
}

export async function createOrgInvite(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(z.object({ org_id: uuid, role: z.enum(["member", "admin"]), max_uses: z.coerce.number().int().min(1).max(2000) }), fd); if (p.error) return p.error;
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("org_invites").insert({ ...p.data, created_by: user.id });
  if (error) return dbError(error);
  rv(p.data.org_id); return { ok: true, message: "Invitation link created." };
}

export async function createOrgPlan(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(z.object({ org_id: uuid, template_key: z.string(), title: reqText(200, "Title") }), fd); if (p.error) return p.error;
  const tpl = ORG_TEMPLATES.find((t) => t.key === p.data.template_key); if (!tpl) return { error: "Unknown template" };
  const { supabase, user } = await requireUser();
  const sections = Object.fromEntries(tpl.sections.map((s) => [s, ""]));
  const { error } = await supabase.from("org_plans").insert({ ...p.data, sections, updated_by: user.id });
  if (error) return dbError(error);
  rv(p.data.org_id); return { ok: true };
}

export async function saveOrgPlan(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const obj = formToObject(fd);
  const id = uuid.safeParse(obj.id); const orgId = uuid.safeParse(obj.org_id);
  if (!id.success || !orgId.success) return { error: "Invalid request" };
  const { supabase, user } = await requireUser();
  const sections: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) if (k.startsWith("sec:")) sections[k.slice(4).slice(0, 120)] = String(v).slice(0, 8000);
  const status = ["draft", "active", "archived"].includes(String(obj.status)) ? String(obj.status) : "draft";
  const review_on = /^\d{4}-\d{2}-\d{2}$/.test(String(obj.review_on)) ? String(obj.review_on) : null;
  const { error } = await supabase.from("org_plans").update({ sections, status, review_on, title: String(obj.title ?? "").slice(0, 200) || "Plan", updated_by: user.id }).eq("id", id.data);
  if (error) return dbError(error);
  rv(orgId.data); return { ok: true, message: "Plan saved." };
}

export async function saveOrgContact(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(z.object({ org_id: uuid, name: reqText(120, "Name"), role: optText(120), phone: optText(40), email: optText(200), is_external: z.preprocess((v) => v === "on", z.boolean()) }), fd); if (p.error) return p.error;
  const { supabase } = await requireUser();
  const { error } = await supabase.from("org_contacts").insert(p.data);
  if (error) return dbError(error);
  rv(p.data.org_id); return { ok: true };
}

export async function saveFacility(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(z.object({ org_id: uuid, name: reqText(200, "Name"), address: optText(300), occupancy: z.coerce.number().int().min(0).optional(), floors: z.coerce.number().int().min(0).optional(), assembly_points: optText(1000), evacuation_routes: optText(2000), equipment: optText(2000), notes: optText(2000) }), fd); if (p.error) return p.error;
  const { supabase } = await requireUser();
  const { error } = await supabase.from("org_facilities").insert(p.data);
  if (error) return dbError(error);
  rv(p.data.org_id); return { ok: true, message: "Facility added." };
}

export async function saveAssignment(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(z.object({ org_id: uuid, title: reqText(200, "Title"), description: optText(1000), assignee_id: z.string().optional().transform((v) => v || null), due_on: optDate }), fd); if (p.error) return p.error;
  const { supabase } = await requireUser();
  const { error } = await supabase.from("org_assignments").insert(p.data);
  if (error) return dbError(error);
  rv(p.data.org_id); return { ok: true };
}

export async function setAssignmentStatus(fd: FormData) {
  const { supabase } = await requireUser();
  const status = String(fd.get("status")); if (!["open", "in_progress", "done"].includes(status)) return;
  await supabase.from("org_assignments").update({ status }).eq("id", String(fd.get("id")));
  rv(String(fd.get("org_id")));
}

export async function toggleOrgChecklist(fd: FormData) {
  const { supabase } = await requireUser();
  await supabase.from("org_checklist_items").update({ done: fd.get("done") !== "true", updated_at: new Date().toISOString() }).eq("id", String(fd.get("id")));
  rv(String(fd.get("org_id")));
}

export async function addOrgChecklist(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(z.object({ org_id: uuid, list_key: z.enum(["evacuation", "continuity", "supplies", "communication"]), label: reqText(300, "Item") }), fd); if (p.error) return p.error;
  const { supabase } = await requireUser();
  const { error } = await supabase.from("org_checklist_items").insert({ ...p.data, sort: 100 });
  if (error) return dbError(error);
  rv(p.data.org_id); return { ok: true };
}

export async function saveOrgDrill(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(z.object({ org_id: uuid, title: reqText(200, "Title"), drill_type: z.enum(["earthquake", "fire", "flood", "typhoon", "tsunami", "lockdown", "other"]), scheduled_for: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date") }), fd); if (p.error) return p.error;
  const { supabase } = await requireUser();
  const { error } = await supabase.from("org_drills").insert(p.data);
  if (error) return dbError(error);
  rv(p.data.org_id); return { ok: true, message: "Drill scheduled." };
}

export async function completeOrgDrill(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(z.object({ id: uuid, org_id: uuid, completed_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), participants: z.coerce.number().int().min(0).max(1000000), evacuation_minutes: z.coerce.number().min(0).max(1000).optional(), observations: optText(3000) }), fd); if (p.error) return p.error;
  const { supabase } = await requireUser();
  const { id, org_id, ...rest } = p.data;
  const { error } = await supabase.from("org_drills").update(rest).eq("id", id);
  if (error) return dbError(error);
  rv(org_id); return { ok: true, message: "Drill recorded." };
}

export async function deleteOrgRow(fd: FormData) {
  const { supabase } = await requireUser();
  const table = String(fd.get("table"));
  if (!["org_contacts", "org_facilities", "org_assignments", "org_checklist_items", "org_drills", "org_plans", "org_invites"].includes(table)) return;
  await supabase.from(table).delete().eq("id", String(fd.get("id")));
  rv(String(fd.get("org_id")));
}

export async function setOrgMemberRole(fd: FormData) {
  const { supabase } = await requireUser();
  const role = String(fd.get("role")); if (!["admin", "member"].includes(role)) return;
  await supabase.from("org_members").update({ role }).match({ org_id: String(fd.get("org_id")), user_id: String(fd.get("user_id")) });
  rv(String(fd.get("org_id")));
}

export async function removeOrgMember(fd: FormData) {
  const { supabase, user } = await requireUser();
  const uid = String(fd.get("user_id"));
  await supabase.from("org_members").delete().match({ org_id: String(fd.get("org_id")), user_id: uid });
  if (uid === user.id) redirect("/organizations");
  rv(String(fd.get("org_id")));
}
