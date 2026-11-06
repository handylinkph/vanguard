import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

const Body = z.object({ message: z.string().min(1).max(1000), path: z.string().max(300).optional(), detail: z.string().max(4000).optional() });
const recent = new Map<string, number[]>(); // simple per-instance rate limit

export async function POST(req: Request) {
  if (!isSupabaseConfigured) return new NextResponse(null, { status: 204 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const now = Date.now(); const hits = (recent.get(ip) ?? []).filter((t) => now - t < 60_000);
  if (hits.length >= 10) return new NextResponse(null, { status: 429 });
  recent.set(ip, [...hits, now]);
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return new NextResponse(null, { status: 400 });
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  await supabase.from("error_events").insert({ user_id: data.user?.id ?? null, source: "client", message: p.data.message, path: p.data.path, detail: p.data.detail });
  return new NextResponse(null, { status: 204 });
}
