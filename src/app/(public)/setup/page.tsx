import { Card, CardContent, CardHeader, CardTitle, Alert } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata = { title: "Service configuration" };

export default function Setup() {
  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader><CardTitle>Account features are not configured on this server</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-sm">
        {isSupabaseConfigured ? <Alert tone="success">The backend is configured. You can <a className="underline" href="/login">sign in</a>.</Alert> : (
          <>
            <Alert tone="warning">This deployment has no Supabase project connected, so sign-in and saved data are unavailable. Public guides, the library page and offline guides still work.</Alert>
            <p>Administrators: set <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> and apply the migrations in <code>supabase/migrations</code>. See <code>docs/DEPLOYMENT.md</code>.</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
