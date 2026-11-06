import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Input, Field, Alert } from "@/components/ui";
import { ActionForm, SubmitButton, FieldError } from "@/components/ui/form";
import { signIn } from "../auth/actions";
import { ClearOfflineOnSignOut } from "@/components/offline/clear-on-signout";

export const metadata = { title: "Sign in" };

export default async function Login({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  return (
    <Card className="mx-auto max-w-md">
      <CardHeader><CardTitle className="text-xl">Sign in to Vanguard</CardTitle><CardDescription>Access your plans, kits and household.</CardDescription></CardHeader>
      <CardContent>
        {sp.signedout && <><Alert tone="success" className="mb-3">You have signed out. Offline data on this device was cleared.</Alert><ClearOfflineOnSignOut /></>}
        {sp.disabled && <Alert tone="error" className="mb-3">This account has been disabled. Contact support if you think this is a mistake.</Alert>}
        {sp.error === "link" && <Alert tone="error" className="mb-3">That link is invalid or has expired. Please try again.</Alert>}
        <ActionForm action={signIn} className="flex flex-col gap-4">
          <input type="hidden" name="next" value={sp.next ?? ""} />
          <Field label="Email" htmlFor="email"><Input id="email" name="email" type="email" autoComplete="email" required /><FieldError name="email" /></Field>
          <Field label="Password" htmlFor="password"><Input id="password" name="password" type="password" autoComplete="current-password" required /><FieldError name="password" /></Field>
          <SubmitButton pendingText="Signing in…">Sign in</SubmitButton>
        </ActionForm>
        <div className="mt-4 flex justify-between text-sm">
          <Link href="/forgot-password" className="text-brand-700 hover:underline">Forgot password?</Link>
          <Link href="/signup" className="text-brand-700 hover:underline">Create account</Link>
        </div>
      </CardContent>
    </Card>
  );
}
