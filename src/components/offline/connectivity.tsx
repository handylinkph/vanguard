"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { listOutbox, listConflicts, subscribe } from "@/lib/offline/store";
import { flushOutbox, refreshSnapshots } from "@/lib/offline/sync";
import { getBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";

function useOnline() {
  return useSyncExternalStore(
    (cb) => { window.addEventListener("online", cb); window.addEventListener("offline", cb); return () => { window.removeEventListener("online", cb); window.removeEventListener("offline", cb); }; },
    () => navigator.onLine, () => true);
}

export function ConnectivityBadge() {
  const online = useOnline();
  const [pending, setPending] = useState(0);
  const [conflicts, setConflicts] = useState(0);
  useEffect(() => {
    const load = async () => { try { setPending((await listOutbox()).length); setConflicts((await listConflicts()).length); } catch { /* IDB unavailable */ } };
    load();
    return subscribe(load);
  }, []);
  useEffect(() => {
    const sb = getBrowserClient();
    if (online && sb) flushOutbox(sb).catch(() => {});
  }, [online]);
  return (
    <Link href="/offline" className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium ${online ? "text-emerald-700" : "bg-amber-100 text-amber-900"}`}
      aria-label={online ? "Online" : "Offline — saved essentials available"}>
      {online ? <Wifi className="size-4" aria-hidden /> : <WifiOff className="size-4" aria-hidden />}
      <span className="hidden sm:inline">{online ? "Online" : "Offline"}</span>
      {pending > 0 && <span className="flex items-center gap-1 rounded-full bg-brand-50 px-1.5 text-brand-700"><RefreshCw className="size-3" />{pending}</span>}
      {conflicts > 0 && <span className="rounded-full bg-red-100 px-1.5 text-red-700">{conflicts} conflict{conflicts > 1 ? "s" : ""}</span>}
    </Link>
  );
}

/** Registers the service worker and keeps the offline snapshot fresh (at most every 10 minutes). */
export function OfflineBootstrap({ signedIn }: { signedIn: boolean }) {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    if (!signedIn) return;
    const last = Number(localStorage.getItem("vg-snapshot-at") ?? 0);
    const sb = getBrowserClient();
    if (sb && navigator.onLine && Date.now() - last > 10 * 60 * 1000) {
      refreshSnapshots(sb).then((ok) => { if (ok) localStorage.setItem("vg-snapshot-at", String(Date.now())); }).catch(() => {});
    }
  }, [signedIn]);
  return null;
}
