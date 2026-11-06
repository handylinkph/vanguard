import { CheckCircle2, Circle } from "lucide-react";
import { requireUser, getMyHouseholds } from "@/lib/auth";
import { Card, CardContent, PageHeader, ButtonLink } from "@/components/ui";

export const metadata = { title: "Welcome" };

export default async function Onboarding() {
  const { supabase, user, profile } = await requireUser();
  const households = await getMyHouseholds();
  const [{ count: contacts }, { count: plans }, { count: kits }, { count: assessments }] = await Promise.all([
    supabase.from("emergency_contacts").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
    supabase.from("emergency_plans").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
    supabase.from("kits").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
    supabase.from("risk_assessments").select("id", { count: "exact", head: true }).eq("user_id", user.id),
  ]);
  const steps = [
    { done: households.length > 0, title: "Set up your household", body: "Who lives with you, including children, older adults and pets.", href: "/household" },
    { done: (assessments ?? 0) > 0, title: "Take the preparedness assessment", body: "Five minutes to see where to start.", href: "/assessment" },
    { done: (contacts ?? 0) > 0, title: "Save emergency contacts", body: "Family, an out-of-area relative and local numbers.", href: "/contacts" },
    { done: (plans ?? 0) > 0, title: "Create your emergency plan", body: "Meeting places, evacuation destinations and roles.", href: "/plans/new" },
    { done: (kits ?? 0) > 0, title: "Build your emergency kit", body: "A 3-day kit and go-bags sized to your household.", href: "/kits/new" },
  ];
  return (
    <>
      <PageHeader title={`Welcome${profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}`} description="Five steps to a prepared household. You can do them in any order and come back anytime." />
      <ol className="flex flex-col gap-3">
        {steps.map((s, i) => (
          <li key={s.title}><Card><CardContent className="flex items-center gap-4 pt-5">
            {s.done ? <CheckCircle2 className="size-6 shrink-0 text-accent" aria-label="Done" /> : <Circle className="size-6 shrink-0 text-line" aria-label="Not done" />}
            <div className="flex-1"><p className="font-medium">{i + 1}. {s.title}</p><p className="text-sm text-muted">{s.body}</p></div>
            <ButtonLink href={s.href} variant={s.done ? "outline" : "default"} size="sm">{s.done ? "Review" : "Start"}</ButtonLink>
          </CardContent></Card></li>
        ))}
      </ol>
      <div className="mt-6"><ButtonLink href="/dashboard" variant="ghost">Go to dashboard</ButtonLink></div>
    </>
  );
}
