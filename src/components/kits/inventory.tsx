"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, AlertTriangle } from "lucide-react";
import { getBrowserClient } from "@/lib/supabase/client";
import { enqueue } from "@/lib/offline/store";
import { kitReadiness, isExpired, expiresWithin } from "@/lib/kits";
import { Progress, Badge } from "@/components/ui";
import type { KitItem } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Live inventory: quantity + packed edits save directly online, or queue offline for sync. */
export function KitInventory({ items, children }: { items: KitItem[]; children?: (item: KitItem) => React.ReactNode }) {
  const [state, setState] = useState(items);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();
  const readiness = useMemo(() => kitReadiness(state.map((i) => ({ ...i, qty_needed: Number(i.qty_needed), qty_have: Number(i.qty_have) }))), [state]);
  const categories = [...new Set(state.map((i) => i.category))];

  async function patch(item: KitItem, change: Partial<Pick<KitItem, "qty_have" | "packed">>) {
    setState((s) => s.map((i) => (i.id === item.id ? { ...i, ...change } : i)));
    const sb = getBrowserClient();
    if (!navigator.onLine || !sb) {
      await enqueue({ table: "kit_items", rowId: item.id, patch: change, baseVersion: item.version, label: item.name });
      setMsg("Offline — changes saved on this device and will sync automatically.");
      return;
    }
    const { data, error } = await sb.from("kit_items").update(change).eq("id", item.id).eq("version", item.version).select("version").maybeSingle();
    if (error || !data) { setMsg(error ? "Couldn't save. Try again." : "Someone else updated this item — refreshed to the latest."); router.refresh(); return; }
    setState((s) => s.map((i) => (i.id === item.id ? { ...i, ...change, version: data.version } : i)));
  }

  return (
    <div>
      <div className="mb-4 rounded-xl border border-line bg-white p-4">
        <div className="flex items-baseline justify-between"><p className="text-sm font-medium">Kit readiness</p><p className="text-2xl font-semibold text-navy" aria-live="polite">{readiness}%</p></div>
        <Progress value={readiness} className="mt-2" label="Kit readiness" />
        <p className="mt-1 text-xs text-muted">Average coverage of essential items. Expired items count as missing.</p>
      </div>
      {msg && <p className="mb-3 rounded bg-amber-50 p-2 text-xs text-amber-900" role="status">{msg}</p>}
      {categories.map((cat) => (
        <section key={cat} className="mb-5">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{cat}</h3>
          <ul className="flex flex-col gap-2">
            {state.filter((i) => i.category === cat).map((i) => {
              const have = Number(i.qty_have), need = Number(i.qty_needed);
              const expired = isExpired(i); const soon = expiresWithin(i, 30);
              return (
                <li key={i.id} className={cn("rounded-lg border bg-white p-3", expired ? "border-red-200" : "border-line")}>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" checked={i.packed} onChange={() => patch(i, { packed: !i.packed })} className="size-4 accent-[#0f766e]" aria-label={`Packed: ${i.name}`} />Packed</label>
                    <div className="min-w-40 flex-1">
                      <p className="text-sm font-medium">{i.name} {!i.essential && <Badge className="ml-1">Optional</Badge>}</p>
                      <p className="text-xs text-muted">Need {need} {i.unit}{i.expires_on && <> · expires {i.expires_on}</>}{i.notes && <> · {i.notes}</>}</p>
                      {expired && <p className="mt-1 flex items-center gap-1 text-xs text-red-700"><AlertTriangle className="size-3" />Expired — replace</p>}
                      {!expired && soon && <p className="mt-1 text-xs text-amber-800">Expires within 30 days</p>}
                    </div>
                    <div className="flex items-center gap-1" role="group" aria-label={`Quantity on hand for ${i.name}`}>
                      <button type="button" className="rounded-md border border-line p-1.5 hover:bg-surface" aria-label="Decrease" onClick={() => patch(i, { qty_have: Math.max(0, have - 1) })}><Minus className="size-3.5" /></button>
                      <input type="number" min={0} step="any" value={have} aria-label={`Have ${i.name}`}
                        onChange={(e) => setState((s) => s.map((x) => (x.id === i.id ? { ...x, qty_have: Number(e.target.value) } : x)))}
                        onBlur={(e) => { const v = Math.max(0, Number(e.target.value) || 0); if (v !== Number(items.find((x) => x.id === i.id)?.qty_have)) patch(i, { qty_have: v }); }}
                        className="h-8 w-16 rounded-md border border-line text-center text-sm" />
                      <button type="button" className="rounded-md border border-line p-1.5 hover:bg-surface" aria-label="Increase" onClick={() => patch(i, { qty_have: have + 1 })}><Plus className="size-3.5" /></button>
                      <span className={cn("ml-2 w-12 text-right text-xs font-medium", have >= need ? "text-accent-700" : "text-amber-700")}>{need ? Math.min(100, Math.round((have / need) * 100)) : 100}%</span>
                    </div>
                  </div>
                  {children?.(i)}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
