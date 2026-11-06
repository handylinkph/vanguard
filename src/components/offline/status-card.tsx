"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { WifiOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@/components/ui";
import { loadSnapshot } from "@/lib/offline/store";
import { refreshSnapshots } from "@/lib/offline/sync";
import { getBrowserClient } from "@/lib/supabase/client";

export function OfflineStatusCard() {
  const [savedAt, setSavedAt] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [swReady, setSwReady] = useState(false);
  useEffect(() => {
    loadSnapshot("essentials").then((s) => setSavedAt(s?.savedAt ?? null)).catch(() => setSavedAt(null));
    if ("serviceWorker" in navigator) navigator.serviceWorker.getRegistration().then((r) => setSwReady(!!r?.active));
  }, []);
  async function refresh() {
    const sb = getBrowserClient(); if (!sb) return;
    setBusy(true);
    if (await refreshSnapshots(sb)) { setSavedAt(new Date().toISOString()); localStorage.setItem("vg-snapshot-at", String(Date.now())); }
    setBusy(false);
  }
  return (
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><WifiOff className="size-4" />Offline availability</CardTitle></CardHeader><CardContent className="text-sm">
      {savedAt === undefined ? <p className="text-muted">Checking…</p> : savedAt ? <p>Plans, contacts, kits and hotlines saved on this device <span className="text-muted">({new Date(savedAt).toLocaleString("en-PH")})</span>.</p> : <p className="text-muted">Not yet saved on this device.</p>}
      <p className="mt-1 text-xs text-muted">App shell & guides: {swReady ? "cached for offline use" : "will be cached after the app is installed or reloaded"}.</p>
      <div className="mt-3 flex gap-2"><Button size="sm" variant="outline" onClick={refresh} disabled={busy}>{busy ? "Saving…" : "Update offline copy"}</Button><Link href="/offline" className="self-center text-xs text-brand-700 underline">Open offline view</Link></div>
    </CardContent></Card>
  );
}
