import { guides } from "@/content/guides";

const STOP = new Set("the a an and or of to in on for is are be what how do i my we our with at from it this that can should when where why you your".split(" "));
export const tokens = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter((t) => t.length > 2 && !STOP.has(t));

/** Rank built-in hazard guides by keyword overlap. Returns top N with a compact text excerpt. */
export function retrieveGuides(question: string, n = 3) {
  const q = tokens(question);
  if (!q.length) return [];
  return guides
    .map((g) => {
      const hay = [g.title, g.tagline, g.summary, ...g.before, ...g.during, ...g.after, ...g.understanding.map((u) => `${u.heading} ${u.body}`)].join(" ").toLowerCase();
      const titleHit = q.some((t) => g.title.toLowerCase().includes(t) || g.key.includes(t)) ? 5 : 0;
      const score = titleHit + q.reduce((a, t) => a + (hay.includes(t) ? 1 : 0), 0);
      return { g, score };
    })
    .filter((x) => x.score > 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map(({ g }) => ({
      title: `${g.title} preparedness guide`, ref: `/guides/${g.key}`,
      text: [g.summary, "Before: " + g.before.slice(0, 5).join("; "), "During: " + g.during.slice(0, 5).join("; "), "After: " + g.after.slice(0, 4).join("; ")].join("\n"),
    }));
}
