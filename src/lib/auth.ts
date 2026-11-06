import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { Profile, Household } from "@/lib/types";

export const getSession = cache(async () => {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();
  return { supabase, user: data.user, profile: profile as Profile | null };
});

export async function requireUser() {
  if (!isSupabaseConfigured) redirect("/setup");
  const s = await getSession();
  if (!s) redirect("/login");
  if (s.profile?.disabled) {
    await s.supabase.auth.signOut();
    redirect("/login?disabled=1");
  }
  return { supabase: s.supabase, user: s.user, profile: s.profile as Profile };
}

export async function requireAdmin() {
  const s = await requireUser();
  if (s.profile.platform_role !== "platform_admin") redirect("/dashboard?denied=admin");
  return s;
}

export const getMyHouseholds = cache(async () => {
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from("household_members")
    .select("role, households(*)")
    .eq("user_id", user.id);
  return (data ?? []).map((r) => ({ role: r.role as string, household: r.households as unknown as Household }));
});
