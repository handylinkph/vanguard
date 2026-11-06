import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { InviteCard } from "@/components/invite-card";
import { acceptGroupInvite } from "@/app/(app)/community/actions";
import { isSupabaseConfigured } from "@/lib/env";

export default async function Page({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string }> }) {
  const { token } = await params; const sp = await searchParams;
  if (!isSupabaseConfigured || !/^[a-f0-9]{64}$/.test(token)) notFound();
  const supabase = await createClient();
  const { data } = await supabase.rpc("preview_group_invite", { p_token: token });
  const inv = (data as { group_name: string; area: string | null; valid: boolean }[] | null)?.[0];
  const session = await getSession();
  return <InviteCard title={inv ? `Join “${inv.group_name}”` : "Group invitation"} detail={inv?.area ? `Preparedness group · ${inv.area}` : "Community preparedness group"}
    valid={!!inv?.valid} signedIn={!!session} token={token} path={`/invite/group/${token}`} accept={acceptGroupInvite} error={sp.error} />;
}
