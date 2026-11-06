import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { isUrgent, URGENT_NOTICE, systemPrompt } from "@/lib/ai/guardrails";
import { retrieveGuides, tokens } from "@/lib/ai/retrieve";
import { kitReadiness } from "@/lib/kits";

export const runtime = "nodejs";
const Body = z.object({ conversationId: z.string().uuid().nullable().optional(), message: z.string().trim().min(1).max(2000) });

export async function GET() {
  return NextResponse.json({ configured: Boolean(process.env.ANTHROPIC_API_KEY) });
}

export async function POST(req: Request) {
  if (!isSupabaseConfigured) return NextResponse.json({ error: "Backend not configured" }, { status: 503 });
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Message must be 1–2000 characters." }, { status: 400 });
  const { message } = parsed.data;
  const userId = auth.user.id;

  const { data: settings } = await supabase.from("app_settings").select("key, value").in("key", ["ai_assistant_enabled", "ai_hourly_message_limit"]);
  const setting = (k: string) => settings?.find((s) => s.key === k)?.value;
  if (setting("ai_assistant_enabled") === false) return NextResponse.json({ error: "The assistant has been turned off by administrators." }, { status: 503 });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "The AI assistant is not configured on this server.", unconfigured: true }, { status: 503 });

  // Rate limit: N user messages per rolling hour.
  const limit = Number(setting("ai_hourly_message_limit") ?? 30);
  const { count } = await supabase.from("ai_messages").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("role", "user").gt("created_at", new Date(Date.now() - 3600_000).toISOString());
  if ((count ?? 0) >= limit) return NextResponse.json({ error: `You've reached the limit of ${limit} messages per hour. Please try again later.` }, { status: 429 });

  // Conversation
  let conversationId = parsed.data.conversationId ?? null;
  if (conversationId) {
    const { data: c } = await supabase.from("ai_conversations").select("id").eq("id", conversationId).maybeSingle();
    if (!c) conversationId = null;
  }
  if (!conversationId) {
    conversationId = crypto.randomUUID();
    await supabase.from("ai_conversations").insert({ id: conversationId, user_id: userId, title: message.slice(0, 80) });
  }
  const { data: history } = await supabase.from("ai_messages").select("role, content").eq("conversation_id", conversationId).order("id", { ascending: false }).limit(12);

  // Retrieval: built-in guides + published library resources.
  const guideSources = retrieveGuides(message, 3);
  const terms = tokens(message).slice(0, 4);
  let libSources: { title: string; ref: string; text: string }[] = [];
  if (terms.length) {
    const { data: res } = await supabase.from("resources").select("slug, title, summary, body, source_name").eq("published", true)
      .or(terms.map((t) => `title.ilike.%${t}%,summary.ilike.%${t}%`).join(",")).limit(3);
    libSources = (res ?? []).map((r) => ({ title: r.title, ref: `/library/${r.slug}`, text: `${r.summary}\n${r.body.slice(0, 1200)}\n(Source: ${r.source_name})` }));
  }
  const sources = [...guideSources, ...libSources].slice(0, 5);

  // Personal context (minimal, no names or contact details).
  const [{ data: hm }, { data: ra }, { data: kitItems }] = await Promise.all([
    supabase.from("household_members").select("age_group, needs_assistance, households(city, region, near_coast, near_river, near_slope)").limit(30),
    supabase.from("risk_assessments").select("score, hazards, recommendations").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("kit_items").select("qty_needed, qty_have, essential, packed, expires_on").limit(500),
  ]);
  const hh = (hm?.[0]?.households as unknown as { city: string | null; region: string | null; near_coast: boolean | null; near_river: boolean | null; near_slope: boolean | null } | null);
  const counts = (g: string) => (hm ?? []).filter((m) => m.age_group === g).length;
  const profile = [
    hh ? `Location: ${[hh.city, hh.region].filter(Boolean).join(", ") || "not set"}. Near coast: ${!!hh.near_coast}, near river: ${!!hh.near_river}, near slope: ${!!hh.near_slope}.` : "",
    hm?.length ? `Household: ${counts("adult") + counts("teen")} adults/teens, ${counts("child")} children, ${counts("infant")} infants, ${counts("senior")} older adults, ${(hm ?? []).filter((m) => m.needs_assistance).length} need evacuation assistance.` : "",
    ra ? `Latest preparedness assessment: ${ra.score}%. Hazards of concern: ${(ra.hazards as string[]).join(", ")}. Top gaps: ${(ra.recommendations as { text: string }[]).slice(0, 3).map((r) => r.text).join(" | ")}` : "No assessment taken yet.",
    kitItems?.length ? `Emergency kit readiness: ${kitReadiness(kitItems.map((k) => ({ ...k, qty_needed: Number(k.qty_needed), qty_have: Number(k.qty_have) })))}%.` : "No emergency kit recorded yet.",
  ].filter(Boolean).join("\n");

  const urgent = isUrgent(message);
  await supabase.from("ai_messages").insert({ conversation_id: conversationId, user_id: userId, role: "user", content: message });

  let reply: string;
  try {
    const client = new Anthropic({ apiKey });
    const msgs = [...(history ?? []).reverse().map((h) => ({ role: h.role as "user" | "assistant", content: h.content })), { role: "user" as const, content: message }];
    const res = await client.messages.create({
      model: process.env.AI_MODEL || "claude-haiku-5-5", max_tokens: 900,
      system: systemPrompt({ profile, sources }), messages: msgs,
    });
    reply = res.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim() || "Sorry, I couldn't generate a response.";
  } catch (e) {
    await supabase.from("error_events").insert({ user_id: userId, source: "server", message: "AI assistant request failed", path: "/api/assistant", detail: String((e as Error).message).slice(0, 1000) });
    return NextResponse.json({ error: "The assistant is temporarily unavailable. Please try again later.", conversationId, urgentNotice: urgent ? URGENT_NOTICE : null }, { status: 502 });
  }
  if (urgent) reply = `${URGENT_NOTICE}\n\n${reply}`;
  const sourceList = sources.map((s, i) => ({ n: i + 1, title: s.title, href: s.ref }));
  await supabase.from("ai_messages").insert({ conversation_id: conversationId, user_id: userId, role: "assistant", content: reply.slice(0, 20000), sources: sourceList });
  await supabase.from("ai_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
  return NextResponse.json({ reply, sources: sourceList, conversationId });
}
