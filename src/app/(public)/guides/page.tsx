import Link from "next/link";
import { guides, searchGuides } from "@/content/guides";
import { Card, PageHeader, Input, Select, Button, EducationalNotice, Badge } from "@/components/ui";
import { getSession } from "@/lib/auth";

export const metadata = { title: "Disaster information & preparedness guidance" };

export default async function Guides({ searchParams }: { searchParams: Promise<{ q?: string; hazard?: string; saved?: string }> }) {
  const sp = await searchParams;
  const session = await getSession().catch(() => null);
  let savedKeys: string[] = [];
  if (session) {
    const { data } = await session.supabase.from("saved_items").select("item_key").eq("item_type", "guide");
    savedKeys = (data ?? []).map((d) => d.item_key);
  }
  let results = searchGuides(sp.q ?? "", sp.hazard);
  if (sp.saved) results = results.filter((g) => savedKeys.includes(g.key));
  return (
    <>
      <PageHeader title="Disaster information & preparedness guidance" description="Plain-language guidance for the hazards most common in the Philippines — what to do before, during and after." />
      <EducationalNotice className="mb-6" />
      <form className="mb-6 flex flex-wrap gap-2" role="search">
        <label htmlFor="q" className="sr-only">Search guides</label>
        <Input id="q" name="q" defaultValue={sp.q} placeholder="Search e.g. storm surge, gas leak, ashfall" className="max-w-sm" />
        <label htmlFor="hazard" className="sr-only">Hazard</label>
        <Select id="hazard" name="hazard" defaultValue={sp.hazard ?? "all"} className="w-44">
          <option value="all">All hazards</option>{guides.map((g) => <option key={g.key} value={g.key}>{g.title}</option>)}
        </Select>
        {session && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="saved" value="1" defaultChecked={!!sp.saved} />Saved only</label>}
        <Button>Search</Button>
      </form>
      {results.length === 0 ? <p className="text-sm text-muted">No guidance matched your search.</p> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {results.map((g) => (
            <Link key={g.key} href={`/guides/${g.key}`}><Card className="h-full p-5 hover:border-brand-500">
              <div className="flex justify-between"><Badge tone="blue">Educational</Badge>{savedKeys.includes(g.key) && <Badge tone="green">Saved</Badge>}</div>
              <h2 className="mt-3 font-semibold">{g.title}</h2>
              <p className="text-sm text-muted">{g.tagline}</p>
            </Card></Link>
          ))}
        </div>
      )}
    </>
  );
}
