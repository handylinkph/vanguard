"use client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { listOutbox, removeOp, addConflict, saveSnapshot } from "./store";
import { resolve } from "./sync-core";

let running = false;

/** Push queued offline edits to the server, detecting conflicts. Returns counts. */
export async function flushOutbox(supabase: SupabaseClient) {
  if (running || !navigator.onLine) return { applied: 0, conflicts: 0, failed: 0 };
  running = true;
  let applied = 0, conflicts = 0, failed = 0;
  try {
    for (const op of await listOutbox()) {
      const fields = ["version", ...Object.keys(op.patch)].join(",");
      const { data: server, error } = await supabase.from(op.table).select(fields).eq("id", op.rowId).maybeSingle();
      if (error) { failed++; continue; }
      const r = resolve(op, server as unknown as { version: number } | null);
      if (r.kind === "apply") {
        const { data, error: upErr } = await supabase.from(op.table).update(op.patch).eq("id", op.rowId).eq("version", op.baseVersion).select("id");
        if (upErr) { failed++; continue; }
        if (!data || data.length === 0) { // lost a race — treat as conflict
          await addConflict({ op, server: {}, detectedAt: new Date().toISOString() }); conflicts++;
        } else applied++;
      } else if (r.kind === "conflict") {
        await addConflict({ op, server: r.server, detectedAt: new Date().toISOString() }); conflicts++;
      } else if (r.kind === "gone") {
        await addConflict({ op, server: { deleted: true }, detectedAt: new Date().toISOString() }); conflicts++;
      } else applied++;
      await removeOp(op.id!);
    }
    if (applied + conflicts > 0) await refreshSnapshots(supabase);
  } finally {
    running = false;
  }
  return { applied, conflicts, failed };
}

/** Download the user's essentials for offline use. Incident records are intentionally excluded. */
export async function refreshSnapshots(supabase: SupabaseClient) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return false;
  const [plans, items, contacts, kits, kitItems, hotlines, saved] = await Promise.all([
    supabase.from("emergency_plans").select("id,title,hazard,status,plan_type,sections,updated_at,version").neq("status", "archived"),
    supabase.from("plan_checklist_items").select("id,plan_id,label,phase,done,assigned_to,sort,version").order("sort"),
    supabase.from("emergency_contacts").select("id,name,relationship,phone,alt_phone,is_out_of_area,household_id").order("priority"),
    supabase.from("kits").select("id,name,kit_type,days,location_note,archived").eq("archived", false),
    supabase.from("kit_items").select("id,kit_id,category,name,unit,qty_needed,qty_have,packed,essential,expires_on,version"),
    supabase.from("services").select("id,name,category,phone,alt_phone,scope,source_name,last_reviewed_on,verification").eq("category", "hotline"),
    supabase.from("saved_items").select("item_type,item_key,title"),
  ]);
  if (plans.error || contacts.error || kits.error) return false;
  await saveSnapshot("essentials", {
    userId: u.user.id,
    plans: plans.data, planItems: items.data ?? [], contacts: contacts.data,
    kits: kits.data, kitItems: kitItems.data ?? [], hotlines: hotlines.data ?? [], saved: saved.data ?? [],
  });
  return true;
}
