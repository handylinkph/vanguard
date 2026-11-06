import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, PageHeader, ButtonLink, EmptyState, Badge, Alert } from "@/components/ui";
import { BAND_LABEL, type AssessmentResult } from "@/lib/assessment";
import { HAZARD_LABEL } from "@/content/guides";
import { fmtDate } from "@/lib/utils";
import { Gauge } from "lucide-react";

export const metadata = { title: "Preparedness assessment" };

export default async function AssessmentHome() {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("risk_assessments").select("id, score, hazards, created_at, city").order("created_at", { ascending: false }).limit(20);
  const history = data ?? [];
  const band = (s: number): AssessmentResult["band"] => (s >= 75 ? "well-prepared" : s >= 40 ? "building" : "getting-started");
  return (
    <>
      <PageHeader title="Household preparedness assessment" description="A short questionnaire about the preparedness actions your household has taken, with prioritised recommendations."
        actions={<ButtonLink href="/assessment/take">{history.length ? "Retake assessment" : "Start assessment"}</ButtonLink>} />
      <Alert tone="info" className="mb-6" title="What this score means">
        The score measures <strong>preparedness actions</strong> — plans, supplies, skills and communication. It is not a scientific rating of the disaster risk where you live and does not predict whether a hazard will affect you. For official hazard maps, consult your LGU/MDRRMO, PHIVOLCS and PAGASA.
      </Alert>
      {history.length === 0 ? <EmptyState icon={<Gauge />} title="No assessments yet" description="Takes about 5 minutes." action={<ButtonLink href="/assessment/take">Start</ButtonLink>} /> : (
        <Card><CardHeader><CardTitle>History</CardTitle></CardHeader><CardContent>
          <ul className="divide-y divide-line">{history.map((a) => (
            <li key={a.id}><Link href={`/assessment/${a.id}`} className="flex items-center justify-between py-3 hover:bg-surface">
              <span><span className="font-medium">{fmtDate(a.created_at)}</span><span className="ml-2 text-xs text-muted">{(a.hazards as string[]).map((h) => HAZARD_LABEL[h]).join(", ") || "General"}{a.city ? ` · ${a.city}` : ""}</span></span>
              <span className="flex items-center gap-2"><Badge tone={a.score >= 75 ? "green" : a.score >= 40 ? "blue" : "amber"}>{BAND_LABEL[band(a.score)]}</Badge><span className="w-12 text-right font-semibold">{a.score}%</span></span>
            </Link></li>))}</ul>
        </CardContent></Card>
      )}
    </>
  );
}
