"use server";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
export async function deleteConversation(fd: FormData) {
  const { supabase } = await requireUser();
  await supabase.from("ai_conversations").delete().eq("id", String(fd.get("id")));
  redirect("/assistant");
}
