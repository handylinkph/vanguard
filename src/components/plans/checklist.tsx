"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/client";
import { enqueue } from "@/lib/offline/store";
import type { PlanItem } from "@/lib/types";
import { cn } from "@/lib/utils";

const PHASE: Record<string, string> = { before: "Before", during: "During", after: "After" };

/** Plan checklist that works online (direct, version-checked update) and offline (queued for sync). */
export function PlanChecklist({ items, canDelete, onDelete, planId }: { items: PlanItem[]; canDelete: boolean; planId: string; onDelete?: (fd: FormData) => Promise<void> }) {
  const [state, setState] = useState(items);
  const [msg, setMsg] = useState<string | null>(null);
  const [, start] = useTransition();
  const router = useRouter();

  async function toggle(item: PlanItem) {
    const done = !item.done;
    setState((s) => s.map((i) => (i.id === item.id ? { ...i, done } : i)));
    const sb = getBrowserClient();
    if (!navigator.onLine || !sb) {
      await enqueue({ table: "plan_checklist_items", rowId: item.id, patch: { done }, baseVersion: item.version, label: item.label });
      setMsg("You're offline — change saved on this device and will sync when you reconnect.");
      return;
    }
    const { data, error } = await sb.from("plan_checklist_items").update({ done }).eq("id", item.id).eq("version", item.version).select("version").maybeSingle();
    if (error || !data) {
      setMsg(error ? "Couldn't save — please try again." : "This item was changed by someone else. Showing the latest version.");
      start(() => router.refresh());
      return;
    }
    setState((s) => s.map((i) => (i.id === item.id ? { ...i, done, version: data.version } : i)));
    setMsg(null);
  }

  const done = state.filter((i) => i.done).length;
  return (
    <div>
      <p className="mb-3 text-sm text-muted" aria-live="polite">{done} of {state.length} complete</p>
      {msg && <p className="mb-3 rounded bg-amber-50 p-2 text-xs text-amber-900" role="status">{msg}</p>}
      {(["before", "during", "after"] as const).map((phase) => {
        const list = state.filter((i) => i.phase === phase);
        if (!list.length) return null;
        return (
          <div key={phase} className="mb-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{PHASE[phase]}</h3>
            <ul className="flex flex-col gap-1.5">
              {list.map((i) => (
                <li key={i.id} className="flex items-start gap-3 rounded-lg border border-line bg-white p-2.5">
                  <input id={`ci-${i.id}`} type="checkbox" checked={i.done} onChange={() => toggle(i)} className="mt-0.5 size-4 accent-[#0f766e]" />
                  <label htmlFor={`ci-${i.id}`} className={cn("flex-1 text-sm", i.done && "text-muted line-through")}>
                    {i.label}{i.assigned_to && <span className="ml-2 text-xs text-brand-700">· {i.assigned_to}</span>}
                  </label>
                  {canDelete && onDelete && (
                    <form action={onDelete} className="no-print"><input type="hidden" name="id" value={i.id} /><input type="hidden" name="plan_id" value={planId} />
                      <button className="text-xs text-muted hover:text-red-600" aria-label={`Delete ${i.label}`}>Remove</button></form>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
