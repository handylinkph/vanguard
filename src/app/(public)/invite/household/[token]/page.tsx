import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { InviteCard } from "@/components/invite-card";
import { acceptHouseholdInvite } from "@/app/(app)/household/actions";
import { isSupabaseConfigured } from "@/lib/env";

export default async function Page({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string }> }) {
  const { token } = await params; const sp = await searchParams;
  if (!isSupabaseConfigured || !/^[a-f0-9]{64}$/.test(token)) notFound();
  const supabase = await createClient();
  const { data } = await supabase.rpc("preview_household_invite", { p_token: token });
  const inv = (data as { household_name: string; role: string; valid: boolean }[] | null)?.[0];
  const session = await getSession();
  return <InviteCard title={inv ? `Join “${inv.household_name}”` : "Household invitation"} detail={inv ? `You'll join as a household ${inv.role}.` : undefined}
    valid={!!inv?.valid} signedIn={!!session} token={token} path={`/invite/household/${token}`} accept={acceptHouseholdInvite} error={sp.error} />;
}
