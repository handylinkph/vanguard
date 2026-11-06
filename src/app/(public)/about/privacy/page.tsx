import { Card, CardContent } from "@/components/ui";
export const metadata = { title: "Privacy notice" };
export default function Privacy() {
  return (
    <Card className="mx-auto max-w-3xl"><CardContent className="prose-v pt-6 text-sm">
      <h1 className="text-2xl font-semibold text-navy">Privacy notice</h1>
      <p className="text-xs text-muted">Draft for legal review — prepared with the Philippine Data Privacy Act of 2012 (Republic Act No. 10173) in mind. Not legal advice.</p>
      <h2>What we collect</h2>
      <ul><li>Account details: name, email, optional phone and location (region, city, barangay).</li>
        <li>Preparedness information you enter: households, dependents, plans, kits, contacts, assessments, drills, finances and personal incident records.</li>
        <li>Technical data needed to run the service, such as error reports (without the content of your records).</li></ul>
      <h2>How we use it</h2>
      <p>Only to provide Vanguard&apos;s preparedness features to you and the people you choose to share with. We do not sell your data and we do not forward anything to government agencies or emergency services.</p>
      <h2>Who can see it</h2>
      <ul><li>Personal records (incident records, finances, assessments) are visible only to you.</li>
        <li>Household information is visible to members of that household. Plans and kits are shared only when you choose.</li>
        <li>Group and organisation content is visible to members of that group or organisation.</li>
        <li>Platform administrators see aggregated statistics and account basics needed to manage the service, not your household or personal records. Reported community posts are visible to moderators.</li></ul>
      <h2>Children&apos;s information</h2>
      <p>Accounts are for adults. Household administrators may list children as dependents with minimal details (name and age group). Avoid entering detailed medical information.</p>
      <h2>Offline storage</h2>
      <p>Essentials you use offline are stored encrypted in your browser and removed when you sign out.</p>
      <h2>Your rights</h2>
      <p>You can access, correct, export and delete your data at any time from Profile &amp; Settings. Deleting your account permanently removes your records.</p>
    </CardContent></Card>
  );
}
