"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { parseForm, formToObject, reqText, optText, optDate, optMoney, checkbox, dbError, uuid, type ActionResult } from "@/lib/actions";
import { buildKitItems, KIT_TYPES, type KitType, type Need } from "@/lib/kits";
import { logActivity } from "@/lib/activity";
import { addDaysISO } from "@/lib/utils";

const n = z.coerce.number().int().min(0).max(50);

export async function createKit(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const obj = formToObject(fd);
  const p = z.object({
    name: reqText(120, "Kit name"),
    kit_type: z.enum(["three_day", "seven_day", "home", "go_bag", "custom"]),
    days: z.coerce.number().int().min(1).max(30),
    adults: n, children: n, infants: n, seniors: n, pets: n,
    household_id: z.string().optional().transform((v) => v || null),
    location_note: optText(200),
    needs: z.array(z.enum(["infants", "children", "seniors", "pets", "accessibility", "medications"])).optional().default([]),
  }).safeParse(obj);
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Check the form" };
  const d = p.data;
  if (d.adults + d.children + d.infants + d.seniors === 0) return { error: "Add at least one person." };
  const { supabase, user } = await requireUser();
  const people = { adults: d.adults, children: d.children, infants: d.infants, seniors: d.seniors, pets: d.pets };
  const id = crypto.randomUUID();
  const { error } = await supabase.from("kits").insert({ id, owner_id: user.id, household_id: d.household_id, name: d.name, kit_type: d.kit_type, days: d.days, people, needs: d.needs, location_note: d.location_note, last_checked_on: new Date().toISOString().slice(0, 10) });
  if (error) return dbError(error);
  const items = buildKitItems(d.kit_type as KitType, people, d.days, d.needs as Need[]).map((i) => ({ ...i, kit_id: id }));
  const { error: e2 } = await supabase.from("kit_items").insert(items);
  if (e2) return dbError(e2);
  await supabase.from("reminders").insert({ user_id: user.id, title: `Check your kit “${d.name}” (expiry dates, batteries, water)`, due_on: addDaysISO(90), related_type: "kit", related_id: id, link: `/kits/${id}` });
  await logActivity(supabase, user.id, "kit", `Created ${KIT_TYPES[d.kit_type as KitType].label} “${d.name}”`, `/kits/${id}`, d.household_id);
  redirect(`/kits/${id}`);
}

export async function addKitItem(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(z.object({
    kit_id: uuid, name: reqText(160, "Item"), category: reqText(40, "Category"), unit: z.string().trim().max(20).default("pcs"),
    qty_needed: z.coerce.number().min(0).max(100000), qty_have: z.coerce.number().min(0).max(100000).default(0),
    essential: checkbox, expires_on: optDate, est_unit_cost_php: optMoney, notes: optText(300),
  }), fd);
  if (p.error) return p.error;
  const { supabase } = await requireUser();
  const { error } = await supabase.from("kit_items").insert(p.data);
  if (error) return dbError(error);
  revalidatePath(`/kits/${p.data.kit_id}`);
  return { ok: true, message: "Item added." };
}

export async function updateKitItem(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(z.object({
    id: uuid, kit_id: uuid, name: reqText(160, "Item"), unit: z.string().trim().max(20), qty_needed: z.coerce.number().min(0).max(100000),
    essential: checkbox, expires_on: optDate, est_unit_cost_php: optMoney, notes: optText(300),
  }), fd);
  if (p.error) return p.error;
  const { supabase, user } = await requireUser();
  const { id, kit_id, ...rest } = p.data;
  const { error } = await supabase.from("kit_items").update(rest).eq("id", id);
  if (error) return dbError(error);
  if (rest.expires_on) {
    const remindOn = addDaysISO(-30, new Date(rest.expires_on));
    await supabase.from("reminders").delete().eq("related_id", id).eq("done", false);
    await supabase.from("reminders").insert({ user_id: user.id, title: `Replace “${rest.name}” before it expires on ${rest.expires_on}`, due_on: remindOn < new Date().toISOString().slice(0, 10) ? new Date().toISOString().slice(0, 10) : remindOn, related_type: "kit_item", related_id: id, link: `/kits/${kit_id}` });
  }
  revalidatePath(`/kits/${kit_id}`);
  return { ok: true, message: "Saved." };
}

export async function deleteKitItem(fd: FormData) {
  const { supabase } = await requireUser();
  await supabase.from("kit_items").delete().eq("id", String(fd.get("id")));
  revalidatePath(`/kits/${fd.get("kit_id")}`);
}

export async function updateKit(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(z.object({ id: uuid, name: reqText(120, "Name"), location_note: optText(200), mark_checked: checkbox }), fd);
  if (p.error) return p.error;
  const { supabase } = await requireUser();
  const { id, mark_checked, ...rest } = p.data;
  const { error } = await supabase.from("kits").update({ ...rest, ...(mark_checked ? { last_checked_on: new Date().toISOString().slice(0, 10) } : {}) }).eq("id", id);
  if (error) return dbError(error);
  revalidatePath(`/kits/${id}`);
  return { ok: true, message: "Kit updated." };
}

export async function archiveKit(fd: FormData) {
  const { supabase } = await requireUser();
  const id = String(fd.get("id"));
  await supabase.from("kits").update({ archived: fd.get("archived") === "true" }).eq("id", id);
  revalidatePath("/kits"); revalidatePath(`/kits/${id}`);
}

export async function deleteKit(fd: FormData) {
  const { supabase } = await requireUser();
  const id = String(fd.get("id"));
  await supabase.from("reminders").delete().eq("related_id", id);
  await supabase.from("kits").delete().eq("id", id);
  redirect("/kits");
}
