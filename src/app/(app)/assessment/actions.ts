"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser, getMyHouseholds } from "@/lib/auth";
import { formToObject, type ActionResult } from "@/lib/actions";
import { questionsFor, scoreAssessment, METHODOLOGY_VERSION, type AnswerValue } from "@/lib/assessment";
import { logActivity } from "@/lib/activity";
import { hazardKeys } from "@/content/guides";

export async function submitAssessment(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  const obj = formToObject(fd);
  const hazards = String(obj.hazards ?? "").split(",").filter((h) => hazardKeys.includes(h as never) && h !== "general");
  const answers: Record<string, AnswerValue> = {};
  const qs = questionsFor(hazards);
  for (const q of qs) {
    const v = String(obj[`q_${q.id}`] ?? "");
    if (!["yes", "partly", "no", "na"].includes(v)) return { error: `Please answer: “${q.text}”` };
    answers[q.id] = v as AnswerValue;
  }
  const hh = (await getMyHouseholds())[0]?.household ?? null;
  let v = { infants: 0, children: 0, seniors: 0, needsAssistance: 0, pets: 0, nearCoast: hh?.near_coast, nearRiver: hh?.near_river, nearSlope: hh?.near_slope };
  if (hh) {
    const [{ data: m }, { count: pets }] = await Promise.all([
      supabase.from("household_members").select("age_group, needs_assistance").eq("household_id", hh.id),
      supabase.from("household_pets").select("id", { count: "exact", head: true }).eq("household_id", hh.id),
    ]);
    v = { ...v, infants: (m ?? []).filter((x) => x.age_group === "infant").length, children: (m ?? []).filter((x) => x.age_group === "child").length,
      seniors: (m ?? []).filter((x) => x.age_group === "senior").length, needsAssistance: (m ?? []).filter((x) => x.needs_assistance).length, pets: pets ?? 0 };
  }
  const r = scoreAssessment(answers, hazards, v);
  const id = crypto.randomUUID();
  const { error } = await supabase.from("risk_assessments").insert({
    id, user_id: user.id, household_id: hh?.id ?? null, region: String(obj.region ?? "").slice(0, 80) || null, city: String(obj.city ?? "").slice(0, 80) || null,
    hazards, answers, score: r.score, category_scores: r.categoryScores, vulnerability_factors: r.vulnerabilityFactors, recommendations: r.recommendations, methodology_version: METHODOLOGY_VERSION,
  });
  if (error) return { error: error.message };
  await logActivity(supabase, user.id, "assessment", `Completed preparedness assessment — ${r.score}%`, `/assessment/${id}`);
  redirect(`/assessment/${id}`);
}

/** Cross-module: add a recommendation as a task on the user's most recent active/draft plan. */
export async function addRecommendationToPlan(fd: FormData) {
  const { supabase, user } = await requireUser();
  const label = String(fd.get("label")).slice(0, 300);
  const back = String(fd.get("back"));
  const { data: plan } = await supabase.from("emergency_plans").select("id").eq("owner_id", user.id).neq("status", "archived")
    .order("status", { ascending: true }).order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (!plan) redirect("/plans/new?from=assessment");
  await supabase.from("plan_checklist_items").insert({ plan_id: plan.id, label, phase: "before", sort: 500 });
  revalidatePath(back);
  redirect(`${back}?added=1`);
}
