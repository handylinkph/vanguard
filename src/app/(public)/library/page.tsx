import Link from "next/link";
import { Card, PageHeader, Input, Select, Button, Badge, Alert, EmptyState } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { guides } from "@/content/guides";
import { fmtDate } from "@/lib/utils";
import type { Resource } from "@/lib/types";
import { BookOpen } from "lucide-react";

export const metadata = { title: "Resource library" };
import { LIB_CATEGORIES } from "@/content/library";

export default async function Library({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; hazard?: string; fav?: string }> }) {
  const sp = await searchParams;
  if (!isSupabaseConfigured) return <><PageHeader title="Resource library" /><Alert tone="warning">The library needs the Vanguard backend, which isn&apos;t configured on this server. The <Link className="underline" href="/guides">disaster guides</Link> are available.</Alert></>;
  const supabase = await createClient();
  const session = await getSession();
  let q = supabase.from("resources").select("id, slug, title, summary, category, hazards, language, source_name, reviewed_on, review_due_on, download_url").eq("published", true).order("title");
  if (sp.category) q = q.eq("category", sp.category);
  if (sp.hazard) q = q.contains("hazards", [sp.hazard]);
  if (sp.q) { const term = sp.q.replace(/[%,()]/g, " ").slice(0, 80); q = q.or(`title.ilike.%${term}%,summary.ilike.%${term}%,body.ilike.%${term}%`); }
  const [{ data }, favs] = await Promise.all([q, session ? session.supabase.from("saved_items").select("item_key").eq("item_type", "resource") : Promise.resolve({ data: [] })]);
  const favKeys = new Set((favs.data ?? []).map((f) => f.item_key));
  let list = (data ?? []) as Resource[];
  if (sp.fav) list = list.filter((r) => favKeys.has(r.slug));
  return (
    <>
      <PageHeader title="Disaster preparedness resource library" description="Guides, procedures and checklists for households, schools, businesses and communities — with sources and review dates." />
      <form className="mb-6 flex flex-wrap gap-2" role="search">
        <label htmlFor="q" className="sr-only">Search</label><Input id="q" name="q" defaultValue={sp.q} placeholder="Search resources" className="max-w-xs" />
        <label htmlFor="category" className="sr-only">Category</label>
        <Select id="category" name="category" defaultValue={sp.category ?? ""} className="w-48"><option value="">All categories</option>{Object.entries(LIB_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
        <label htmlFor="hazard" className="sr-only">Hazard</label>
        <Select id="hazard" name="hazard" defaultValue={sp.hazard ?? ""} className="w-40"><option value="">Any hazard</option>{guides.map((g) => <option key={g.key} value={g.key}>{g.title}</option>)}</Select>
        {session && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="fav" value="1" defaultChecked={!!sp.fav} />Favourites</label>}
        <Button>Filter</Button>
      </form>
      {list.length === 0 ? <EmptyState icon={<BookOpen />} title="No resources found" description="Try a different search or filter." /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((r) => {
            const overdue = r.review_due_on && r.review_due_on < new Date().toISOString().slice(0, 10);
            return (
              <Link key={r.id} href={`/library/${r.slug}`}><Card className="h-full p-5 hover:border-brand-500">
                <div className="flex flex-wrap gap-2"><Badge tone="blue">{LIB_CATEGORIES[r.category]}</Badge>{favKeys.has(r.slug) && <Badge tone="green">Favourite</Badge>}{overdue && <Badge tone="amber">Review due</Badge>}</div>
                <h2 className="mt-3 font-semibold">{r.title}</h2><p className="mt-1 text-sm text-muted">{r.summary}</p>
                <p className="mt-3 text-xs text-muted">Source: {r.source_name} · reviewed {fmtDate(r.reviewed_on)}</p>
              </Card></Link>
            );
          })}
        </div>
      )}
    </>
  );
}
