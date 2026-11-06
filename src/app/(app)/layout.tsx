export const dynamic = "force-dynamic";
import { AppShell } from "@/components/shell/app-shell";
import { requireUser } from "@/lib/auth";
import { signOut } from "@/app/actions";
import { OfflineBootstrap } from "@/components/offline/connectivity";
import { SignOutCleanup } from "@/components/offline/signout-cleanup";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user, profile } = await requireUser();
  const [{ count: orgCount }, { data: banner }] = await Promise.all([
    supabase.from("org_members").select("org_id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("app_settings").select("value").eq("key", "maintenance_banner").maybeSingle(),
  ]);
  return (
    <AppShell userName={profile?.full_name || user.email || "Account"} isAdmin={profile?.platform_role === "platform_admin"}
      orgCount={orgCount ?? 0} banner={typeof banner?.value === "string" && banner.value ? banner.value : undefined} signOut={signOut}>
      <OfflineBootstrap signedIn />
      <SignOutCleanup userId={user.id} />
      {children}
    </AppShell>
  );
}
