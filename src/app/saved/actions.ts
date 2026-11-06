"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";

export async function toggleSaved(fd: FormData) {
  const { supabase, user } = await requireUser();
  const item_type = String(fd.get("item_type"));
  const item_key = String(fd.get("item_key")).slice(0, 200);
  if (!["guide", "resource", "service"].includes(item_type)) return;
  if (fd.get("saved") === "true") await supabase.from("saved_items").delete().match({ user_id: user.id, item_type, item_key });
  else await supabase.from("saved_items").insert({ user_id: user.id, item_type, item_key, title: String(fd.get("title") ?? "").slice(0, 200) });
  revalidatePath(String(fd.get("path") ?? "/"));
}

export async function toggleChecklistItem(fd: FormData) {
  const { supabase, user } = await requireUser();
  const checklist_key = String(fd.get("checklist_key")).slice(0, 100);
  const item_key = String(fd.get("item_key")).slice(0, 100);
  if (fd.get("done") === "true") await supabase.from("checklist_progress").delete().match({ user_id: user.id, checklist_key, item_key });
  else await supabase.from("checklist_progress").upsert({ user_id: user.id, checklist_key, item_key, done: true, updated_at: new Date().toISOString() });
  revalidatePath(String(fd.get("path") ?? "/"));
}
