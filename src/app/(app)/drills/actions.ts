"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser, getMyHouseholds } from "@/lib/auth";
import { parseForm, optText, dbError, type ActionResult } from "@/lib/actions";
import { getScenario, scoreRun } from "@/content/scenarios";
import { logActivity } from "@/lib/activity";

export async function saveSimulation(scenarioKey: string, picks: Record<string, string>, durationSeconds: number) {
  const { supabase, user } = await requireUser();
  const s = getScenario(scenarioKey);
  if (!s) throw new Error("Unknown scenario");
  const r = scoreRun(s, picks);   // scored on the server; client picks are only inputs
  const hh = (await getMyHouseholds())[0]?.household;
  const id = crypto.randomUUID();
  const { error } = await supabase.from("drill_runs").insert({ id, user_id: user.id, household_id: hh?.id ?? null, scenario_key: s.key, mode: "simulation",
    score: r.score, max_score: r.max, decisions: r.decisions, duration_seconds: Math.max(0, Math.min(36000, Math.round(durationSeconds))) });
  if (error) throw new Error(error.message);
  await logActivity(supabase, user.id, "drill", `Completed “${s.title}” simulation — ${r.pct}%`, `/drills/${s.key}?run=${id}`, hh?.id);
  revalidatePath("/drills"); revalidatePath("/dashboard");
  return { id, ...r };
}

export async function saveHouseholdDrill(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  const key = String(fd.get("scenario_key"));
  const s = getScenario(key); if (!s) return { error: "Unknown drill" };
  const p = parseForm(z.object({ duration_seconds: z.coerce.number().int().min(0).max(36000), participants: z.coerce.number().int().min(1).max(500), reflection: optText(2000) }), fd);
  if (p.error) return p.error;
  const checked = fd.getAll("check").map(String);
  const checklist = s.drillChecklist.map((label, i) => ({ label, done: checked.includes(String(i)) }));
  const hh = (await getMyHouseholds())[0]?.household;
  const { error } = await supabase.from("drill_runs").insert({ user_id: user.id, household_id: hh?.id ?? null, scenario_key: key, mode: "household_drill",
    score: checklist.filter((c) => c.done).length, max_score: checklist.length, checklist, ...p.data });
  if (error) return dbError(error);
  await supabase.from("drill_schedules").update({ done: true }).eq("user_id", user.id).eq("scenario_key", key).eq("done", false).lte("scheduled_for", new Date().toISOString().slice(0, 10));
  await logActivity(supabase, user.id, "drill", `Ran household drill: ${s.title}`, "/drills", hh?.id);
  revalidatePath("/drills");
  redirect("/drills?saved=1");
}

export async function scheduleDrill(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(z.object({ scenario_key: z.string().max(60), scheduled_for: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date"), notes: optText(300) }), fd);
  if (p.error) return p.error;
  if (!getScenario(p.data.scenario_key)) return { error: "Unknown drill" };
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("drill_schedules").insert({ ...p.data, user_id: user.id });
  if (error) return dbError(error);
  await supabase.from("reminders").insert({ user_id: user.id, title: `Household drill: ${getScenario(p.data.scenario_key)!.title}`, due_on: p.data.scheduled_for, related_type: "drill", link: `/drills/${p.data.scenario_key}?mode=household` });
  revalidatePath("/drills");
  return { ok: true, message: "Drill scheduled — it will appear in your reminders." };
}

export async function deleteSchedule(fd: FormData) {
  const { supabase } = await requireUser();
  await supabase.from("drill_schedules").delete().eq("id", String(fd.get("id")));
  revalidatePath("/drills");
}
