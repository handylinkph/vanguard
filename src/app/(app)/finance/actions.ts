"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { parseForm, reqText, optText, optDate, dbError, uuid, type ActionResult } from "@/lib/actions";
import { shoppingList } from "@/lib/kits";
import { logActivity } from "@/lib/activity";

const money = (label: string) => z.coerce.number({ message: `Enter ${label}` }).refine((n) => Number.isFinite(n) && Math.abs(n) < 1e12, "Enter a valid amount");
const rv = () => revalidatePath("/finance");

export async function createGoal(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(z.object({ name: reqText(120, "Name"), target_php: money("a target").refine((n) => n > 0, "Target must be more than ₱0"), target_date: optDate }), fd); if (p.error) return p.error;
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("savings_goals").insert({ ...p.data, user_id: user.id });
  if (error) return dbError(error);
  await logActivity(supabase, user.id, "finance", `Set savings goal “${p.data.name}”`, "/finance");
  rv(); return { ok: true, message: "Goal created." };
}

export async function addContribution(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(z.object({ goal_id: uuid, amount_php: money("an amount").refine((n) => n !== 0, "Amount can't be zero"), note: optText(200), contributed_on: optDate }), fd); if (p.error) return p.error;
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("savings_contributions").insert({ ...p.data, contributed_on: p.data.contributed_on ?? undefined, user_id: user.id });
  if (error) return dbError(error);
  rv(); return { ok: true, message: "Recorded." };
}

export async function createBudget(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(z.object({ name: reqText(120, "Name"), kind: z.enum(["preparedness", "supplies", "recovery"]), from_kit: z.string().optional() }), fd); if (p.error) return p.error;
  const { supabase, user } = await requireUser();
  const id = crypto.randomUUID();
  const { error } = await supabase.from("budgets").insert({ id, user_id: user.id, name: p.data.name, kind: p.data.kind });
  if (error) return dbError(error);
  // Cross-module: build an emergency-supply budget from a kit's shopping list estimates.
  if (p.data.from_kit && uuid.safeParse(p.data.from_kit).success) {
    const { data: items } = await supabase.from("kit_items").select("*").eq("kit_id", p.data.from_kit);
    const list = shoppingList((items ?? []).map((i) => ({ ...i, qty_needed: Number(i.qty_needed), qty_have: Number(i.qty_have), est_unit_cost_php: i.est_unit_cost_php == null ? null : Number(i.est_unit_cost_php) })));
    const lines = list.filter((l) => l.estCost).map((l) => ({ budget_id: id, user_id: user.id, category: l.category, label: `${l.name} (${Math.round(l.missing * 100) / 100} ${l.unit})`.slice(0, 160), planned_php: l.estCost! }));
    if (lines.length) await supabase.from("budget_lines").insert(lines);
  }
  rv(); return { ok: true, message: "Budget created." };
}

export async function addBudgetLine(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(z.object({ budget_id: uuid, category: reqText(60, "Category"), label: reqText(160, "Item"), planned_php: money("an amount").refine((n) => n >= 0, "Must be ₱0 or more") }), fd); if (p.error) return p.error;
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("budget_lines").insert({ ...p.data, user_id: user.id });
  if (error) return dbError(error);
  rv(); return { ok: true };
}

export async function addExpense(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(z.object({
    kind: z.enum(["preparedness", "recovery"]), category: reqText(60, "Category"), description: reqText(200, "Description"),
    amount_php: money("an amount").refine((n) => n >= 0, "Must be ₱0 or more"), spent_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a date"),
    budget_id: z.string().optional().transform((v) => (v ? v : null)), incident_id: z.string().optional().transform((v) => (v ? v : null)), kit_id: z.string().optional().transform((v) => (v ? v : null)),
  }), fd); if (p.error) return p.error;
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("expenses").insert({ ...p.data, user_id: user.id });
  if (error) return dbError(error);
  rv(); if (p.data.incident_id) revalidatePath(`/incidents/${p.data.incident_id}`);
  return { ok: true, message: "Expense recorded." };
}

export async function deleteFinanceRow(fd: FormData) {
  const { supabase } = await requireUser();
  const table = String(fd.get("table"));
  if (!["savings_goals", "savings_contributions", "budgets", "budget_lines", "expenses"].includes(table)) return;
  await supabase.from(table).delete().eq("id", String(fd.get("id")));
  rv();
}
