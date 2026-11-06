import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { InviteCard } from "@/components/invite-card";
import { acceptOrgInvite } from "@/app/(app)/organizations/actions";
import { isSupabaseConfigured } from "@/lib/env";

export default async function Page({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string }> }) {
  const { token } = await params; const sp = await searchParams;
  if (!isSupabaseConfigured || !/^[a-f0-9]{64}$/.test(token)) notFound();
  const supabase = await createClient();
  const { data } = await supabase.rpc("preview_org_invite", { p_token: token });
  const inv = (data as { org_name: string; org_type: string; role: string; valid: boolean }[] | null)?.[0];
  const session = await getSession();
  return <InviteCard title={inv ? `Join ${inv.org_name}` : "Organization invitation"} detail={inv ? `${inv.org_type === "school" ? "School" : "Business"} · you'll join as ${inv.role}` : undefined}
    valid={!!inv?.valid} signedIn={!!session} token={token} path={`/invite/org/${token}`} accept={acceptOrgInvite} error={sp.error} />;
}
