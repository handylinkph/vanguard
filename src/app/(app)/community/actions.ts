"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { parseForm, reqText, optText, optDate, dbError, uuid, type ActionResult } from "@/lib/actions";
import { logActivity } from "@/lib/activity";

const rv = (id: string) => revalidatePath(`/community/${id}`);

export async function createGroup(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(z.object({ name: z.string().trim().min(2, "Name is required").max(120), description: optText(2000), area: optText(120) }), fd); if (p.error) return p.error;
  const { supabase, user } = await requireUser();
  const id = crypto.randomUUID();
  const { error } = await supabase.from("groups").insert({ id, ...p.data, created_by: user.id });
  if (error) return dbError(error);
  await supabase.from("group_checklist_items").insert([
    "Share each household's out-of-area contact with the group coordinator (optional)", "Map the nearest evacuation area and routes", "Identify neighbours who may need help evacuating (with their consent)", "Schedule a community drill",
  ].map((label, i) => ({ group_id: id, label, sort: i })));
  await logActivity(supabase, user.id, "community", `Created group “${p.data.name}”`, `/community/${id}`);
  redirect(`/community/${id}`);
}

export async function acceptGroupInvite(fd: FormData) {
  const { supabase, user } = await requireUser();
  const token = String(fd.get("token"));
  const { data, error } = await supabase.rpc("accept_group_invite", { p_token: token });
  if (error) redirect(`/invite/group/${token}?error=${encodeURIComponent(error.message)}`);
  await logActivity(supabase, user.id, "community", "Joined a preparedness group", `/community/${data}`);
  redirect(`/community/${data}`);
}

export async function createGroupInvite(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(z.object({ group_id: uuid, max_uses: z.coerce.number().int().min(1).max(500) }), fd); if (p.error) return p.error;
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("group_invites").insert({ ...p.data, created_by: user.id });
  if (error) return dbError(error);
  rv(p.data.group_id); return { ok: true, message: "Invitation link created." };
}

export async function createPost(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(z.object({ group_id: uuid, kind: z.enum(["announcement", "discussion"]), title: reqText(200, "Title"), body: reqText(5000, "Message") }), fd); if (p.error) return p.error;
  const { supabase, user } = await requireUser();
  const { data: setting } = await supabase.from("app_settings").select("value").eq("key", "community_posting_enabled").maybeSingle();
  if (setting && setting.value === false && p.data.kind === "discussion") return { error: "Discussions are temporarily disabled by administrators." };
  const { error } = await supabase.from("group_posts").insert({ ...p.data, author_id: user.id });
  if (error) return dbError(error);
  rv(p.data.group_id); return { ok: true };
}

export async function createComment(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(z.object({ group_id: uuid, post_id: uuid, body: reqText(2000, "Comment") }), fd); if (p.error) return p.error;
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("group_comments").insert({ ...p.data, author_id: user.id });
  if (error) return dbError(error);
  rv(p.data.group_id); return { ok: true };
}

export async function deletePost(fd: FormData) {
  const { supabase } = await requireUser();
  await supabase.from(fd.get("type") === "comment" ? "group_comments" : "group_posts").delete().eq("id", String(fd.get("id")));
  rv(String(fd.get("group_id")));
}

export async function reportContent(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(z.object({ group_id: uuid, target_type: z.enum(["post", "comment"]), target_id: uuid, reason: z.string().trim().min(3, "Tell us briefly what's wrong").max(500) }), fd); if (p.error) return p.error;
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("content_reports").insert({ ...p.data, reporter_id: user.id });
  if (error) return dbError(error);
  return { ok: true, message: "Reported to the group coordinators and moderators. Thank you." };
}

export async function resolveReport(fd: FormData) {
  const { supabase } = await requireUser();
  await supabase.rpc("admin_resolve_report", { p_report: String(fd.get("id")), p_action: String(fd.get("action")) });
  const gid = fd.get("group_id"); if (gid) rv(String(gid)); revalidatePath("/admin/moderation");
}

export async function saveTask(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(z.object({ group_id: uuid, title: reqText(200, "Task"), description: optText(1000), assigned_to: z.string().optional().transform((v) => v || null), due_on: optDate }), fd); if (p.error) return p.error;
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("group_tasks").insert({ ...p.data, created_by: user.id });
  if (error) return dbError(error);
  rv(p.data.group_id); return { ok: true };
}

export async function setTaskStatus(fd: FormData) {
  const { supabase, user } = await requireUser();
  const status = String(fd.get("status"));
  if (!["open", "in_progress", "done"].includes(status)) return;
  const { data } = await supabase.from("group_tasks").update({ status }).eq("id", String(fd.get("id"))).select("title").maybeSingle();
  if (data && status === "done") await logActivity(supabase, user.id, "community", `Completed group task “${data.title}”`, `/community/${fd.get("group_id")}`);
  rv(String(fd.get("group_id")));
}

export async function deleteTask(fd: FormData) {
  const { supabase } = await requireUser();
  await supabase.from("group_tasks").delete().eq("id", String(fd.get("id")));
  rv(String(fd.get("group_id")));
}

export async function addGroupChecklist(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(z.object({ group_id: uuid, label: reqText(200, "Item") }), fd); if (p.error) return p.error;
  const { supabase } = await requireUser();
  const { error } = await supabase.from("group_checklist_items").insert({ ...p.data, sort: 100 });
  if (error) return dbError(error);
  rv(p.data.group_id); return { ok: true };
}

export async function toggleGroupChecklist(fd: FormData) {
  const { supabase, user } = await requireUser();
  const done = fd.get("done") !== "true";
  await supabase.from("group_checklist_items").update({ done, done_by: done ? user.id : null }).eq("id", String(fd.get("id")));
  rv(String(fd.get("group_id")));
}

export async function saveEvent(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(z.object({ group_id: uuid, title: reqText(200, "Title"), kind: z.enum(["drill", "meeting", "training", "activity"]), starts_at: z.string().min(1, "Choose a date and time"), location_text: optText(200), description: optText(2000) }), fd); if (p.error) return p.error;
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("group_events").insert({ ...p.data, starts_at: new Date(p.data.starts_at + "+08:00").toISOString(), created_by: user.id });
  if (error) return dbError(error);
  rv(p.data.group_id); return { ok: true, message: "Event scheduled." };
}

export async function deleteEvent(fd: FormData) {
  const { supabase } = await requireUser();
  await supabase.from("group_events").delete().eq("id", String(fd.get("id")));
  rv(String(fd.get("group_id")));
}

export async function setGroupMemberRole(fd: FormData) {
  const { supabase } = await requireUser();
  const role = String(fd.get("role"));
  if (!["coordinator", "member"].includes(role)) return;
  await supabase.from("group_members").update({ role }).match({ group_id: String(fd.get("group_id")), user_id: String(fd.get("user_id")) });
  rv(String(fd.get("group_id")));
}

export async function removeGroupMember(fd: FormData) {
  const { supabase, user } = await requireUser();
  const gid = String(fd.get("group_id")); const uid = String(fd.get("user_id"));
  await supabase.from("group_members").delete().match({ group_id: gid, user_id: uid });
  if (uid === user.id) redirect("/community");
  rv(gid);
}

export async function updateGroup(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(z.object({ id: uuid, name: z.string().trim().min(2).max(120), description: optText(2000), area: optText(120) }), fd); if (p.error) return p.error;
  const { supabase } = await requireUser();
  const { id, ...rest } = p.data;
  const { error } = await supabase.from("groups").update(rest).eq("id", id);
  if (error) return dbError(error);
  rv(id); return { ok: true, message: "Group updated." };
}
