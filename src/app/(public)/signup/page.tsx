import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Input, Field } from "@/components/ui";
import { ActionForm, SubmitButton, FieldError } from "@/components/ui/form";
import { signUp } from "../auth/actions";

export const metadata = { title: "Create account" };

export default function Signup() {
  return (
    <Card className="mx-auto max-w-md">
      <CardHeader><CardTitle className="text-xl">Create your Vanguard account</CardTitle><CardDescription>Free. Your household information stays private by default.</CardDescription></CardHeader>
      <CardContent>
        <ActionForm action={signUp} className="flex flex-col gap-4">
          <Field label="Full name" htmlFor="full_name"><Input id="full_name" name="full_name" autoComplete="name" required maxLength={120} /><FieldError name="full_name" /></Field>
          <Field label="Email" htmlFor="email"><Input id="email" name="email" type="email" autoComplete="email" required /><FieldError name="email" /></Field>
          <Field label="Password" htmlFor="password" hint="At least 10 characters with letters and numbers."><Input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} /><FieldError name="password" /></Field>
          <label className="flex items-start gap-2 text-sm text-muted">
            <input type="checkbox" name="consent" className="mt-1" required />
            <span>I agree that Vanguard stores the information I enter to provide preparedness features, as described in the <Link href="/about/privacy" className="text-brand-700 underline">privacy notice</Link> (Data Privacy Act of 2012, RA 10173).</span>
          </label>
          <FieldError name="consent" />
          <SubmitButton pendingText="Creating account…">Create account</SubmitButton>
        </ActionForm>
        <p className="mt-4 text-center text-sm">Already have an account? <Link href="/login" className="text-brand-700 underline">Sign in</Link></p>
      </CardContent>
    </Card>
  );
}
