import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, Alert, ButtonLink, Button } from "@/components/ui";

export function InviteCard({ title, detail, valid, signedIn, token, path, accept, error }: {
  title: string; detail?: string; valid: boolean; signedIn: boolean; token: string; path: string; accept: (fd: FormData) => Promise<void>; error?: string;
}) {
  return (
    <Card className="mx-auto max-w-md">
      <CardHeader><CardTitle className="text-xl">{title}</CardTitle>{detail && <p className="text-sm text-muted">{detail}</p>}</CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error && <Alert tone="error">{error}</Alert>}
        {!valid ? <Alert tone="warning">This invitation is invalid, expired, or already used. Ask the sender for a new link.</Alert>
          : signedIn ? <form action={accept}><input type="hidden" name="token" value={token} /><Button className="w-full">Accept invitation</Button></form>
          : <>
              <p className="text-sm">Sign in or create an account to accept.</p>
              <ButtonLink href={`/login?next=${encodeURIComponent(path)}`}>Sign in</ButtonLink>
              <p className="text-center text-sm">New to Vanguard? <Link className="text-brand-700 underline" href="/signup">Create an account</Link>, then reopen this link.</p>
            </>}
      </CardContent>
    </Card>
  );
}
