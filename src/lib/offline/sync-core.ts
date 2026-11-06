// Pure offline-sync logic (no browser APIs) — unit tested.
// Strategy: optimistic concurrency on a per-row `version` column.
//  - Each queued op records the row version it was based on.
//  - If the server row still has that version, the patch is applied (guarded by .eq("version", base)).
//  - If the server changed meanwhile and the changed fields differ, it's a CONFLICT: the server copy
//    is kept and the user's attempted values are surfaced for an explicit "keep mine" decision.

export type SyncTable = "kit_items" | "plan_checklist_items";
export interface QueuedOp {
  id?: number;
  table: SyncTable;
  rowId: string;
  patch: Record<string, unknown>;
  baseVersion: number;
  label: string;
  queuedAt: string;
}
export interface ServerRow { version: number; [k: string]: unknown }

export type Resolution =
  | { kind: "apply" }
  | { kind: "noop" } // server already has the same values
  | { kind: "conflict"; server: Record<string, unknown> }
  | { kind: "gone" };

export const ALLOWED_FIELDS: Record<SyncTable, string[]> = {
  kit_items: ["qty_have", "packed", "expires_on"],
  plan_checklist_items: ["done"],
};

export function sanitizePatch(table: SyncTable, patch: Record<string, unknown>) {
  const allowed = new Set(ALLOWED_FIELDS[table]);
  return Object.fromEntries(Object.entries(patch).filter(([k]) => allowed.has(k)));
}

const same = (a: unknown, b: unknown) => (a == null && b == null) || String(a) === String(b);

export function resolve(op: QueuedOp, server: ServerRow | null): Resolution {
  if (!server) return { kind: "gone" };
  const fields = Object.keys(op.patch);
  if (fields.every((f) => same(server[f], op.patch[f]))) return { kind: "noop" };
  if (server.version === op.baseVersion) return { kind: "apply" };
  return { kind: "conflict", server: { ...Object.fromEntries(fields.map((f) => [f, server[f]])), version: server.version } };
}

/** Merge a new op into the queue: later edits to the same row replace earlier patches but keep the ORIGINAL base version. */
export function coalesce(queue: QueuedOp[], next: QueuedOp): QueuedOp[] {
  const idx = queue.findIndex((q) => q.table === next.table && q.rowId === next.rowId);
  if (idx === -1) return [...queue, next];
  const merged = { ...queue[idx], patch: { ...queue[idx].patch, ...next.patch }, label: next.label, queuedAt: next.queuedAt };
  return queue.map((q, i) => (i === idx ? merged : q));
}
