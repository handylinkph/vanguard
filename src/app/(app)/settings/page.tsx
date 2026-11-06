import { Download, ShieldAlert } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, PageHeader, Field, Input, Alert, buttonVariants } from "@/components/ui";
import { ActionForm, SubmitButton, FieldError } from "@/components/ui/form";
import { updateProfile, updatePrivacy, changeEmail, deleteAccount } from "./actions";
import { ClearOfflineButton } from "@/components/offline/clear-button";
import Link from "next/link";

export const metadata = { title: "Profile & settings" };

export default async function Settings() {
  const { user, profile } = await requireUser();
  return (
    <>
      <PageHeader title="Profile & settings" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>Profile</CardTitle></CardHeader><CardContent>
          <ActionForm action={updateProfile} className="grid gap-3 sm:grid-cols-2">
            <Field label="Full name" htmlFor="fn" className="sm:col-span-2"><Input id="fn" name="full_name" defaultValue={profile.full_name ?? ""} maxLength={120} required /><FieldError name="full_name" /></Field>
            <Field label="Mobile number (optional)" htmlFor="ph"><Input id="ph" name="phone" type="tel" defaultValue={profile.phone ?? ""} maxLength={40} /></Field>
            <Field label="Region / Province" htmlFor="rg"><Input id="rg" name="region" defaultValue={profile.region ?? ""} maxLength={80} /></Field>
            <Field label="City / Municipality" htmlFor="ct"><Input id="ct" name="city" defaultValue={profile.city ?? ""} maxLength={80} /></Field>
            <Field label="Barangay" htmlFor="bg"><Input id="bg" name="barangay" defaultValue={profile.barangay ?? ""} maxLength={80} /></Field>
            <SubmitButton size="sm" className="self-start">Save profile</SubmitButton>
          </ActionForm></CardContent></Card>

        <Card><CardHeader><CardTitle>Account</CardTitle><CardDescription>Signed in as {user.email}</CardDescription></CardHeader><CardContent className="flex flex-col gap-4">
          <ActionForm action={changeEmail} className="flex items-end gap-2"><Field label="Change email" htmlFor="em" className="flex-1"><Input id="em" name="email" type="email" required /></Field><SubmitButton size="sm" variant="outline">Update</SubmitButton></ActionForm>
          <Link href="/reset-password" className="text-sm text-brand-700 underline">Change password</Link>
        </CardContent></Card>

        <Card><CardHeader><CardTitle>Privacy</CardTitle><CardDescription>Control what others can see. Household, incident and financial records are always private to you and your household.</CardDescription></CardHeader><CardContent>
          <ActionForm action={updatePrivacy} className="flex flex-col gap-3">
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="share_name_with_groups" defaultChecked={profile.privacy?.share_name_with_groups !== false} className="mt-1" />Show my name to members of community groups I join (otherwise shown as “Member”)</label>
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="allow_aggregate_metrics" defaultChecked={profile.privacy?.allow_aggregate_metrics !== false} className="mt-1" />Include my anonymous assessment score in platform-wide averages</label>
            <SubmitButton size="sm" className="self-start">Save privacy settings</SubmitButton>
          </ActionForm></CardContent></Card>

        <Card><CardHeader><CardTitle>Your data</CardTitle><CardDescription>Download everything you&apos;ve stored in Vanguard (Data Privacy Act right to access and portability).</CardDescription></CardHeader><CardContent className="flex flex-col gap-3">
          <a href="/settings/export" download className={buttonVariants({ variant: "outline" })}><Download />Download my data (JSON)</a>
          <ClearOfflineButton />
          <p className="text-xs text-muted">Read the <Link className="underline" href="/about/privacy">privacy notice</Link>.</p>
        </CardContent></Card>

        <Card className="border-red-200 lg:col-span-2"><CardHeader><CardTitle className="flex items-center gap-2 text-red-700"><ShieldAlert className="size-4" />Delete account</CardTitle>
          <CardDescription>Permanently deletes your account, plans, kits, contacts, assessments, incident records and files, finances and AI conversations. Households you share remain for other members. This cannot be undone — download your data first.</CardDescription></CardHeader>
          <CardContent>
            <Alert tone="warning" className="mb-3">If you are the only administrator of a household that has other members, make someone else an administrator first.</Alert>
            <ActionForm action={deleteAccount} className="flex flex-wrap items-end gap-2">
              <Field label='Type "DELETE" to confirm' htmlFor="cf"><Input id="cf" name="confirm" autoComplete="off" required className="w-48" /></Field>
              <SubmitButton variant="destructive" size="sm" pendingText="Deleting…">Delete my account</SubmitButton>
            </ActionForm></CardContent></Card>
      </div>
    </>
  );
}
