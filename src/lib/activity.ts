import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function logActivity(
  supabase: SupabaseClient, userId: string, kind: string, summary: string, link?: string, householdId?: string | null,
) {
  await supabase.from("activity_log").insert({ user_id: userId, kind, summary: summary.slice(0, 300), link, household_id: householdId ?? null });
}
