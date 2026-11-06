import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckSquare, Square } from "lucide-react";
import { guides, getGuide } from "@/content/guides";
import { Card, CardContent, CardHeader, CardTitle, PageHeader, EducationalNotice, Badge, ButtonLink } from "@/components/ui";
import { SaveButton } from "@/components/save-button";
import { PrintButton } from "@/components/ui/copy-button";
import { getSession } from "@/lib/auth";
import { toggleChecklistItem } from "@/app/saved/actions";
import { fmtDate } from "@/lib/utils";

function Section({ title, items }: { title: string; items: string[] }) {
  return <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent><ul className="list-disc space-y-1.5 pl-5 text-sm">{items.map((i) => <li key={i}>{i}</li>)}</ul></CardContent></Card>;
}

export function generateStaticParams() { return guides.map((g) => ({ key: g.key })); }
export async function generateMetadata({ params }: { params: Promise<{ key: string }> }) {
  const g = getGuide((await params).key); return { title: g ? `${g.title} preparedness` : "Guide" };
}

export default async function GuidePage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const g = getGuide(key); if (!g) notFound();
  const session = await getSession().catch(() => null);
  let saved = false; let done: string[] = [];
  if (session) {
    const [s, c] = await Promise.all([
      session.supabase.from("saved_items").select("item_key").eq("item_type", "guide").eq("item_key", g.key).maybeSingle(),
      session.supabase.from("checklist_progress").select("item_key").eq("checklist_key", `guide:${g.key}`),
    ]);
    saved = !!s.data; done = (c.data ?? []).map((x) => x.item_key);
  }
  const path = `/guides/${g.key}`;
  return (
    <>
      <PageHeader eyebrow="Preparedness guidance" title={g.title} description={g.summary}
        actions={<><SaveButton type="guide" itemKey={g.key} title={g.title} saved={saved} path={path} signedIn={!!session} /><PrintButton /></>} />
      <EducationalNotice className="mb-6" />
      {g.season && <p className="mb-4 text-sm"><Badge tone="blue">When</Badge> {g.season}</p>}
      <div className="grid gap-4 md:grid-cols-3">
        {g.understanding.map((u) => <Card key={u.heading} className="p-4"><h2 className="text-sm font-semibold text-navy">{u.heading}</h2><p className="mt-1 text-sm text-muted">{u.body}</p></Card>)}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Section title="Before" items={g.before} /><Section title="During" items={g.during} /><Section title="After" items={g.after} />
      </div>
      <Card className="mt-6"><CardHeader><CardTitle>Preparedness checklist</CardTitle>{!session && <p className="text-sm text-muted"><Link href="/login" className="underline">Sign in</Link> to track your progress.</p>}</CardHeader>
        <CardContent><ul className="flex flex-col gap-2">{g.checklist.map((c) => {
          const isDone = done.includes(c.key);
          return (
            <li key={c.key}>{session ? (
              <form action={toggleChecklistItem} className="flex">
                <input type="hidden" name="checklist_key" value={`guide:${g.key}`} /><input type="hidden" name="item_key" value={c.key} /><input type="hidden" name="done" value={String(isDone)} /><input type="hidden" name="path" value={path} />
                <button className="flex items-center gap-2 text-left text-sm" aria-pressed={isDone}>{isDone ? <CheckSquare className="size-5 text-accent" /> : <Square className="size-5 text-muted" />}<span className={isDone ? "text-muted line-through" : ""}>{c.label}</span></button>
              </form>) : <span className="flex items-center gap-2 text-sm"><Square className="size-5 text-muted" />{c.label}</span>}</li>
          );
        })}</ul>
        {session && <div className="mt-4 flex gap-2"><ButtonLink href={`/plans/new`} size="sm" variant="secondary">Create a {g.title.toLowerCase()} plan</ButtonLink><ButtonLink href="/drills" size="sm" variant="outline">Practise with a drill</ButtonLink></div>}
        </CardContent></Card>
      <Card className="mt-6"><CardHeader><CardTitle>Official sources</CardTitle></CardHeader><CardContent className="text-sm">
        <ul className="flex flex-col gap-2">{g.sources.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-700 underline">{s.name}</a> — {s.role}</li>)}</ul>
        <p className="mt-3 text-xs text-muted">Content written by Vanguard as general educational guidance in plain language; it is not published or endorsed by these agencies. Last reviewed {fmtDate(g.reviewedOn)}. Always follow current official advisories.</p>
      </CardContent></Card>
    </>
  );
}
