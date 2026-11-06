// Organizational readiness tracking (transparent, completion-based).
export interface OrgReadinessInput { activePlans: number; checklistDone: number; checklistTotal: number; assignmentsDone: number; assignmentsTotal: number; drillsLast12m: number; facilities: number; contacts: number }
export function orgReadiness(i: OrgReadinessInput) {
  const parts = [
    { label: "Active emergency plan", value: i.activePlans > 0 ? 100 : 0, weight: 25 },
    { label: "Evacuation & continuity checklists", value: i.checklistTotal ? (i.checklistDone / i.checklistTotal) * 100 : 0, weight: 25 },
    { label: "Preparedness assignments", value: i.assignmentsTotal ? (i.assignmentsDone / i.assignmentsTotal) * 100 : 0, weight: 15 },
    { label: "Drills (2+ per year)", value: Math.min(i.drillsLast12m, 2) * 50, weight: 20 },
    { label: "Facility records", value: i.facilities > 0 ? 100 : 0, weight: 7.5 },
    { label: "Emergency contact directory", value: Math.min(i.contacts, 3) / 3 * 100, weight: 7.5 },
  ];
  const overall = Math.round(parts.reduce((a, p) => a + p.value * p.weight, 0) / parts.reduce((a, p) => a + p.weight, 0));
  return { overall, parts: parts.map((p) => ({ ...p, value: Math.round(p.value) })) };
}
