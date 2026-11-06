"use client";
// IndexedDB storage for offline essentials. Snapshot data is encrypted at rest with an
// AES-GCM key that is generated in the browser and stored as a NON-EXTRACTABLE CryptoKey.
// Everything is wiped on sign-out. Incident records are never cached offline.
import { openDB, type IDBPDatabase } from "idb";
import { coalesce, sanitizePatch, type QueuedOp } from "./sync-core";

const DB_NAME = "vanguard-offline";
let dbp: Promise<IDBPDatabase> | null = null;

function db() {
  dbp ??= openDB(DB_NAME, 1, {
    upgrade(d) {
      d.createObjectStore("snapshots");
      d.createObjectStore("outbox", { keyPath: "id", autoIncrement: true });
      d.createObjectStore("conflicts", { keyPath: "id", autoIncrement: true });
      d.createObjectStore("meta");
    },
  });
  return dbp;
}

async function key(): Promise<CryptoKey> {
  const d = await db();
  const existing = (await d.get("meta", "key")) as CryptoKey | undefined;
  if (existing) return existing;
  const k = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  await d.put("meta", k, "key");
  return k;
}

export async function saveSnapshot<T>(name: string, data: T) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = new TextEncoder().encode(JSON.stringify({ savedAt: new Date().toISOString(), data }));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await key(), plain);
  await (await db()).put("snapshots", { iv, cipher }, name);
}

export async function loadSnapshot<T>(name: string): Promise<{ savedAt: string; data: T } | null> {
  const rec = (await (await db()).get("snapshots", name)) as { iv: Uint8Array; cipher: ArrayBuffer } | undefined;
  if (!rec) return null;
  try {
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: rec.iv as BufferSource }, await key(), rec.cipher);
    return JSON.parse(new TextDecoder().decode(plain));
  } catch {
    return null;
  }
}

export async function enqueue(op: Omit<QueuedOp, "queuedAt">) {
  const d = await db();
  const clean = { ...op, patch: sanitizePatch(op.table, op.patch), queuedAt: new Date().toISOString() };
  const all = (await d.getAll("outbox")) as QueuedOp[];
  const merged = coalesce(all, clean);
  const tx = d.transaction("outbox", "readwrite");
  await tx.store.clear();
  for (const q of merged) await tx.store.put(q.id ? q : { ...q });
  await tx.done;
  notify();
}

export async function listOutbox(): Promise<QueuedOp[]> { return (await db()).getAll("outbox"); }
export async function removeOp(id: number) { await (await db()).delete("outbox", id); notify(); }

export interface ConflictRecord { id?: number; op: QueuedOp; server: Record<string, unknown>; detectedAt: string }
export async function addConflict(c: ConflictRecord) { await (await db()).add("conflicts", c); notify(); }
export async function listConflicts(): Promise<ConflictRecord[]> { return (await db()).getAll("conflicts"); }
export async function removeConflict(id: number) { await (await db()).delete("conflicts", id); notify(); }

export async function clearAllOfflineData() {
  dbp = null;
  await new Promise<void>((res) => { const r = indexedDB.deleteDatabase(DB_NAME); r.onsuccess = r.onerror = r.onblocked = () => res(); });
  if ("caches" in window) {
    for (const k of await caches.keys()) if (k.startsWith("vanguard-")) await caches.delete(k);
  }
  notify();
}

// Simple pub/sub so UI badges refresh.
const listeners = new Set<() => void>();
export function subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
function notify() { listeners.forEach((f) => f()); }
