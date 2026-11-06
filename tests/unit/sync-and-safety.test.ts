import { describe, it, expect } from "vitest";
import { resolve, coalesce, sanitizePatch, type QueuedOp } from "@/lib/offline/sync-core";
import { isUrgent, systemPrompt } from "@/lib/ai/guardrails";
import { retrieveGuides } from "@/lib/ai/retrieve";
import { renderMarkdown } from "@/lib/markdown";
import { planBodyHtml } from "@/lib/plan-export";
import { zipRows } from "@/lib/rows";
import { scenarios, scoreRun, maxScore } from "@/content/scenarios";
import { searchGuides } from "@/content/guides";
import type { Plan } from "@/lib/types";

const op = (patch: Record<string, unknown>, baseVersion = 1): QueuedOp => ({ table: "kit_items", rowId: "r1", patch, baseVersion, label: "Water", queuedAt: "now" });

describe("offline sync conflict resolution", () => {
  it("applies when the server version matches", () => expect(resolve(op({ qty_have: 5 }), { version: 1, qty_have: 2 }).kind).toBe("apply"));
  it("is a no-op when the server already has the value", () => expect(resolve(op({ qty_have: 5 }), { version: 3, qty_have: 5 }).kind).toBe("noop"));
  it("reports a conflict with server values when both changed", () => {
    const r = resolve(op({ qty_have: 5 }), { version: 2, qty_have: 9 });
    expect(r).toEqual({ kind: "conflict", server: { qty_have: 9, version: 2 } });
  });
  it("detects deleted rows", () => expect(resolve(op({ qty_have: 1 }), null).kind).toBe("gone"));
  it("coalesces edits to the same row, keeping the original base version", () => {
    const q = coalesce([op({ qty_have: 1 }, 4)], op({ packed: true }, 6));
    expect(q).toHaveLength(1);
    expect(q[0]).toMatchObject({ baseVersion: 4, patch: { qty_have: 1, packed: true } });
  });
  it("strips fields that offline edits may not change", () => {
    expect(sanitizePatch("kit_items", { qty_have: 1, kit_id: "x", name: "y" })).toEqual({ qty_have: 1 });
    expect(sanitizePatch("plan_checklist_items", { done: true, plan_id: "x" })).toEqual({ done: true });
  });
});

describe("AI guardrails & retrieval", () => {
  it("flags urgent situations", () => {
    expect(isUrgent("We are trapped in the house, flood water rising fast")).toBe(true);
    expect(isUrgent("My father is not breathing")).toBe(true);
    expect(isUrgent("Tulong po!")).toBe(true);
    expect(isUrgent("What should go in a go-bag?")).toBe(false);
  });
  it("system prompt forbids live-condition claims and includes numbered sources", () => {
    const p = systemPrompt({ profile: "", sources: [{ title: "Typhoon guide", ref: "/guides/typhoon", text: "..." }] });
    expect(p).toMatch(/NO access to live/);
    expect(p).toMatch(/\[1\] Typhoon guide/);
  });
  it("retrieves the relevant hazard guide", () => {
    expect(retrieveGuides("how do I prepare for a typhoon storm surge")[0].ref).toBe("/guides/typhoon");
    expect(retrieveGuides("ashfall masks volcano")[0].ref).toBe("/guides/volcano");
  });
  it("guide search filters by text and hazard", () => {
    expect(searchGuides("storm surge").map((g) => g.key)).toContain("typhoon");
    expect(searchGuides("", "fire").map((g) => g.key)).toEqual(["fire"]);
  });
});

describe("output safety", () => {
  it("markdown renderer escapes HTML and only allows https links", () => {
    const html = renderMarkdown("## Hi\n<script>alert(1)</script>\n- **bold** [x](https://ok.ph) [y](javascript:alert(1))");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain('<a href="https://ok.ph"');
    expect(html).not.toContain('href="javascript');
  });
  it("plan export escapes user content", () => {
    const plan = { title: "<img src=x onerror=alert(1)>", hazard: "all", plan_type: "household", status: "active", updated_at: "2026-11-07", review_on: null, sections: { meeting_places: [{ name: "<b>x</b>", kind: "near" }] } } as unknown as Plan;
    const html = planBodyHtml(plan, [], []);
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;b&gt;x&lt;/b&gt;");
    expect(html).toContain("911");
  });
  it("zips repeater rows and drops empty ones", () => {
    expect(zipRows({ mp_name: ["Gate", "", "Church"], mp_kind: ["near", "near", "far"] }, "mp", ["name", "kind"], "name")).toEqual([{ name: "Gate", kind: "near" }, { name: "Church", kind: "far" }]);
  });
});

describe("drill scoring", () => {
  it("scores best choices at 100% with no suggestions", () => {
    for (const s of scenarios) {
      const best = Object.fromEntries(s.steps.map((st) => [st.id, st.choices.reduce((a, b) => (b.points > a.points ? b : a)).id]));
      const r = scoreRun(s, best);
      expect(r.pct).toBe(100); expect(r.suggestions).toHaveLength(0); expect(r.max).toBe(maxScore(s));
    }
  });
  it("gives improvement suggestions for weaker choices and ignores tampered ids", () => {
    const s = scenarios[0];
    const r = scoreRun(s, { s1: "a", s2: "zzz" });
    expect(r.score).toBe(0); expect(r.suggestions.length).toBe(s.steps.length);
  });
});
