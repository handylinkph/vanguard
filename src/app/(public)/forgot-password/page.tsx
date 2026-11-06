import { Card, CardContent, CardHeader, CardTitle, CardDescription, Input, Field } from "@/components/ui";
import { ActionForm, SubmitButton, FieldError } from "@/components/ui/form";
import { requestReset } from "../auth/actions";

export const metadata = { title: "Reset password" };
export default function Forgot() {
  return (
    <Card className="mx-auto max-w-md">
      <CardHeader><CardTitle className="text-xl">Reset your password</CardTitle><CardDescription>We&apos;ll email you a secure link.</CardDescription></CardHeader>
      <CardContent>
        <ActionForm action={requestReset} className="flex flex-col gap-4">
          <Field label="Email" htmlFor="email"><Input id="email" name="email" type="email" autoComplete="email" required /><FieldError name="email" /></Field>
          <SubmitButton pendingText="Sending…">Send reset link</SubmitButton>
        </ActionForm>
      </CardContent>
    </Card>
  );
}
