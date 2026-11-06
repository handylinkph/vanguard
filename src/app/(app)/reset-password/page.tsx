import { Card, CardContent, CardHeader, CardTitle, Input, Field } from "@/components/ui";
import { ActionForm, SubmitButton, FieldError } from "@/components/ui/form";
import { updatePassword } from "@/app/(public)/auth/actions";

export const metadata = { title: "Set new password" };
export default function ResetPassword() {
  return (
    <Card className="mx-auto max-w-md">
      <CardHeader><CardTitle className="text-xl">Choose a new password</CardTitle></CardHeader>
      <CardContent>
        <ActionForm action={updatePassword} className="flex flex-col gap-4" resetOnSuccess>
          <Field label="New password" htmlFor="password" hint="At least 10 characters with letters and numbers."><Input id="password" name="password" type="password" autoComplete="new-password" required /><FieldError name="password" /></Field>
          <Field label="Confirm password" htmlFor="confirm"><Input id="confirm" name="confirm" type="password" autoComplete="new-password" required /><FieldError name="confirm" /></Field>
          <SubmitButton>Update password</SubmitButton>
        </ActionForm>
      </CardContent>
    </Card>
  );
}
