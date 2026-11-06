import Link from "next/link";
import { ClipboardList, Backpack, Gauge, WifiOff, Users, Map, Sparkles, Building2 } from "lucide-react";
import { ButtonLink, Card } from "@/components/ui";
import { guides } from "@/content/guides";

const FEATURES = [
  { icon: ClipboardList, title: "Emergency plans", body: "Guided household plans with meeting places, evacuation destinations, roles and checklists." },
  { icon: Backpack, title: "Kit builder", body: "3-day, 7-day and go-bag inventories sized to your household, with expiry reminders." },
  { icon: Gauge, title: "Preparedness assessment", body: "See where your household stands and get a prioritised improvement list." },
  { icon: WifiOff, title: "Works offline", body: "Your plans, contacts, kits and safety guides stay available when the network is down." },
  { icon: Users, title: "Community groups", body: "Prepare together with neighbours: shared checklists, events and tasks." },
  { icon: Map, title: "Services directory", body: "Hotlines, hospitals, fire and police stations with sources and review dates." },
  { icon: Sparkles, title: "AI assistant", body: "Ask preparedness questions and get answers grounded in Vanguard's library." },
  { icon: Building2, title: "Businesses & schools", body: "Organisational plans, drills, facilities and readiness tracking." },
];

export default function Landing() {
  return (
    <div className="flex flex-col gap-14">
      <section className="grid items-center gap-8 rounded-2xl bg-navy px-6 py-12 text-white sm:px-10 lg:grid-cols-2">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-300">Disaster preparedness for the Philippines</p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">Ready at all times, all things, all places.</h1>
          <p className="mt-4 max-w-xl text-white/80">Vanguard turns preparedness advice into a plan you can act on — for your household, your community, your school or your business.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href="/signup" variant="accent" size="lg">Create your free account</ButtonLink>
            <ButtonLink href="/guides" size="lg" className="bg-white/10 hover:bg-white/20">Read the guides</ButtonLink>
          </div>
        </div>
        <Card className="border-white/10 bg-white/5 p-5 text-white shadow-none">
          <p className="text-sm font-semibold">Preparedness guides</p>
          <ul className="mt-3 grid grid-cols-2 gap-2 text-sm">
            {guides.map((g) => (
              <li key={g.key}><Link href={`/guides/${g.key}`} className="block rounded-lg bg-white/10 px-3 py-2 hover:bg-white/20">{g.title}</Link></li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-white/60">Educational information. For current warnings, follow PAGASA, PHIVOLCS and your LGU.</p>
        </Card>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-navy">Everything your household needs to get ready</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <Card key={title} className="p-5">
              <Icon className="size-6 text-accent" aria-hidden />
              <h3 className="mt-3 font-semibold text-ink">{title}</h3>
              <p className="mt-1 text-sm text-muted">{body}</p>
            </Card>
          ))}
        </div>
      </section>
      <section className="rounded-xl border border-line bg-white p-6 text-sm text-muted">
        <h2 className="font-semibold text-ink">What Vanguard is — and isn&apos;t</h2>
        <p className="mt-2">Vanguard is a preparedness companion. It does not issue official warnings, monitor live hazards, contact rescue services or coordinate emergency response. Always follow instructions from your local government and national agencies, and call 911 in an emergency.</p>
      </section>
    </div>
  );
}
