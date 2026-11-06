export const dynamic = "force-dynamic";
import Link from "next/link";
import { Logo } from "@/components/shell/logo";
import { getSession } from "@/lib/auth";
import { ButtonLink } from "@/components/ui";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession().catch(() => null);
  return (
    <div className="min-h-dvh">
      <header className="app-header border-b border-line bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" aria-label="Vanguard home"><Logo /></Link>
          <nav aria-label="Public" className="flex items-center gap-1 text-sm">
            <Link href="/guides" className="hidden rounded-lg px-3 py-2 hover:bg-surface sm:block">Disaster information</Link>
            <Link href="/library" className="hidden rounded-lg px-3 py-2 hover:bg-surface sm:block">Library</Link>
            <Link href="/services" className="hidden rounded-lg px-3 py-2 hover:bg-surface md:block">Emergency services</Link>
            {session ? <ButtonLink href="/dashboard" size="sm">Open dashboard</ButtonLink>
              : <><Link href="/login" className="rounded-lg px-3 py-2 hover:bg-surface">Sign in</Link><ButtonLink href="/signup" size="sm" variant="accent">Get started</ButtonLink></>}
          </nav>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-6xl px-4 py-8">{children}</main>
      <footer className="border-t border-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-muted sm:flex-row sm:justify-between">
          <p>Vanguard provides preparedness education and planning tools. It is not an emergency alert or dispatch service. In an emergency call <a href="tel:911" className="font-semibold text-red-700">911</a>.</p>
          <p>“Ready at all times, all things, all places.”</p>
        </div>
      </footer>
    </div>
  );
}
