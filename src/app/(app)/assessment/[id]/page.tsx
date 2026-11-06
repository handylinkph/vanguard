import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, PageHeader, Badge, Button, Progress, Alert, ButtonLink } from "@/components/ui";
import { InlineAction } from "@/components/ui/form";
import { PrintButton } from "@/components/ui/copy-button";
import { BAND_LABEL, CATEGORY_LABEL, type AssessmentResult } from "@/lib/assessment";
import { HAZARD_LABEL } from "@/content/guides";
import { addRecommendationToPlan } from "../actions";
import { fmtDate } from "@/lib/utils";

export const metadata = { title: "Assessment results" };

export default async function Result({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ added?: string }> }) {
  const { id } = await params; const sp = await searchParams;
  const { supabase } = await requireUser();
  const { data: a } = await supabase.from("risk_assessments").select("*").eq("id", id).maybeSingle();
  if (!a) notFound();
  const { data: prev } = await supabase.from("risk_assessments").select("score, created_at").lt("created_at", a.created_at).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const band: AssessmentResult["band"] = a.score >= 75 ? "well-prepared" : a.score >= 40 ? "building" : "getting-started";
  const recs = a.recommendations as AssessmentResult["recommendations"];
  return (
    <>
      <PageHeader title="Your preparedness results" eyebrow={`Assessment · ${fmtDate(a.created_at)}`}
        description={`Hazards: ${(a.hazards as string[]).map((h) => HAZARD_LABEL[h]).join(", ") || "General"}${a.city ? ` · ${a.city}` : ""}`}
        actions={<><PrintButton label="Print summary" /><ButtonLink href="/assessment/take" variant="outline">Retake</ButtonLink></>} />
      {sp.added && <Alert tone="success" className="mb-4">Added to your emergency plan checklist.</Alert>}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1"><CardContent className="pt-6 text-center">
          <p className="text-sm text-muted">Household preparedness score</p>
          <p className="mt-2 text-5xl font-semibold text-navy">{a.score}%</p>
          <Badge tone={a.score >= 75 ? "green" : a.score >= 40 ? "blue" : "amber"} className="mt-2">{BAND_LABEL[band]}</Badge>
          {prev && <p className="mt-2 text-xs text-muted">{a.score - prev.score >= 0 ? "+" : ""}{a.score - prev.score} since {fmtDate(prev.created_at)}</p>}
          <p className="mt-4 text-left text-xs text-muted">This measures preparedness actions you reported. It is not a validated geographic disaster-risk rating and does not predict exposure to hazards. Methodology {a.methodology_version}.</p>
        </CardContent></Card>
        <Card className="lg:col-span-2"><CardHeader><CardTitle>By category</CardTitle></CardHeader><CardContent className="flex flex-col gap-3">
          {Object.entries(a.category_scores as Record<string, number>).map(([k, v]) => (
            <div key={k}><div className="flex justify-between text-sm"><span>{CATEGORY_LABEL[k as keyof typeof CATEGORY_LABEL] ?? k}</span><span className="font-medium">{v}%</span></div><Progress value={v} label={k} /></div>))}
          {(a.vulnerability_factors as string[]).length > 0 && (
            <div className="mt-2"><p className="text-sm font-medium">Household factors to plan around</p>
              <ul className="mt-1 flex flex-wrap gap-2">{(a.vulnerability_factors as string[]).map((f) => <li key={f}><Badge tone="amber">{f}</Badge></li>)}</ul></div>)}
        </CardContent></Card>
      </div>
      <Card className="mt-6"><CardHeader><CardTitle>Your improvement checklist</CardTitle><p className="text-sm text-muted">Prioritised by impact. Add any item to your emergency plan checklist.</p></CardHeader>
        <CardContent>{recs.length === 0 ? <p className="text-sm">Great work — no gaps found. Keep supplies fresh and practise drills regularly.</p> : (
          <ul className="flex flex-col gap-2">{recs.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line p-3">
              <div className="flex items-start gap-2"><Badge tone={r.priority === "high" ? "red" : r.priority === "medium" ? "amber" : "neutral"}>{r.priority}</Badge><span className="text-sm">{r.text}</span></div>
              <div className="no-print flex gap-2">
                <Link href={r.link} className="text-sm text-brand-700 underline">{r.action}</Link>
                <InlineAction action={addRecommendationToPlan} hidden={{ label: r.text, back: `/assessment/${a.id}` }}><Button size="sm" variant="secondary">Add to plan</Button></InlineAction>
              </div>
            </li>))}</ul>)}
        </CardContent></Card>
    </>
  );
}
