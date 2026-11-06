"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { parseForm, formToObject, reqText, optText, optDate, checkbox, dbError, uuid, type ActionResult } from "@/lib/actions";
import { zipRows } from "@/lib/rows";
import { logActivity } from "@/lib/activity";
import { getPlanTemplate } from "@/content/templates";
import { addDaysISO } from "@/lib/utils";
import type { PlanSections } from "@/lib/types";

const HAZ = z.enum(["all", "typhoon", "flood", "earthquake", "volcano", "landslide", "fire", "tsunami"]);

export async function createPlan(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(z.object({
    title: reqText(160, "Title"), template: z.string().max(40), hazard: HAZ,
    plan_type: z.enum(["personal", "household"]), household_id: z.string().optional().transform((v) => v || null),
    shared_with_household: checkbox,
  }), fd);
  if (p.error) return p.error;
  const { supabase, user } = await requireUser();
  if (p.data.plan_type === "household" && !p.data.household_id) return { error: "Choose a household for a household plan, or set up a household first." };
  const tpl = getPlanTemplate(p.data.template);
  const id = crypto.randomUUID();
  const review_on = addDaysISO(182);
  const { error } = await supabase.from("emergency_plans").insert({
    id, owner_id: user.id, title: p.data.title, hazard: p.data.hazard, plan_type: p.data.plan_type,
    household_id: p.data.household_id, shared_with_household: p.data.plan_type === "household" ? p.data.shared_with_household : false,
    review_on, sections: {},
  });
  if (error) return dbError(error);
  await supabase.from("plan_checklist_items").insert(tpl.checklist.map((c, i) => ({ plan_id: id, label: c.label, phase: c.phase, sort: i })));
  await supabase.from("reminders").insert({ user_id: user.id, title: `Review emergency plan “${p.data.title}”`, due_on: review_on, related_type: "plan", related_id: id, link: `/plans/${id}` });
  await logActivity(supabase, user.id, "plan", `Created plan “${p.data.title}”`, `/plans/${id}`, p.data.household_id);
  redirect(`/plans/${id}?step=meeting`);
}

const STEP_ORDER = ["meeting", "evacuation", "responsibilities", "communication", "checklist", "review"];

export async function saveSection(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const obj = formToObject(fd);
  const id = uuid.safeParse(obj.plan_id); const step = String(obj.step);
  if (!id.success || !STEP_ORDER.includes(step)) return { error: "Invalid request" };
  const { data: plan } = await supabase.from("emergency_plans").select("sections, current_step").eq("id", id.data).single();
  if (!plan) return { error: "Plan not found" };
  const sections: PlanSections = { ...(plan.sections as PlanSections) };
  if (step === "meeting") sections.meeting_places = zipRows(obj, "mp", ["name", "address", "kind"], "name") as PlanSections["meeting_places"];
  if (step === "evacuation") sections.evacuation_destinations = zipRows(obj, "ev", ["name", "address", "route", "notes"], "name") as PlanSections["evacuation_destinations"];
  if (step === "responsibilities") {
    sections.responsibilities = zipRows(obj, "rs", ["person", "task"], "task") as PlanSections["responsibilities"];
    sections.special_considerations = String(obj.special_considerations ?? "").slice(0, 2000);
  }
  if (step === "communication") sections.communication = {
    out_of_area_contact: String(obj.out_of_area_contact ?? "").slice(0, 200),
    check_in_method: String(obj.check_in_method ?? "").slice(0, 500),
    code_words: String(obj.code_words ?? "").slice(0, 200),
    notes: String(obj.comm_notes ?? "").slice(0, 2000),
  };
  const stepIdx = STEP_ORDER.indexOf(step);
  const { error, count } = await supabase.from("emergency_plans")
    .update({ sections, current_step: Math.max(plan.current_step ?? 0, stepIdx + 1) }, { count: "exact" }).eq("id", id.data);
  if (error) return dbError(error);
  if (!count) return { error: "You don't have permission to edit this plan." };
  revalidatePath(`/plans/${id.data}`);
  if (obj.continue) redirect(`/plans/${id.data}?step=${STEP_ORDER[stepIdx + 1] ?? "review"}`);
  return { ok: true, message: "Saved." };
}

export async function addChecklistItem(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(z.object({ plan_id: uuid, label: reqText(300, "Task"), phase: z.enum(["before", "during", "after"]), assigned_to: optText(120), due_on: optDate }), fd);
  if (p.error) return p.error;
  const { supabase } = await requireUser();
  const { error } = await supabase.from("plan_checklist_items").insert({ ...p.data, sort: 999 });
  if (error) return dbError(error);
  revalidatePath(`/plans/${p.data.plan_id}`);
  return { ok: true };
}

export async function deleteChecklistItem(fd: FormData) {
  const { supabase } = await requireUser();
  await supabase.from("plan_checklist_items").delete().eq("id", String(fd.get("id")));
  revalidatePath(`/plans/${fd.get("plan_id")}`);
}

export async function updatePlanMeta(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(z.object({ id: uuid, title: reqText(160, "Title"), review_on: optDate, shared_with_household: checkbox, notes: optText(4000) }), fd);
  if (p.error) return p.error;
  const { supabase, user } = await requireUser();
  const { data: plan } = await supabase.from("emergency_plans").select("sections, household_id, owner_id").eq("id", p.data.id).single();
  if (!plan) return { error: "Plan not found" };
  const update: Record<string, unknown> = { title: p.data.title, review_on: p.data.review_on, sections: { ...(plan.sections as object), notes: p.data.notes ?? "" } };
  if (plan.owner_id === user.id && plan.household_id) update.shared_with_household = p.data.shared_with_household;
  const { error } = await supabase.from("emergency_plans").update(update).eq("id", p.data.id);
  if (error) return dbError(error);
  if (p.data.review_on) {
    await supabase.from("reminders").delete().eq("related_id", p.data.id).eq("done", false);
    await supabase.from("reminders").insert({ user_id: user.id, title: `Review emergency plan “${p.data.title}”`, due_on: p.data.review_on, related_type: "plan", related_id: p.data.id, link: `/plans/${p.data.id}` });
  }
  revalidatePath(`/plans/${p.data.id}`);
  return { ok: true, message: "Plan details saved." };
}

export async function setPlanStatus(fd: FormData) {
  const { supabase, user } = await requireUser();
  const id = String(fd.get("id")); const status = String(fd.get("status"));
  if (!["draft", "active", "archived"].includes(status)) return;
  const { data } = await supabase.from("emergency_plans").update({ status }).eq("id", id).select("title, household_id").single();
  if (data) await logActivity(supabase, user.id, "plan", `${status === "active" ? "Activated" : status === "archived" ? "Archived" : "Restored"} plan “${data.title}”`, `/plans/${id}`, data.household_id);
  revalidatePath("/plans"); revalidatePath(`/plans/${id}`); revalidatePath("/dashboard");
}

export async function duplicatePlan(fd: FormData) {
  const { supabase, user } = await requireUser();
  const id = String(fd.get("id"));
  const { data: plan } = await supabase.from("emergency_plans").select("*").eq("id", id).single();
  if (!plan) return;
  const { data: items } = await supabase.from("plan_checklist_items").select("label, phase, assigned_to, sort").eq("plan_id", id);
  const newId = crypto.randomUUID();
  await supabase.from("emergency_plans").insert({
    id: newId, owner_id: user.id, title: `${plan.title} (copy)`.slice(0, 160), hazard: plan.hazard, plan_type: plan.plan_type,
    household_id: plan.household_id, shared_with_household: false, sections: plan.sections, status: "draft", review_on: plan.review_on, current_step: plan.current_step,
  });
  if (items?.length) await supabase.from("plan_checklist_items").insert(items.map((i) => ({ ...i, plan_id: newId })));
  redirect(`/plans/${newId}`);
}

export async function deletePlan(fd: FormData) {
  const { supabase } = await requireUser();
  const id = String(fd.get("id"));
  await supabase.from("reminders").delete().eq("related_id", id);
  await supabase.from("emergency_plans").delete().eq("id", id);
  revalidatePath("/plans");
  redirect("/plans");
}
