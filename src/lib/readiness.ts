// Overall household readiness progress shown on the dashboard.
// Transparent methodology: weighted completion of concrete preparedness actions.
// It is a progress indicator, never a safety or survivability guarantee.

export interface ReadinessInputs {
  hasActivePlan: boolean;
  planChecklistPct: number | null; // 0-100
  kitReadinessPct: number | null; // best kit
  contactsCount: number;
  latestAssessmentScore: number | null;
  latestAssessmentDays: number | null; // age in days
  drillsLast12Months: number;
  hasSavingsGoal: boolean;
  savingsPct: number | null;
}

export interface ReadinessComponent { key: string; label: string; weight: number; value: number; hint: string; link: string }

export function computeReadiness(i: ReadinessInputs): { overall: number; components: ReadinessComponent[] } {
  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
  const components: ReadinessComponent[] = [
    { key: "plan", label: "Emergency plan", weight: 25, link: "/plans",
      value: i.hasActivePlan ? clamp(50 + (i.planChecklistPct ?? 0) / 2) : 0,
      hint: i.hasActivePlan ? "Complete your plan checklist" : "Create and activate an emergency plan" },
    { key: "kit", label: "Emergency kit", weight: 25, link: "/kits", value: clamp(i.kitReadinessPct ?? 0),
      hint: i.kitReadinessPct == null ? "Build your first kit" : "Fill the gaps in your kit" },
    { key: "contacts", label: "Emergency contacts", weight: 15, link: "/contacts", value: clamp(Math.min(i.contactsCount, 3) / 3 * 100),
      hint: "Save at least 3 emergency contacts" },
    { key: "assessment", label: "Preparedness assessment", weight: 15, link: "/assessment",
      value: i.latestAssessmentScore == null ? 0 : clamp(i.latestAssessmentScore * ((i.latestAssessmentDays ?? 0) > 365 ? 0.5 : 1)),
      hint: i.latestAssessmentScore == null ? "Take the assessment" : (i.latestAssessmentDays ?? 0) > 365 ? "Retake — your assessment is over a year old" : "Act on your recommendations" },
    { key: "drills", label: "Drills & practice", weight: 10, link: "/drills", value: clamp(Math.min(i.drillsLast12Months, 2) / 2 * 100),
      hint: "Complete 2 drills a year" },
    { key: "finance", label: "Financial readiness", weight: 10, link: "/finance",
      value: i.hasSavingsGoal ? clamp(30 + (i.savingsPct ?? 0) * 0.7) : 0, hint: "Set an emergency savings goal" },
  ];
  const overall = clamp(components.reduce((a, c) => a + c.value * c.weight, 0) / components.reduce((a, c) => a + c.weight, 0));
  return { overall, components };
}
