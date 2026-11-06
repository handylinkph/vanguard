"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/admin";
import { parseForm, optText, checkbox, dbError, type ActionResult } from "@/lib/actions";

export async function updateProfile(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(z.object({ full_name: z.string().trim().min(1, "Enter your name").max(120), phone: optText(40), region: optText(80), city: optText(80), barangay: optText(80) }), fd); if (p.error) return p.error;
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("profiles").update(p.data).eq("id", user.id);
  if (error) return dbError(error);
  revalidatePath("/", "layout"); return { ok: true, message: "Profile saved." };
}

export async function updatePrivacy(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(z.object({ share_name_with_groups: checkbox, allow_aggregate_metrics: checkbox }), fd); if (p.error) return p.error;
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("profiles").update({ privacy: p.data }).eq("id", user.id);
  if (error) return dbError(error);
  if (!p.data.share_name_with_groups) {
    await supabase.from("group_members").update({ display_name: "Member" }).eq("user_id", user.id);
  }
  revalidatePath("/settings"); return { ok: true, message: "Privacy settings saved." };
}

export async function changeEmail(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(z.object({ email: z.string().trim().toLowerCase().email("Enter a valid email") }), fd); if (p.error) return p.error;
  const { supabase } = await requireUser();
  const { error } = await supabase.auth.updateUser({ email: p.data.email });
  if (error) return { error: error.message };
  return { ok: true, message: "Check both your old and new inboxes to confirm the change." };
}

export async function deleteAccount(_: ActionResult, fd: FormData): Promise<ActionResult> {
  if (fd.get("confirm") !== "DELETE") return { error: 'Type DELETE in capital letters to confirm.' };
  const { supabase, user } = await requireUser();
  const admin = createServiceClient();
  if (!admin) return { error: "Account deletion requires server configuration (service role key). Please contact support — your request has not been processed." };
  // Remove private files first (storage objects are not removed by database cascades).
  const { data: files } = await supabase.from("incident_attachments").select("storage_path");
  if (files?.length) await admin.storage.from("incident-files").remove(files.map((f) => f.storage_path));
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { error: `Deletion failed: ${error.message}` };
  await supabase.auth.signOut();
  redirect("/login?signedout=1");
}

export async function completeReminder(fd: FormData) {
  const { supabase } = await requireUser();
  await supabase.from("reminders").update({ done: true }).eq("id", String(fd.get("id")));
  revalidatePath("/dashboard");
}
