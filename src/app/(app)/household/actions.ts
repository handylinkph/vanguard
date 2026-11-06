"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { parseForm, optText, reqText, checkbox, dbError, uuid, type ActionResult } from "@/lib/actions";
import { logActivity } from "@/lib/activity";

const HouseholdSchema = z.object({
  name: reqText(120, "Household name"),
  region: optText(80), city: optText(80), barangay: optText(80),
  dwelling_type: z.enum(["house", "apartment", "condominium", "boarding", "other"]).optional(),
  floors: z.coerce.number().int().min(0).max(200).optional(),
  near_coast: checkbox, near_river: checkbox, near_slope: checkbox,
  notes: optText(2000),
});

export async function createHousehold(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(HouseholdSchema, fd); if (p.error) return p.error;
  const { supabase, user } = await requireUser();
  const id = crypto.randomUUID(); // generated here: the row only becomes visible after the membership trigger runs
  const { error } = await supabase.from("households").insert({ id, ...p.data, created_by: user.id });
  if (error) return dbError(error);
  await supabase.from("profiles").update({ onboarded: true, region: p.data.region, city: p.data.city, barangay: p.data.barangay }).eq("id", user.id);
  await logActivity(supabase, user.id, "household", `Created household “${p.data.name}”`, "/household", id);
  revalidatePath("/", "layout");
  redirect(`/household?id=${id}`);
}

export async function updateHousehold(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(HouseholdSchema.extend({ id: uuid }), fd); if (p.error) return p.error;
  const { supabase } = await requireUser();
  const { id, ...rest } = p.data;
  const { error, count } = await supabase.from("households").update(rest, { count: "exact" }).eq("id", id);
  if (error) return dbError(error);
  if (!count) return { error: "Only household administrators can edit household details." };
  revalidatePath("/household");
  return { ok: true, message: "Household updated." };
}

const MemberSchema = z.object({
  household_id: uuid,
  display_name: reqText(120, "Name"),
  relationship: optText(60),
  age_group: z.enum(["infant", "child", "teen", "adult", "senior"]),
  needs_assistance: checkbox,
  care_notes: optText(500),
  responsibilities: optText(500),
});

export async function addDependent(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(MemberSchema, fd); if (p.error) return p.error;
  const { supabase } = await requireUser();
  const { error } = await supabase.from("household_members").insert({ ...p.data, role: "dependent" });
  if (error) return dbError(error);
  revalidatePath("/household");
  return { ok: true, message: `${p.data.display_name} added.` };
}

export async function updateMember(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(MemberSchema.extend({ id: uuid }), fd); if (p.error) return p.error;
  const { supabase } = await requireUser();
  const { id, ...fields } = p.data;
  const rest: Partial<typeof fields> = { ...fields };
  delete rest.household_id;
  const { error, count } = await supabase.from("household_members").update(rest, { count: "exact" }).eq("id", id);
  if (error) return dbError(error);
  if (!count) return { error: "You can't edit this member." };
  revalidatePath("/household");
  return { ok: true, message: "Saved." };
}

export async function removeMember(fd: FormData) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("household_members").delete().eq("id", String(fd.get("id")));
  if (error) redirect(`/household?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/household");
}


export async function setMemberRole(fd: FormData) {
  const { supabase } = await requireUser();
  const role = String(fd.get("role"));
  if (!["admin", "member"].includes(role)) return;
  const { error } = await supabase.from("household_members").update({ role }).eq("id", String(fd.get("id")));
  if (error) redirect(`/household?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/household");
}

export async function addPet(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(z.object({ household_id: uuid, name: reqText(60, "Name"), species: optText(40), notes: optText(300) }), fd); if (p.error) return p.error;
  const { supabase } = await requireUser();
  const { error } = await supabase.from("household_pets").insert(p.data);
  if (error) return dbError(error);
  revalidatePath("/household");
  return { ok: true };
}
export async function removePet(fd: FormData) {
  const { supabase } = await requireUser();
  await supabase.from("household_pets").delete().eq("id", String(fd.get("id")));
  revalidatePath("/household");
}

export async function createInvite(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(z.object({ household_id: uuid, role: z.enum(["member", "admin"]), note: optText(200) }), fd); if (p.error) return p.error;
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("household_invites").insert({ ...p.data, created_by: user.id });
  if (error) return dbError(error);
  revalidatePath("/household");
  return { ok: true, message: "Invitation link created. Share it privately with the person you're inviting." };
}
export async function revokeInvite(fd: FormData) {
  const { supabase } = await requireUser();
  await supabase.from("household_invites").delete().eq("id", String(fd.get("id")));
  revalidatePath("/household");
}

export async function acceptHouseholdInvite(fd: FormData) {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase.rpc("accept_household_invite", { p_token: String(fd.get("token")) });
  if (error) redirect(`/invite/household/${fd.get("token")}?error=${encodeURIComponent(error.message)}`);
  await logActivity(supabase, user.id, "household", "Joined a household", "/household", data as string);
  revalidatePath("/", "layout");
  redirect(`/household?id=${data}`);
}

export async function leaveHousehold(fd: FormData) {
  const { supabase, user } = await requireUser();
  const hid = String(fd.get("household_id"));
  const { error } = await supabase.from("household_members").delete().eq("household_id", hid).eq("user_id", user.id);
  if (error) redirect(`/household?id=${hid}&error=${encodeURIComponent(error.message)}`);
  revalidatePath("/", "layout");
  redirect("/household");
}

