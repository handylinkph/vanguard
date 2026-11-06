"use client";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Phone, Wifi, WifiOff, RefreshCw, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, PageHeader, Badge, Button, Alert, Progress } from "@/components/ui";
import { loadSnapshot, saveSnapshot, enqueue, listOutbox, listConflicts, removeConflict, subscribe, type ConflictRecord } from "@/lib/offline/store";
import { flushOutbox, refreshSnapshots } from "@/lib/offline/sync";
import type { QueuedOp } from "@/lib/offline/sync-core";
import { getBrowserClient } from "@/lib/supabase/client";
import { kitReadiness } from "@/lib/kits";

interface Snapshot {
  userId: string;
  plans: { id: string; title: string; hazard: string; status: string; sections: { meeting_places?: { name: string; address?: string }[]; evacuation_destinations?: { name: string; route?: string }[]; communication?: { out_of_area_contact?: string; check_in_method?: string } } }[];
  planItems: { id: string; plan_id: string; label: string; phase: string; done: boolean; version: number }[];
  contacts: { id: string; name: string; relationship: string | null; phone: string; alt_phone: string | null; is_out_of_area: boolean }[];
  kits: { id: string; name: string; kit_type: string; location_note: string | null }[];
  kitItems: { id: string; kit_id: string; category: string; name: string; unit: string; qty_needed: number; qty_have: number; packed: boolean; essential: boolean; expires_on: string | null; version: number }[];
  hotlines: { id: string; name: string; phone: string | null; alt_phone: string | null; source_name: string; last_reviewed_on: string }[];
}

const AVAILABLE = [
  ["Available offline", "Saved emergency plans & checklists, emergency contacts, kit inventories, hotlines, and preparedness guides you've opened. You can tick checklist items and update kit quantities — changes sync when you reconnect."],
  ["Needs a connection", "Signing in, creating new plans/kits, community groups, the AI assistant, maps & facility search, incident records (kept online for privacy), and the admin console."],
];

export function OfflineHub({ guides }: { guides: { key: string; title: string; tagline: string }[] }) {
  const online = useSyncExternalStore((cb) => { addEventListener("online", cb); addEventListener("offline", cb); return () => { removeEventListener("online", cb); removeEventListener("offline", cb); }; }, () => navigator.onLine, () => true);
  const [snap, setSnap] = useState<{ savedAt: string; data: Snapshot } | null | undefined>(undefined);
  const [outbox, setOutbox] = useState<QueuedOp[]>([]);
  const [conflicts, setConflicts] = useState<ConflictRecord[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setSnap(await loadSnapshot<Snapshot>("essentials"));
      setOutbox(await listOutbox()); setConflicts(await listConflicts());
    } catch { setSnap(null); }
  }, []);
  // load() reads IndexedDB asynchronously (an external store) and sets state after awaiting.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); return subscribe(load); }, [load]);

  async function sync() {
    const sb = getBrowserClient(); if (!sb) { setMsg("Sync needs the Vanguard backend."); return; }
    setMsg("Syncing…");
    const r = await flushOutbox(sb);
    const ok = await refreshSnapshots(sb);
    setMsg(`Synced ${r.applied} change(s)${r.conflicts ? `, ${r.conflicts} conflict(s) need your decision` : ""}${r.failed ? `, ${r.failed} failed (will retry)` : ""}.${ok ? " Offline copy updated." : " Sign in to refresh your offline copy."}`);
    await load();
  }

  async function updateLocal(mut: (d: Snapshot) => void) {
    if (!snap) return;
    const data = structuredClone(snap.data); mut(data);
    await saveSnapshot("essentials", data);
    setSnap({ savedAt: snap.savedAt, data });
  }

  async function togglePlanItem(id: string) {
    const item = snap?.data.planItems.find((i) => i.id === id); if (!item) return;
    await enqueue({ table: "plan_checklist_items", rowId: id, patch: { done: !item.done }, baseVersion: item.version, label: item.label });
    await updateLocal((d) => { const it = d.planItems.find((i) => i.id === id)!; it.done = !it.done; });
    if (navigator.onLine) sync();
  }
  async function setQty(id: string, qty: number) {
    const item = snap?.data.kitItems.find((i) => i.id === id); if (!item) return;
    const v = Math.max(0, qty);
    await enqueue({ table: "kit_items", rowId: id, patch: { qty_have: v }, baseVersion: item.version, label: item.name });
    await updateLocal((d) => { d.kitItems.find((i) => i.id === id)!.qty_have = v; });
  }
  async function keepMine(c: ConflictRecord) {
    const serverVersion = Number(c.server.version);
    if (Number.isFinite(serverVersion)) await enqueue({ ...c.op, baseVersion: serverVersion });
    await removeConflict(c.id!);
    if (navigator.onLine) sync();
  }

  const d = snap?.data;
  return (
    <>
      <PageHeader title="Offline access" description="Your preparedness essentials, available on this device even without internet."
        actions={<Badge tone={online ? "green" : "amber"}>{online ? <><Wifi className="size-3" />Online</> : <><WifiOff className="size-3" />Offline</>}</Badge>} />
      <div className="mb-6 grid gap-3 sm:grid-cols-2">{AVAILABLE.map(([t, b]) => <Alert key={t} tone={t.startsWith("Available") ? "success" : "education"} title={t}>{b}</Alert>)}</div>
      <Alert tone="warning" className="mb-6">In an emergency call <a href="tel:911" className="font-semibold underline">911</a>. Phone calls work without mobile data.</Alert>

      {(outbox.length > 0 || conflicts.length > 0 || msg) && (
        <Card className="mb-6"><CardHeader><CardTitle className="flex items-center gap-2"><RefreshCw className="size-4" />Sync</CardTitle></CardHeader><CardContent className="text-sm">
          {outbox.length > 0 && <p>{outbox.length} change(s) waiting to sync: {outbox.map((o) => o.label).join(", ")}</p>}
          {msg && <p className="mt-1 text-muted" role="status">{msg}</p>}
          {conflicts.map((c) => (
            <div key={c.id} className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="flex items-center gap-2 font-medium text-red-800"><AlertTriangle className="size-4" />Conflict: “{c.op.label}”</p>
              <p className="text-xs">{c.server.deleted ? "This item was deleted on the server." : `Someone else changed this while you were offline. Server: ${JSON.stringify(Object.fromEntries(Object.entries(c.server).filter(([k]) => k !== "version")))} · Yours: ${JSON.stringify(c.op.patch)}`}</p>
              <div className="mt-2 flex gap-2">
                {!c.server.deleted && <Button size="sm" onClick={() => keepMine(c)}>Keep my change</Button>}
                <Button size="sm" variant="outline" onClick={() => removeConflict(c.id!)}>{c.server.deleted ? "Dismiss" : "Keep server version"}</Button>
              </div>
            </div>))}
          <Button size="sm" variant="outline" className="mt-3" onClick={sync} disabled={!online}>Sync now</Button>
        </CardContent></Card>
      )}

      {snap === undefined ? <p className="text-sm text-muted">Loading saved data…</p> : !d ? (
        <Card className="mb-6"><CardContent className="pt-5 text-sm">
          <p>No personal data is saved on this device yet. Sign in while online and open your dashboard — Vanguard saves an encrypted offline copy automatically.</p>
          {online && <Button size="sm" className="mt-3" onClick={sync}>Save my essentials now</Button>}
        </CardContent></Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <p className="text-xs text-muted lg:col-span-2">Offline copy saved {new Date(snap!.savedAt).toLocaleString("en-PH")}. Data may have changed since then.</p>
          <Card><CardHeader><CardTitle>Emergency contacts</CardTitle></CardHeader><CardContent>
            <ul className="flex flex-col gap-2 text-sm">
              <li className="flex justify-between"><span className="font-medium">National emergency hotline</span><a href="tel:911" className="font-semibold text-red-700">911</a></li>
              {d.hotlines.filter((h) => h.phone !== "911").map((h) => <li key={h.id} className="flex justify-between"><span>{h.name}</span><a href={`tel:${(h.phone ?? "").replace(/[^\d+]/g, "")}`} className="text-brand-700 underline">{h.phone}</a></li>)}
              {d.contacts.map((c) => (
                <li key={c.id} className="flex flex-wrap justify-between gap-2 border-t border-line pt-2"><span>{c.name}{c.relationship ? ` · ${c.relationship}` : ""}{c.is_out_of_area && <Badge tone="green" className="ml-1">Out-of-area</Badge>}</span>
                  <span className="flex gap-3"><a href={`tel:${c.phone.replace(/\s/g, "")}`} className="flex items-center gap-1 text-brand-700 underline"><Phone className="size-3" />{c.phone}</a></span></li>))}
              {d.contacts.length === 0 && <li className="text-muted">No contacts saved.</li>}
            </ul></CardContent></Card>

          {d.plans.map((p) => {
            const items = d.planItems.filter((i) => i.plan_id === p.id);
            return (
              <Card key={p.id}><CardHeader><CardTitle>{p.title}</CardTitle><Badge tone={p.status === "active" ? "green" : "amber"} className="w-fit">{p.status}</Badge></CardHeader><CardContent className="text-sm">
                {(p.sections.meeting_places ?? []).length > 0 && <><p className="font-medium">Meeting places</p><ul className="mb-2 list-disc pl-5">{p.sections.meeting_places!.map((m, i) => <li key={i}>{m.name}{m.address ? ` — ${m.address}` : ""}</li>)}</ul></>}
                {(p.sections.evacuation_destinations ?? []).length > 0 && <><p className="font-medium">Evacuation</p><ul className="mb-2 list-disc pl-5">{p.sections.evacuation_destinations!.map((m, i) => <li key={i}>{m.name}{m.route ? ` — ${m.route}` : ""}</li>)}</ul></>}
                {p.sections.communication?.out_of_area_contact && <p className="mb-2"><span className="font-medium">Check-in contact:</span> {p.sections.communication.out_of_area_contact}</p>}
                <p className="font-medium">Checklist</p>
                <ul className="mt-1 flex flex-col gap-1">{items.map((i) => (
                  <li key={i.id}><label className="flex items-start gap-2"><input type="checkbox" checked={i.done} onChange={() => togglePlanItem(i.id)} className="mt-0.5" /><span className={i.done ? "line-through text-muted" : ""}>{i.label}</span></label></li>))}</ul>
              </CardContent></Card>);
          })}

          {d.kits.map((k) => {
            const items = d.kitItems.filter((i) => i.kit_id === k.id);
            const r = kitReadiness(items.map((i) => ({ ...i, qty_needed: Number(i.qty_needed), qty_have: Number(i.qty_have) })));
            return (
              <Card key={k.id}><CardHeader><CardTitle>{k.name}</CardTitle><p className="text-xs text-muted">{k.location_note ?? ""}</p><Progress value={r} label={`${k.name} readiness`} /><p className="text-xs text-muted">{r}% ready</p></CardHeader>
                <CardContent><ul className="flex max-h-80 flex-col gap-1 overflow-y-auto text-sm">{items.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-2"><span>{i.name}</span>
                    <span className="flex items-center gap-1"><input type="number" min={0} step="any" aria-label={`Have ${i.name}`} defaultValue={Number(i.qty_have)} onBlur={(e) => Number(e.target.value) !== Number(i.qty_have) && setQty(i.id, Number(e.target.value) || 0)} className="h-7 w-16 rounded border border-line text-center" /><span className="text-xs text-muted">/ {Number(i.qty_needed)} {i.unit}</span></span></li>))}</ul></CardContent></Card>);
          })}
        </div>
      )}

      <Card className="mt-6"><CardHeader><CardTitle>Preparedness guides</CardTitle><p className="text-sm text-muted">Guides are cached when you visit them online.</p></CardHeader><CardContent>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{guides.map((g) => <li key={g.key}><Link href={`/guides/${g.key}`} className="block rounded-lg border border-line p-3 text-sm hover:border-brand-500"><span className="font-medium">{g.title}</span><span className="block text-xs text-muted">{g.tagline}</span></Link></li>)}</ul>
      </CardContent></Card>
    </>
  );
}
