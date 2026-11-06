import { describe, it, expect } from "vitest";
import { scoreAssessment, questionsFor, vulnerabilityFactors, QUESTIONS } from "@/lib/assessment";
import { computeReadiness } from "@/lib/readiness";
import { orgReadiness } from "@/lib/org";

const none = { infants: 0, children: 0, seniors: 0, needsAssistance: 0, pets: 0 };

describe("preparedness assessment", () => {
  it("only includes hazard questions for selected hazards", () => {
    const ids = questionsFor(["typhoon"]).map((q) => q.id);
    expect(ids).toContain("hz_typhoon"); expect(ids).not.toContain("hz_volcano");
  });
  it("scores 100 when all yes and 0 when all no", () => {
    const qs = questionsFor(["earthquake"]);
    const yes = Object.fromEntries(qs.map((q) => [q.id, "yes" as const]));
    const no = Object.fromEntries(qs.map((q) => [q.id, "no" as const]));
    expect(scoreAssessment(yes, ["earthquake"], none).score).toBe(100);
    const r = scoreAssessment(no, ["earthquake"], none);
    expect(r.score).toBe(0); expect(r.band).toBe("getting-started");
    expect(r.recommendations[0].priority).toBe("high");
  });
  it("ignores not-applicable answers and counts partial as half", () => {
    const qs = questionsFor([]);
    const answers = Object.fromEntries(qs.map((q) => [q.id, "partly" as const]));
    answers[qs[0].id] = "na" as never;
    expect(scoreAssessment(answers, [], none).score).toBe(50);
  });
  it("weights planning/supplies more for households with dependents and lists factors", () => {
    const answers = Object.fromEntries(questionsFor([]).map((q) => [q.id, q.category === "plan" ? ("no" as const) : ("yes" as const)]));
    const base = scoreAssessment(answers, [], none).score;
    const withKids = scoreAssessment(answers, [], { ...none, children: 2 }).score;
    expect(withKids).toBeLessThan(base);
    expect(vulnerabilityFactors({ ...none, seniors: 1, nearCoast: true })).toEqual(["Household includes older adults", "Home is near the coast (self-reported)"]);
  });
  it("every recommendation links to an in-app route", () => {
    for (const q of QUESTIONS) expect(q.recommendation.link.startsWith("/")).toBe(true);
  });
});

describe("readiness indicators", () => {
  it("household readiness is 0 with nothing and 100 with everything", () => {
    expect(computeReadiness({ hasActivePlan: false, planChecklistPct: null, kitReadinessPct: null, contactsCount: 0, latestAssessmentScore: null, latestAssessmentDays: null, drillsLast12Months: 0, hasSavingsGoal: false, savingsPct: null }).overall).toBe(0);
    expect(computeReadiness({ hasActivePlan: true, planChecklistPct: 100, kitReadinessPct: 100, contactsCount: 5, latestAssessmentScore: 100, latestAssessmentDays: 10, drillsLast12Months: 3, hasSavingsGoal: true, savingsPct: 100 }).overall).toBe(100);
  });
  it("halves an assessment older than a year", () => {
    const r = computeReadiness({ hasActivePlan: false, planChecklistPct: null, kitReadinessPct: null, contactsCount: 0, latestAssessmentScore: 80, latestAssessmentDays: 400, drillsLast12Months: 0, hasSavingsGoal: false, savingsPct: null });
    expect(r.components.find((c) => c.key === "assessment")!.value).toBe(40);
  });
  it("organization readiness reflects completion", () => {
    expect(orgReadiness({ activePlans: 1, checklistDone: 5, checklistTotal: 10, assignmentsDone: 0, assignmentsTotal: 0, drillsLast12m: 1, facilities: 1, contacts: 3 }).overall).toBe(Math.round((100 * 25 + 50 * 25 + 0 * 15 + 50 * 20 + 100 * 7.5 + 100 * 7.5) / 100));
  });
});
