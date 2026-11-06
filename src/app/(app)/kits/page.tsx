import Link from "next/link";
import { Backpack, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { Card, PageHeader, Badge, ButtonLink, EmptyState, Progress } from "@/components/ui";
import { KIT_TYPES, kitReadiness, isExpired, expiresWithin, type KitType } from "@/lib/kits";
import { fmtDate } from "@/lib/utils";

export const metadata = { title: "Emergency kits" };

export default async function KitsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  const { supabase } = await requireUser();
  const { data } = await supabase.from("kits").select("*, kit_items(qty_needed, qty_have, essential, packed, expires_on)").eq("archived", view === "archived").order("updated_at", { ascending: false });
  const kits = data ?? [];
  return (
    <>
      <PageHeader title="Emergency kits" description="Supply inventories sized to your household, with readiness, expiry tracking and shopping lists." actions={<ButtonLink href="/kits/new"><Plus />New kit</ButtonLink>} />
      <div className="mb-4 flex gap-2 text-sm">
        <Link href="/kits" className={`rounded-full px-3 py-1 ${view !== "archived" ? "bg-navy text-white" : "border border-line bg-white"}`}>Current</Link>
        <Link href="/kits?view=archived" className={`rounded-full px-3 py-1 ${view === "archived" ? "bg-navy text-white" : "border border-line bg-white"}`}>Archived</Link>
      </div>
      {kits.length === 0 ? <EmptyState icon={<Backpack />} title="No kits yet" description="Build a 3-day home kit and a go-bag for each person." action={<ButtonLink href="/kits/new">Build a kit</ButtonLink>} /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {kits.map((k) => {
            const items = (k.kit_items ?? []).map((i: { qty_needed: number; qty_have: number; essential: boolean; packed: boolean; expires_on: string | null }) => ({ ...i, qty_needed: Number(i.qty_needed), qty_have: Number(i.qty_have) }));
            const r = kitReadiness(items);
            const expired = items.filter((i: { expires_on: string | null }) => isExpired(i)).length;
            const soon = items.filter((i: { expires_on: string | null }) => expiresWithin(i, 30)).length;
            return (
              <Link key={k.id} href={`/kits/${k.id}`}><Card className="h-full p-5 hover:border-brand-500">
                <div className="flex flex-wrap gap-2"><Badge tone="blue">{KIT_TYPES[k.kit_type as KitType].label}</Badge>{k.household_id && <Badge>Household</Badge>}
                  {expired > 0 && <Badge tone="red">{expired} expired</Badge>}{soon > 0 && <Badge tone="amber">{soon} expiring soon</Badge>}</div>
                <h2 className="mt-3 font-semibold">{k.name}</h2>
                <p className="text-xs text-muted">{items.length} items · {k.days} days · checked {fmtDate(k.last_checked_on)}</p>
                <Progress value={r} className="mt-4" label={`${k.name} readiness`} />
                <p className="mt-1 text-xs text-muted">{r}% ready</p>
              </Card></Link>
            );
          })}
        </div>
      )}
    </>
  );
}
