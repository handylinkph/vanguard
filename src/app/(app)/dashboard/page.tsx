import Link from "next/link";
import { Bell, ArrowRight, Bookmark, Activity, ClipboardList, Backpack, Gauge, Users } from "lucide-react";
import { requireUser, getMyHouseholds } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, PageHeader, Badge, Button, Progress, ButtonLink, Alert } from "@/components/ui";
import { InlineAction } from "@/components/ui/form";
import { OfflineStatusCard } from "@/components/offline/status-card";
import { computeReadiness } from "@/lib/readiness";
import { kitReadiness, isExpired, expiresWithin } from "@/lib/kits";
import { BAND_LABEL, type AssessmentResult } from "@/lib/assessment";
import { getGuide } from "@/content/guides";
import { completeReminder } from "../settings/actions";
import { fmtDate, daysBetween, addDaysISO, todayISO, daysAgoISO } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const sp = await searchParams;
  const { supabase, user, profile } = await requireUser();
  const households = await getMyHouseholds();
  const hh = households[0]?.household;
  const yearAgo = daysAgoISO(365);

  const [plans, kits, contacts, assessment, drills, goals, contribs, reminders, saved, activity, members] = await Promise.all([
    supabase.from("emergency_plans").select("id, title, status, plan_checklist_items(done)").neq("status", "archived").order("updated_at", { ascending: false }),
    supabase.from("kits").select("id, name, kit_items(name, qty_needed, qty_have, essential, packed, expires_on)").eq("archived", false),
    supabase.from("emergency_contacts").select("id", { count: "exact", head: true }),
    supabase.from("risk_assessments").select("id, score, created_at, recommendations").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("drill_runs").select("id", { count: "exact", head: true }).eq("user_id", user.id).gt("completed_at", yearAgo),
    supabase.from("savings_goals").select("id, target_php"),
    supabase.from("savings_contributions").select("amount_php"),
    supabase.from("reminders").select("*").eq("done", false).lte("due_on", addDaysISO(30)).order("due_on").limit(8),
    supabase.from("saved_items").select("item_type, item_key, title").order("created_at", { ascending: false }).limit(8),
    supabase.from("activity_log").select("id, summary, link, created_at, user_id").order("created_at", { ascending: false }).limit(8),
    hh ? supabase.from("household_members").select("id, role", { count: "exact" }).eq("household_id", hh.id) : Promise.resolve({ data: [], count: 0 }),
  ]);

  const activePlans = (plans.data ?? []).filter((p) => p.status === "active");
  const planForPct = activePlans[0] ?? plans.data?.[0];
  const planItems = (planForPct?.plan_checklist_items ?? []) as { done: boolean }[];
  const planPct = planItems.length ? (planItems.filter((i) => i.done).length / planItems.length) * 100 : 0;
  type KI = { name: string; qty_needed: number; qty_have: number; essential: boolean; packed: boolean; expires_on: string | null };
  const kitStats = (kits.data ?? []).map((k) => {
    const items = ((k.kit_items ?? []) as KI[]).map((i) => ({ ...i, qty_needed: Number(i.qty_needed), qty_have: Number(i.qty_have) }));
    return { id: k.id, name: k.name, readiness: kitReadiness(items), expired: items.filter((i) => isExpired(i)), soon: items.filter((i) => expiresWithin(i, 30)) };
  });
  const bestKit = kitStats.length ? Math.max(...kitStats.map((k) => k.readiness)) : null;
  const totalTarget = (goals.data ?? []).reduce((a, g) => a + Number(g.target_php), 0);
  const totalSaved = (contribs.data ?? []).reduce((a, c) => a + Number(c.amount_php), 0);
  const a = assessment.data;
  const r = computeReadiness({
    hasActivePlan: activePlans.length > 0, planChecklistPct: planPct, kitReadinessPct: bestKit, contactsCount: contacts.count ?? 0,
    latestAssessmentScore: a?.score ?? null, latestAssessmentDays: a ? daysBetween(new Date(a.created_at), new Date()) : null,
    drillsLast12Months: drills.count ?? 0, hasSavingsGoal: (goals.data ?? []).length > 0, savingsPct: totalTarget ? (totalSaved / totalTarget) * 100 : null,
  });

  const suggestions: { text: string; href: string }[] = [];
  if (!hh) suggestions.push({ text: "Set up your household profile", href: "/household" });
  for (const k of kitStats) for (const i of k.expired.slice(0, 2)) suggestions.push({ text: `Replace expired “${i.name}” in ${k.name}`, href: `/kits/${k.id}` });
  for (const c of [...r.components].sort((x, y) => x.value - y.value)) if (c.value < 100) suggestions.push({ text: c.hint, href: c.link });
  for (const rec of ((a?.recommendations ?? []) as AssessmentResult["recommendations"]).filter((x) => x.priority === "high").slice(0, 2)) suggestions.push({ text: rec.text, href: rec.link });
  const uniqueSuggestions = suggestions.filter((s, i) => suggestions.findIndex((x) => x.text === s.text) === i).slice(0, 6);
  const overdue = (reminders.data ?? []).filter((x) => x.due_on < todayISO());

  return (
    <>
      <PageHeader eyebrow={new Date().toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric", timeZone: "Asia/Manila" })}
        title={`Kumusta${profile.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}!`}
        description={hh ? `${hh.name} · ${members.count ?? 0} people` : "Let's get your household prepared."}
        actions={<ButtonLink href="/onboarding" variant="outline">Setup checklist</ButtonLink>} />
      {sp.denied && <Alert tone="error" className="mb-4">You don&apos;t have access to that area.</Alert>}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2"><CardHeader><CardTitle>Household readiness progress</CardTitle>
          <p className="text-xs text-muted">Weighted completion of concrete preparedness actions. A progress measure — not a guarantee of safety.</p></CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="relative grid size-28 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#0f766e ${r.overall * 3.6}deg, #e2e7ef 0deg)` }} role="img" aria-label={`Readiness ${r.overall} percent`}>
                <div className="grid size-22 place-items-center rounded-full bg-white"><span className="text-2xl font-semibold text-navy">{r.overall}%</span></div>
              </div>
              <ul className="grid flex-1 gap-2 sm:grid-cols-2">{r.components.map((c) => (
                <li key={c.key}><Link href={c.link} className="block rounded-lg p-1.5 hover:bg-surface"><div className="flex justify-between text-xs"><span>{c.label}</span><span className="font-medium">{c.value}%</span></div><Progress value={c.value} className="mt-1 h-1.5" label={c.label} /></Link></li>))}</ul>
            </div>
          </CardContent></Card>

        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Bell className="size-4" />Reminders</CardTitle></CardHeader><CardContent>
          {(reminders.data ?? []).length === 0 ? <p className="text-sm text-muted">Nothing due in the next 30 days.</p> : (
            <ul className="flex flex-col gap-2">{reminders.data!.map((rm) => (
              <li key={rm.id} className="flex items-start justify-between gap-2 text-sm">
                <Link href={rm.link ?? "/dashboard"} className="hover:underline"><span className={overdue.some((o) => o.id === rm.id) ? "text-red-700" : ""}>{rm.title}</span><span className="block text-xs text-muted">{fmtDate(rm.due_on)}</span></Link>
                <InlineAction action={completeReminder} hidden={{ id: rm.id }}><Button size="sm" variant="ghost">Done</Button></InlineAction>
              </li>))}</ul>)}
        </CardContent></Card>

        <Card><CardHeader><CardTitle className="flex items-center gap-2"><ClipboardList className="size-4" />Emergency plan</CardTitle></CardHeader><CardContent className="text-sm">
          {planForPct ? <>
            <Link href={`/plans/${planForPct.id}`} className="font-medium hover:underline">{planForPct.title}</Link> <Badge tone={planForPct.status === "active" ? "green" : "amber"}>{planForPct.status}</Badge>
            <Progress value={planPct} className="mt-3" label="Plan checklist" /><p className="mt-1 text-xs text-muted">{Math.round(planPct)}% of checklist · {activePlans.length} active plan(s)</p>
          </> : <><p className="text-muted">No plan yet.</p><ButtonLink href="/plans/new" size="sm" className="mt-3">Create plan</ButtonLink></>}
        </CardContent></Card>

        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Backpack className="size-4" />Emergency kits</CardTitle></CardHeader><CardContent className="text-sm">
          {kitStats.length === 0 ? <><p className="text-muted">No kits yet.</p><ButtonLink href="/kits/new" size="sm" className="mt-3">Build a kit</ButtonLink></> : (
            <ul className="flex flex-col gap-2">{kitStats.slice(0, 3).map((k) => (
              <li key={k.id}><Link href={`/kits/${k.id}`} className="block hover:underline"><div className="flex justify-between"><span>{k.name}</span><span className="font-medium">{k.readiness}%</span></div></Link>
                <Progress value={k.readiness} className="mt-1 h-1.5" label={`${k.name} completion`} />
                {(k.expired.length > 0 || k.soon.length > 0) && <p className="mt-1 text-xs text-amber-800">{k.expired.length} expired · {k.soon.length} expiring soon</p>}</li>))}</ul>)}
        </CardContent></Card>

        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Gauge className="size-4" />Risk awareness</CardTitle></CardHeader><CardContent className="text-sm">
          {a ? <>
            <p className="text-3xl font-semibold text-navy">{a.score}%</p>
            <p className="text-xs text-muted">{BAND_LABEL[a.score >= 75 ? "well-prepared" : a.score >= 40 ? "building" : "getting-started"]} · assessed {fmtDate(a.created_at)}</p>
            <Link href={`/assessment/${a.id}`} className="mt-2 inline-flex items-center gap-1 text-brand-700 underline">See recommendations <ArrowRight className="size-3" /></Link>
          </> : <><p className="text-muted">Take a 5-minute household preparedness assessment.</p><ButtonLink href="/assessment/take" size="sm" className="mt-3">Start</ButtonLink></>}
          <p className="mt-3 text-xs text-muted">Measures preparedness actions, not geographic hazard risk.</p>
        </CardContent></Card>

        <Card className="lg:col-span-2"><CardHeader><CardTitle>Suggested next steps</CardTitle></CardHeader><CardContent>
          {uniqueSuggestions.length === 0 ? <p className="text-sm">You&apos;re on top of things. Keep supplies fresh and practise a drill this season.</p> : (
            <ul className="grid gap-2 sm:grid-cols-2">{uniqueSuggestions.map((s) => (
              <li key={s.text}><Link href={s.href} className="flex items-center justify-between gap-2 rounded-lg border border-line p-3 text-sm hover:border-brand-500">{s.text}<ArrowRight className="size-4 shrink-0 text-muted" /></Link></li>))}</ul>)}
        </CardContent></Card>

        <OfflineStatusCard />

        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Bookmark className="size-4" />Saved resources</CardTitle></CardHeader><CardContent className="text-sm">
          {(saved.data ?? []).length === 0 ? <p className="text-muted">Save guides and resources to find them quickly — and offline.</p> : (
            <ul className="flex flex-col gap-1.5">{saved.data!.map((s) => {
              const href = s.item_type === "guide" ? `/guides/${s.item_key}` : s.item_type === "resource" ? `/library/${s.item_key}` : "/services";
              return <li key={s.item_type + s.item_key}><Link href={href} className="text-brand-700 hover:underline">{s.title || getGuide(s.item_key)?.title || s.item_key}</Link> <span className="text-xs text-muted">{s.item_type}</span></li>;
            })}</ul>)}
        </CardContent></Card>

        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Activity className="size-4" />Recent activity</CardTitle></CardHeader><CardContent className="text-sm">
          {(activity.data ?? []).length === 0 ? <p className="text-muted">Your preparedness activity will appear here.</p> : (
            <ul className="flex flex-col gap-2">{activity.data!.map((ev) => (
              <li key={ev.id}><Link href={ev.link ?? "#"} className="hover:underline">{ev.summary}</Link><span className="block text-xs text-muted">{fmtDate(ev.created_at)}{ev.user_id !== user.id ? " · household member" : ""}</span></li>))}</ul>)}
        </CardContent></Card>

        {!hh && <Card className="lg:col-span-3 border-brand-100 bg-brand-50"><CardContent className="flex flex-wrap items-center justify-between gap-3 pt-5">
          <p className="flex items-center gap-2 text-sm"><Users className="size-5 text-brand-700" />Add your household so kits are sized correctly and plans can be shared with family.</p>
          <ButtonLink href="/household" size="sm">Set up household</ButtonLink></CardContent></Card>}
      </div>
    </>
  );
}
