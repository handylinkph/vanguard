import { Phone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, PageHeader, Badge, Alert } from "@/components/ui";
import { ServiceFinder, type Place } from "@/components/services/finder";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { SaveButton } from "@/components/save-button";
import { SERVICE_CATEGORIES } from "@/content/library";
import { fmtDate } from "@/lib/utils";
import type { Service } from "@/lib/types";

export const metadata = { title: "Emergency services directory" };

const FALLBACK_HOTLINES: Partial<Service>[] = [
  { id: "fallback-911", name: "National Emergency Hotline", phone: "911", category: "hotline", scope: "national", source_name: "Emergency 911 (Philippine government)", verification: "unverified", last_reviewed_on: "2026-11-07" },
];

export default async function Services() {
  let services: Service[] = []; let saved = new Set<string>();
  const session = await getSession().catch(() => null);
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const { data } = await supabase.from("services").select("*").eq("published", true).order("scope").order("name");
    services = (data ?? []) as Service[];
    if (session) saved = new Set(((await session.supabase.from("saved_items").select("item_key").eq("item_type", "service")).data ?? []).map((s) => s.item_key));
  }
  const hotlines = services.filter((s) => s.category === "hotline");
  const hotlineList = hotlines.length ? hotlines : (FALLBACK_HOTLINES as Service[]);
  const curated: Place[] = services.filter((s) => s.lat != null && s.lng != null && s.category !== "hotline").map((s) => ({
    id: s.id, name: s.name, category: s.category, lat: s.lat!, lng: s.lng!, phone: s.phone, address: s.address, source: "vanguard", reviewed: s.last_reviewed_on, verification: s.verification,
  }));
  const local = services.filter((s) => s.category !== "hotline");
  return (
    <>
      <PageHeader title="Emergency services directory" description="Hotlines, hospitals, fire and police stations, and other services — with sources and review dates." />
      <Alert tone="warning" className="mb-6"><strong>This is a reference directory, not a dispatch service.</strong> Vanguard cannot contact rescuers for you and does not show whether a facility is open or available during a disaster. In an emergency, call <a href="tel:911" className="font-semibold underline">911</a>.</Alert>
      <Card className="mb-6"><CardHeader><CardTitle>Emergency hotlines</CardTitle><p className="text-sm text-muted">Confirm local numbers with your LGU — numbers can change.</p></CardHeader>
        <CardContent><ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {hotlineList.map((h) => (
            <li key={h.id} className="rounded-lg border border-line p-3">
              <div className="flex items-start justify-between gap-2"><p className="font-medium">{h.name}</p>
                {!h.id.startsWith("fallback") && <SaveButton type="service" itemKey={h.id} title={h.name} saved={saved.has(h.id)} path="/services" signedIn={!!session} />}</div>
              <a href={`tel:${(h.phone ?? "").replace(/[^\d+]/g, "")}`} className="mt-1 flex items-center gap-2 text-xl font-semibold text-red-700"><Phone className="size-5" />{h.phone}</a>
              {h.alt_phone && <p className="text-sm">Alt: <a className="underline" href={`tel:${h.alt_phone.replace(/[^\d+]/g, "")}`}>{h.alt_phone}</a></p>}
              <p className="mt-1 text-xs text-muted">{h.scope} · Source: {h.source_url ? <a className="underline" href={h.source_url} target="_blank" rel="noopener noreferrer">{h.source_name}</a> : h.source_name} · reviewed {fmtDate(h.last_reviewed_on)}</p>
              <Badge tone={h.verification === "verified" ? "green" : "amber"} className="mt-1">{h.verification === "verified" ? "Verified" : "Verify locally"}</Badge>
            </li>))}
        </ul></CardContent></Card>
      <h2 className="mb-3 text-lg font-semibold text-navy">Find facilities near you</h2>
      <ServiceFinder curated={curated} />
      {local.length > 0 && (
        <Card className="mt-6"><CardHeader><CardTitle>Curated directory</CardTitle></CardHeader><CardContent>
          <ul className="divide-y divide-line">{local.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <span><Badge tone="blue">{SERVICE_CATEGORIES[s.category]}</Badge> <span className="font-medium">{s.name}</span> <span className="text-muted">{[s.city, s.region].filter(Boolean).join(", ")}</span></span>
              <span className="flex items-center gap-3">{s.phone && <a className="text-brand-700 underline" href={`tel:${s.phone.replace(/[^\d+]/g, "")}`}>{s.phone}</a>}<span className="text-xs text-muted">reviewed {fmtDate(s.last_reviewed_on)}</span></span>
            </li>))}</ul>
        </CardContent></Card>
      )}
    </>
  );
}
